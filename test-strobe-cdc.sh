#!/bin/bash

# Test Enhanced MCP Server with STROBE and CDC features

echo "Building enhanced server..."
npm run build:enhanced

echo -e "\n==== Testing Enhanced MCP Server ====\n"

# Test 1: Natural language query with CDC sepsis
echo "Test 1: Natural language query with CDC sepsis criteria"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"natural_language_query","arguments":{"query":"Using the synthetic dataset, define sepsis using CDC criteria, provide descriptive statistics, and analyze if vancomycin reduces 30-day mortality in sepsis patients","use_cdc_sepsis":true}},"id":1}' | node dist/server/index-enhanced.js

echo -e "\n----------------------------------------\n"

# Test 2: Generate STROBE analysis plan
echo "Test 2: Generate STROBE-compliant analysis plan"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"generate_strobe_analysis","arguments":{"research_question":"Does early vancomycin administration reduce mortality in patients with sepsis?","study_type":"cohort"}},"id":2}' | node dist/server/index-enhanced.js

echo -e "\n----------------------------------------\n"

# Test 3: Look up sepsis with guidelines
echo "Test 3: Look up sepsis knowledge with CDC guidelines"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"lookup_medical_knowledge","arguments":{"entity":"sepsis","include_guidelines":true}},"id":3}' | node dist/server/index-enhanced.js

echo -e "\n----------------------------------------\n"

# Test 4: Analyze dataset with CDC sepsis criteria
echo "Test 4: Analyze dataset applying CDC sepsis criteria"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"analyze_synthetic_dataset","arguments":{"analysis_type":"descriptive","filters":{"condition":"sepsis"},"apply_cdc_sepsis":true}},"id":4}' | node dist/server/index-enhanced.js

echo -e "\n----------------------------------------\n"

# Test 5: Generate research code with STROBE comments
echo "Test 5: Generate R code with STROBE checklist comments"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"generate_research_code","arguments":{"analysis_spec":{"entities":[{"text":"sepsis","type":"condition"}],"outcomes":["mortality"]},"language":"R","include_strobe_comments":true}},"id":5}' | node dist/server/index-enhanced.js

echo -e "\n==== Test Complete ====\n"