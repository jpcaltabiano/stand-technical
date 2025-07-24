import React, { useState } from 'react';
import EvaluateObservationTool from './EvaluateObservationTool';
import VulnerabilityLookupTool from './VulnerabilityLookupTool';
import RuleLookupTool from './RuleLookupTool';

export default function Underwriter() {
  const [activeTab, setActiveTab] = useState('evaluate');

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24, border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Underwriter Dashboard</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('evaluate')}
          style={{ padding: '0.5em 2em', background: activeTab === 'evaluate' ? '#0074D9' : '#eee', color: activeTab === 'evaluate' ? '#fff' : '#222', border: 'none', borderRadius: 4 }}
        >
          Evaluate Observation
        </button>
        <button
          onClick={() => setActiveTab('lookup')}
          style={{ padding: '0.5em 2em', background: activeTab === 'lookup' ? '#0074D9' : '#eee', color: activeTab === 'lookup' ? '#fff' : '#222', border: 'none', borderRadius: 4 }}
        >
          Vulnerability Lookup
        </button>
        <button
          onClick={() => setActiveTab('ruleExplorer')}
          style={{ padding: '0.5em 2em', background: activeTab === 'ruleExplorer' ? '#0074D9' : '#eee', color: activeTab === 'ruleExplorer' ? '#fff' : '#222', border: 'none', borderRadius: 4 }}
        >
          Rule Explorer
        </button>
      </div>
      <div>
        <div style={{ display: activeTab === 'evaluate' ? 'block' : 'none' }}>
          <EvaluateObservationTool />
        </div>
        <div style={{ display: activeTab === 'lookup' ? 'block' : 'none' }}>
          <VulnerabilityLookupTool />
        </div>
        <div style={{ display: activeTab === 'ruleExplorer' ? 'block' : 'none' }}>
          <RuleLookupTool />
        </div>
      </div>
    </div>
  );
} 