const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const RULES_DIR = __dirname;
const RULES_FILE_PREFIX = 'rules_v';
const RULES_FILE_SUFFIX = '.json';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const ruleSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'rule.schema.json'), 'utf-8'));
const ajv = new Ajv({ allErrors: true });
const validateRule = ajv.compile(ruleSchema);

function getAllRuleFiles() {
  return fs.readdirSync(RULES_DIR)
    .filter(f => f.startsWith(RULES_FILE_PREFIX) && f.endsWith(RULES_FILE_SUFFIX));
}

function getLatestEngineVersion() {
  const files = getAllRuleFiles();
  const versions = files.map(f => parseInt(f.slice(RULES_FILE_PREFIX.length, -RULES_FILE_SUFFIX.length))).filter(Number.isInteger);
  if (versions.length === 0) return 1;
  return Math.max(...versions);
}

function getRulesFileForVersion(version) {
  return path.join(RULES_DIR, `${RULES_FILE_PREFIX}${version}${RULES_FILE_SUFFIX}`);
}

function readRules(version = null) {
  const v = version || getLatestEngineVersion();
  const file = getRulesFileForVersion(v);
  if (!fs.existsSync(file)) throw new Error(`Rules file for version ${v} not found.`);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeRules(rules, version) {
  const file = getRulesFileForVersion(version);
  fs.writeFileSync(file, JSON.stringify(rules, null, 2));
}

function createNewEngineVersion(newRules) {
  const newVersion = getLatestEngineVersion() + 1;
  const created_at = new Date().toISOString();
  const rulesWithMeta = { created_at, rules: newRules };
  writeRules(rulesWithMeta, newVersion);
  return newVersion;
}

function getRulesAndMeta(version = null) {
  const v = version || getLatestEngineVersion();
  const file = getRulesFileForVersion(v);
  if (!fs.existsSync(file)) throw new Error(`Rules file for version ${v} not found.`);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

app.get('/', (req, res) => {
  res.send('API is running');
});

app.post('/evaluate', (req, res) => {
  try {
    const { observation, engine_version } = req.body;
    console.log('Incoming observation:', JSON.stringify(observation, null, 2));
    if (!observation || typeof observation !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid observation.' });
    }
    // TODO: add validation for observation object, check fields are valid and not empty
    const rulesMeta = getRulesAndMeta(engine_version);
    const rules = rulesMeta.rules;
    const evaluationResult = evaluate(observation, rules, engine_version);
    console.log('Raw vulnerabilities (before mitigation filtering):', JSON.stringify(evaluationResult.vulnerabilities, null, 2));
    console.log('Final vulnerabilities (after mitigation filtering):', JSON.stringify(evaluationResult.vulnerabilities, null, 2));
    res.json({
      vulnerabilities: evaluationResult.vulnerabilities,
      bridge_mitigations_applied: evaluationResult.bridge_mitigations_applied,
      bridge_mitigation_count: evaluationResult.bridge_mitigation_count,
      engine_version: engine_version || getLatestEngineVersion(),
      created_at: rulesMeta.created_at
    });
  } catch (e) {
    console.error('Error in /evaluate:', e);
    res.status(500).json({ error: 'Failed to evaluate observation.' });
  }
});

// GET /rules - list all rules for a version
app.get('/rules', (req, res) => {
  try {
    const version = req.query.engine_version ? parseInt(req.query.engine_version) : null;
    const rulesMeta = getRulesAndMeta(version);
    res.json({ engine_version: version || getLatestEngineVersion(), created_at: rulesMeta.created_at, rules: rulesMeta.rules });
  } catch (e) {
    res.status(500).json({ error: 'Failed to read rules.' });
  }
});

// GET /rules/:id - get rule by id for a version
app.get('/rules/:id', (req, res) => {
  try {
    const version = req.query.engine_version ? parseInt(req.query.engine_version) : null;
    const rulesMeta = getRulesAndMeta(version);
    const rule = rulesMeta.rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found.' });
    res.json(rule);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read rules.' });
  }
});

// POST /rules - add new rule or new version
app.post('/rules', (req, res) => {
  try {
    const newRule = req.body;
    // Validate against rule.schema.json
    const valid = validateRule(newRule);
    if (!valid) {
      return res.status(400).json({ error: 'Rule validation failed', details: validateRule.errors });
    }
    const latestMeta = getRulesAndMeta();
    const rules = latestMeta.rules;
    // If rule with same id exists, treat as new version (replace)
    const idx = rules.findIndex(r => r.id === newRule.id);
    let newRules;
    if (idx !== -1) {
      newRules = [...rules];
      newRules[idx] = newRule;
    } else {
      newRules = [...rules, newRule];
    }
    const newVersion = createNewEngineVersion(newRules);
    res.json({ success: true, rule: newRule, engine_version: newVersion });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save rule.' });
  }
});

// DELETE /rules/:id - delete rule and create new engine version
app.delete('/rules/:id', (req, res) => {
  try {
    const latestMeta = getRulesAndMeta();
    const rules = latestMeta.rules;
    const newRules = rules.filter(r => r.id !== req.params.id);
    if (newRules.length === rules.length) {
      return res.status(404).json({ error: 'Rule not found.' });
    }
    const newVersion = createNewEngineVersion(newRules);
    res.json({ success: true, deleted: req.params.id, engine_version: newVersion });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete rule.' });
  }
});

// GET /rules/:id/mitigations - get all mitigations for a rule for a version
app.get('/rules/:id/mitigations', (req, res) => {
  try {
    const version = req.query.engine_version ? parseInt(req.query.engine_version) : null;
    const rulesMeta = getRulesAndMeta(version);
    const rule = rulesMeta.rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found.' });
    res.json({
      id: rule.id,
      name: rule.name,
      mitigations: rule.mitigations || [],
      engine_version: version || getLatestEngineVersion(),
      created_at: rulesMeta.created_at
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get mitigations.' });
  }
});

// GET /engine-versions - list all engine versions and their creation times
app.get('/engine-versions', (req, res) => {
  try {
    const files = getAllRuleFiles();
    const versions = files.map(f => parseInt(f.slice(RULES_FILE_PREFIX.length, -RULES_FILE_SUFFIX.length))).filter(Number.isInteger);
    const result = versions.map(v => {
      const meta = getRulesAndMeta(v);
      return { engine_version: v, created_at: meta.created_at };
    });
    res.json(result.sort((a, b) => a.engine_version - b.engine_version));
  } catch (e) {
    res.status(500).json({ error: 'Failed to list engine versions.' });
  }
});

// Helper: Render logic node to human-readable string (simple, covers common cases)
function renderLogic(node) {
  if (!node || typeof node !== 'object') return String(node);
  if (node.and) return node.and.map(renderLogic).join(' AND ');
  if (node.or) return node.or.map(renderLogic).join(' OR ');
  if (node.not) return `NOT (${renderLogic(node.not)})`;
  if (node.if) return `IF (${renderLogic(node.if.condition)}) THEN (${renderLogic(node.if.then)}) ELSE (${renderLogic(node.if.else)})`;
  if (node.equals) return `${renderLogic(node.equals[0])} == ${renderLogic(node.equals[1])}`;
  if (node.greater_than) return `${renderLogic(node.greater_than[0])} > ${renderLogic(node.greater_than[1])}`;
  if (node.less_than) return `${renderLogic(node.less_than[0])} < ${renderLogic(node.less_than[1])}`;
  if (node.in) return `${renderLogic(node.in[0])} in [${node.in[1].join(', ')}]`;
  if (node.foreach) return `For each item in ${node.foreach.array_field}${node.foreach.where ? ` where (${renderLogic(node.foreach.where)})` : ''}, must satisfy (${renderLogic(node.foreach.satisfies)})`;
  if (node.field) return `field '${node.field}'`;
  if (node.value !== undefined) return JSON.stringify(node.value);
  if (node.calculate) {
    const { op, args } = node.calculate;
    return `(${args.map(renderLogic).join(` ${op} `)})`;
  }
  return '[complex logic]';
}

function renderMitigations(mitigations) {
  if (!Array.isArray(mitigations)) return '';
  return mitigations.map(mit => `- [${mit.type.toUpperCase()}] ${mit.description}`).join('\n');
}

// GET /rules/:id/human-readable - get a human-readable version of a rule
app.get('/rules/:id/human-readable', async (req, res) => {
  try {
    const version = req.query.engine_version ? parseInt(req.query.engine_version) : null;
    const rulesMeta = getRulesAndMeta(version);
    const rule = rulesMeta.rules.find(r => r.id === req.params.id);
    if (!rule) return res.status(404).json({ error: 'Rule not found.' });
    const humanReadable = `Rule: ${rule.name}\n\nDescription: ${rule.description}\n\nLogic: ${renderLogic(rule.logic)}\n\nMitigations:\n${renderMitigations(rule.mitigations)}`;
    res.json({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      human_readable: humanReadable,
      rule_json: rule
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get human-readable rule.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});


//observation: a json object containing observations for a property. does not need to be complete
//rules: a list of the rules to evalue the property again. can be all rules or a subset of them
//engine_version: the version of the engine to evalue against

// Helper: Evaluate a logic node against an observation
function evalLogic(node, observation) {
  if (!node || typeof node !== 'object') return node;
  if (node.and) {
    return node.and.every(child => evalLogic(child, observation));
  }
  if (node.or) {
    return node.or.some(child => evalLogic(child, observation));
  }
  if (node.not) {
    return !evalLogic(node.not, observation);
  }
  if (node.if) {
    return evalLogic(node.if.condition, observation)
      ? evalLogic(node.if.then, observation)
      : evalLogic(node.if.else, observation);
  }
  if (node.equals) {
    const [a, b] = node.equals;
    return resolveValue(a, observation) === resolveValue(b, observation);
  }
  if (node.greater_than) {
    const [a, b] = node.greater_than;
    return resolveValue(a, observation) > resolveValue(b, observation);
  }
  if (node.less_than) {
    const [a, b] = node.less_than;
    return resolveValue(a, observation) < resolveValue(b, observation);
  }
  if (node.in) {
    const [a, arr] = node.in;
    return arr.includes(resolveValue(a, observation));
  }
  if (node.foreach) {
    const arr = observation[node.foreach.array_field] || [];
    return arr.some(item => {
      // Optionally filter with 'where'
      if (node.foreach.where && !evalLogic(node.foreach.where, { ...observation, ...item })) {
        return false;
      }
      return evalLogic(node.foreach.satisfies, { ...observation, ...item });
    });
  }
  if (node.calculate) {
    const { op, args } = node.calculate;
    const vals = args.map(arg => resolveValue(arg, observation));
    switch (op) {
      case 'add': return vals.reduce((a, b) => a + b, 0);
      case 'subtract': return vals.slice(1).reduce((a, b) => a - b, vals[0]);
      case 'multiply': return vals.reduce((a, b) => a * b, 1);
      case 'divide': return vals.slice(1).reduce((a, b) => a / b, vals[0]);
      default: throw new Error('Unknown op: ' + op);
    }
  }
  if (node.field) {
    return observation[node.field];
  }
  if (node.value !== undefined) {
    return node.value;
  }
  return undefined;
}

// Helper: Recursively resolve a value or logic node
function resolveValue(val, observation) {
  if (typeof val === 'object' && val !== null) {
    return evalLogic(val, observation);
  }
  return val;
}

// Evaluate a single rule against an observation
function evaluateRule(rule, observation, missingFields = [], appliedBridgeIds = []) {
  if (missingFields.length > 0) {
    // Partial evaluation: missing fields, so return a potential vulnerability
    return {
      id: rule.id,
      name: rule.name,
      vulnerability: rule.vulnerability,
      status: 'potential',
      missing_fields: missingFields,
      note: `Cannot fully evaluate: ${missingFields.join(', ')} field(s) missing.`,
      mitigations: (rule.mitigations || []).map(mit => ({ ...mit, applied: false })) // Show all mitigations for awareness
    };
  }
  const triggered = evalLogic(rule.logic, observation);
  if (triggered) {
    // Filter mitigations by only_if if present
    const mitigations = (rule.mitigations || []).filter(mit => {
      if (!mit.only_if) return true;
      try {
        return evalLogic(mit.only_if, observation);
      } catch (e) {
        console.error(`Error evaluating only_if for mitigation: ${mit.description}`, e);
        return false;
      }
    }).map(mit => ({
      ...mit,
      applied: mit.type === 'bridge' && appliedBridgeIds.includes(mit.id)
    }));
    return {
      id: rule.id,
      name: rule.name,
      vulnerability: rule.vulnerability,
      status: 'confirmed',
      mitigations
    };
  }
  return null;
}

// Helper: Recursively collect all field names used in a logic node, but for foreach, only require array_field at top level
function collectTopLevelFields(node, fields = new Set()) {
  if (!node || typeof node !== 'object') return fields;
  if (node.foreach && node.foreach.array_field) {
    fields.add(node.foreach.array_field);
    // Do NOT recurse into satisfies/where for top-level fields
    return fields;
  }
  if (node.field) {
    fields.add(node.field);
  }
  for (const key of Object.keys(node)) {
    if (Array.isArray(node[key])) {
      node[key].forEach(child => collectTopLevelFields(child, fields));
    } else if (typeof node[key] === 'object' && node[key] !== null) {
      collectTopLevelFields(node[key], fields);
    }
  }
  return fields;
}

// Helper: Check if all required fields are present in the observation
function hasAllFields(fields, observation) {
  for (const field of fields) {
    if (!(field in observation)) {
      return false;
    }
  }
  return true;
}

// Evaluate all rules against an observation, now supporting potential vulnerabilities and applied bridge mitigations
const evaluate = (observation, rules, engine_version) => {
  const vulnerabilities = [];
  const appliedBridgeIds = Array.isArray(observation.applied_bridge_mitigations) ? observation.applied_bridge_mitigations : [];
  const appliedBridgeMitigations = [];
  for (const rule of rules) {
    const requiredFields = Array.from(collectTopLevelFields(rule.logic));
    const presentFields = requiredFields.filter(field => field in observation);
    const missingFields = requiredFields.filter(field => !(field in observation));
    if (presentFields.length === 0) {
      continue;
    }
    const result = evaluateRule(rule, observation, missingFields, appliedBridgeIds);
    if (result) {
      // Collect applied bridge mitigations for summary
      (result.mitigations || []).forEach(mit => {
        if (mit.type === 'bridge' && mit.applied) {
          appliedBridgeMitigations.push(mit.id);
        }
      });
      vulnerabilities.push(result);
    }
  }
  return {
    vulnerabilities,
    bridge_mitigations_applied: appliedBridgeMitigations,
    bridge_mitigation_count: appliedBridgeMitigations.length
  };
};

module.exports = { evaluate };

/**
 * endpoints: 
 * /evaluate - evaluate an observation against a rule
 * /add_rule - add a rule to the database
 * /test_rule - run a test on a rule - takes a mock observation, rule, and expected outcome object
 * 
 * 
 */