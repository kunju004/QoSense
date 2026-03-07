import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api';

export default function ProfilePage({ active }) {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await analyticsApi.summary();
      setSummary(data.summary);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (active) load();
  }, [active]);

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const S = {
    page: { padding: 32, fontFamily: 'monospace', color: '#dde4f0', maxWidth: 700 },
    tag:  { fontSize: 9, letterSpacing: '0.2em', color: '#00e5ff', textTransform: 'uppercase', marginBottom: 6 },
    h1:   { fontFamily: 'serif', fontSize: 26, fontWeight: 700, color: '#dde4f0', marginBottom: 4 },
    sub:  { fontSize: 11, color: '#6a7590', marginBottom: 32 },
    card: { background: '#0f1219', border: '1px solid #1a2030', borderRadius: 10, padding: 24, marginBottom: 16 },
    cardTitle: { fontSize: 9, letterSpacing: '0.18em', color: '#6a7590', textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 },
    avatarWrap: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 },
    avatar: { width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #00e5ff, #7b61ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#000', flexShrink: 0 },
    name:  { fontFamily: 'serif', fontSize: 22, fontWeight: 700, color: '#dde4f0', marginBottom: 4 },
    email: { fontSize: 12, color: '#6a7590' },
    role:  { display: 'inline-block', marginTop: 8, padding: '2px 10px', borderRadius: 20, fontSize: 9, fontWeight: 600, color: '#00e5ff', border: '1px solid rgba(0,229,255,0.3)', background: 'rgba(0,229,255,0.08)' },
    row:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #1a2030' },
    rowLabel: { fontSize: 11, color: '#6a7590' },
    rowVal:   { fontSize: 11, color: '#dde4f0', fontWeight: 600 },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
    statBox:   { background: '#141820', border: '1px solid #1a2030', borderRadius: 8, padding: 16, textAlign: 'center' },
    statNum:   { fontFamily: 'serif', fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 4 },
    statLabel: { fontSize: 9, color: '#6a7590', letterSpacing: '0.1em', textTransform: 'uppercase' },
    logoutBtn: { marginTop: 24, padding: '10px 24px', background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#ff5252', cursor: 'pointer' },
  };

  return (
    <div style={S.page}>
      <div style={S.tag}>Account</div>
      <h1 style={S.h1}>Your Profile</h1>
      <p style={S.sub}>Account details and research statistics</p>

      <div style={S.card}>
        <div style={S.cardTitle}>Identity</div>
        <div style={S.avatarWrap}>
          <div style={S.avatar}>{(user?.name || 'U')[0].toUpperCase()}</div>
          <div>
            <div style={S.name}>{user?.name}</div>
            <div style={S.email}>{user?.email}</div>
            <span style={S.role}>{user?.role || 'researcher'}</span>
          </div>
        </div>
        {[
          { label: 'Full Name',    val: user?.name },
          { label: 'Email',        val: user?.email },
          { label: 'Role',         val: user?.role || 'researcher' },
          { label: 'Member Since', val: joined },
        ].map(r => (
          <div style={S.row} key={r.label}>
            <span style={S.rowLabel}>{r.label}</span>
            <span style={S.rowVal}>{r.val || '-'}</span>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div style={S.cardTitle}>Research Statistics</div>
          <button onClick={load} style={{background:'none',border:'none',color:'#00e5ff',cursor:'pointer',fontFamily:'monospace',fontSize:10}}>
            {loading ? 'Loading...' : '↺ Refresh'}
          </button>
        </div>
        {loading
          ? <div style={{ fontSize: 11, color: '#6a7590' }}>Loading stats...</div>
          : (
            <div style={S.statsGrid}>
              {[
                { label: 'Total Runs',      val: summary?.total_runs     || 0,  color: '#00e5ff' },
                { label: 'Total Requests',  val: summary?.total_requests || 0,  color: '#b2ff59' },
                { label: 'Avg Violation %', val: Math.round(summary?.avg_violation_rate || 0) + '%', color: parseFloat(summary?.avg_violation_rate) > 10 ? '#ff5252' : '#00e5ff' },
              ].map(s => (
                <div style={S.statBox} key={s.label}>
                  <div style={{ ...S.statNum, color: s.color }}>{s.val}</div>
                  <div style={S.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      <div style={S.card}>
        <div style={S.cardTitle}>System Info</div>
        {[
          { label: 'Backend',     val: 'Node.js + Express' },
          { label: 'Database',    val: 'PostgreSQL' },
          { label: 'Auth',        val: 'JWT (7d expiry)' },
          { label: 'LLM Advisor', val: 'Mock (set ANTHROPIC_API_KEY to activate)' },
          { label: 'TTFT SLO',    val: '< 500ms' },
          { label: 'TPOT SLO',    val: '< 50ms/tok' },
          { label: 'E2E SLO',     val: '< 2000ms' },
        ].map(r => (
          <div style={S.row} key={r.label}>
            <span style={S.rowLabel}>{r.label}</span>
            <span style={S.rowVal}>{r.val}</span>
          </div>
        ))}
      </div>

      <button style={S.logoutBtn} onClick={logout}>Sign Out</button>
    </div>
  );
}
