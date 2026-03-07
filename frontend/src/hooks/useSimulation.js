import { useState, useEffect, useRef, useCallback } from 'react';
import { runsApi, schedulerApi } from '../api';

const NODES = ['edge-gpu', 'edge-cpu', 'device', 'cloud'];
const NODE_META = {
  'edge-gpu': { label: 'Edge GPU', color: '#00e5ff', speed: 1.0 },
  'edge-cpu': { label: 'Edge CPU', color: '#b2ff59', speed: 0.35 },
  'device':   { label: 'Device',   color: '#ffab40', speed: 0.18 },
  'cloud':    { label: 'Cloud',    color: '#ea80fc', speed: 0.85 },
};
const SLO = { ttft: 500, tpot: 50, e2e: 2000 };
const WORKLOADS = {
  interactive: { arrivalRate: 2.2, shortRatio: 0.85 },
  batch:       { arrivalRate: 0.7, shortRatio: 0.15 },
  bursty:      { arrivalRate: 4.5, shortRatio: 0.55 },
  mixed:       { arrivalRate: 1.8, shortRatio: 0.50 },
};
const rand  = (a, b) => Math.random() * (b - a) + a;
const randI = (a, b) => Math.floor(rand(a, b));
let REQ_CTR = 0;

function genRequest(workload) {
  const isShort = Math.random() < workload.shortRatio;
  const priority = isShort
    ? ['interactive','interactive','deadline-critical'][randI(0,3)]
    : ['batch','batch','interactive'][randI(0,3)];
  return {
    requestKey: `r${++REQ_CTR}`,
    priority,
    promptTokens:  isShort ? randI(32,256)   : randI(512,2048),
    outputTokens:  isShort ? randI(64,256)   : randI(512,1500),
  };
}

export function useSimulation() {
  const [running,    setRunning]    = useState(false);
  const [runId,      setRunId]      = useState(null);
  const [queue,      setQueue]      = useState([]);
  const [completed,  setCompleted]  = useState([]);
  const [advisorLog, setAdvisorLog] = useState([]);
  const [nodeLoads,  setNodeLoads]  = useState({'edge-gpu':0,'edge-cpu':0,device:0,cloud:0});
  const [metrics,    setMetrics]    = useState({totalReqs:0,violations:0,avgTTFT:0,avgTPOT:0});
  const [throughputHistory,  setThroughputHistory]  = useState([]);
  const [violationHistory,   setViolationHistory]   = useState([]);
  const [schedulerMode,      setSchedulerMode]      = useState('llm');
  const [workloadKey,        setWorkloadKey]         = useState('mixed');
  const [error,              setError]               = useState(null);
  const stateRef     = useRef({});
  const startTimeRef = useRef(null);
  stateRef.current   = { running, runId, queue, completed, nodeLoads, metrics, schedulerMode, workloadKey };

  const start = useCallback(async () => {
    setError(null);
    REQ_CTR = 0;
    try {
      const { run } = await runsApi.create({
        schedulerMode: stateRef.current.schedulerMode,
        workloadType:  stateRef.current.workloadKey,
        name: `${stateRef.current.schedulerMode} / ${stateRef.current.workloadKey} — ${new Date().toLocaleTimeString()}`,
      });
      setRunId(run.id);
      startTimeRef.current = Date.now();
      setRunning(true);
    } catch (err) { setError(`Failed to start: ${err.message}`); }
  }, []);

  const stop = useCallback(async () => {
    setRunning(false);
    const { runId: rId, metrics: m } = stateRef.current;
    if (!rId) return;
    try {
      await runsApi.end(rId, {
        totalRequests: m.totalReqs, totalViolations: m.violations,
        avgTtft: m.avgTTFT, avgTpot: m.avgTPOT, avgE2e: 0,
        durationMs: Date.now() - (startTimeRef.current || Date.now()),
      });
    } catch(e) { console.error(e.message); }
  }, []);

  const reset = useCallback(() => {
    setRunning(false); setRunId(null); setQueue([]); setCompleted([]);
    setAdvisorLog([]); setNodeLoads({'edge-gpu':0,'edge-cpu':0,device:0,cloud:0});
    setMetrics({totalReqs:0,violations:0,avgTTFT:0,avgTPOT:0});
    setThroughputHistory([]); setViolationHistory([]); setError(null);
    REQ_CTR = 0;
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(async () => {
      const { workloadKey: wk, schedulerMode: sm, runId: rId, nodeLoads: nl, metrics: m } = stateRef.current;
      const workload = WORKLOADS[wk];
      const newRequests = [];
      if (Math.random() < workload.arrivalRate * 0.12) newRequests.push(genRequest(workload));
      if (newRequests.length > 0) setQueue(q => [...q.slice(-29), ...newRequests.map(r => ({ ...r, status: 'queued' }))]);

      const toProcess = newRequests.slice(0, 2);
      if (toProcess.length === 0) {
        setNodeLoads(prev => { const n={...prev}; NODES.forEach(id=>{n[id]=Math.max(0,(n[id]||0)-rand(1,4));}); return n; });
        return;
      }

      try {
        const results = [];
        if (sm === 'llm') {
          for (const req of toProcess) {
            try {
              const res = await schedulerApi.decide({ runId: rId, ...req, schedulerMode: sm, systemState: { nodeLoads: nl, queueDepth: stateRef.current.queue.length, recentViolations: m.violations, schedulerMode: sm } });
              results.push({ req, ...res });
              if (res.advisor) {
                setAdvisorLog(prev => [{ id: req.requestKey, time: new Date().toLocaleTimeString(), text: res.advisor.reasoning, priority: req.priority, node: res.result.assigned_node, action: res.result.slo_violated ? 'WARN' : 'ADMIT', priorityClass: res.advisor.priority_class, costBucket: res.advisor.cost_bucket, latencyMs: res.advisor.latency_ms, provider: res.advisor.provider }, ...prev].slice(0,40));
              }
            } catch(e) { console.error(e.message); }
          }
        } else {
          const res = await schedulerApi.batchDecide({ runId: rId, requests: toProcess, schedulerMode: sm, systemState: { nodeLoads: nl } });
          res.results?.forEach((r,i) => results.push({ req: toProcess[i], result: r }));
        }

        if (results.length > 0) {
          const newCompleted = results.map(r => ({ id: r.req?.requestKey, priority: r.req?.priority, promptTokens: r.req?.promptTokens, outputTokens: r.req?.outputTokens, ttft: r.result?.ttft_ms, tpot: r.result?.tpot_ms, e2e: r.result?.e2e_ms, node: r.result?.assigned_node, status: r.result?.slo_violated ? 'violated' : 'done' }));
          setCompleted(prev => [...newCompleted, ...prev].slice(0,200));
          setMetrics(prev => {
            const all = [...newCompleted, ...stateRef.current.completed].slice(0,50);
            return { totalReqs: prev.totalReqs + newCompleted.length, violations: prev.violations + newCompleted.filter(r=>r.status==='violated').length, avgTTFT: Math.round(all.reduce((s,r)=>s+(r.ttft||0),0)/Math.max(all.length,1)), avgTPOT: Math.round(all.reduce((s,r)=>s+(r.tpot||0),0)/Math.max(all.length,1)*10)/10 };
          });
          const loadDeltas = {'edge-gpu':0,'edge-cpu':0,device:0,cloud:0};
          results.forEach(r => { const n=r.result?.assigned_node; if(n) loadDeltas[n]+=((r.req?.promptTokens||0)+(r.req?.outputTokens||0))/80; });
          setNodeLoads(prev => { const n={...prev}; NODES.forEach(id=>{n[id]=Math.min(100,Math.max(0,(n[id]||0)+(loadDeltas[id]||0)-rand(2,5)));}); return n; });
          setThroughputHistory(h=>[...h,newCompleted.length].slice(-40));
          setViolationHistory(h=>[...h,newCompleted.filter(r=>r.status==='violated').length].slice(-40));
          const processed = new Set(results.map(r=>r.req?.requestKey));
          setQueue(q=>q.filter(r=>!processed.has(r.requestKey)));
        }
      } catch(err) { console.error(err.message); }
    }, 1500);
    return () => clearInterval(interval);
  }, [running]);

  const violationRate = metrics.totalReqs > 0 ? Math.round((metrics.violations/metrics.totalReqs)*100) : 0;
  return { running, start, stop, reset, runId, queue, completed, advisorLog, nodeLoads, NODE_META, metrics: { ...metrics, violationRate }, throughputHistory, violationHistory, schedulerMode, setSchedulerMode, workloadKey, setWorkloadKey, error, SLO };
}
