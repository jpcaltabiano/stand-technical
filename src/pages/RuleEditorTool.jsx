import React, { useState, useEffect } from 'react';
import EvaluationResults from '../components/EvaluationResults';

const API_URL = 'http://localhost:3001';

export default function RuleEditorTool() {
  const [engineVersions, setEngineVersions] = useState([]);
  const [selectedEngineVersion, setSelectedEngineVersion] = useState('');
  const [rules, setRules] = useState([]);
  const [mode, setMode] = useState('update'); // 'update' or 'add'
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [ruleJson, setRuleJson] = useState('');
  const [observationJson, setObservationJson] = useState(`{
  
}`);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch engine versions on mount
  useEffect(() => {
    fetch(`${API_URL}/engine-versions`)
      .then(res => res.json())
      .then(data => {
        setEngineVersions(data);
        if (data.length > 0 && !selectedEngineVersion) {
          setSelectedEngineVersion(data[data.length - 1].engine_version.toString());
        }
      })
      .catch(() => setEngineVersions([]));
    // eslint-disable-next-line
  }, []);

  // Fetch rules when engine version changes
  useEffect(() => {
    if (selectedEngineVersion) {
      fetch(`${API_URL}/rules?engine_version=${selectedEngineVersion}`)
        .then(res => res.json())
        .then(data => setRules(data.rules || []))
        .catch(() => setRules([]));
      setSelectedRuleId('');
      setRuleJson('');
    } else {
      setRules([]);
      setSelectedRuleId('');
      setRuleJson('');
    }
  }, [selectedEngineVersion]);

  // Load rule into editor when selected
  useEffect(() => {
    if (mode === 'update' && selectedRuleId && rules.length > 0) {
      const rule = rules.find(r => r.id === selectedRuleId);
      setRuleJson(JSON.stringify(rule, null, 2));
    }
    if (mode === 'add') {
      setRuleJson(`{
  "id": "",
  "name": "",
  "description": "",
  "logic": {},
  "vulnerability": "",
  "mitigations": []
}`);
      setSelectedRuleId('');
    }
  }, [mode, selectedRuleId, rules]);

  const handleTest = async () => {
    setLoading(true);
    setError('');
    setTestResult(null);
    let rule, observation;
    try {
      rule = JSON.parse(ruleJson);
    } catch (e) {
      setError('Rule JSON is invalid.');
      setLoading(false);
      return;
    }
    try {
      observation = JSON.parse(observationJson);
    } catch (e) {
      setError('Observation JSON is invalid.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/rules/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule, observation })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      setTestResult(data.result);
    } catch (e) {
      setError(e.message || 'Failed to test rule.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Rule Editor</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
        <div>
          <label>Engine Version: </label>
          <select value={selectedEngineVersion} onChange={e => setSelectedEngineVersion(e.target.value)}>
            {engineVersions.length > 0 && engineVersions.map(v => (
              <option key={v.engine_version} value={v.engine_version}>
                v{v.engine_version} ({new Date(v.created_at).toLocaleString()})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Mode: </label>
          <select value={mode} onChange={e => setMode(e.target.value)}>
            <option value="update">Update/Delete Existing Rule</option>
            <option value="add">Add New Rule</option>
          </select>
        </div>
        {mode === 'update' && (
          <div>
            <label>Rule: </label>
            <select value={selectedRuleId} onChange={e => setSelectedRuleId(e.target.value)} style={{ minWidth: 200 }}>
              <option value="">Select a rule</option>
              {rules.map(r => (
                <option key={r.id} value={r.id}>{r.name || r.id}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <label><strong>Rule JSON</strong></label>
          <textarea
            value={ruleJson}
            onChange={e => setRuleJson(e.target.value)}
            rows={18}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 15, border: '1px solid #bbb', borderRadius: 4, padding: 8 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label><strong>Test Observation JSON</strong></label>
          <textarea
            value={observationJson}
            onChange={e => setObservationJson(e.target.value)}
            rows={18}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: 15, border: '1px solid #bbb', borderRadius: 4, padding: 8 }}
          />
        </div>
      </div>
      <button onClick={handleTest} disabled={loading} style={{ padding: '0.5em 2em', fontSize: 16 }}>
        {loading ? 'Testing...' : 'Test Rule Against Observation'}
      </button>
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      <EvaluationResults results={testResult} title="Rule Test Results" />
    </div>
  );
} 