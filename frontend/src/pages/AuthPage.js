import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [mode, setMode]   = useState('login');
  const [form, setForm]   = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.email || !form.password) return setError('Please fill in all fields.');
    if (mode === 'signup' && !form.name) return setError('Name is required.');
    setLoading(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await signup(form.name, form.email, form.password);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const S = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080a0f', padding: 20 },
    card: { width: '100%', maxWidth: 400, background: '#0f1219', border: '1px solid #1a2030', borderRadius: 12, padding: 36 },
    logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 },
    logoText: { fontFamily: 'monospace', fontSize: 13, color: '#00e5ff' },
    title: { fontFamily: 'serif', fontSize: 24, fontWeight: 700, color: '#dde4f0', marginBottom: 4 },
    sub: { fontFamily: 'monospace', fontSize: 11, color: '#6a7590', marginBottom: 24 },
    error: { background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)', borderRadius: 6, padding: '9px 12px', fontSize: 11, color: '#ff5252', marginBottom: 14, fontFamily: 'monospace' },
    label: { display: 'block', fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.15em', color: '#6a7590', textTransform: 'uppercase', marginBottom: 5 },
    input: { width: '100%', background: '#141820', border: '1px solid #1a2030', borderRadius: 6, padding: '9px 12px', fontFamily: 'monospace', fontSize: 12, color: '#dde4f0', outline: 'none', boxSizing: 'border-box', marginBottom: 14 },
    btn: { display: 'block', width: '100%', padding: 11, background: '#00e5ff', color: '#000', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 8 },
    switchRow: { textAlign: 'center', marginTop: 18, fontFamily: 'monospace', fontSize: 11, color: '#6a7590' },
    link: { background: 'none', border: 'none', color: '#00e5ff', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, textDecoration: 'underline' },
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logoRow}>
          <svg width="22" height="22" viewBox="0 0 22 22">
            <polygon points="11,1 21,6 21,16 11,21 1,16 1,6" fill="none" stroke="#00e5ff" strokeWidth="1.5"/>
            <circle cx="11" cy="11" r="3" fill="#00e5ff"/>
          </svg>
          <span style={S.logoText}>QoS Scheduler</span>
        </div>
        <h1 style={S.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p style={S.sub}>{mode === 'login' ? 'Sign in to your research dashboard' : 'Join the simulation platform'}</p>
        {error && <div style={S.error}>{error}</div>}
        {mode === 'signup' && <>
          <label style={S.label}>Full Name</label>
          <input style={S.input} type="text" placeholder="Dr. Jane Doe" value={form.name} onChange={e => set('name', e.target.value)} />
        </>}
        <label style={S.label}>Email</label>
        <input style={S.input} type="email" placeholder="researcher@university.edu" value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <label style={S.label}>Password</label>
        <input style={S.input} type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <button style={{ ...S.btn, opacity: loading ? 0.6 : 1 }} onClick={submit} disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>
        <div style={S.switchRow}>
          {mode === 'login'
            ? <><span>No account? </span><button style={S.link} onClick={() => { setMode('signup'); setError(''); }}>Sign up</button></>
            : <><span>Have an account? </span><button style={S.link} onClick={() => { setMode('login'); setError(''); }}>Sign in</button></>}
        </div>
      </div>
    </div>
  );
}
