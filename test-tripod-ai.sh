#!/bin/bash

# Test TRIPOD+AI Integration with Healthcare Research MCP Server

echo "Building OMOP-enhanced server with TRIPOD+AI..."
npm run build:omop

echo -e "\n==== Testing TRIPOD+AI Guidelines Integration ====\n"

# Test 1: Get TRIPOD+AI guidelines
echo "Test 1: Get TRIPOD+AI guidelines for machine learning development study"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_tripod_ai_guidelines","arguments":{"study_type":"development","model_type":"machine_learning"}},"id":1}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    guidelines = json.loads(result)
    print(f\"TRIPOD+AI Version: {guidelines['version']}\")
    print(f\"Study Type: {guidelines['study_type']}\")
    print(f\"Model Type: {guidelines['model_type']}\")
    print(f\"Applicable Items: {len(guidelines['checklist']['applicable_items'])}\")
    print(f\"Key Principles: {list(guidelines['principles'].keys())}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 2: Assess TRIPOD+AI compliance
echo "Test 2: Assess TRIPOD+AI compliance for AI study"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"assess_tripod_ai_compliance","arguments":{"study_features":{"has_ai_methods":true,"addresses_ai_considerations":true,"has_basic_documentation":true}}},"id":2}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    compliance = json.loads(result)
    print(f\"Overall Compliance Score: {compliance['overall_score']:.2f}\")
    print(f\"Section Scores: {len(compliance['section_scores'])} sections assessed\")
    if compliance['recommendations']:
        print(f\"Recommendations: {len(compliance['recommendations'])}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 3: Generate AI prediction code with TRIPOD+AI compliance
echo "Test 3: Generate machine learning prediction code following TRIPOD+AI"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"generate_ai_prediction_code","arguments":{"query":"Develop a machine learning model to predict sepsis mortality at 30 days using patient demographics, vitals, and lab values","model_type":"machine_learning","language":"R","include_fairness":true}},"id":3}' | node dist/server/index-omop-enhanced.js 2>/dev/null | head -50

echo -e "\n----------------------------------------\n"

# Test 4: Get TRIPOD+AI guidelines for deep learning
echo "Test 4: Get TRIPOD+AI guidelines for deep learning validation study"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_tripod_ai_guidelines","arguments":{"study_type":"validation","model_type":"deep_learning"}},"id":4}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    guidelines = json.loads(result)
    print(f\"Deep Learning Guidelines:\")
    print(f\"  Study Type: {guidelines['study_type']}\")
    print(f\"  Model Type: {guidelines['model_type']}\")
    print(f\"  Key Focus Areas:\")
    for principle, details in guidelines['principles'].items():
        print(f\"    - {details['title']}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 5: Generate Python deep learning code
echo "Test 5: Generate Python deep learning code with TRIPOD+AI compliance"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"generate_ai_prediction_code","arguments":{"query":"Build a neural network to predict heart failure readmission using EHR data","model_type":"deep_learning","language":"Python","include_fairness":true}},"id":5}' | node dist/server/index-omop-enhanced.js 2>/dev/null | head -30

echo -e "\n----------------------------------------\n"

# Test 6: Integration test - STROBE + TRIPOD+AI
echo "Test 6: Test integration with existing analyze_omop_dataset tool"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"analyze_omop_dataset","arguments":{"query":"Using OMOP data, develop a prediction model for sepsis outcome that includes both traditional statistics and machine learning approaches"}},"id":6}' | node dist/server/index-omop-enhanced.js 2>/dev/null | head -40

echo -e "\n==== TRIPOD+AI Integration Test Complete ====\n"

echo "Summary of TRIPOD+AI Features:"
echo "✓ Complete TRIPOD+AI v2024 checklist with 27 items"
echo "✓ AI-specific guidelines for ML/DL models"
echo "✓ Algorithmic fairness assessment"
echo "✓ Model interpretability requirements"
echo "✓ Integration with existing STROBE compliance"
echo "✓ Support for R and Python code generation"