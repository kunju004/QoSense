const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');
const { getAdvisorDecision } = require('../services/llmAdvisor');
const { chooseNodeHeuristic, processRequest } = require('../services/scheduler');

router.post('/decide', auth, async (req, res, next) => {
  try {
    const { runId, requestKey, priority, promptTokens, outputTokens, schedulerMode, systemState } = req.body;
    if (!runId || !requestKey || !priority || !promptTokens || !schedulerMode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const requestContext = { requestKey, priority, promptTokens, outputTokens };
    let decision, advisorResult = null;

    if (schedulerMode === 'llm') {
      advisorResult = await getAdvisorDecision(requestContext, { ...systemState, schedulerMode });
      decision = { nodeId: advisorResult.assigned_node || 'edge-gpu', reasoning: advisorResult.reasoning, priorityClass: advisorResult.priority_class, costBucket: advisorResult.cost_bucket, recommendedAction: advisorResult.recommended_action };
    } else {
      const nodeId = chooseNodeHeuristic(requestContext, systemState?.nodeLoads, schedulerMode);
      decision = { nodeId, reasoning: `[${schedulerMode}] Heuristic routing to ${nodeId}.`, priorityClass: priority, costBucket: outputTokens < 256 ? 'short' : 'long', recommendedAction: 'admit' };
    }

    const result = processRequest(requestContext, decision.nodeId);

    const reqInsert = await query(
      `INSERT INTO requests (run_id, request_key, priority, prompt_tokens, output_tokens, assigned_node, ttft_ms, tpot_ms, e2e_ms, slo_violated, advisor_message, completed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW()) RETURNING id`,
      [runId, requestKey, priority, promptTokens, outputTokens, result.assigned_node, result.ttft_ms, result.tpot_ms, result.e2e_ms, result.slo_violated, decision.reasoning]
    );

    if (schedulerMode === 'llm' && advisorResult) {
      await query(
        `INSERT INTO advisor_decisions (run_id, request_id, scheduler_mode, priority_class, cost_bucket, recommended_action, reasoning, assigned_node, action_taken, latency_ms)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [runId, reqInsert.rows[0].id, schedulerMode, advisorResult.priority_class, advisorResult.cost_bucket, advisorResult.recommended_action, advisorResult.reasoning, decision.nodeId, result.slo_violated ? 'WARN' : 'ADMIT', advisorResult.latency_ms]
      );
    }

    res.json({ decision, result, advisor: advisorResult });
  } catch (err) { next(err); }
});

router.post('/batch-decide', auth, async (req, res, next) => {
  try {
    const { runId, requests, schedulerMode, systemState } = req.body;
    if (!runId || !requests?.length || !schedulerMode) return res.status(400).json({ error: 'Missing fields' });
    const results = [];
    for (const req_item of requests.slice(0, 10)) {
      const nodeId = chooseNodeHeuristic(req_item, systemState?.nodeLoads, schedulerMode);
      const result = processRequest(req_item, nodeId);
      await query(
        `INSERT INTO requests (run_id, request_key, priority, prompt_tokens, output_tokens, assigned_node, ttft_ms, tpot_ms, e2e_ms, slo_violated, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
        [runId, req_item.requestKey, req_item.priority, req_item.promptTokens, req_item.outputTokens, result.assigned_node, result.ttft_ms, result.tpot_ms, result.e2e_ms, result.slo_violated]
      );
      results.push({ requestKey: req_item.requestKey, nodeId, ...result });
    }
    await query(
      `UPDATE simulation_runs SET total_requests=total_requests+$1, total_violations=total_violations+$2 WHERE id=$3`,
      [results.length, results.filter(r => r.slo_violated).length, runId]
    );
    res.json({ results });
  } catch (err) { next(err); }
});

module.exports = router;
