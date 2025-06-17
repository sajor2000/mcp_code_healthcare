import { Server, Tool } from '@modelcontextprotocol/sdk/server/index.js';
import { Database } from 'better-sqlite3';
import { checkSTROBECompliance } from '../../nlp/strobe-guidelines.js';

export class ResearchCodeGeneratorTool implements Tool {
  name = 'generate_research_code';
  description = 'Generate complete analysis code for health services research studies in R, Python, or SAS';
  
  inputSchema = {
    type: 'object',
    properties: {
      study_type: {
        type: 'string',
        enum: ['cohort', 'case-control', 'cross-sectional', 'rct_emulation', 'time_series'],
        description: 'Type of study design'
      },
      analysis_plan: {
        type: 'object',
        properties: {
          primary_outcome: { type: 'string' },
          secondary_outcomes: { type: 'array', items: { type: 'string' } },
          exposures: { type: 'array', items: { type: 'string' } },
          covariates: { type: 'array', items: { type: 'string' } },
          effect_modifiers: { type: 'array', items: { type: 'string' } },
          statistical_methods: { 
            type: 'array', 
            items: { 
              type: 'string',
              enum: [
                'descriptive_statistics',
                'univariate_analysis',
                'multivariable_regression',
                'cox_regression',
                'logistic_regression',
                'linear_regression',
                'propensity_score_matching',
                'iptw',
                'instrumental_variables',
                'difference_in_differences',
                'interrupted_time_series',
                'machine_learning',
                'competing_risks',
                'multilevel_modeling',
                'gee',
                'sensitivity_analysis'
              ]
            }
          },
          subgroup_analyses: { type: 'array', items: { type: 'string' } },
          missing_data_approach: {
            type: 'string',
            enum: ['complete_case', 'multiple_imputation', 'ipw', 'pattern_mixture']
          }
        },
        required: ['primary_outcome', 'statistical_methods']
      },
      output_format: {
        type: 'string',
        enum: ['R', 'Python', 'SAS', 'Stata'],
        description: 'Programming language for the generated code'
      },
      data_model: {
        type: 'string',
        enum: ['OMOP', 'CLIF', 'custom'],
        description: 'Data model being used'
      },
      include_components: {
        type: 'array',
        items: {
          type: 'string',
          enum: [
            'data_import',
            'data_cleaning',
            'table1',
            'main_analysis',
            'figures',
            'sensitivity_analyses',
            'diagnostics',
            'reporting'
          ]
        },
        default: ['data_import', 'data_cleaning', 'table1', 'main_analysis', 'figures']
      }
    },
    required: ['study_type', 'analysis_plan', 'output_format']
  };

  constructor(private server: Server, private db: Database) {
    server.addTool(this);
  }
  
  async execute(args: any) {
    const { 
      study_type, 
      analysis_plan, 
      output_format, 
      data_model = 'custom',
      include_components = ['data_import', 'data_cleaning', 'table1', 'main_analysis', 'figures']
    } = args;
    
    let generatedCode = '';
    let workflow = [];
    
    // Check STROBE compliance if analysis plan provided
    let strobeCompliance = null;
    if (analysis_plan) {
      strobeCompliance = checkSTROBECompliance({
        study_type,
        outcomes: [analysis_plan.primary_outcome, ...(analysis_plan.secondary_outcomes || [])],
        predictors: analysis_plan.exposures || [],
        covariates: analysis_plan.covariates || [],
        analysis_plan: analysis_plan.statistical_methods?.map(method => ({ type: method })) || [],
        sample_size_estimate: analysis_plan.sample_size || null
      });
      
      // Add STROBE compliance to analysis plan for code generation
      (analysis_plan as any).strobeCompliance = strobeCompliance;
    }
    
    // Generate code based on output format
    switch (output_format) {
      case 'R':
        generatedCode = await this.generateRCode(
          study_type, 
          analysis_plan, 
          data_model, 
          include_components
        );
        break;
      case 'Python':
        generatedCode = await this.generatePythonCode(
          study_type, 
          analysis_plan, 
          data_model, 
          include_components
        );
        break;
      case 'SAS':
        generatedCode = await this.generateSASCode(
          study_type, 
          analysis_plan, 
          data_model, 
          include_components
        );
        break;
      case 'Stata':
        generatedCode = await this.generateStataCode(
          study_type, 
          analysis_plan, 
          data_model, 
          include_components
        );
        break;
    }
    
    // Create analysis workflow
    workflow = this.createAnalysisWorkflow(study_type, analysis_plan, include_components);
    
    // Generate documentation
    const documentation = this.generateDocumentation(study_type, analysis_plan);
    
    // Get required packages/libraries
    const requiredPackages = this.getRequiredPackages(output_format, analysis_plan);
    
    // Generate validation steps
    const validationSteps = this.getValidationSteps(study_type, analysis_plan);
    
    return {
      code: generatedCode,
      format: output_format,
      workflow,
      documentation,
      required_packages: requiredPackages,
      validation_steps: validationSteps,
      execution_notes: this.getExecutionNotes(output_format),
      output_files: this.getExpectedOutputFiles(include_components),
      strobe_compliance: strobeCompliance
    };
  }
  
  private async generateRCode(
    studyType: string, 
    plan: any, 
    dataModel: string,
    components: string[]
  ): Promise<string> {
    let code = `# Health Services Research Analysis
# Study Type: ${studyType}
# Data Model: ${dataModel}
# Generated by Healthcare Research MCP Server
# Date: ${new Date().toISOString()}

${(plan as any).strobeCompliance ? this.generateSTROBEComplianceSection(plan, 'R') : ''}
# Load required libraries
${this.getRLibraries(plan)}

# Set options
options(scipen = 999)  # Disable scientific notation
theme_set(theme_minimal())  # Set default ggplot theme

`;

    // Data import section
    if (components.includes('data_import')) {
      code += this.generateRDataImport(dataModel);
    }
    
    // Data cleaning section
    if (components.includes('data_cleaning')) {
      code += this.generateRDataCleaning(plan);
    }
    
    // Table 1 section
    if (components.includes('table1')) {
      code += this.generateRTable1(plan);
    }
    
    // Main analysis section
    if (components.includes('main_analysis')) {
      code += await this.generateRMainAnalysis(studyType, plan);
    }
    
    // Figures section
    if (components.includes('figures')) {
      code += this.generateRFigures(studyType, plan);
    }
    
    // Sensitivity analyses section
    if (components.includes('sensitivity_analyses')) {
      code += this.generateRSensitivityAnalyses(plan);
    }
    
    // Diagnostics section
    if (components.includes('diagnostics')) {
      code += this.generateRDiagnostics(studyType, plan);
    }
    
    // Reporting section
    if (components.includes('reporting')) {
      code += this.generateRReporting();
    }
    
    return code;
  }
  
  private getRLibraries(plan: any): string {
    const libraries = [
      'tidyverse',
      'tableone',
      'survival',
      'broom'
    ];
    
    // Add method-specific libraries
    if (plan.statistical_methods.includes('propensity_score_matching')) {
      libraries.push('MatchIt', 'cobalt');
    }
    if (plan.statistical_methods.includes('machine_learning')) {
      libraries.push('caret', 'randomForest', 'xgboost');
    }
    if (plan.statistical_methods.includes('multiple_imputation')) {
      libraries.push('mice', 'VIM');
    }
    if (plan.statistical_methods.includes('competing_risks')) {
      libraries.push('cmprsk', 'tidycmprsk');
    }
    if (plan.statistical_methods.includes('multilevel_modeling')) {
      libraries.push('lme4', 'lmerTest');
    }
    
    return libraries.map(lib => `library(${lib})`).join('\n');
  }
  
  private generateRDataImport(dataModel: string): string {
    if (dataModel === 'OMOP') {
      return `
# ============================================
# Data Import - OMOP CDM
# ============================================

# Connect to OMOP database
con <- DBI::dbConnect(
  RPostgres::Postgres(),
  host = Sys.getenv("DB_HOST"),
  port = as.integer(Sys.getenv("DB_PORT", 5432)),
  dbname = Sys.getenv("DB_NAME"),
  user = Sys.getenv("DB_USER"),
  password = Sys.getenv("DB_PASSWORD")
)

# Import cohort data
cohort <- DBI::dbGetQuery(con, readr::read_file("sql/cohort_query.sql"))

# Import additional tables as needed
person <- tbl(con, "person") %>% collect()
condition_occurrence <- tbl(con, "condition_occurrence") %>% collect()
drug_exposure <- tbl(con, "drug_exposure") %>% collect()
measurement <- tbl(con, "measurement") %>% collect()

# Close database connection
DBI::dbDisconnect(con)

`;
    } else if (dataModel === 'CLIF') {
      return `
# ============================================
# Data Import - CLIF Format
# ============================================

# Import CLIF data files
patients <- read_csv("data/patients.csv")
admissions <- read_csv("data/admissions.csv")
vitals <- read_csv("data/vitals.csv")
labs <- read_csv("data/labs.csv")
medications <- read_csv("data/medications.csv")

# Merge datasets
cohort <- patients %>%
  inner_join(admissions, by = "patient_id") %>%
  left_join(
    vitals %>% 
      group_by(patient_id, admission_id) %>%
      summarise(across(everything(), list(mean = mean, max = max, min = min), 
                      .names = "{.col}_{.fn}"))
  )

`;
    } else {
      return `
# ============================================
# Data Import
# ============================================

# Import analysis dataset
cohort <- read_csv("data/analysis_cohort.csv")

# Check data structure
glimpse(cohort)
summary(cohort)

`;
    }
  }
  
  private generateRDataCleaning(plan: any): string {
    return `
# ============================================
# Data Cleaning and Preparation
# ============================================

# Check for duplicates
n_duplicates <- cohort %>%
  group_by(patient_id) %>%
  filter(n() > 1) %>%
  nrow()
cat("Number of duplicate patients:", n_duplicates, "\\n")

# Handle duplicates (keep first occurrence)
cohort <- cohort %>%
  group_by(patient_id) %>%
  slice(1) %>%
  ungroup()

# Create derived variables
cohort <- cohort %>%
  mutate(
    # Age categories
    age_cat = cut(age, 
                  breaks = c(0, 50, 65, 80, Inf),
                  labels = c("<50", "50-64", "65-79", "≥80"),
                  right = FALSE),
    
    # Charlson comorbidity index categories
    cci_cat = cut(charlson_score,
                  breaks = c(0, 1, 3, Inf),
                  labels = c("0", "1-2", "≥3"),
                  right = FALSE),
    
    # Follow-up time
    followup_days = as.numeric(followup_date - index_date),
    followup_years = followup_days / 365.25
  )

# Handle missing data - exploratory
missing_summary <- cohort %>%
  summarise(across(everything(), ~sum(is.na(.)) / n() * 100)) %>%
  pivot_longer(everything(), names_to = "variable", values_to = "percent_missing") %>%
  arrange(desc(percent_missing))

print(missing_summary)

# Visualize missing data patterns
VIM::aggr(cohort, col = c('navyblue', 'red'), 
          numbers = TRUE, sortVars = TRUE)

`;
  }
  
  private generateRTable1(plan: any): string {
    const vars = [
      'age', 'age_cat', 'gender',
      ...plan.covariates,
      plan.primary_outcome
    ];
    
    return `
# ============================================
# Table 1: Baseline Characteristics
# ============================================

# Define variables for Table 1
vars_table1 <- c(${vars.map(v => `"${v}"`).join(', ')})

# Define categorical variables
cat_vars <- c(${vars.filter(v => v.includes('cat') || v === 'gender').map(v => `"${v}"`).join(', ')})

# Create Table 1
table1 <- CreateTableOne(
  vars = vars_table1,
  strata = "${plan.exposures[0]}",  # Primary exposure
  data = cohort,
  factorVars = cat_vars,
  includeNA = FALSE,
  test = TRUE,
  smd = TRUE
)

# Print Table 1
print(table1, 
      smd = TRUE,
      showAllLevels = TRUE,
      formatOptions = list(big.mark = ","),
      exact = c("gender"),
      nonnormal = c("age", "charlson_score"))

# Export Table 1
table1_df <- print(table1, printToggle = FALSE) %>%
  as.data.frame() %>%
  tibble::rownames_to_column("Variable")

write_csv(table1_df, "output/table1_baseline_characteristics.csv")

`;
  }
  
  private async generateRMainAnalysis(studyType: string, plan: any): Promise<string> {
    let code = `
# ============================================
# Main Analysis
# ============================================

`;
    
    // Add STROBE compliance comment if available
    if ((plan as any).strobeCompliance) {
      code += this.generateSTROBEComplianceSection(plan, 'R');
    }
    
    // Add analysis based on study type and methods
    if (plan.statistical_methods.includes('cox_regression')) {
      code += `
# Cox Proportional Hazards Regression
# ------------------------------------

# Univariate analysis
univariate_results <- list()

for (var in c("${plan.exposures.join('", "')}", "${plan.covariates.join('", "')}")) {
  formula <- as.formula(paste("Surv(followup_time, ${plan.primary_outcome}) ~", var))
  model <- coxph(formula, data = cohort)
  univariate_results[[var]] <- broom::tidy(model, exponentiate = TRUE, conf.int = TRUE)
}

# Combine univariate results
univariate_df <- bind_rows(univariate_results, .id = "variable") %>%
  select(variable, term, estimate, conf.low, conf.high, p.value) %>%
  mutate(
    HR_CI = sprintf("%.2f (%.2f-%.2f)", estimate, conf.low, conf.high),
    p.value = format.pval(p.value, digits = 3)
  )

# Multivariable model
mv_formula <- as.formula(paste(
  "Surv(followup_time, ${plan.primary_outcome}) ~",
  paste(c("${plan.exposures.join('", "')}", "${plan.covariates.join('", "')}"), collapse = " + ")
))

mv_model <- coxph(mv_formula, data = cohort)
summary(mv_model)

# Check proportional hazards assumption
ph_test <- cox.zph(mv_model)
print(ph_test)
plot(ph_test)

# Extract results
mv_results <- broom::tidy(mv_model, exponentiate = TRUE, conf.int = TRUE) %>%
  mutate(
    HR_CI = sprintf("%.2f (%.2f-%.2f)", estimate, conf.low, conf.high),
    p.value = format.pval(p.value, digits = 3)
  )

`;
    }
    
    if (plan.statistical_methods.includes('propensity_score_matching')) {
      code += `
# Propensity Score Analysis
# -------------------------

# Calculate propensity scores
ps_formula <- as.formula(paste(
  "${plan.exposures[0]} ~",
  paste("${plan.covariates.join('" + "')}", collapse = " + ")
))

ps_model <- glm(ps_formula, data = cohort, family = binomial)

# Add propensity scores to dataset
cohort$ps <- predict(ps_model, type = "response")

# Check overlap
ggplot(cohort, aes(x = ps, fill = factor(${plan.exposures[0]}))) +
  geom_density(alpha = 0.5) +
  labs(title = "Propensity Score Distribution",
       x = "Propensity Score",
       fill = "Treatment") +
  theme_minimal()

ggsave("output/ps_distribution.png", width = 8, height = 6)

# Perform matching
match_obj <- matchit(
  ps_formula,
  data = cohort,
  method = "nearest",
  caliper = 0.1,
  ratio = 1
)

# Check balance
love.plot(match_obj, 
          thresholds = c(m = 0.1),
          var.order = "unadjusted")

# Extract matched data
matched_cohort <- match.data(match_obj)

# Analysis on matched cohort
matched_model <- coxph(
  Surv(followup_time, ${plan.primary_outcome}) ~ ${plan.exposures[0]} + cluster(subclass),
  data = matched_cohort
)

`;
    }
    
    return code;
  }
  
  private generateSTROBEComplianceSection(
    plan: any,
    language: 'R' | 'Python' | 'SAS' | 'Stata'
  ): string {
    const compliance = plan.strobeCompliance;
    
    if (!compliance) return '';
    
    const commentChar = language === 'SAS' || language === 'Stata' ? '*' : '#';
    
    return `
${commentChar} ==============================================================================
${commentChar} STROBE Statement Compliance
${commentChar} ==============================================================================
${commentChar} This analysis addresses the following STROBE checklist items:
${compliance.addressed.map((item: string) => `${commentChar} ✓ ${item}`).join('\n')}

${commentChar} The following STROBE items require attention:
${compliance.missing.map((item: string) => `${commentChar} ⚠ ${item}`).join('\n')}

${commentChar} Recommendations for improving STROBE compliance:
${compliance.recommendations.map((rec: string, i: number) => `${commentChar} ${i + 1}. ${rec}`).join('\n')}

${commentChar} Analysis confidence: ${plan.confidence || 'N/A'}
${commentChar} ==============================================================================

`;
  }
  
  private generateRFigures(studyType: string, plan: any): string {
    return `
# ============================================
# Figures
# ============================================

# Figure 1: Kaplan-Meier Curves
# ------------------------------
km_fit <- survfit(
  Surv(followup_time, ${plan.primary_outcome}) ~ ${plan.exposures[0]},
  data = cohort
)

# Create KM plot with NEJM styling
km_plot <- ggsurvplot(
  km_fit,
  data = cohort,
  pval = TRUE,
  pval.method = TRUE,
  conf.int = TRUE,
  conf.int.style = "ribbon",
  xlab = "Time (days)",
  ylab = "Event-free survival probability",
  risk.table = TRUE,
  risk.table.height = 0.25,
  ggtheme = theme_minimal(),
  palette = c("#0066CC", "#DC3545"),  # NEJM colors
  font.family = "Helvetica"
)

# Save KM plot
ggsave("output/figure1_kaplan_meier.png", 
       plot = km_plot$plot,
       width = 10, height = 8, dpi = 300)

# Figure 2: Forest Plot
# ---------------------
forest_data <- mv_results %>%
  filter(term != "(Intercept)") %>%
  mutate(
    term = factor(term, levels = rev(term)),
    is_significant = p.value < 0.05
  )

forest_plot <- ggplot(forest_data, aes(y = term)) +
  geom_point(aes(x = estimate), size = 3) +
  geom_errorbarh(aes(xmin = conf.low, xmax = conf.high), height = 0.2) +
  geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
  scale_x_log10() +
  labs(x = "Hazard Ratio (95% CI)", y = "") +
  theme_minimal() +
  theme(
    axis.text.y = element_text(size = 10),
    panel.grid.minor = element_blank(),
    text = element_text(family = "Helvetica")
  )

ggsave("output/figure2_forest_plot.png", 
       plot = forest_plot,
       width = 8, height = 6, dpi = 300)

# Figure 3: Subgroup Analysis
# ---------------------------
if (length(plan$subgroup_analyses) > 0) {
  subgroup_results <- list()
  
  for (subgroup in plan$subgroup_analyses) {
    levels <- unique(cohort[[subgroup]])
    
    for (level in levels) {
      subset_data <- cohort %>% filter(!!sym(subgroup) == level)
      
      if (nrow(subset_data) >= 20) {  # Minimum sample size
        model <- coxph(
          Surv(followup_time, ${plan.primary_outcome}) ~ ${plan.exposures[0]},
          data = subset_data
        )
        
        result <- broom::tidy(model, exponentiate = TRUE, conf.int = TRUE) %>%
          filter(term == "${plan.exposures[0]}") %>%
          mutate(
            subgroup = subgroup,
            level = as.character(level),
            n = nrow(subset_data)
          )
        
        subgroup_results[[paste(subgroup, level)]] <- result
      }
    }
  }
  
  subgroup_df <- bind_rows(subgroup_results)
  
  # Create subgroup forest plot
  subgroup_plot <- ggplot(subgroup_df, aes(y = interaction(level, subgroup))) +
    geom_point(aes(x = estimate), size = 3) +
    geom_errorbarh(aes(xmin = conf.low, xmax = conf.high), height = 0.2) +
    geom_vline(xintercept = 1, linetype = "dashed", color = "gray50") +
    scale_x_log10() +
    labs(x = "Hazard Ratio (95% CI)", y = "Subgroup") +
    theme_minimal() +
    theme(text = element_text(family = "Helvetica"))
  
  ggsave("output/figure3_subgroup_analysis.png", 
         plot = subgroup_plot,
         width = 10, height = 8, dpi = 300)
}

`;
  }
  
  private generateRSensitivityAnalyses(plan: any): string {
    return `
# ============================================
# Sensitivity Analyses
# ============================================

# Sensitivity Analysis 1: Complete Case Analysis
# ----------------------------------------------
complete_cohort <- cohort %>% 
  drop_na(${plan.covariates.join(', ')})

sens1_model <- coxph(
  mv_formula,
  data = complete_cohort
)

# Sensitivity Analysis 2: Different Follow-up Windows
# ---------------------------------------------------
sens2_results <- list()

for (days in c(30, 90, 180, 365)) {
  temp_cohort <- cohort %>%
    mutate(
      followup_time_sens = pmin(followup_time, days),
      event_sens = ifelse(followup_time <= days, ${plan.primary_outcome}, 0)
    )
  
  model <- coxph(
    update(mv_formula, Surv(followup_time_sens, event_sens) ~ .),
    data = temp_cohort
  )
  
  sens2_results[[paste0("followup_", days, "d")]] <- 
    broom::tidy(model, exponentiate = TRUE, conf.int = TRUE) %>%
    filter(term == "${plan.exposures[0]}") %>%
    mutate(followup_window = days)
}

sens2_df <- bind_rows(sens2_results)

# Sensitivity Analysis 3: E-value for Unmeasured Confounding
# ----------------------------------------------------------
# Calculate E-value for primary exposure
primary_hr <- mv_results %>%
  filter(term == "${plan.exposures[0]}") %>%
  pull(estimate)

primary_ci_lower <- mv_results %>%
  filter(term == "${plan.exposures[0]}") %>%
  pull(conf.low)

e_value <- sqrt(primary_hr * (primary_hr - 1) + 1)
e_value_ci <- sqrt(primary_ci_lower * (primary_ci_lower - 1) + 1)

cat("E-value for primary exposure:", round(e_value, 2), "\\n")
cat("E-value for CI lower bound:", round(e_value_ci, 2), "\\n")

`;
  }
  
  private generateRDiagnostics(studyType: string, plan: any): string {
    return `
# ============================================
# Model Diagnostics
# ============================================

# Check for multicollinearity
if (length(plan$covariates) > 1) {
  # Create design matrix
  X <- model.matrix(~ ${plan.covariates.join(' + ')}, data = cohort)[, -1]
  
  # Calculate VIF
  vif_values <- car::vif(lm(${plan.primary_outcome} ~ X, data = cohort))
  print("Variance Inflation Factors:")
  print(vif_values)
}

# Residual plots for Cox model
par(mfrow = c(2, 2))

# Martingale residuals
residuals_mart <- residuals(mv_model, type = "martingale")
plot(cohort$age, residuals_mart, 
     xlab = "Age", ylab = "Martingale residuals",
     main = "Martingale Residuals vs Age")
abline(h = 0, col = "red", lty = 2)

# Deviance residuals
residuals_dev <- residuals(mv_model, type = "deviance")
plot(predict(mv_model), residuals_dev,
     xlab = "Linear predictor", ylab = "Deviance residuals",
     main = "Deviance Residuals vs Linear Predictor")
abline(h = 0, col = "red", lty = 2)

# Schoenfeld residuals test
plot(ph_test)

par(mfrow = c(1, 1))

# Save diagnostic plots
png("output/model_diagnostics.png", width = 12, height = 10, units = "in", res = 300)
par(mfrow = c(2, 2))
plot(ph_test)
dev.off()

`;
  }
  
  private generateRReporting(): string {
    return `
# ============================================
# Generate Report
# ============================================

# Create results summary
results_summary <- list(
  n_total = nrow(cohort),
  n_events = sum(cohort$${plan.primary_outcome}),
  median_followup = median(cohort$followup_time),
  primary_results = mv_results %>% filter(term == "${plan.exposures[0]}"),
  table1 = table1_df
)

# Save results
saveRDS(results_summary, "output/analysis_results.rds")

# Generate automated report using RMarkdown
rmarkdown::render(
  "templates/analysis_report.Rmd",
  output_file = paste0("output/analysis_report_", Sys.Date(), ".html"),
  params = list(
    results = results_summary,
    study_type = "${studyType}",
    data_model = "${dataModel}"
  )
)

# Session info for reproducibility
sink("output/session_info.txt")
sessionInfo()
sink()

cat("\\n✓ Analysis complete! Results saved to output directory.\\n")
`;
  }
  
  private async generatePythonCode(
    studyType: string, 
    plan: any, 
    dataModel: string,
    components: string[]
  ): Promise<string> {
    let code = `# Health Services Research Analysis
# Study Type: ${studyType}
# Data Model: ${dataModel}
# Generated by Healthcare Research MCP Server
# Date: ${new Date().toISOString()}

${(plan as any).strobeCompliance ? this.generateSTROBEComplianceSection(plan, 'Python') : ''}
# Import required libraries
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
${plan.statistical_methods.includes('cox_regression') ? 'from lifelines import CoxPHFitter, KaplanMeierFitter' : ''}
${plan.statistical_methods.includes('propensity_score_matching') ? 'from pymatch import Matcher' : ''}
${plan.statistical_methods.includes('machine_learning') ? 'from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.metrics import roc_auc_score, classification_report' : ''}
${plan.missing_data_approach === 'multiple_imputation' ? 'from sklearn.impute import IterativeImputer' : ''}

# Set display options
pd.set_option('display.max_columns', None)
pd.set_option('display.float_format', '{:.3f}'.format)
sns.set_style("whitegrid")
plt.rcParams['figure.dpi'] = 300
plt.rcParams['font.family'] = 'Helvetica'

`;

    if (components.includes('data_import')) {
      code += `
# ============================================
# Data Import
# ============================================

# Load cohort data
cohort = pd.read_csv('data/analysis_cohort.csv')
print(f"Loaded {len(cohort)} patients")
print(cohort.info())

`;
    }

    if (components.includes('data_cleaning')) {
      code += `
# ============================================
# Data Cleaning
# ============================================

# Check for duplicates
duplicates = cohort.duplicated(subset=['patient_id'])
print(f"Number of duplicates: {duplicates.sum()}")

# Remove duplicates
cohort = cohort.drop_duplicates(subset=['patient_id'])

# Create derived variables
cohort['age_cat'] = pd.cut(
    cohort['age'], 
    bins=[0, 50, 65, 80, float('inf')],
    labels=['<50', '50-64', '65-79', '≥80'],
    right=False
)

# Handle missing data
missing_summary = cohort.isnull().sum() / len(cohort) * 100
missing_summary = missing_summary[missing_summary > 0].sort_values(ascending=False)
print("\\nMissing data summary:")
print(missing_summary)

`;
    }

    if (components.includes('table1')) {
      code += `
# ============================================
# Table 1: Baseline Characteristics
# ============================================

from tableone import TableOne

# Define columns for Table 1
columns = [${plan.covariates.map(v => `'${v}'`).join(', ')}, '${plan.primary_outcome}']
categorical = [col for col in columns if cohort[col].dtype == 'object']

# Create Table 1
table1 = TableOne(
    cohort, 
    columns=columns,
    categorical=categorical,
    groupby='${plan.exposures[0]}',
    pval=True,
    smd=True
)

print(table1.tabulate(tablefmt="grid"))
table1.to_csv('output/table1_baseline_characteristics.csv')

`;
    }

    if (components.includes('main_analysis') && plan.statistical_methods.includes('cox_regression')) {
      code += `
# ============================================
# Cox Proportional Hazards Analysis
# ============================================

from lifelines import CoxPHFitter

# Prepare data for survival analysis
survival_data = cohort[[
    'followup_time', 
    '${plan.primary_outcome}',
    '${plan.exposures[0]}',
    ${plan.covariates.map(v => `'${v}'`).join(', ')}
]].dropna()

# Fit Cox model
cph = CoxPHFitter()
cph.fit(
    survival_data,
    duration_col='followup_time',
    event_col='${plan.primary_outcome}'
)

# Display results
print(cph.summary)

# Check proportional hazards assumption
cph.check_assumptions(survival_data)

# Save results
results = cph.summary
results['HR'] = np.exp(results['coef'])
results['HR_CI_lower'] = np.exp(results['coef'] - 1.96 * results['se(coef)'])
results['HR_CI_upper'] = np.exp(results['coef'] + 1.96 * results['se(coef)'])
results.to_csv('output/cox_regression_results.csv')

`;
    }

    return code;
  }
  
  private async generateSASCode(
    studyType: string, 
    plan: any, 
    dataModel: string,
    components: string[]
  ): Promise<string> {
    return `/* Health Services Research Analysis */
/* Study Type: ${studyType} */
/* Data Model: ${dataModel} */
/* Generated by Healthcare Research MCP Server */
${(plan as any).strobeCompliance ? this.generateSTROBEComplianceSection(plan, 'SAS') : ''}

/* Import data */
PROC IMPORT OUT=cohort 
    DATAFILE="data/analysis_cohort.csv" 
    DBMS=CSV REPLACE;
    GETNAMES=YES;
RUN;

/* Table 1 */
PROC FREQ DATA=cohort;
    TABLES ${plan.exposures[0]} * (${plan.covariates.join(' ')}) / CHISQ;
RUN;

PROC MEANS DATA=cohort N MEAN STD MIN MAX;
    CLASS ${plan.exposures[0]};
    VAR age ${plan.covariates.filter(v => !v.includes('cat')).join(' ')};
RUN;

/* Cox Regression */
PROC PHREG DATA=cohort;
    MODEL followup_time*${plan.primary_outcome}(0) = 
        ${plan.exposures[0]} ${plan.covariates.join(' ')} / RL;
RUN;
`;
  }
  
  private async generateStataCode(
    studyType: string, 
    plan: any, 
    dataModel: string,
    components: string[]
  ): Promise<string> {
    return `/* Health Services Research Analysis */
/* Study Type: ${studyType} */
/* Data Model: ${dataModel} */
${(plan as any).strobeCompliance ? this.generateSTROBEComplianceSection(plan, 'Stata') : ''}
// Import data
import delimited "data/analysis_cohort.csv", clear

// Set survival data
stset followup_time, failure(${plan.primary_outcome})

// Table 1
table1_mc, by(${plan.exposures[0]}) vars(${plan.covariates.join(' ')})

// Cox regression
stcox ${plan.exposures[0]} ${plan.covariates.join(' ')}, efron
estat phtest, detail

// Generate survival curves
sts graph, by(${plan.exposures[0]}) risktable
`;
  }
  
  private createAnalysisWorkflow(studyType: string, plan: any, components: string[]): any[] {
    const workflow = [];
    
    if (components.includes('data_import')) {
      workflow.push({
        step: 'Data Import',
        description: 'Load cohort data from database or files',
        outputs: ['Raw dataset']
      });
    }
    
    if (components.includes('data_cleaning')) {
      workflow.push({
        step: 'Data Cleaning',
        description: 'Handle duplicates, missing data, create derived variables',
        outputs: ['Clean dataset', 'Missing data report']
      });
    }
    
    if (components.includes('table1')) {
      workflow.push({
        step: 'Descriptive Statistics',
        description: 'Generate baseline characteristics table',
        outputs: ['Table 1']
      });
    }
    
    if (components.includes('main_analysis')) {
      workflow.push({
        step: 'Primary Analysis',
        description: `Perform ${plan.statistical_methods.join(', ')}`,
        outputs: ['Effect estimates', 'P-values', 'Confidence intervals']
      });
    }
    
    if (components.includes('figures')) {
      workflow.push({
        step: 'Generate Figures',
        description: 'Create publication-ready figures',
        outputs: ['Kaplan-Meier curves', 'Forest plots', 'Other visualizations']
      });
    }
    
    return workflow;
  }
  
  private generateDocumentation(studyType: string, plan: any): string {
    return `# Analysis Documentation

## Study Design
- Type: ${studyType}
- Primary Outcome: ${plan.primary_outcome}
- Primary Exposure: ${plan.exposures[0]}

## Statistical Methods
${plan.statistical_methods.map(method => `- ${method}`).join('\n')}

## Covariates Adjusted For
${plan.covariates.map(cov => `- ${cov}`).join('\n')}

## Missing Data Approach
- Method: ${plan.missing_data_approach}

## Sensitivity Analyses
- Complete case analysis
- Different follow-up windows
- E-value for unmeasured confounding
`;
  }
  
  private getRequiredPackages(format: string, plan: any): string[] {
    const packages = {
      R: [
        'tidyverse', 'survival', 'tableone', 'broom', 'survminer',
        ...(plan.statistical_methods.includes('propensity_score_matching') ? ['MatchIt', 'cobalt'] : []),
        ...(plan.statistical_methods.includes('machine_learning') ? ['caret', 'randomForest'] : [])
      ],
      Python: [
        'pandas', 'numpy', 'matplotlib', 'seaborn', 'scipy', 'tableone',
        ...(plan.statistical_methods.includes('cox_regression') ? ['lifelines'] : []),
        ...(plan.statistical_methods.includes('machine_learning') ? ['scikit-learn'] : [])
      ],
      SAS: ['BASE', 'STAT', 'GRAPH'],
      Stata: ['st', 'table1']
    };
    
    return packages[format] || [];
  }
  
  private getValidationSteps(studyType: string, plan: any): string[] {
    return [
      'Verify cohort size and characteristics',
      'Check variable distributions',
      'Validate model assumptions',
      'Confirm proportional hazards (if applicable)',
      'Review missing data patterns',
      'Validate results against clinical expectations'
    ];
  }
  
  private getExecutionNotes(format: string): string {
    const notes = {
      R: 'Run in RStudio or R console. Ensure all packages are installed.',
      Python: 'Run in Jupyter notebook or Python environment with required packages.',
      SAS: 'Run in SAS Studio or SAS environment.',
      Stata: 'Run in Stata console with appropriate version.'
    };
    
    return notes[format] || 'Follow standard execution procedures for the selected language.';
  }
  
  private getExpectedOutputFiles(components: string[]): string[] {
    const files = [];
    
    if (components.includes('table1')) {
      files.push('table1_baseline_characteristics.csv');
    }
    if (components.includes('main_analysis')) {
      files.push('main_analysis_results.csv', 'model_diagnostics.png');
    }
    if (components.includes('figures')) {
      files.push('figure1_kaplan_meier.png', 'figure2_forest_plot.png');
    }
    
    return files;
  }
}