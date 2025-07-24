import React, { useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const API_URL = "http://localhost:3001";

function fetchRules() {
  return fetch(`${API_URL}/rules`).then((res) => res.json());
}
function fetchRule(id) {
  return fetch(`${API_URL}/rules/${id}`).then((res) => res.json());
}
function saveRule(rule) {
  return fetch(`${API_URL}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rule),
  }).then((res) => res.json());
}

const initialNodes = [
  // Example: { id: '1', type: 'input', data: { label: 'Start' }, position: { x: 0, y: 0 } }
];
const initialEdges = [];

function RuleBuilder() {
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showModal, setShowModal] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch rules on mount
  useEffect(() => {
    fetchRules().then(setRules);
  }, []);

  // Load rule into flow when selected
  useEffect(() => {
    if (selectedRule) {
      // Convert rule.logic to nodes/edges
      const { nodes, edges } = logicToFlow(selectedRule.logic);
      setNodes(nodes);
      setEdges(edges);
      setRuleName(selectedRule.name);
      setRuleDesc(selectedRule.description);
    } else {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setRuleName("");
      setRuleDesc("");
    }
  }, [selectedRule, setNodes, setEdges]);

  // Convert logic JSON to React Flow nodes/edges (stub)
  function logicToFlow(logic) {
    // TODO: Implement full conversion. For now, show a single node.
    if (!logic) return { nodes: [], edges: [] };
    return {
      nodes: [
        {
          id: "logic",
          type: "default",
          data: { label: JSON.stringify(logic, null, 2) },
          position: { x: 100, y: 100 },
        },
      ],
      edges: [],
    };
  }

  // Convert React Flow nodes/edges to logic JSON (stub)
  function flowToLogic(nodes, edges) {
    // TODO: Implement full conversion from flow to logic JSON
    if (nodes.length === 1) {
      try {
        return JSON.parse(nodes[0].data.label);
      } catch {
        return {};
      }
    }
    return {};
  }

  // Handle save
  const handleSave = () => setShowModal(true);
  const confirmSave = async () => {
    setSaving(true);
    setError(null);
    const logic = flowToLogic(nodes, edges);
    const rule = {
      id: selectedRule ? selectedRule.id : `rule-${Date.now()}`,
      name: ruleName,
      description: ruleDesc,
      logic,
      vulnerability: selectedRule?.vulnerability || "Describe the vulnerability.",
      mitigations: selectedRule?.mitigations || [],
      version: (selectedRule?.version || 0) + 1,
      schema_version: 1,
    };
    try {
      await saveRule(rule);
      setShowModal(false);
      setSaving(false);
      // Refresh rules list
      fetchRules().then(setRules);
    } catch (e) {
      setError("Failed to save rule.");
      setSaving(false);
    }
  };

  // Add node (for demo, adds a blank logic node)
  const addNode = () => {
    setNodes((nds) => [
      ...nds,
      {
        id: `${Date.now()}`,
        type: "default",
        data: { label: "New Logic Node" },
        position: { x: 200, y: 200 },
      },
    ]);
  };

  // Add edge
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (

    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar: Rule List */}
      <div style={{ width: 250, borderRight: "1px solid #ddd", padding: 16 }}>
        <h3>Rules</h3>
        <button onClick={() => setSelectedRule(null)}>+ New Rule</button>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {rules.map((rule) => (
            <li key={rule.id}>
              <button
                style={{
                  background: selectedRule?.id === rule.id ? "#eee" : "#fff",
                  border: "none",
                  textAlign: "left",
                  width: "100%",
                  padding: 8,
                  cursor: "pointer",
                }}
                onClick={async () => {
                  const r = await fetchRule(rule.id);
                  setSelectedRule(r);
                }}
              >
                {rule.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Main: Rule Builder */}
      <div style={{ flex: 1, position: "relative" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
          <input
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            placeholder="Rule Name"
            style={{ fontSize: 18, width: 300, marginRight: 16 }}
          />
          <input
            value={ruleDesc}
            onChange={(e) => setRuleDesc(e.target.value)}
            placeholder="Description"
            style={{ fontSize: 16, width: 400 }}
          />
          <button onClick={addNode} style={{ marginLeft: 16 }}>+ Add Node</button>
          <button onClick={handleSave} style={{ marginLeft: 16, background: "#007bff", color: "#fff" }}>
            Save Rule
          </button>
        </div>
        <div style={{ width: "100%", height: "calc(100% - 60px)" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
        {/* Save Modal */}
        {showModal && (
          <div style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <div style={{ background: "#fff", padding: 32, borderRadius: 8, minWidth: 300 }}>
              <h3>Confirm Save</h3>
              <p>Are you sure you want to save this rule? This will create a new version.</p>
              {error && <div style={{ color: "red" }}>{error}</div>}
              <div style={{ marginTop: 24 }}>
                <button onClick={confirmSave} disabled={saving} style={{ marginRight: 16 }}>
                  {saving ? "Saving..." : "Yes, Save"}
                </button>
                <button onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RuleBuilder; 