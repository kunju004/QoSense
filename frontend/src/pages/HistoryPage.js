import { useState, useEffect } from 'react';
import { runsApi, analyticsApi } from '../api';

const schedColor = { llm: '#00e5ff', fcfs: '#ff5252', orca: '#ffab40', sarathi: '#b2ff59' };

export default function HistoryPage({ active }) {
  const [runs, setRuns]           = useState([]);
  const [summary, setSummary]     = useState(null);
  const [byScheduler, setByScheduler] = useState([]);
  const [loading, setLoading]     = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([runsApi.list(), analyticsApi.summary()]);
      setRuns(r.runs);
      setSummary(a.summary);
      setByScheduler(a.byScheduler);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // Reload every time this tab becomes visible
  useEffect(() => {
    if (active) load();
  }, [active]);

  const deleteRun = async (id) => {
    if (!window.confirm('Delete this run?')) return;
    await runsApi.delete(id);
    setRuns(r => r.filter(x => x.id !== id));
  };

  const S = {
    page: { padding: 24, fontFamily: 'monospace', color: '#dde4f0' },
    tag:  { fontSize: 9, letterSpacing: '0.2em', color: '#00e5ff', textTransform: 'uppercase', marginBottom: 6 },
    h1:   { fontFamily: 'serif', fontSize: 26, fontWeight: 700, color: '#dde4f0', marginBottom: 4 },
    sub:  { fontSize: 11, color: '#6a7590', marginBottom: 24 },
    statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
    statCard: { background: '#0f1219', border: '1px solid #1a2030', borderRadius: 8, padding: 16 },
    statLabel: { fontSize: 9, letterSpacing: '0.12em', color: '#6a7590', textTransform: 'uppercase', marginBottom: 8 },
    statVal: { fontFamily: 'serif', fontSize: 28, fontWeight: 700 },
    panel: { background: '#0f1219', border: '1px solid #1a2030', borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
    panelHdr: { display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #1a2030', background: '#0d1018', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '8px 14px', textAlign: 'left', fontSize: 8, letterSpacing: '0.12em', color: '#36404f', textTransform: 'uppercase', borderBottom: '1px solid #1a2030' },
    td: { padding: '9px 14px', fontSize: 11, borderBottom: '1px solid #1a2030' },
    badge: (c) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 600, color: c, border: '1px solid '+c+'44', background: c+'11' }),
    empty: { padding: 32, textAlign: 'center', color: '#36404f', fontSize: 12 },
  };

  return (
    <div style={S.page}>
      <div style={S.tag}>History</div>
      <h1 style={S.h1}>Simulation Runs</h1>
      <p style={S.sub}>All runs persisted in PostgreSQL</p>

      {summary && (
        <div style={S.statsRow}>
          {[
            { label: 'Total Runs',      val: summary.total_runs      || 0,  color: '#00e5ff' },
            { label: 'Total Requests',  val: summary.total_requests  || 0,  color: '#b2ff59' },
            { label: 'Avg TTFT',        val: Math.round(summary.avg_ttft || 0) + 'ms', color: '#ffab40' },
            { label: 'Avg Violation %', val: Math.round(summary.avg_violation_rate || 0) + '%', color: parseFloat(summary.avg_violation_rate) > 10 ? '#ff5252' : '#00e5ff' },
          ].map(s => (
            <div style={S.statCard} key={s.label}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{ ...S.statVal, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {byScheduler.length > 0 && (
        <div style={{ ...S.panel, marginBottom: 20 }}>
          <div style={S.panelHdr}><span>Scheduler Comparison</span></div>
          <table style={S.table}>
            <thead>
              <tr>{['Scheduler','Runs','Avg Violation %','Avg TTFT','Total Requests'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {byScheduler.map(s => (
                <tr key={s.scheduler_mode}>
                  <td style={S.td}><span style={S.badge(schedColor[s.scheduler_mode] || '#888')}>{s.scheduler_mode}</span></td>
                  <td style={{ ...S.td, color: '#6a7590' }}>{s.runs}</td>
                  <td style={{ ...S.td, color: parseFloat(s.avg_violation_rate) > 10 ? '#ff5252' : '#b2ff59' }}>{parseFloat(s.avg_violation_rate || 0).toFixed(1)}%</td>
                  <td style={S.td}>{Math.round(s.avg_ttft || 0)}ms</td>
                  <td style={{ ...S.td, color: '#6a7590' }}>{s.total_requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={S.panel}>
        <div style={S.panelHdr}>
          <span>{runs.length} Runs</span>
          <button onClick={load} style={{ background: 'none', border: 'none', color: '#00e5ff', cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>
            {loading ? 'Loading...' : '↺ Refresh'}
          </button>
        </div>
        {runs.length === 0
          ? <div style={S.empty}>{loading ? 'Loading...' : 'No runs yet. Run a simulation first.'}</div>
          : (
            <table style={S.table}>
              <thead>
                <tr>{['Name','Scheduler','Workload','Requests','Violations','Avg TTFT','Status','Started',''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id}>
                    <td style={{ ...S.td, color: '#6a7590', fontSize: 10, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.name || run.id.slice(0,8)}</td>
                    <td style={S.td}><span style={S.badge(schedColor[run.scheduler_mode] || '#888')}>{run.scheduler_mode}</span></td>
                    <td style={{ ...S.td, color: '#6a7590' }}>{run.workload_type}</td>
                    <td style={S.td}>{run.total_requests}</td>
                    <td style={{ ...S.td, color: parseFloat(run.violation_rate) > 10 ? '#ff5252' : '#b2ff59' }}>{run.violation_rate ? parseFloat(run.violation_rate).toFixed(1) + '%' : '-'}</td>
                    <td style={S.td}>{run.avg_ttft_ms ? Math.round(run.avg_ttft_ms) + 'ms' : '-'}</td>
                    <td style={S.td}><span style={S.badge(run.status === 'completed' ? '#b2ff59' : '#ffab40')}>{run.status}</span></td>
                    <td style={{ ...S.td, color: '#36404f', fontSize: 10 }}>{new Date(run.started_at).toLocaleString()}</td>
                    <td style={S.td}><button onClick={() => deleteRun(run.id)} style={{ background: 'none', border: 'none', color: '#36404f', cursor: 'pointer' }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  );
}
