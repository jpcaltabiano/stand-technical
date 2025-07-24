const axios = require('axios');

const API_URL = 'http://localhost:3001';

async function getEngineVersions() {
  const res = await axios.get(`${API_URL}/engine-versions`);
  return res.data;
}

async function getRules(engine_version = null) {
  const url = engine_version ? `${API_URL}/rules?engine_version=${engine_version}` : `${API_URL}/rules`;
  const res = await axios.get(url);
  return res.data;
}

async function getMitigations(ruleId, engine_version = null) {
  const url = engine_version ? `${API_URL}/rules/${ruleId}/mitigations?engine_version=${engine_version}` : `${API_URL}/rules/${ruleId}/mitigations`;
  const res = await axios.get(url);
  return res.data;
}

async function addOrUpdateRule(rule) {
  const res = await axios.post(`${API_URL}/rules`, rule);
  return res.data;
}

async function deleteRule(ruleId) {
  const res = await axios.delete(`${API_URL}/rules/${ruleId}`);
  return res.data;
}

async function testEvaluate(observation, expectedVulnIds, expectedMitigations = {}, expectedStatuses = {}, expectedMissingFields = {}, engine_version = null) {
  const body = engine_version ? { observation, engine_version } : { observation };
  const res = await axios.post(`${API_URL}/evaluate`, body);
  const vulns = res.data.vulnerabilities;
  const triggered = vulns.map(v => v.id).sort();
  const pass = JSON.stringify(triggered) === JSON.stringify(expectedVulnIds.sort());
  console.log(`\n/evaluate (engine_version=${engine_version || res.data.engine_version}): Expected: ${JSON.stringify(expectedVulnIds)}, Got: ${JSON.stringify(triggered)} => ${pass ? 'PASS' : 'FAIL'}`);
  // Check mitigations if provided
  if (Object.keys(expectedMitigations).length > 0) {
    for (const [vulnId, mitDescs] of Object.entries(expectedMitigations)) {
      const vuln = vulns.find(v => v.id === vulnId);
      const gotDescs = (vuln?.mitigations || []).map(m => m.description).sort();
      const expDescs = mitDescs.sort();
      const mitPass = JSON.stringify(gotDescs) === JSON.stringify(expDescs);
      console.log(`  Mitigations for ${vulnId}: Expected: ${JSON.stringify(expDescs)}, Got: ${JSON.stringify(gotDescs)} => ${mitPass ? 'PASS' : 'FAIL'}`);
    }
  }
  // Check statuses if provided
  if (expectedStatuses && Object.keys(expectedStatuses).length > 0) {
    for (const [vulnId, expStatus] of Object.entries(expectedStatuses)) {
      const vuln = vulns.find(v => v.id === vulnId);
      const gotStatus = vuln?.status;
      const statusPass = gotStatus === expStatus;
      console.log(`  Status for ${vulnId}: Expected: ${expStatus}, Got: ${gotStatus} => ${statusPass ? 'PASS' : 'FAIL'}`);
    }
  }
  // Check missing_fields if provided
  if (expectedMissingFields && Object.keys(expectedMissingFields).length > 0) {
    for (const [vulnId, expMissing] of Object.entries(expectedMissingFields)) {
      const vuln = vulns.find(v => v.id === vulnId);
      const gotMissing = vuln?.missing_fields || [];
      const missingPass = expMissing.every(f => gotMissing.includes(f));
      console.log(`  Missing fields for ${vulnId}: Expected to include: ${JSON.stringify(expMissing)}, Got: ${JSON.stringify(gotMissing)} => ${missingPass ? 'PASS' : 'FAIL'}`);
    }
  }
}

async function testMitigations(ruleId, expectedMitigations) {
  const res = await axios.get(`${API_URL}/rules/${ruleId}/mitigations`);
  const gotDescs = (res.data.mitigations || []).map(m => m.description).sort();
  const expDescs = expectedMitigations.sort();
  const pass = JSON.stringify(gotDescs) === JSON.stringify(expDescs);
  console.log(`\n/rules/${ruleId}/mitigations: Expected: ${JSON.stringify(expDescs)}, Got: ${JSON.stringify(gotDescs)} => ${pass ? 'PASS' : 'FAIL'}`);
}

async function testHumanReadable(ruleId) {
  const res = await axios.get(`${API_URL}/rules/${ruleId}/human-readable`);
  const hasRule = !!res.data.rule_json;
  const hasPlaceholder = res.data.human_readable && res.data.human_readable.includes('TODO');
  const pass = hasRule && hasPlaceholder;
  console.log(`\n/rules/${ruleId}/human-readable: Returns rule_json and placeholder => ${pass ? 'PASS' : 'FAIL'}`);
}

async function runAllTests() {
  // 1. List all engine versions
  const versionsBefore = await getEngineVersions();
  console.log('\nEngine versions before any changes:', versionsBefore);

  // 2. Add a new rule (should increase engine version)
  const newRule = {
    id: "test-rule-1",
    name: "Test Rule 1",
    description: "A test rule for versioning.",
    logic: { "equals": [ { "field": "Test Field" }, "foo" ] },
    vulnerability: "Test vulnerability.",
    mitigations: [
      { type: "full", description: "Test full mitigation." }
    ],
    version: 1,
    schema_version: 1
  };
  const addRes = await addOrUpdateRule(newRule);
  console.log('\nAdded new rule, engine version:', addRes.engine_version);
  const versionsAfterAdd = await getEngineVersions();
  console.log('Engine versions after add:', versionsAfterAdd);

  // 3. Update the rule (should increase engine version)
  const updatedRule = { ...newRule, description: "Updated description.", version: 2 };
  const updateRes = await addOrUpdateRule(updatedRule);
  console.log('\nUpdated rule, engine version:', updateRes.engine_version);
  const versionsAfterUpdate = await getEngineVersions();
  console.log('Engine versions after update:', versionsAfterUpdate);

  // 4. Delete the rule (should increase engine version)
  const deleteRes = await deleteRule("test-rule-1");
  console.log('\nDeleted rule, engine version:', deleteRes.engine_version);
  const versionsAfterDelete = await getEngineVersions();
  console.log('Engine versions after delete:', versionsAfterDelete);

  // 5. Evaluate against a specific engine version (use version after add)
  await testEvaluate(
    { "Test Field": "foo" },
    ["test-rule-1"],
    { "test-rule-1": ["Test full mitigation."] },
    { "test-rule-1": "confirmed" },
    {},
    addRes.engine_version
  );

  // 6. Get all rules for a specific engine version
  const rulesAtAdd = await getRules(addRes.engine_version);
  console.log('\nRules at engine version', addRes.engine_version, ':', rulesAtAdd.rules.map(r => r.id));

  // 7. Get mitigations for a rule at a specific engine version
  const mitAtAdd = await getMitigations("test-rule-1", addRes.engine_version);
  console.log('\nMitigations for test-rule-1 at engine version', addRes.engine_version, ':', mitAtAdd.mitigations.map(m => m.description));

  // 8. Evaluate against latest version (should not find test-rule-1)
  await testEvaluate(
    { "Test Field": "foo" },
    [],
    {},
    {},
    {},
    deleteRes.engine_version
  );

  // 9. List all engine versions at the end
  const versionsFinal = await getEngineVersions();
  console.log('\nEngine versions at end:', versionsFinal);

  // 10. Business logic tests (roof/windows/attic-vent) using engine version 1
  const baseVersion = 1;
  // Roof: No roof or wildfire risk fields present
  await testEvaluate(
    {},
    [],
    {},
    {},
    {},
    baseVersion
  );
  // Roof: Class B, missing wildfire risk
  await testEvaluate(
    { "Roof Type": "Class B" },
    ["roof-class-and-maintenance"],
    { "roof-class-and-maintenance": [
      "Replace roof with Class A assembly, ensure all gaps are sealed, and roof is well maintained.",
      "Seal visible gaps and perform maintenance to improve roof condition. (Only available for Class B roofs in eligible areas)"
    ] },
    { "roof-class-and-maintenance": "potential" },
    { "roof-class-and-maintenance": ["Wildfire Risk Category"] },
    baseVersion
  );
  // Windows: Single pane, shrub too close
  await testEvaluate(
    {
      "Window Type": "Single",
      "Vegetation": [ { "Type": "Shrub", "Distance to Window": 10 } ]
    },
    ["windows-safe-distance"],
    { "windows-safe-distance": [
      "Remove vegetation within safe distance or replace window with tempered glass.",
      "Apply film to windows (reduces required distance by 20%).",
      "Apply flame retardant to shrubs (reduces required distance by 25%).",
      "Prune trees to safe height (reduces required distance by 50%)."
    ] },
    {},
    {},
    baseVersion
  );
  // Attic vent mitigations
  const atticMit = await getMitigations("attic-vent-has-screens", baseVersion);
  console.log('\nMitigations for attic-vent-has-screens at engine version', baseVersion, ':', atticMit.mitigations.map(m => m.description));

  // 11. Test adding a malformed rule (should fail schema validation)
  const malformedRule = {
    id: "malformed-rule",
    // name is missing
    description: 123, // should be string
    logic: {}, // missing required logic structure
    vulnerability: 42, // should be string
    mitigations: "not-an-array", // should be array
    version: "one", // should be integer
    schema_version: 1
  };
  try {
    await addOrUpdateRule(malformedRule);
    console.log('\nMalformed rule test: FAIL (should have thrown)');
  } catch (err) {
    if (err.response && err.response.status === 400) {
      console.log('\nMalformed rule test: PASS (validation error as expected)');
      console.log('  Error details:', err.response.data.details);
    } else {
      console.log('\nMalformed rule test: FAIL (unexpected error)', err);
    }
  }

  // 12. Test applied bridge mitigations by ID
  await testEvaluate(
    {
      "Roof Type": "Class B",
      "applied_bridge_mitigations": ["roof-bridge-1"]
    },
    ["roof-class-and-maintenance"],
    {
      "roof-class-and-maintenance": [
        "Replace roof with Class A assembly, ensure all gaps are sealed, and roof is well maintained.",
        "Seal visible gaps and perform maintenance to improve roof condition. (Only available for Class B roofs in eligible areas)"
      ]
    },
    { "roof-class-and-maintenance": "confirmed" },
    {},
    baseVersion
  );
}

runAllTests().catch(e => {
  console.error('Test run failed:', e);
}).finally(() => {
  // Cleanup: delete all rules_v*.json files except rules_v1.json
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname);
  fs.readdirSync(dir).forEach(file => {
    if (/^rules_v\d+\.json$/.test(file) && file !== 'rules_v1.json') {
      try {
        fs.unlinkSync(path.join(dir, file));
        console.log('Deleted test rules file:', file);
      } catch (err) {
        console.error('Failed to delete file:', file, err);
      }
    }
  });
});