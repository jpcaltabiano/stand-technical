import React from 'react';

export default function EvaluationResults({ results, title = "Evaluation Results" }) {
  if (!results) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <h3>{title}</h3>
      <div>Bridge Mitigations Applied: {results.bridge_mitigation_count || 0}</div>
      {results.bridge_mitigations_applied && results.bridge_mitigations_applied.length > 0 && (
        <div>IDs: {results.bridge_mitigations_applied.join(', ')}</div>
      )}
      {results.note && <div style={{ color: 'gray', fontStyle: 'italic', marginTop: 8 }}>{results.note}</div>}
      <div style={{ marginTop: 16 }}>
        {(!results.vulnerabilities || results.vulnerabilities.length === 0) ? 
          <div>No vulnerabilities found.</div> : 
          results.vulnerabilities.map((vuln, i) => (
            <div key={i} style={{ border: '1px solid #ddd', borderRadius: 6, margin: '12px 0', padding: 12 }}>
              <strong>{vuln.name}</strong> <span style={{ color: vuln.status === 'potential' ? 'orange' : 'green' }}>({vuln.status})</span>
              <div>{vuln.vulnerability}</div>
              {vuln.mitigations && vuln.mitigations.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>Mitigations:</strong>
                  <ul>
                    {vuln.mitigations.map(mit => (
                      <li key={mit.id} style={{ color: mit.type === 'bridge' ? '#0074D9' : '#111' }}>
                        [{mit.type.toUpperCase()}] {mit.description} {mit.applied ? <b>(applied)</b> : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {vuln.missing_fields && vuln.missing_fields.length > 0 && (
                <div style={{ color: 'orange', marginTop: 6 }}>Missing fields: {vuln.missing_fields.join(', ')}</div>
              )}
              {vuln.note && <div style={{ color: 'gray', fontStyle: 'italic' }}>{vuln.note}</div>}
            </div>
          ))
        }
      </div>
    </div>
  );
} 