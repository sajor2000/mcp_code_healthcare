#!/bin/bash

# Test Complete MCP Server with Enhanced Code Generation

echo "Building complete server..."
npm run build:complete

echo -e "\n==== Testing Complete MCP Server ====\n"

# Test 1: Parse complex research question
echo "Test 1: Parse complex research question"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"parse_research_question","arguments":{"query":"Find all patients over age 40 who have been diagnosed with sepsis using CDC criteria. Analyze demographics, mortality rates, length of stay, and medication use including vancomycin. Create visualizations showing age distribution and mortality by age group.","dataset_format":"clif"}},"id":1}' | node dist/server/index-complete.js 2>/dev/null | python3 -m json.tool

echo -e "\n----------------------------------------\n"

# Test 2: Validate analysis feasibility
echo "Test 2: Validate analysis with available data"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"validate_analysis","arguments":{"analysis_spec":{"query":"Analyze sepsis mortality","condition":"sepsis","analyses":["mortality","medications"],"cohort_criteria":{"inclusion":["Age > 40"]}},"dataset_info":{"format":"clif","n_patients":500,"available_tables":["patient","hospitalization","medication_admin_continuous"]}}},"id":2}' | node dist/server/index-complete.js 2>/dev/null | python3 -m json.tool

echo -e "\n----------------------------------------\n"

# Test 3: Generate complete validated code
echo "Test 3: Generate complete R code with STROBE and CDC sepsis"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"generate_complete_code","arguments":{"query":"Using the CLIF dataset, identify patients with sepsis using CDC criteria. Compare 30-day mortality between patients who received vancomycin within 24 hours vs those who did not. Adjust for age, sex, and severity scores. Create Table One and mortality plots.","dataset_info":{"format":"clif","n_patients":500,"n_encounters":654},"language":"R","include_strobe_comments":true,"include_cdc_sepsis":true}},"id":3}' | node dist/server/index-complete.js 2>/dev/null

echo -e "\n----------------------------------------\n"

# Test 4: Get CLIF table schemas
echo "Test 4: Get CLIF table schemas"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"get_table_schemas","arguments":{"format":"clif"}},"id":4}' | node dist/server/index-complete.js 2>/dev/null | python3 -m json.tool

echo -e "\n----------------------------------------\n"

# Test 5: Get sepsis knowledge with CDC
echo "Test 5: Get sepsis condition knowledge"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"get_condition_knowledge","arguments":{"condition":"sepsis","include_cdc_definition":true}},"id":5}' | node dist/server/index-complete.js 2>/dev/null | python3 -m json.tool | head -50

echo -e "\n----------------------------------------\n"

# Test 6: Generate STROBE checklist
echo "Test 6: Generate customized STROBE checklist"
echo '{"jsonrpc":"2.0","method":"call_tool","params":{"name":"generate_strobe_checklist","arguments":{"research_question":"Does early vancomycin administration reduce mortality in sepsis patients?","study_type":"cohort"}},"id":6}' | node dist/server/index-complete.js 2>/dev/null | python3 -m json.tool

echo -e "\n==== Test Complete ====\n"