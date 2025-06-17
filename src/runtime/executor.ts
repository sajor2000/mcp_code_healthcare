import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger, createModuleLogger } from '../utils/logger.js';
import { MCPError, ExternalServiceError } from '../utils/errors.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execLogger = createModuleLogger('runtime-executor');

export interface ExecutionConfig {
  language: 'R' | 'Python' | 'SAS' | 'Stata';
  code: string;
  timeout?: number; // milliseconds
  maxMemory?: number; // MB
  workDir?: string;
  env?: Record<string, string>;
  packages?: string[]; // Required packages to check
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  outputFiles?: string[];
  plots?: string[];
  tables?: any[];
}

export class RuntimeExecutor {
  private static readonly TEMP_DIR = path.join(process.cwd(), 'temp', 'executions');
  private static readonly MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB
  
  private static readonly LANGUAGE_CONFIG = {
    R: {
      command: 'Rscript',
      extension: '.R',
      checkCommand: 'R --version',
      packageCheck: (pkg: string) => `if (!require("${pkg}", quietly = TRUE)) stop("Package ${pkg} not found")`
    },
    Python: {
      command: 'python3',
      extension: '.py',
      checkCommand: 'python3 --version',
      packageCheck: (pkg: string) => `import ${pkg}`
    },
    SAS: {
      command: 'sas',
      extension: '.sas',
      checkCommand: 'sas -version',
      packageCheck: (pkg: string) => `/* Check for ${pkg} */`
    },
    Stata: {
      command: 'stata',
      extension: '.do',
      checkCommand: 'stata -version',
      packageCheck: (pkg: string) => `* Check for ${pkg}`
    }
  };

  static async initialize(): Promise<void> {
    // Ensure temp directory exists
    await fs.mkdir(this.TEMP_DIR, { recursive: true });
    
    // Check available runtimes
    const runtimes = await this.checkAvailableRuntimes();
    execLogger.info('Available runtimes', { runtimes });
  }

  static async checkAvailableRuntimes(): Promise<string[]> {
    const available: string[] = [];
    
    for (const [lang, config] of Object.entries(this.LANGUAGE_CONFIG)) {
      try {
        await this.executeCommand(config.checkCommand, { timeout: 5000 });
        available.push(lang);
      } catch {
        execLogger.warn(`Runtime not available: ${lang}`);
      }
    }
    
    return available;
  }

  static async execute(config: ExecutionConfig): Promise<ExecutionResult> {
    const startTime = Date.now();
    const executionId = uuidv4();
    const workDir = config.workDir || path.join(this.TEMP_DIR, executionId);
    
    execLogger.info('Starting execution', {
      executionId,
      language: config.language,
      timeout: config.timeout,
      maxMemory: config.maxMemory
    });
    
    try {
      // Create working directory
      await fs.mkdir(workDir, { recursive: true });
      
      // Prepare code with package checks
      const preparedCode = await this.prepareCode(config);
      
      // Write code to file
      const langConfig = this.LANGUAGE_CONFIG[config.language];
      const codeFile = path.join(workDir, `script${langConfig.extension}`);
      await fs.writeFile(codeFile, preparedCode);
      
      // Execute code
      const result = await this.executeCode(
        config.language,
        codeFile,
        workDir,
        config.timeout || 300000, // 5 minutes default
        config.env
      );
      
      // Collect output files
      const outputFiles = await this.collectOutputFiles(workDir);
      const plots = outputFiles.filter(f => 
        ['.png', '.jpg', '.svg', '.pdf'].includes(path.extname(f))
      );
      
      // Parse tables from output if applicable
      const tables = await this.parseTablesFromOutput(result.stdout, config.language);
      
      const duration = Date.now() - startTime;
      
      execLogger.info('Execution completed', {
        executionId,
        exitCode: result.exitCode,
        duration,
        outputFiles: outputFiles.length,
        plots: plots.length
      });
      
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        duration,
        outputFiles,
        plots,
        tables
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      execLogger.error('Execution failed', {
        executionId,
        error: error.message,
        duration
      });
      
      if (error.code === 'ETIMEDOUT') {
        throw new MCPError(
          `Execution timeout after ${config.timeout}ms`,
          'EXECUTION_TIMEOUT',
          408
        );
      }
      
      throw new ExternalServiceError(
        config.language,
        error.message,
        error
      );
    } finally {
      // Cleanup temp files after a delay
      setTimeout(async () => {
        try {
          await fs.rm(workDir, { recursive: true, force: true });
        } catch (error) {
          execLogger.warn('Failed to cleanup temp directory', { workDir });
        }
      }, 60000); // 1 minute delay
    }
  }

  private static async prepareCode(config: ExecutionConfig): Promise<string> {
    const langConfig = this.LANGUAGE_CONFIG[config.language];
    let preparedCode = '';
    
    // Add package checks
    if (config.packages && config.packages.length > 0) {
      const packageChecks = config.packages
        .map(pkg => langConfig.packageCheck(pkg))
        .join('\n');
      
      preparedCode += packageChecks + '\n\n';
    }
    
    // Add wrapper code based on language
    switch (config.language) {
      case 'R':
        preparedCode += this.wrapRCode(config.code);
        break;
      case 'Python':
        preparedCode += this.wrapPythonCode(config.code);
        break;
      default:
        preparedCode += config.code;
    }
    
    return preparedCode;
  }

  private static wrapRCode(code: string): string {
    return `
# Set up error handling
options(error = function() {
  traceback(2)
  quit(status = 1)
})

# Set working directory
setwd(getwd())

# Suppress startup messages
suppressPackageStartupMessages({
  ${code}
})

# Ensure all plots are saved
if (length(dev.list()) > 0) {
  dev.off()
}
`;
  }

  private static wrapPythonCode(code: string): string {
    return `
import sys
import os
import warnings
import traceback

# Suppress warnings
warnings.filterwarnings('ignore')

try:
    ${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    traceback.print_exc()
    sys.exit(1)
finally:
    # Ensure all plots are saved
    try:
        import matplotlib.pyplot as plt
        plt.close('all')
    except:
        pass
`;
  }

  private static async executeCode(
    language: string,
    codeFile: string,
    workDir: string,
    timeout: number,
    env?: Record<string, string>
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const langConfig = this.LANGUAGE_CONFIG[language];
    const command = `${langConfig.command} "${codeFile}"`;
    
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let outputSize = 0;
      
      const child = spawn(langConfig.command, [codeFile], {
        cwd: workDir,
        env: { ...process.env, ...env },
        timeout
      });
      
      // Handle stdout
      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        outputSize += chunk.length;
        
        if (outputSize <= this.MAX_OUTPUT_SIZE) {
          stdout += chunk;
        } else if (stdout.indexOf('... truncated ...') === -1) {
          stdout += '\n... truncated due to size limit ...\n';
        }
      });
      
      // Handle stderr
      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;
      });
      
      // Handle completion
      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });
      
      // Handle errors
      child.on('error', (error) => {
        reject(error);
      });
      
      // Handle timeout
      child.on('timeout', () => {
        child.kill('SIGTERM');
        reject(new Error('ETIMEDOUT'));
      });
    });
  }

  private static async executeCommand(
    command: string,
    options: { timeout?: number } = {}
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, [], {
        shell: true,
        timeout: options.timeout || 10000
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
      
      child.on('error', reject);
    });
  }

  private static async collectOutputFiles(workDir: string): Promise<string[]> {
    const files = await fs.readdir(workDir);
    const outputFiles: string[] = [];
    
    for (const file of files) {
      const filePath = path.join(workDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile() && !file.endsWith('.R') && !file.endsWith('.py')) {
        outputFiles.push(filePath);
      }
    }
    
    return outputFiles;
  }

  private static async parseTablesFromOutput(
    output: string,
    language: string
  ): Promise<any[]> {
    const tables: any[] = [];
    
    // Simple table detection - would be enhanced with actual parsing
    if (language === 'R') {
      // Look for R data frame outputs
      const tableMatches = output.match(/\s+\w+\s+\w+[\s\S]*?\n(?:\s*\d+.*\n)+/g);
      if (tableMatches) {
        tables.push(...tableMatches.map(t => ({ type: 'text', content: t })));
      }
    } else if (language === 'Python') {
      // Look for pandas DataFrame outputs
      const dfMatches = output.match(/\s+\w+\s+\w+[\s\S]*?\n(?:\d+\s+.*\n)+/g);
      if (dfMatches) {
        tables.push(...dfMatches.map(t => ({ type: 'text', content: t })));
      }
    }
    
    return tables;
  }

  // Sandbox execution for untrusted code
  static async executeSandboxed(config: ExecutionConfig): Promise<ExecutionResult> {
    // Enhanced security for sandboxed execution
    const sandboxConfig = {
      ...config,
      env: {
        ...config.env,
        PATH: '/usr/local/bin:/usr/bin:/bin', // Restricted PATH
        HOME: config.workDir || this.TEMP_DIR
      }
    };
    
    // Additional restrictions could include:
    // - Docker container execution
    // - Resource limits (CPU, memory)
    // - Network isolation
    // - Filesystem restrictions
    
    return this.execute(sandboxConfig);
  }
}