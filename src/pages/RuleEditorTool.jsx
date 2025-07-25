import React, { useState, useEffect } from 'react';
import EvaluationResults from '../components/EvaluationResults';

const API_URL = 'http://localhost:3001';

function ConfirmModal({ open, onConfirm, onCancel, action }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#fff', padding: 32, borderRadius: 8, minWidth: 340, boxShadow: '0 2px 16px #0002' }}>
        <h4>Are you sure?</h4>
        <div style={{ marginBottom: 16 }}>
          This will <b>{action}</b> and create a new engine version. This action cannot be undone.
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '0.5em 2em' }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '0.5em 2em', background: '#d33', color: '#fff', border: 'none', borderRadius: 4 }}>{action}</button>
        </div>
      </div>
    </div>
  );
}

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
  const [modal, setModal] = useState({ open: false, action: '', onConfirm: null });
  const [success, setSuccess] = useState('');

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
    setSuccess('');
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
      setTestResult(data);
    } catch (e) {
      setError(e.message || 'Failed to test rule.');
    } finally {
      setLoading(false);
    }
  };

  // --- Backend actions ---
  const handleUpdateRule = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const rule = JSON.parse(ruleJson);
      const res = await fetch(`${API_URL}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSuccess('Rule updated and new engine version created!');
      // Refresh rules/engine versions
      fetch(`${API_URL}/engine-versions`).then(res => res.json()).then(setEngineVersions);
      fetch(`${API_URL}/rules?engine_version=${selectedEngineVersion}`).then(res => res.json()).then(data => setRules(data.rules || []));
    } catch (e) {
      setError(e.message || 'Failed to update rule.');
    } finally {
      setLoading(false);
      setModal({ open: false, action: '', onConfirm: null });
    }
  };

  const handleDeleteRule = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/rules/${selectedRuleId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setSuccess('Rule deleted and new engine version created!');
      // Refresh rules/engine versions
      fetch(`${API_URL}/engine-versions`).then(res => res.json()).then(setEngineVersions);
      fetch(`${API_URL}/rules?engine_version=${selectedEngineVersion}`).then(res => res.json()).then(data => setRules(data.rules || []));
      setSelectedRuleId('');
      setRuleJson('');
    } catch (e) {
      setError(e.message || 'Failed to delete rule.');
    } finally {
      setLoading(false);
      setModal({ open: false, action: '', onConfirm: null });
    }
  };

  const handleAddRule = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const rule = JSON.parse(ruleJson);
      const res = await fetch(`${API_URL}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Add failed');
      setSuccess('Rule added and new engine version created!');
      // Refresh rules/engine versions
      fetch(`${API_URL}/engine-versions`).then(res => res.json()).then(setEngineVersions);
      fetch(`${API_URL}/rules?engine_version=${selectedEngineVersion}`).then(res => res.json()).then(data => setRules(data.rules || []));
      setRuleJson('');
    } catch (e) {
      setError(e.message || 'Failed to add rule.');
    } finally {
      setLoading(false);
      setModal({ open: false, action: '', onConfirm: null });
    }
  };

  // --- Render ---
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
      {mode === 'update' && selectedRuleId && (
        <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
          <button
            onClick={() => setModal({ open: true, action: 'Update Rule', onConfirm: handleUpdateRule })}
            disabled={loading}
            style={{ padding: '0.5em 2em', background: '#0074D9', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            Update Rule
          </button>
          <button
            onClick={() => setModal({ open: true, action: 'Delete Rule', onConfirm: handleDeleteRule })}
            disabled={loading}
            style={{ padding: '0.5em 2em', background: '#d33', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            Delete Rule
          </button>
        </div>
      )}
      {mode === 'add' && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setModal({ open: true, action: 'Add New Rule', onConfirm: handleAddRule })}
            disabled={loading}
            style={{ padding: '0.5em 2em', background: '#2ecc40', color: '#fff', border: 'none', borderRadius: 4 }}
          >
            Add New Rule
          </button>
        </div>
      )}
      <ConfirmModal
        open={modal.open}
        action={modal.action}
        onConfirm={modal.onConfirm}
        onCancel={() => setModal({ open: false, action: '', onConfirm: null })}
      />
      {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginTop: 16 }}>{success}</div>}
      <EvaluationResults results={testResult} title="Rule Test Results" />
    </div>
  );
} 