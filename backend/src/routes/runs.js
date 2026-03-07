const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, scheduler_mode, workload_type, status,
              total_requests, total_violations, violation_rate,
              avg_ttft_ms, avg_tpot_ms, duration_ms, started_at, ended_at
       FROM simulation_runs WHERE user_id = $1 ORDER BY started_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ runs: result.rows });
  } catch (err) { next(err); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { schedulerMode, workloadType, name } = req.body;
    if (!schedulerMode || !workloadType) return res.status(400).json({ error: 'schedulerMode and workloadType required' });
    const result = await query(
      `INSERT INTO simulation_runs (user_id, name, scheduler_mode, workload_type, status)
       VALUES ($1, $2, $3, $4, 'running') RETURNING *`,
      [req.user.id, name || `${schedulerMode} / ${workloadType}`, schedulerMode, workloadType]
    );
    res.status(201).json({ run: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const runResult = await query(`SELECT * FROM simulation_runs WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.id]);
    if (runResult.rows.length === 0) return res.status(404).json({ error: 'Run not found' });
    const requestsResult = await query(`SELECT * FROM requests WHERE run_id = $1 ORDER BY arrived_at DESC LIMIT 100`, [req.params.id]);
    res.json({ run: runResult.rows[0], requests: requestsResult.rows });
  } catch (err) { next(err); }
});

router.patch('/:id/end', auth, async (req, res, next) => {
  try {
    const { totalRequests, totalViolations, avgTtft, avgTpot, avgE2e, durationMs } = req.body;
    const violationRate = totalRequests > 0 ? ((totalViolations / totalRequests) * 100).toFixed(2) : 0;
    const result = await query(
      `UPDATE simulation_runs SET status='completed', total_requests=$1, total_violations=$2,
       avg_ttft_ms=$3, avg_tpot_ms=$4, avg_e2e_ms=$5, violation_rate=$6, duration_ms=$7, ended_at=NOW()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [totalRequests, totalViolations, avgTtft, avgTpot, avgE2e, violationRate, durationMs, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Run not found' });
    res.json({ run: result.rows[0] });
  } catch (err) { next(err); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const result = await query('DELETE FROM simulation_runs WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Run not found' });
    res.json({ message: 'Run deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
