#!/bin/bash

# Test OMOP-Enhanced MCP Server with Medical Ontologies

echo "Building OMOP-enhanced server..."
npm run build:omop

echo -e "\n==== Testing OMOP-Enhanced MCP Server ====\n"

# Test 1: Get OMOP schema
echo "Test 1: Get complete OMOP CDM v5.4 schema"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_omop_schema","arguments":{"table_name":"all","include_relationships":true}},"id":1}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    schema = json.loads(result)
    print(f\"OMOP CDM v{schema['version']} loaded successfully\")
    print(f\"Total tables: {schema['total_tables']}\")
    print(f\"Sample tables: {', '.join([t['name'] for t in schema['tables'][:5]])}...\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 2: Get specific table schema
echo "Test 2: Get person table schema"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_omop_schema","arguments":{"table_name":"person"}},"id":2}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    schema = json.loads(result)
    print(f\"Table: {schema['table']}\")
    print(f\"Description: {schema['description']}\")
    print(f\"Columns: {len(schema['columns'])}\")
    required = [col for col, info in schema['columns'].items() if info.get('required')]
    print(f\"Required columns: {', '.join(required[:5])}...\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 3: Validate OMOP structure
echo "Test 3: Validate OMOP data structure"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"validate_omop_data","arguments":{"available_tables":["person","visit_occurrence","condition_occurrence","drug_exposure","measurement","concept","concept_relationship"]}},"id":3}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    validation = json.loads(result)
    print(f\"Validation result: {'VALID' if validation['isValid'] else 'INVALID'}\")
    if validation['warnings']:
        print(f\"Warnings: {len(validation['warnings'])}\")
    if validation['recommendations']:
        print(f\"Recommendations: {len(validation['recommendations'])}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 4: Search medical codes
echo "Test 4: Search for sepsis codes across ontologies"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"search_medical_codes","arguments":{"keyword":"sepsis","code_systems":["ICD10","SNOMED"],"limit":5}},"id":4}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    search = json.loads(result)
    print(f\"Search keyword: {search['search_keyword']}\")
    print(f\"Total results: {search['total_results']}\")
    for system, results in search['results'].items():
        print(f\"{system}: {len(results)} results\")
        if results:
            print(f\"  Sample: {results[0]['code']} - {results[0].get('description', results[0].get('name'))}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 5: Get condition codes
echo "Test 5: Get all codes for sepsis condition"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_condition_codes","arguments":{"condition":"sepsis","include_related":true}},"id":5}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    codes = json.loads(result)
    print(f\"Condition: {codes['condition']}\")
    print(f\"ICD-10 codes: {len(codes['icd10_codes'])}\")
    print(f\"  Sample: {', '.join(codes['icd10_codes'][:3])}...\")
    print(f\"SNOMED codes: {len(codes['snomed_codes'])}\")
    if codes.get('related_conditions'):
        print(f\"Related conditions: {', '.join(codes['related_conditions'])}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 6: Get medication codes
echo "Test 6: Get vancomycin medication codes"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_medication_codes","arguments":{"medication":"vancomycin","include_formulations":true}},"id":6}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    meds = json.loads(result)
    print(f\"Medication: {meds['medication']}\")
    print(f\"RxNorm codes: {len(meds['rxnorm_codes'])}\")
    print(f\"SNOMED codes: {len(meds['snomed_codes'])}\")
    if meds.get('formulations'):
        print(f\"Formulations: {len(meds['formulations'])}\")
        print(f\"  Sample: {meds['formulations'][0]['code']} - {meds['formulations'][0]['name']}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 7: Get lab codes
echo "Test 7: Get creatinine lab test codes"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"get_lab_codes","arguments":{"lab_test":"creatinine","include_methods":true}},"id":7}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    labs = json.loads(result)
    print(f\"Lab test: {labs['lab_test']}\")
    print(f\"LOINC codes: {len(labs['loinc_codes'])}\")
    print(f\"SNOMED codes: {len(labs['snomed_codes'])}\")
    if labs.get('measurement_methods'):
        print(f\"Measurement methods: {len(labs['measurement_methods'])}\")
        print(f\"  Sample: {labs['measurement_methods'][0]['code']} - {labs['measurement_methods'][0]['name']}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n----------------------------------------\n"

# Test 8: Generate OMOP cohort
echo "Test 8: Generate OMOP cohort definition for sepsis"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"generate_omop_cohort","arguments":{"condition":"sepsis","inclusion_criteria":["Age >= 18"],"use_standard_concepts":true}},"id":8}' | node dist/server/index-omop-enhanced.js 2>/dev/null | head -30

echo -e "\n----------------------------------------\n"

# Test 9: Lookup specific code
echo "Test 9: Lookup specific ICD-10 code"
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"lookup_medical_code","arguments":{"code":"A41.9","code_system":"ICD10"}},"id":9}' | node dist/server/index-omop-enhanced.js 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'result' in data:
    result = data['result']['content'][0]['text']
    lookup = json.loads(result)
    print(f\"Code: {lookup['code']}\")
    print(f\"Description: {lookup['description']}\")
    print(f\"Code system: {lookup['code_system']}\")
    if lookup.get('omop_mapping'):
        print(f\"OMOP vocabulary: {lookup['omop_mapping']['vocabulary_id']}\")
else:
    print('Error:', data.get('error', {}).get('message', 'Unknown error'))
"

echo -e "\n==== Test Complete ====\n"