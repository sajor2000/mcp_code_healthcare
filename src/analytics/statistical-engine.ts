import { RuntimeExecutor, ExecutionResult } from '../runtime/executor.js';
import { logger, createModuleLogger } from '../utils/logger.js';
import { MCPError } from '../utils/errors.js';
import { Cacheable } from '../utils/cache.js';

const statsLogger = createModuleLogger('statistical-engine');

export interface StatisticalAnalysis {
  type: string;
  method: string;
  parameters: Record<string, any>;
  data: any;
}

export interface StatisticalResult {
  analysis: string;
  results: Record<string, any>;
  plots?: string[];
  tables?: any[];
  diagnostics?: Record<string, any>;
  code?: string;
}

export class StatisticalEngine {
  private static readonly R_PACKAGES = [
    'survival', 'ggplot2', 'dplyr', 'tidyr', 'broom',
    'tableone', 'MatchIt', 'survey', 'lme4', 'geepack'
  ];
  
  private static readonly PYTHON_PACKAGES = [
    'pandas', 'numpy', 'scipy', 'statsmodels', 'sklearn',
    'matplotlib', 'seaborn', 'lifelines', 'tableone'
  ];

  static async initialize(): Promise<void> {
    await RuntimeExecutor.initialize();
    const runtimes = await RuntimeExecutor.checkAvailableRuntimes();
    
    if (!runtimes.includes('R') && !runtimes.includes('Python')) {
      throw new MCPError(
        'No statistical runtime available (R or Python required)',
        'RUNTIME_ERROR',
        500
      );
    }
    
    statsLogger.info('Statistical engine initialized', { runtimes });
  }

  @Cacheable('statistics', 3600)
  static async runAnalysis(analysis: StatisticalAnalysis): Promise<StatisticalResult> {
    statsLogger.info('Running statistical analysis', {
      type: analysis.type,
      method: analysis.method
    });
    
    try {
      switch (analysis.type) {
        case 'survival':
          return await this.runSurvivalAnalysis(analysis);
        case 'regression':
          return await this.runRegressionAnalysis(analysis);
        case 'propensity':
          return await this.runPropensityAnalysis(analysis);
        case 'machine_learning':
          return await this.runMachineLearning(analysis);
        case 'descriptive':
          return await this.runDescriptiveAnalysis(analysis);
        default:
          throw new MCPError(
            `Unknown analysis type: ${analysis.type}`,
            'INVALID_ANALYSIS',
            400
          );
      }
    } catch (error) {
      statsLogger.error('Statistical analysis failed', {
        type: analysis.type,
        error: error.message
      });
      throw error;
    }
  }

  private static async runSurvivalAnalysis(
    analysis: StatisticalAnalysis
  ): Promise<StatisticalResult> {
    const { time, event, predictors, covariates, strata } = analysis.parameters;
    
    const rCode = `
library(survival)
library(survminer)
library(broom)

# Load data
data <- read.csv("input_data.csv")

# Create survival object
surv_obj <- Surv(data$${time}, data$${event})

# Fit Cox model
formula_str <- paste("surv_obj ~", paste(c(${this.formatRVector(predictors)}, ${this.formatRVector(covariates)}), collapse = " + "))
cox_model <- coxph(as.formula(formula_str), data = data)

# Model summary
model_summary <- tidy(cox_model, conf.int = TRUE, exponentiate = TRUE)
write.csv(model_summary, "cox_results.csv")

# Check proportional hazards assumption
ph_test <- cox.zph(cox_model)
write.csv(ph_test$table, "ph_test.csv")

# Generate survival curves
if (!is.null("${strata}")) {
  km_fit <- survfit(as.formula(paste("surv_obj ~", "${strata}")), data = data)
  
  # Create Kaplan-Meier plot
  km_plot <- ggsurvplot(
    km_fit,
    data = data,
    pval = TRUE,
    conf.int = TRUE,
    risk.table = TRUE,
    risk.table.col = "strata",
    ggtheme = theme_minimal()
  )
  
  ggsave("kaplan_meier.png", km_plot$plot, width = 10, height = 8, dpi = 300)
}

# Forest plot
library(forestplot)
png("forest_plot.png", width = 800, height = 600)
forestplot(
  labeltext = model_summary$term,
  mean = model_summary$estimate,
  lower = model_summary$conf.low,
  upper = model_summary$conf.high,
  xlab = "Hazard Ratio"
)
dev.off()

# Model diagnostics
png("schoenfeld_residuals.png", width = 800, height = 600)
plot(ph_test)
dev.off()

# Print results
cat("Cox Regression Results:\\n")
print(summary(cox_model))
`;

    const result = await RuntimeExecutor.execute({
      language: 'R',
      code: rCode,
      packages: ['survival', 'survminer', 'broom', 'forestplot'],
      timeout: 60000
    });

    return this.parseStatisticalResults(result, 'survival', rCode);
  }

  private static async runRegressionAnalysis(
    analysis: StatisticalAnalysis
  ): Promise<StatisticalResult> {
    const { outcome, predictors, covariates, family = 'gaussian' } = analysis.parameters;
    
    const rCode = `
library(broom)
library(car)
library(ggplot2)

# Load data
data <- read.csv("input_data.csv")

# Build formula
formula_str <- paste("${outcome} ~", paste(c(${this.formatRVector(predictors)}, ${this.formatRVector(covariates)}), collapse = " + "))

# Fit model based on family
if ("${family}" == "binomial") {
  model <- glm(as.formula(formula_str), data = data, family = binomial())
  
  # Calculate odds ratios
  or_results <- tidy(model, conf.int = TRUE, exponentiate = TRUE)
  write.csv(or_results, "logistic_results.csv")
  
  # ROC curve
  library(pROC)
  roc_obj <- roc(data$${outcome}, predict(model, type = "response"))
  png("roc_curve.png", width = 600, height = 600)
  plot(roc_obj, main = paste("ROC Curve (AUC =", round(auc(roc_obj), 3), ")"))
  dev.off()
  
} else {
  model <- lm(as.formula(formula_str), data = data)
  
  # Model results
  model_results <- tidy(model, conf.int = TRUE)
  write.csv(model_results, "linear_results.csv")
  
  # Diagnostic plots
  png("diagnostic_plots.png", width = 1200, height = 900)
  par(mfrow = c(2, 2))
  plot(model)
  dev.off()
}

# VIF for multicollinearity
vif_results <- vif(model)
write.csv(data.frame(variable = names(vif_results), vif = vif_results), "vif_results.csv")

# Print results
summary(model)
`;

    const result = await RuntimeExecutor.execute({
      language: 'R',
      code: rCode,
      packages: ['broom', 'car', 'ggplot2', 'pROC'],
      timeout: 45000
    });

    return this.parseStatisticalResults(result, 'regression', rCode);
  }

  private static async runPropensityAnalysis(
    analysis: StatisticalAnalysis
  ): Promise<StatisticalResult> {
    const { treatment, outcome, covariates, method = 'nearest' } = analysis.parameters;
    
    const rCode = `
library(MatchIt)
library(cobalt)
library(ggplot2)

# Load data
data <- read.csv("input_data.csv")

# Propensity score matching
ps_formula <- as.formula(paste("${treatment} ~", paste(${this.formatRVector(covariates)}, collapse = " + ")))
match_out <- matchit(ps_formula, data = data, method = "${method}", distance = "logit")

# Check balance
bal_tab <- bal.tab(match_out, un = TRUE)
write.csv(bal_tab$Balance, "balance_table.csv")

# Love plot
png("love_plot.png", width = 800, height = 600)
love.plot(match_out, binary = "std")
dev.off()

# Extract matched data
matched_data <- match.data(match_out)

# Outcome analysis on matched data
outcome_model <- lm(${outcome} ~ ${treatment}, data = matched_data, weights = weights)
outcome_results <- tidy(outcome_model, conf.int = TRUE)
write.csv(outcome_results, "matched_outcome_results.csv")

# Propensity score distribution
png("ps_distribution.png", width = 800, height = 600)
plot(match_out, type = "hist")
dev.off()

# Print results
cat("Matching Summary:\\n")
summary(match_out)
cat("\\nOutcome Analysis:\\n")
summary(outcome_model)
`;

    const result = await RuntimeExecutor.execute({
      language: 'R',
      code: rCode,
      packages: ['MatchIt', 'cobalt'],
      timeout: 60000
    });

    return this.parseStatisticalResults(result, 'propensity', rCode);
  }

  private static async runMachineLearning(
    analysis: StatisticalAnalysis
  ): Promise<StatisticalResult> {
    const { outcome, features, algorithm = 'random_forest', cv_folds = 5 } = analysis.parameters;
    
    const pythonCode = `
import pandas as pd
import numpy as np
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, classification_report, roc_curve
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

# Load data
data = pd.read_csv("input_data.csv")

# Prepare features and target
X = data[${this.formatPythonList(features)}]
y = data["${outcome}"]

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Select algorithm
if "${algorithm}" == "random_forest":
    model = RandomForestClassifier(n_estimators=100, random_state=42)
elif "${algorithm}" == "gradient_boosting":
    model = GradientBoostingClassifier(n_estimators=100, random_state=42)
else:
    model = LogisticRegression(random_state=42)

# Train model
model.fit(X_train_scaled, y_train)

# Cross-validation
cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=${cv_folds}, scoring='roc_auc')
print(f"Cross-validation AUC: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")

# Test set performance
y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
test_auc = roc_auc_score(y_test, y_pred_proba)
print(f"Test AUC: {test_auc:.3f}")

# Save results
results_df = pd.DataFrame({
    'metric': ['cv_auc_mean', 'cv_auc_std', 'test_auc'],
    'value': [cv_scores.mean(), cv_scores.std(), test_auc]
})
results_df.to_csv("ml_performance.csv", index=False)

# Feature importance (if applicable)
if hasattr(model, 'feature_importances_'):
    importance_df = pd.DataFrame({
        'feature': X.columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    importance_df.to_csv("feature_importance.csv", index=False)
    
    # Plot feature importance
    plt.figure(figsize=(10, 6))
    sns.barplot(data=importance_df.head(20), x='importance', y='feature')
    plt.title('Top 20 Feature Importances')
    plt.tight_layout()
    plt.savefig("feature_importance.png", dpi=300)
    plt.close()

# ROC curve
fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
plt.figure(figsize=(8, 6))
plt.plot(fpr, tpr, label=f'ROC curve (AUC = {test_auc:.3f})')
plt.plot([0, 1], [0, 1], 'k--', label='Random')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curve')
plt.legend()
plt.grid(True, alpha=0.3)
plt.savefig("roc_curve_ml.png", dpi=300)
plt.close()

# Save model
joblib.dump(model, "trained_model.pkl")
joblib.dump(scaler, "scaler.pkl")

# Classification report
print("\\nClassification Report:")
print(classification_report(y_test, model.predict(X_test_scaled)))
`;

    const result = await RuntimeExecutor.execute({
      language: 'Python',
      code: pythonCode,
      packages: ['pandas', 'numpy', 'sklearn', 'matplotlib', 'seaborn', 'joblib'],
      timeout: 120000 // 2 minutes for ML
    });

    return this.parseStatisticalResults(result, 'machine_learning', pythonCode);
  }

  private static async runDescriptiveAnalysis(
    analysis: StatisticalAnalysis
  ): Promise<StatisticalResult> {
    const { variables, groupBy, includeTests = true } = analysis.parameters;
    
    const rCode = `
library(tableone)
library(dplyr)
library(ggplot2)

# Load data
data <- read.csv("input_data.csv")

# Create Table 1
vars_to_summarize <- c(${this.formatRVector(variables)})
cat_vars <- names(data)[sapply(data, is.factor) | sapply(data, function(x) length(unique(x)) < 10)]
cat_vars <- intersect(vars_to_summarize, cat_vars)

if (!is.null("${groupBy}") && "${groupBy}" != "") {
  table1 <- CreateTableOne(
    vars = vars_to_summarize,
    strata = "${groupBy}",
    data = data,
    factorVars = cat_vars,
    test = ${includeTests}
  )
} else {
  table1 <- CreateTableOne(
    vars = vars_to_summarize,
    data = data,
    factorVars = cat_vars
  )
}

# Save Table 1
capture.output(print(table1, showAllLevels = TRUE), file = "table1.txt")
table1_df <- as.data.frame(print(table1, showAllLevels = TRUE, printToggle = FALSE))
write.csv(table1_df, "table1.csv")

# Generate distribution plots for continuous variables
cont_vars <- setdiff(vars_to_summarize, cat_vars)
if (length(cont_vars) > 0) {
  for (var in cont_vars) {
    p <- ggplot(data, aes_string(x = var)) +
      geom_histogram(bins = 30, fill = "skyblue", color = "black", alpha = 0.7) +
      theme_minimal() +
      labs(title = paste("Distribution of", var))
    
    if (!is.null("${groupBy}") && "${groupBy}" != "") {
      p <- p + facet_wrap(~ ${groupBy})
    }
    
    ggsave(paste0("dist_", var, ".png"), p, width = 8, height = 6, dpi = 300)
  }
}

# Missing data summary
missing_summary <- data.frame(
  variable = names(data),
  n_missing = sapply(data, function(x) sum(is.na(x))),
  pct_missing = sapply(data, function(x) mean(is.na(x)) * 100)
)
write.csv(missing_summary, "missing_data_summary.csv", row.names = FALSE)

# Print summary
print(table1)
`;

    const result = await RuntimeExecutor.execute({
      language: 'R',
      code: rCode,
      packages: ['tableone', 'dplyr', 'ggplot2'],
      timeout: 30000
    });

    return this.parseStatisticalResults(result, 'descriptive', rCode);
  }

  private static formatRVector(items: string[]): string {
    if (!items || items.length === 0) return '""';
    return items.map(item => `"${item}"`).join(', ');
  }

  private static formatPythonList(items: string[]): string {
    if (!items || items.length === 0) return '[]';
    return '[' + items.map(item => `"${item}"`).join(', ') + ']';
  }

  private static async parseStatisticalResults(
    execution: ExecutionResult,
    analysisType: string,
    code: string
  ): Promise<StatisticalResult> {
    const results: Record<string, any> = {
      stdout: execution.stdout,
      stderr: execution.stderr,
      exitCode: execution.exitCode
    };

    // Parse specific output files based on analysis type
    if (execution.outputFiles) {
      for (const file of execution.outputFiles) {
        if (file.endsWith('.csv')) {
          // In production, would actually read and parse CSV files
          results[path.basename(file, '.csv')] = `CSV file: ${file}`;
        } else if (file.endsWith('.txt')) {
          results[path.basename(file, '.txt')] = `Text file: ${file}`;
        }
      }
    }

    return {
      analysis: analysisType,
      results,
      plots: execution.plots,
      tables: execution.tables,
      diagnostics: {
        duration: execution.duration,
        outputFiles: execution.outputFiles?.length || 0
      },
      code
    };
  }
}