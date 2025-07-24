import React, { useState, useEffect } from 'react';
import observationSchema from '../observationSchema';
import EvaluationResults from '../components/EvaluationResults';

const API_URL = 'http://localhost:3001';

export default function EvaluateObservationTool() {
  const [observation, setObservation] = useState({
    "Vegetation": []
  });
  const [vegCount, setVegCount] = useState(0);
  const [engineVersions, setEngineVersions] = useState([]);
  const [selectedEngineVersion, setSelectedEngineVersion] = useState('');
  const [rules, setRules] = useState([]);
  const [selectedRules, setSelectedRules] = useState(['ALL']);
  const [bridgeMitigations, setBridgeMitigations] = useState([]);
  const [selectedBridgeMitigations, setSelectedBridgeMitigations] = useState([]);
  const [results, setResults] = useState(null);
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

  // Fetch rules and bridge mitigations when engine version changes
  useEffect(() => {
    if (selectedEngineVersion) {
      fetch(`${API_URL}/rules?engine_version=${selectedEngineVersion}`)
        .then(res => res.json())
        .then(data => {
          setRules(data.rules || []);
          // Collect all bridge mitigations from all rules
          const bridges = [];
          (data.rules || []).forEach(rule => {
            (rule.mitigations || []).forEach(mit => {
              if (mit.type === 'bridge') {
                bridges.push({ id: mit.id, description: mit.description });
              }
            });
          });
          setBridgeMitigations(bridges);
        })
        .catch(() => {
          setRules([]);
          setBridgeMitigations([]);
        });
    } else {
      setRules([]);
      setBridgeMitigations([]);
    }
    setSelectedRules(['ALL']);
    setSelectedBridgeMitigations([]);
  }, [selectedEngineVersion]);

  const handleChange = (field, value) => {
    setObservation(obs => {
      const newObs = { ...obs };
      if (value === '' || value === 'Select') {
        delete newObs[field];
      } else {
        newObs[field] = value;
      }
      return newObs;
    });
  };

  const handleVegChange = (idx, field, value) => {
    setObservation(obs => {
      const veg = [...(obs["Vegetation"] || [])];
      veg[idx] = { ...veg[idx], [field]: value };
      return { ...obs, "Vegetation": veg };
    });
  };

  const handleVegCountChange = (count) => {
    setVegCount(count);
    setObservation(obs => ({
      ...obs,
      "Vegetation": Array.from({ length: count }, (_, i) => obs["Vegetation"][i] || { "Type": '', "Distance to Window": '' })
    }));
  };

  const handleRuleSelect = (e) => {
    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
    if (options.includes('ALL')) {
      setSelectedRules(['ALL']);
    } else {
      setSelectedRules(options);
    }
  };

  const handleBridgeMitSelect = (e) => {
    const options = Array.from(e.target.selectedOptions).map(opt => opt.value);
    setSelectedBridgeMitigations(options);
    setObservation(obs => {
      const newObs = { ...obs };
              if (options.length === 0) {
        delete newObs["applied_bridge_mitigations"];
      } else {
        newObs["applied_bridge_mitigations"] = options;
      }
      return newObs;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    // Clean up observation: remove empty fields and empty vegetation
    const obs = { ...observation };
    if (obs["Vegetation"] && obs["Vegetation"].length === 0) delete obs["Vegetation"];
    if (obs["Vegetation"]) {
      obs["Vegetation"] = obs["Vegetation"].filter(v => v["Type"] || v["Distance to Window"]);
      if (obs["Vegetation"].length === 0) delete obs["Vegetation"];
    }
    Object.keys(obs).forEach(key => {
      if (obs[key] === '' || obs[key] === 'Select') delete obs[key];
    });
    const body = {
      observation: obs,
      ...(selectedEngineVersion && { engine_version: selectedEngineVersion }),
      ...(selectedRules.length > 0 && !selectedRules.includes('ALL') && { rule_ids: selectedRules })
    };
    try {
      const res = await fetch(`${API_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Failed to evaluate');
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError('Failed to evaluate observation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
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
          <label>Rules: </label>
          <select multiple value={selectedRules} onChange={handleRuleSelect} style={{ minWidth: 200, minHeight: 60 }}>
            <option value="ALL">All Rules</option>
            {rules.map(r => (
              <option key={r.id} value={r.id}>{r.name || r.id}</option>
            ))}
          </select>
          <div style={{ fontSize: 12, color: '#888' }}>
            (Default: All rules. Select one or more to limit evaluation.)
          </div>
        </div>
        <div>
          <label>Bridge Mitigations Already Applied: </label>
          <select multiple value={selectedBridgeMitigations} onChange={handleBridgeMitSelect} style={{ minWidth: 220, minHeight: 60 }}>
            {bridgeMitigations.map(mit => {
              const desc = mit.description.length > 40 ? mit.description.slice(0, 40) + '…' : mit.description;
              return (
                <option key={mit.id} value={mit.id} title={mit.description}>{desc}</option>
              );
            })}
          </select>
          <div style={{ fontSize: 12, color: '#888' }}>
            (Select all bridge mitigations already applied to this property.)
          </div>
        </div>
      </div>
      {observationSchema.fields.filter(f => f.type !== 'array').map(field => (
        <div key={field.id}>
          <label>{field.label}: </label>
          {field.type === 'string' && field.options ? (
            <select value={observation[field.id] || ''} onChange={e => handleChange(field.id, e.target.value)}>
              <option value="Select">Select</option>
              {field.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'number' ? (
            <input type="number" value={observation[field.id] || ''} onChange={e => handleChange(field.id, e.target.value)} />
          ) : null}
        </div>
      ))}
      <div>
        <label>Number of Vegetation Items: </label>
        <input type="number" min={0} max={5} value={vegCount} onChange={e => handleVegCountChange(Number(e.target.value))} style={{ width: 60 }} />
      </div>
      {vegCount > 0 && (
        <div style={{ marginTop: 10 }}>
          <strong>Vegetation Details:</strong>
          {Array.from({ length: vegCount }).map((_, idx) => (
            <div key={idx} style={{ margin: '8px 0', padding: 8, border: '1px solid #eee', borderRadius: 4 }}>
              {observationSchema.fields.find(f => f.id === 'Vegetation').itemFields.map(itemField => (
                <span key={itemField.id}>
                  <label>{itemField.label}: </label>
                  {itemField.type === 'string' && itemField.options ? (
                    <select value={observation["Vegetation"][idx]?.[itemField.id] || ''} onChange={e => handleVegChange(idx, itemField.id, e.target.value)}>
                      <option value="Select">Select</option>
                      {itemField.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : itemField.type === 'number' ? (
                    <input type="number" value={observation["Vegetation"][idx]?.[itemField.id] || ''} onChange={e => handleVegChange(idx, itemField.id, e.target.value)} style={{ width: 80 }} />
                  ) : null}
                  {' '}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
      <button type="submit" style={{ marginTop: 20, padding: '0.5em 2em' }} disabled={loading}>{loading ? 'Evaluating...' : 'Evaluate'}</button>
      {error && <div style={{ color: 'red', marginTop: 20 }}>{error}</div>}
      <EvaluationResults results={results} />
    </form>
  );
} 