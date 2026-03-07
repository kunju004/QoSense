const NODES = {
  'edge-gpu': { speed: 1.0  },
  'edge-cpu': { speed: 0.35 },
  'device':   { speed: 0.18 },
  'cloud':    { speed: 0.85 },
};

const SLO = { ttft: 500, tpot: 50, e2e: 2000 };
const rand = (a, b) => Math.random() * (b - a) + a;

function computeLatencies(request, nodeId) {
  const node = NODES[nodeId];
  const speedFactor = node.speed * (0.9 + Math.random() * 0.2);
  const ttft = (request.promptTokens / 512) * (300 / speedFactor) + rand(20, 80);
  const tpot = (15 / speedFactor) + rand(2, 12);
  const e2e  = ttft + tpot * request.outputTokens;
  return {
    ttft_ms:      Math.round(ttft),
    tpot_ms:      Math.round(tpot * 10) / 10,
    e2e_ms:       Math.round(e2e),
    slo_violated: ttft > SLO.ttft || tpot > SLO.tpot || e2e > SLO.e2e,
  };
}

function chooseNodeHeuristic(request, nodeLoads, mode) {
  const loads = nodeLoads || {};
  if (mode === 'fcfs') {
    const nodeList = Object.keys(NODES);
    return nodeList[Math.floor(Math.random() * nodeList.length)];
  }
  if (mode === 'orca') {
    return (loads['edge-gpu'] || 0) < 95 ? 'edge-gpu' : 'edge-cpu';
  }
  if (mode === 'sarathi') {
    return Object.keys(NODES).reduce((best, id) =>
      (loads[id] || 0) < (loads[best] || 0) ? id : best, 'edge-gpu');
  }
  if (request.priority === 'deadline-critical' || request.priority === 'interactive') {
    if ((loads['edge-gpu'] || 0) < 85) return 'edge-gpu';
  }
  if (request.priority === 'batch') {
    return ['edge-cpu', 'device', 'cloud'].reduce((best, id) =>
      (loads[id] || 0) < (loads[best] || 0) ? id : best, 'edge-cpu');
  }
  return Object.keys(NODES).reduce((best, id) =>
    (loads[id] || 0) < (loads[best] || 0) ? id : best, 'edge-gpu');
}

function processRequest(request, nodeId) {
  const latencies = computeLatencies(request, nodeId);
  return { assigned_node: nodeId, ...latencies, completed_at: new Date().toISOString() };
}

module.exports = { chooseNodeHeuristic, processRequest, SLO, NODES };
