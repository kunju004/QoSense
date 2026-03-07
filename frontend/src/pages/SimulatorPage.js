const SCHEDULERS = { llm:{label:'LLM-Guided (Ours)',color:'#00e5ff'}, fcfs:{label:'FCFS (Baseline)',color:'#ff5252'}, orca:{label:'Orca',color:'#ffab40'}, sarathi:{label:'Sarathi-Serve',color:'#b2ff59'} };
const WORKLOADS  = { interactive:{label:'Interactive',color:'#00e5ff'}, batch:{label:'Batch',color:'#b2ff59'}, bursty:{label:'Bursty',color:'#ffab40'}, mixed:{label:'Mixed',color:'#ea80fc'} };

function PriBadge({ p, tiny }) {
  const c = {'interactive':'#00e5ff','deadline-critical':'#ff5252','batch':'#b2ff59'}[p]||'#888';
  const label = tiny ? {'interactive':'INTR','deadline-critical':'CRIT','batch':'BTCH'}[p]||p : p;
  return <span style={{display:'inline-block',padding:tiny?'1px 5px':'2px 7px',borderRadius:3,border:'1px solid '+c+'44',background:c+'10',color:c,fontSize:tiny?8:9,fontFamily:'monospace',fontWeight:600,whiteSpace:'nowrap'}}>{label}</span>;
}

function SLOVal({ val, slo, unit }) {
  if (val==null) return <span style={{color:'#36404f',fontSize:10,fontFamily:'monospace'}}>-</span>;
  return <span style={{color:val<=slo?'#b2ff59':'#ff5252',fontSize:10,fontFamily:'monospace'}}>{val}{unit}</span>;
}

function Sparkline({ title, data, color }) {
  const W=240, H=56;
  if (data.length < 2) return (
    <div style={{background:'#0f1219',border:'1px solid #1a2030',borderRadius:8,padding:12}}>
      <div style={{fontFamily:'monospace',fontSize:9,color:'#6a7590',marginBottom:6}}>{title}</div>
      <div style={{height:H,display:'flex',alignItems:'center',justifyContent:'center',color:'#36404f',fontSize:10}}>No data</div>
    </div>
  );
  const max=Math.max(...data,1);
  const pts=data.map((v,i)=>((i/(data.length-1))*W)+','+(H-(v/max)*(H-6)-3)).join(' ');
  return (
    <div style={{background:'#0f1219',border:'1px solid #1a2030',borderRadius:8,padding:12}}>
      <div style={{fontFamily:'monospace',fontSize:9,color:'#6a7590',marginBottom:6}}>{title}</div>
      <svg width="100%" height={H} viewBox={'0 0 '+W+' '+H} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
      <div style={{fontFamily:'serif',fontSize:16,fontWeight:700,color:color,marginTop:2}}>
        {data[data.length-1]} <span style={{fontFamily:'monospace',fontSize:9,color:'#36404f'}}>latest</span>
      </div>
    </div>
  );
}

export default function SimulatorPage({ sim }) {
  const sched  = SCHEDULERS[sim.schedulerMode];
  const workld = WORKLOADS[sim.workloadKey];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:'monospace',color:'#dde4f0'}}>

      <div style={{display:'flex',alignItems:'center',gap:16,padding:'10px 20px',borderBottom:'1px solid #1a2030',background:'#0d1018',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:9,letterSpacing:'0.18em',color:'#6a7590',minWidth:70}}>SCHEDULER</span>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {Object.entries(SCHEDULERS).map(([k,s])=>(
              <button key={k} onClick={()=>!sim.running&&sim.setSchedulerMode(k)} disabled={sim.running}
                style={{padding:'5px 11px',background:sim.schedulerMode===k?s.color+'11':'transparent',border:'1px solid '+(sim.schedulerMode===k?s.color:'#232d40'),borderRadius:4,fontFamily:'monospace',fontSize:10,color:sim.schedulerMode===k?s.color:'#6a7590',cursor:'pointer'}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:9,letterSpacing:'0.18em',color:'#6a7590',minWidth:70}}>WORKLOAD</span>
          <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
            {Object.entries(WORKLOADS).map(([k,w])=>(
              <button key={k} onClick={()=>sim.setWorkloadKey(k)}
                style={{padding:'5px 11px',background:sim.workloadKey===k?w.color+'11':'transparent',border:'1px solid '+(sim.workloadKey===k?w.color:'#232d40'),borderRadius:4,fontFamily:'monospace',fontSize:10,color:sim.workloadKey===k?w.color:'#6a7590',cursor:'pointer'}}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginLeft:'auto'}}>
          {sim.runId && <span style={{fontSize:9,color:'#36404f'}}>RUN: {sim.runId.slice(0,8)}</span>}
          <button onClick={sim.running?sim.stop:sim.start}
            style={{padding:'7px 18px',border:sim.running?'1px solid rgba(255,82,82,0.3)':'none',borderRadius:5,fontFamily:'serif',fontSize:12,fontWeight:700,cursor:'pointer',background:sim.running?'rgba(255,82,82,0.12)':'#00e5ff',color:sim.running?'#ff5252':'#000'}}>
            {sim.running?'Pause':'Run'}
          </button>
          <button onClick={sim.reset} style={{padding:'7px 12px',background:'transparent',border:'1px solid #232d40',borderRadius:5,fontFamily:'monospace',fontSize:10,color:'#6a7590',cursor:'pointer'}}>Reset</button>
        </div>
      </div>

      {sim.error && <div style={{background:'rgba(255,82,82,0.1)',border:'1px solid rgba(255,82,82,0.3)',padding:'8px 20px',fontSize:11,color:'#ff5252'}}>{sim.error}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 400px',flex:1,overflow:'hidden'}}>
        <div style={{display:'flex',flexDirection:'column',gap:12,padding:16,overflowY:'auto',borderRight:'1px solid #1a2030'}}>

          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
            {[
              {label:'Total Requests',val:sim.metrics.totalReqs,unit:'',color:'#00e5ff'},
              {label:'Avg TTFT',val:sim.metrics.avgTTFT,unit:'ms',color:sim.metrics.avgTTFT>500?'#ff5252':'#00e5ff'},
              {label:'Avg TPOT',val:sim.metrics.avgTPOT,unit:'ms',color:sim.metrics.avgTPOT>50?'#ff5252':'#b2ff59'},
              {label:'SLO Violations',val:sim.metrics.violationRate,unit:'%',color:sim.metrics.violationRate>10?'#ff5252':'#00e5ff'},
            ].map(m=>(
              <div key={m.label} style={{background:'#0f1219',border:'1px solid #1a2030',borderRadius:8,padding:14}}>
                <div style={{fontSize:9,letterSpacing:'0.12em',color:'#6a7590',textTransform:'uppercase',marginBottom:7}}>{m.label}</div>
                <div style={{fontFamily:'serif',fontSize:26,fontWeight:700,color:m.color,lineHeight:1}}>
                  {m.val}<span style={{fontFamily:'monospace',fontSize:11,fontWeight:400,marginLeft:2}}>{m.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{background:'#0f1219',border:'1px solid #1a2030',borderRadius:8,overflow:'hidden'}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'9px 14px',borderBottom:'1px solid #1a2030',background:'#0d1018'}}>
              <span style={{fontSize:9,letterSpacing:'0.2em',color:'#dde4f0',fontWeight:600}}>NODE CLUSTER</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,padding:12}}>
              {Object.entries(sim.NODE_META).map(([id,meta])=>{
                const load=Math.min(100,Math.round(sim.nodeLoads[id]||0));
                const lc=load>85?'#ff5252':load>60?'#ffab40':meta.color;
                return (
                  <div key={id} style={{background:'#141820',border:'1px solid #1a2030',borderRadius:6,padding:10}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:meta.color,display:'inline-block',flexShrink:0}}/>
                      <span style={{fontSize:10,fontWeight:600,color:'#dde4f0'}}>{meta.label}</span>
                    </div>
                    <div style={{height:3,background:'#1a2030',borderRadius:2,marginBottom:6}}>
                      <div style={{height:3,borderRadius:2,width:load+'%',background:lc,transition:'width 0.4s ease'}}/>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:9}}>
                      <span style={{color:lc}}>{load}%</span>
                      <span style={{color:'#6a7590'}}>{sim.completed.filter(r=>r.node===id).length} reqs</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Sparkline title="THROUGHPUT" data={sim.throughputHistory} color="#00e5ff"/>
            <Sparkline title="SLO VIOLATIONS" data={sim.violationHistory} color="#ff5252"/>
          </div>

          <div style={{background:'#0f1219',border:'1px solid #1a2030',borderRadius:8,overflow:'hidden'}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'9px 14px',borderBottom:'1px solid #1a2030',background:'#0d1018'}}>
              <span style={{fontSize:9,letterSpacing:'0.2em',color:'#dde4f0',fontWeight:600}}>REQUEST QUEUE</span>
              <span style={{fontSize:10,color:'#6a7590'}}>{sim.queue.length} waiting</span>
            </div>
            <div style={{maxHeight:180,overflowY:'auto',padding:8,display:'flex',flexDirection:'column',gap:3}}>
              {sim.queue.length===0 && <div style={{padding:16,textAlign:'center',color:'#36404f',fontSize:11}}>{sim.running?'Queue flowing...':'Start simulation'}</div>}
              {sim.queue.slice(0,10).map(r=>(
                <div key={r.requestKey} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',background:'#141820',borderRadius:4}}>
                  <PriBadge p={r.priority}/>
                  <span style={{color:'#6a7590',flex:1,fontSize:10}}>{r.requestKey}</span>
                  <span style={{color:'#36404f',fontSize:10}}>{r.promptTokens} to {r.outputTokens} tok</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:12,padding:16,overflowY:'auto'}}>
          <div style={{background:'#0f1219',border:'1px solid #1a2030',borderRadius:8,overflow:'hidden'}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'9px 14px',borderBottom:'1px solid #1a2030',background:'#0d1018'}}>
              <span style={{fontSize:9,letterSpacing:'0.2em',color:sim.schedulerMode==='llm'?'#00e5ff':'#dde4f0',fontWeight:600}}>LLM ADVISOR</span>
              <span style={{fontSize:10,color:'#6a7590'}}>{sim.advisorLog.length} decisions</span>
            </div>
            <div style={{maxHeight:320,overflowY:'auto',padding:6,display:'flex',flexDirection:'column',gap:2}}>
              {sim.advisorLog.length===0 && <div style={{padding:20,textAlign:'center',color:'#36404f',fontSize:11}}>Advisor decisions stream here...</div>}
              {sim.advisorLog.map((e,i)=>{
                const nc={'edge-gpu':'#00e5ff','edge-cpu':'#b2ff59','device':'#ffab40','cloud':'#ea80fc'}[e.node]||'#888';
                return (
                  <div key={e.id+i} style={{padding:'8px 10px',borderRadius:5,background:'#141820',border:i===0?'1px solid rgba(0,229,255,0.2)':'1px solid transparent',marginBottom:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:5,flexWrap:'wrap'}}>
                      <span style={{fontSize:9,color:'#36404f'}}>{e.time}</span>
                      <PriBadge p={e.priority} tiny={true}/>
                      {e.costBucket && <span style={{fontSize:8,color:'#6a7590',background:'#1a2030',padding:'1px 5px',borderRadius:3}}>{e.costBucket}</span>}
                      <span style={{color:nc,fontSize:9,fontWeight:600,marginLeft:'auto'}}>to {e.node}</span>
                      <span style={{fontSize:8,fontWeight:700,padding:'1px 6px',borderRadius:3,background:e.action==='WARN'?'rgba(255,82,82,0.1)':'rgba(178,255,89,0.1)',color:e.action==='WARN'?'#ff5252':'#b2ff59'}}>{e.action}</span>
                    </div>
                    <div style={{fontSize:10,color:'#6a7590',lineHeight:1.5}}>{e.text}</div>
                    {e.latencyMs!=null && <div style={{fontSize:8,color:'#36404f',marginTop:4}}>advisor latency: {e.latencyMs}ms</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{background:'#0f1219',border:'1px solid #1a2030',borderRadius:8,overflow:'hidden',flex:1}}>
            <div style={{display:'flex',justifyContent:'space-between',padding:'9px 14px',borderBottom:'1px solid #1a2030',background:'#0d1018'}}>
              <span style={{fontSize:9,letterSpacing:'0.2em',color:'#dde4f0',fontWeight:600}}>COMPLETED REQUESTS</span>
              <span style={{fontSize:10,color:'#6a7590'}}>{sim.completed.length} total</span>
            </div>
            <div style={{overflowY:'auto',maxHeight:360}}>
              <div style={{display:'grid',gridTemplateColumns:'44px 68px 66px 54px 70px 70px 58px',gap:4,padding:'6px 12px',borderBottom:'1px solid #1a2030',background:'#0d1018'}}>
                {['ID','Priority','TTFT','TPOT','E2E','Node','Status'].map(h=>(
                  <span key={h} style={{fontSize:8,letterSpacing:'0.1em',color:'#36404f',textTransform:'uppercase'}}>{h}</span>
                ))}
              </div>
              {sim.completed.length===0 && <div style={{padding:20,textAlign:'center',color:'#36404f',fontSize:11}}>Results appear here...</div>}
              {sim.completed.slice(0,20).map(r=>{
                const nm=sim.NODE_META[r.node];
                return (
                  <div key={r.id} style={{display:'grid',gridTemplateColumns:'44px 68px 66px 54px 70px 70px 58px',gap:4,padding:'6px 12px',borderBottom:'1px solid #1a2030',alignItems:'center',background:r.status==='violated'?'rgba(255,82,82,0.04)':'transparent'}}>
                    <span style={{color:'#6a7590',fontSize:10}}>{r.id}</span>
                    <PriBadge p={r.priority} tiny={true}/>
                    <SLOVal val={r.ttft} slo={sim.SLO.ttft} unit="ms"/>
                    <SLOVal val={r.tpot} slo={sim.SLO.tpot} unit=""/>
                    <SLOVal val={r.e2e}  slo={sim.SLO.e2e}  unit="ms"/>
                    <span style={{color:nm?nm.color:'#888',fontSize:10}}>{nm?nm.label:'-'}</span>
                    <span style={{color:r.status==='done'?'#b2ff59':'#ff5252',fontSize:9,fontWeight:700}}>{r.status==='done'?'OK':'VIOL'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',padding:'8px 20px',borderTop:'1px solid #1a2030',background:'#0d1018',fontSize:9,color:'#36404f',flexWrap:'wrap',gap:6}}>
        <span>Adaptive QoS-Aware Scheduling with LLM-Guided Decision Making</span>
        <span>SLO: TTFT 500ms / TPOT 50ms/tok / E2E 2000ms</span>
        <span style={{color:sched.color}}>{sched.label} / {workld.label}</span>
      </div>
    </div>
  );
}
