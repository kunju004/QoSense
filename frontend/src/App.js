import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSimulation } from './hooks/useSimulation';
import AuthPage      from './pages/AuthPage';
import SimulatorPage from './pages/SimulatorPage';
import HistoryPage   from './pages/HistoryPage';
import ProfilePage   from './pages/ProfilePage';

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:1000,
      background:'#0f1219', border:'1px solid #00e5ff',
      borderRadius:10, padding:'16px 20px', minWidth:280,
      boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
      animation:'slideUp 0.3s ease', fontFamily:'monospace',
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
        <div style={{fontSize:9,letterSpacing:'0.18em',color:'#00e5ff',textTransform:'uppercase',fontWeight:600}}>Run Completed</div>
        <button onClick={onClose} style={{background:'none',border:'none',color:'#36404f',cursor:'pointer',fontSize:14,lineHeight:1,padding:0}}>✕</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {[
          { label:'Requests',   val: toast.totalReqs,             color:'#00e5ff' },
          { label:'Violations', val: toast.violationRate + '%',    color: toast.violationRate > 10 ? '#ff5252' : '#b2ff59' },
          { label:'Avg TTFT',   val: toast.avgTTFT + 'ms',         color: toast.avgTTFT > 500 ? '#ff5252' : '#dde4f0' },
          { label:'Avg TPOT',   val: toast.avgTPOT + 'ms',         color: toast.avgTPOT > 50  ? '#ff5252' : '#dde4f0' },
        ].map(s => (
          <div key={s.label} style={{background:'#141820',borderRadius:6,padding:'8px 10px'}}>
            <div style={{fontSize:8,color:'#6a7590',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:3}}>{s.label}</div>
            <div style={{fontFamily:'serif',fontSize:18,fontWeight:700,color:s.color}}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{marginTop:10,fontSize:9,color:'#6a7590'}}>Saved to Run History</div>
    </div>
  );
}

function AppShell() {
  const { user, logout } = useAuth();
  const [page, setPage]   = useState('sim');
  const [toast, setToast] = useState(null);
  const sim = useSimulation();
  const wasRunning = useRef(false);

  useEffect(() => {
    if (wasRunning.current && !sim.running && sim.metrics.totalReqs > 0) {
      setToast({
        totalReqs:     sim.metrics.totalReqs,
        violationRate: sim.metrics.violationRate,
        avgTTFT:       sim.metrics.avgTTFT,
        avgTPOT:       sim.metrics.avgTPOT,
      });
    }
    wasRunning.current = sim.running;
  }, [sim.running]);

  const NAV = [
    { id:'sim',     icon:'⬡', label:'Simulator'  },
    { id:'history', icon:'◈', label:'Run History' },
    { id:'profile', icon:'○', label:'Profile'     },
  ];

  const PAGE_TITLES = {
    sim:     { tag:'Live Simulation',  title:'Adaptive QoS-Aware Scheduler' },
    history: { tag:'Database Records', title:'Simulation History'           },
    profile: { tag:'Account',          title:'Your Profile'                 },
  };

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#080a0f',fontFamily:'monospace'}}>
      <aside style={{width:190,display:'flex',flexDirection:'column',background:'#0f1219',borderRight:'1px solid #1a2030',flexShrink:0}}>
        <div style={{flex:1,padding:'20px 0',overflowY:'auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'0 16px 20px',borderBottom:'1px solid #1a2030',marginBottom:12}}>
            <svg width="20" height="20" viewBox="0 0 20 20">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#00e5ff" strokeWidth="1.5"/>
              <circle cx="10" cy="10" r="2.5" fill="#00e5ff"/>
            </svg>
            <div>
              <div style={{fontFamily:'serif',fontSize:12,fontWeight:700,color:'#dde4f0'}}>QoS Scheduler</div>
              <div style={{fontSize:9,color:'#6a7590',marginTop:1}}>Edge Inference</div>
            </div>
          </div>

          {NAV.map(n => (
            <div key={n.id} onClick={() => setPage(n.id)}
              style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',fontSize:11,color:page===n.id?'#00e5ff':'#6a7590',cursor:'pointer',borderLeft:'2px solid '+(page===n.id?'#00e5ff':'transparent'),background:page===n.id?'rgba(0,229,255,0.05)':'transparent',userSelect:'none'}}>
              <span style={{fontSize:13,width:16,textAlign:'center'}}>{n.icon}</span>
              <span>{n.label}</span>
              {n.id==='sim' && sim.running && (
                <span style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:'#00e5ff',animation:'pulse 1.2s ease-in-out infinite',flexShrink:0}}/>
              )}
            </div>
          ))}
        </div>

        <div style={{padding:14,borderTop:'1px solid #1a2030'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,cursor:'pointer'}} onClick={() => setPage('profile')}>
            <div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,#00e5ff,#7b61ff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#000',flexShrink:0}}>
              {(user?.name||'U')[0].toUpperCase()}
            </div>
            <div>
              <div style={{fontSize:10,color:'#dde4f0'}}>{user?.name}</div>
              <div style={{fontSize:9,color:'#6a7590',overflow:'hidden',textOverflow:'ellipsis',maxWidth:120}}>{user?.email}</div>
            </div>
          </div>
          <button onClick={logout} style={{width:'100%',background:'none',border:'1px solid #1a2030',borderRadius:5,padding:6,fontFamily:'monospace',fontSize:10,color:'#6a7590',cursor:'pointer'}}>Sign out</button>
        </div>
      </aside>

      <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid #1a2030',background:'#0f1219',flexShrink:0}}>
          <div>
            <div style={{fontSize:9,letterSpacing:'0.2em',color:'#00e5ff',textTransform:'uppercase',marginBottom:3}}>
              {PAGE_TITLES[page]?.tag}
            </div>
            <h1 style={{fontFamily:'serif',fontSize:18,fontWeight:700,color:'#dde4f0',margin:0}}>
              {PAGE_TITLES[page]?.title}
            </h1>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:sim.running?'#00e5ff':'#b2ff59',animation:sim.running?'pulse 1.2s ease-in-out infinite':'none'}}/>
            <span style={{fontSize:9,letterSpacing:'0.15em',color:'#6a7590'}}>{sim.running?'SIMULATION RUNNING':'BACKEND CONNECTED'}</span>
          </div>
        </header>

        <div style={{flex:1,overflow:'auto',display:'flex',flexDirection:'column'}}>
          <div style={{display:page==='sim'?'flex':'none',flex:1,flexDirection:'column'}}><SimulatorPage sim={sim}/></div>
          <div style={{display:page==='history'?'block':'none',flex:1}}><HistoryPage active={page==='history'}/></div>
          <div style={{display:page==='profile'?'block':'none',flex:1}}><ProfilePage active={page==='profile'}/></div>
        </div>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)}/>
    </div>
  );
}

function Root() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#080a0f',color:'#6a7590',fontFamily:'monospace',fontSize:12}}>
      Initializing...
    </div>
  );
  return user ? <AppShell/> : <AuthPage/>;
}

export default function App() {
  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{height:100%}
        body{background:#080a0f;color:#dde4f0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#1a2030;border-radius:2px}
      `}</style>
      <AuthProvider><Root/></AuthProvider>
    </>
  );
}
