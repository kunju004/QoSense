const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');

router.get('/summary', auth, async (req, res, next) => {
  try {
    const runs = await query(
      `SELECT COUNT(*) as total_runs, SUM(total_requests) as total_requests,
              SUM(total_violations) as total_violations, AVG(avg_ttft_ms) as avg_ttft,
              AVG(avg_tpot_ms) as avg_tpot, AVG(violation_rate) as avg_violation_rate
       FROM simulation_runs WHERE user_id=$1 AND status='completed'`,
      [req.user.id]
    );
    const byScheduler = await query(
      `SELECT scheduler_mode, COUNT(*) as runs, AVG(violation_rate) as avg_violation_rate,
              AVG(avg_ttft_ms) as avg_ttft, AVG(avg_tpot_ms) as avg_tpot, SUM(total_requests) as total_requests
       FROM simulation_runs WHERE user_id=$1 AND status='completed'
       GROUP BY scheduler_mode ORDER BY avg_violation_rate ASC`,
      [req.user.id]
    );
    res.json({ summary: runs.rows[0], byScheduler: byScheduler.rows });
  } catch (err) { next(err); }
});

module.exports = router;
