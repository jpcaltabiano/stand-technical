import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

export default function RuleLookupTool() {
  const [engineVersions, setEngineVersions] = useState([]);
  const [selectedEngineVersion, setSelectedEngineVersion] = useState('');
  const [rules, setRules] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [humanReadable, setHumanReadable] = useState(null);
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
  }, []);

  // Fetch rules when engine version changes
  useEffect(() => {
    if (selectedEngineVersion) {
      fetch(`${API_URL}/rules?engine_version=${selectedEngineVersion}`)
        .then(res => res.json())
        .then(data => {
          setRules(data.rules || []);
          setSelectedRuleId('');
          setHumanReadable(null);
        })
        .catch(() => {
          setRules([]);
          setSelectedRuleId('');
          setHumanReadable(null);
        });
    } else {
      setRules([]);
      setSelectedRuleId('');
      setHumanReadable(null);
    }
  }, [selectedEngineVersion]);

  // Fetch human-readable rule when rule is selected
  useEffect(() => {
    if (selectedRuleId && selectedEngineVersion) {
      setLoading(true);
      setError('');
      fetch(`${API_URL}/rules/${selectedRuleId}/human-readable?engine_version=${selectedEngineVersion}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch human-readable rule');
          return res.json();
        })
        .then(data => {
          setHumanReadable(data);
          console.log(data);
        })
        .catch(() => {
          setHumanReadable(null);
          setError('Failed to fetch human-readable rule.');
        })
        .finally(() => setLoading(false));
    } else {
      setHumanReadable(null);
    }
  }, [selectedRuleId, selectedEngineVersion]);

  return (
    <div>
      <h2>Rule Explorer</h2>
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
          <label>Rule: </label>
          <select value={selectedRuleId} onChange={e => setSelectedRuleId(e.target.value)} style={{ minWidth: 200 }}>
            <option value="">Select a rule</option>
            {rules.map(r => (
              <option key={r.id} value={r.id}>{r.name || r.id}</option>
            ))}
          </select>
        </div>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {humanReadable && (
        <div style={{ marginTop: 24, border: '1px solid #ddd', borderRadius: 6, padding: 16, background: '#fafbfc' }}>
          <h3>{humanReadable.name}</h3>
          <div style={{ fontStyle: 'italic', color: '#666', marginBottom: 8 }}>{humanReadable.description}</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#f4f4f4', border: '1px solid #eee', borderRadius: 4, padding: 12, margin: 0, fontSize: 15 }}>
            {humanReadable.human_readable}
          </pre>
        </div>
      )}
    </div>
  );
} 