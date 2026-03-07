require('dotenv').config();

const MOCK_TEMPLATES = [
  (r, node) => ({
    priority_class: r.priority,
    cost_bucket: r.outputTokens < 256 ? 'short' : r.outputTokens < 512 ? 'medium' : 'long',
    recommended_action: r.priority === 'batch' ? 'defer' : 'admit',
    assigned_node: node,
    reasoning: `Priority class ${r.priority} with ${r.promptTokens} prompt tokens. Routing to ${node} to meet TTFT < 500ms SLO constraint.`
  }),
  (r, node) => ({
    priority_class: r.priority,
    cost_bucket: r.outputTokens < 256 ? 'short' : 'long',
    recommended_action: 'admit',
    assigned_node: node,
    reasoning: `Estimated decode cost: ${r.outputTokens} tokens. ${node} selected for lowest TPOT.`
  }),
  (r, node) => ({
    priority_class: r.priority,
    cost_bucket: 'long',
    recommended_action: 'preempt-batch',
    assigned_node: node,
    reasoning: `Queue pressure elevated. Preempting lower-priority batch job. Admitting ${r.priority} to ${node}.`
  }),
];

function mockAdvise(requestContext) {
  const tmpl = MOCK_TEMPLATES[Math.floor(Math.random() * MOCK_TEMPLATES.length)];
  const node = requestContext.priority === 'batch' ? 'edge-cpu' : 'edge-gpu';
  return tmpl(requestContext, node);
}

async function getAdvisorDecision(requestContext, systemState) {
  const provider = process.env.LLM_PROVIDER || 'mock';
  const start = Date.now();
  try {
    const decision = mockAdvise(requestContext);
    return { ...decision, latency_ms: Date.now() - start, provider };
  } catch (err) {
    return { ...mockAdvise(requestContext), latency_ms: Date.now() - start, provider: 'mock-fallback' };
  }
}

module.exports = { getAdvisorDecision };
