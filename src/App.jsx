import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceDot
} from "recharts";

const VT = 0.02585, IS_BJT = 1e-15, IS_D = 1e-12, VA = 80;
const IDSS = 10e-3, VP = -4;
const KN = 2e-3, VTH_MOS = 2;
const VTH_IGBT = 6, GM_IGBT = 8;

// ── Shared UI ─────────────────────────────────────────────────────────
function DigitalMeter({ label, value, unit, color, sub }) {
  const d = typeof value === "number" && isFinite(value)
    ? unit === "μA" ? (value * 1e6).toFixed(3)
    : unit === "mA" ? (value * 1e3).toFixed(3)
    : unit === "nA" ? (value * 1e9).toFixed(3)
    : value.toFixed(3)
    : "---";
  return (
    <div style={{ background:"linear-gradient(135deg,#080f08,#0d1a0d)", border:`1px solid ${color}33`,
      borderTop:`2px solid ${color}`, borderRadius:8, padding:"10px 14px", textAlign:"center", flex:1, minWidth:100 }}>
      <div style={{ color:"#667766", fontSize:10, fontFamily:"monospace", marginBottom:4 }}>
        {label}{sub && <sub style={{fontSize:8}}>{sub}</sub>}
      </div>
      <div style={{ color, fontSize:20, fontFamily:"'Courier New',monospace", fontWeight:"bold",
        textShadow:`0 0 8px ${color}`, letterSpacing:2 }}>{d}</div>
      <div style={{ color:`${color}77`, fontSize:10, fontFamily:"monospace" }}>{unit}</div>
    </div>
  );
}

function Ctrl({ label, value, min, max, step, onChange, unit, color="#64ffda", log }) {
  const toS = v => log ? Math.log10(v) : v;
  const frS = v => log ? Math.pow(10, v) : v;
  const sv = toS(value), smin = toS(min), smax = toS(max);
  const pct = ((sv - smin) / (smax - smin)) * 100;
  const disp = value >= 1e6 ? `${(value/1e6).toFixed(2)}M`
    : value >= 1000 ? `${(value/1000).toFixed(1)}k`
    : value >= 1 ? value.toFixed(1) : value.toFixed(2);
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ color:"#aabba0", fontSize:11, fontFamily:"monospace" }}>{label}</span>
        <span style={{ color, fontSize:11, fontFamily:"monospace", fontWeight:"bold" }}>{disp} {unit}</span>
      </div>
      <input type="range" min={smin} max={smax} step={log ? 0.01 : step} value={sv}
        onChange={e => onChange(frS(parseFloat(e.target.value)))}
        style={{ width:"100%", accentColor:color, cursor:"pointer",
          background:`linear-gradient(to right,${color} 0%,${color} ${pct}%,#1a2a1a ${pct}%,#1a2a1a 100%)`,
          height:4, borderRadius:2, outline:"none", appearance:"none" }}/>
    </div>
  );
}

const P = (extra={}) => ({ background:"#050f05", border:"1px solid #1a3a1a", borderRadius:10, padding:14, ...extra });
const LBL = ({ text }) => <div style={{ fontSize:10, color:"#446644", marginBottom:10, letterSpacing:2 }}>◈ {text}</div>;

// ── BJT ───────────────────────────────────────────────────────────────
function BJTSimulator() {
  const [vbb,setVbb]=useState(3), [vcc,setVcc]=useState(10);
  const [rb,setRb]=useState(100000), [rc,setRc]=useState(2000);
  const [beta,setBeta]=useState(100), [mode,setMode]=useState("input");
  const VCE_VALS=[1,2,5,10], IB_VALS=[10,20,40,60,80,100];
  const VC=["#00ff88","#44ccff","#ff8844","#ff44aa"];
  const IC=["#00ff88","#44ccff","#ffcc44","#ff8844","#ff44aa","#cc44ff"];

  const {vbe_op,ib_op,ic_op,vce_op}=useMemo(()=>{
    if(vbb<0.6) return {vbe_op:vbb,ib_op:0,ic_op:0,vce_op:vcc};
    let vbe=0.7,ib=0,ic=0,vce=vcc;
    for(let i=0;i<50;i++){
      ib=(vbb-vbe)/rb; if(ib<0){ib=0;break;}
      ic=beta*ib*(1+vce/VA); vce=vcc-ic*rc;
      if(vce<0.2){vce=0.2;ic=(vcc-vce)/rc;ib=ic/beta;vbe=0.75;break;}
      const vbe_new=VT*Math.log(ib/(IS_BJT/beta)+1);
      if(Math.abs(vbe_new-vbe)<1e-6) break;
      vbe=vbe_new;
    }
    return {vbe_op:Math.min(vbe,0.9),ib_op:Math.max(0,ib),ic_op:Math.max(0,ic),vce_op:Math.max(0.1,vce)};
  },[vbb,vcc,rb,rc,beta]);

  const inputData=useMemo(()=>Array.from({length:81},(_,i)=>{
    const vbe=i*0.01; const row={vbe};
    VCE_VALS.forEach(v=>{row[`vce${v}`]=Math.max(0,Math.min((IS_BJT/beta)*(Math.exp(Math.min(vbe/VT,25))-1)*(1+v/VA)*1e6,300));});
    return row;
  }),[beta]);

  const outputData=useMemo(()=>Array.from({length:101},(_,i)=>{
    const vce=i*0.15; const row={vce};
    IB_VALS.forEach(ib_ua=>{
      const ib=ib_ua*1e-6;
      row[`ib${ib_ua}`]=Math.max(0,Math.min((vce<0.2?(vce/0.2):1)*beta*ib*(1+vce/VA)*1000,60));
    });
    return row;
  }),[beta]);

  const tableData=useMemo(()=>Array.from({length:17},(_,i)=>{
    const vbe=0.4+i*0.025;
    const ib=(IS_BJT/beta)*(Math.exp(Math.min(vbe/VT,25))-1)*(1+vce_op/VA)*1e6;
    return {vbe:vbe.toFixed(3),ib:ib<0.001?"≈0":ib.toFixed(2),ic:(ib*beta/1000).toFixed(3),isOp:Math.abs(vbe-vbe_op)<0.015};
  }),[beta,vce_op,vbe_op]);

  const wc="#64ffda";
  return (
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={P()}>
          <LBL text="NPN BJT — COMMON EMITTER"/>
          <svg viewBox="0 0 320 280" width="100%" style={{maxHeight:260}}>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a2a1a" strokeWidth="0.5"/></pattern>
              <filter id="glo"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <rect width="320" height="280" fill="#080f08" rx="6"/>
            <rect width="320" height="280" fill="url(#grid)" rx="6"/>
            <text x="12" y="52" fill="#aed6a0" fontSize="10" fontFamily="monospace">V_BB={vbb.toFixed(1)}V</text>
            <line x1="22" y1="68" x2="22" y2="80" stroke={wc} strokeWidth="1.5"/>
            <line x1="16" y1="80" x2="28" y2="80" stroke={wc} strokeWidth="2.5"/>
            <line x1="18" y1="84" x2="26" y2="84" stroke={wc} strokeWidth="1.5"/>
            <line x1="16" y1="88" x2="28" y2="88" stroke={wc} strokeWidth="2.5"/>
            <line x1="22" y1="92" x2="22" y2="100" stroke={wc} strokeWidth="1.5"/>
            <line x1="22" y1="68" x2="22" y2="40" stroke={wc} strokeWidth="1.5"/>
            <line x1="22" y1="40" x2="80" y2="40" stroke={wc} strokeWidth="1.5"/>
            <polyline points="80,40 84,32 88,48 92,32 96,48 100,32 104,48 108,40" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#glo)"/>
            <text x="87" y="28" fill="#ffcc44" fontSize="9" fontFamily="monospace">R_B={Math.round(rb/1000)}kΩ</text>
            <line x1="108" y1="40" x2="140" y2="40" stroke={wc} strokeWidth="1.5"/>
            <circle cx="140" cy="40" r="2.5" fill={wc}/>
            <line x1="140" y1="40" x2="140" y2="140" stroke={wc} strokeWidth="1.5"/>
            <text x="258" y="22" fill="#aed6a0" fontSize="10" fontFamily="monospace">V_CC={vcc.toFixed(1)}V</text>
            <line x1="268" y1="38" x2="268" y2="60" stroke={wc} strokeWidth="1.5"/>
            <polyline points="268,60 272,52 276,68 280,52 284,68 288,52 292,68 296,60" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#glo)"/>
            <text x="268" y="48" fill="#ffcc44" fontSize="9" fontFamily="monospace">R_C={(rc/1000).toFixed(1)}kΩ</text>
            <line x1="268" y1="68" x2="268" y2="120" stroke={wc} strokeWidth="1.5"/>
            <circle cx="268" cy="120" r="2.5" fill={wc}/>
            <circle cx="200" cy="155" r="32" fill="none" stroke={vbe_op>=0.6?"#00ff88":"#1a4a1a"} strokeWidth="2" filter={vbe_op>=0.6?"url(#glo)":""}/>
            <line x1="155" y1="140" x2="172" y2="140" stroke={vbe_op>=0.6?"#00ff88":"#336633"} strokeWidth="2.5"/>
            <line x1="172" y1="125" x2="172" y2="155" stroke={vbe_op>=0.6?"#00ff88":"#336633"} strokeWidth="2.5"/>
            <line x1="172" y1="128" x2="215" y2="108" stroke={vbe_op>=0.6?"#00ff88":"#336633"} strokeWidth="2.5"/>
            <line x1="172" y1="152" x2="215" y2="172" stroke={vbe_op>=0.6?"#00ff88":"#336633"} strokeWidth="2.5"/>
            <polygon points="205,167 215,172 210,162" fill={vbe_op>=0.6?"#00ff88":"#336633"}/>
            <text x="190" y="158" fill={vbe_op>=0.6?"#00ff88":"#336633"} fontSize="11" fontFamily="monospace" fontWeight="bold">NPN</text>
            <line x1="140" y1="140" x2="155" y2="140" stroke={wc} strokeWidth="1.5"/>
            <line x1="215" y1="108" x2="268" y2="108" stroke={wc} strokeWidth="1.5"/>
            <line x1="268" y1="108" x2="268" y2="120" stroke={wc} strokeWidth="1.5"/>
            <line x1="215" y1="172" x2="215" y2="230" stroke={wc} strokeWidth="1.5"/>
            <line x1="215" y1="230" x2="22" y2="230" stroke={wc} strokeWidth="1.5"/>
            <line x1="22" y1="230" x2="22" y2="100" stroke={wc} strokeWidth="1.5"/>
            <line x1="215" y1="230" x2="215" y2="245" stroke={wc} strokeWidth="1.5"/>
            <line x1="200" y1="245" x2="230" y2="245" stroke={wc} strokeWidth="2.5"/>
            <line x1="205" y1="250" x2="225" y2="250" stroke={wc} strokeWidth="1.8"/>
            <line x1="210" y1="255" x2="220" y2="255" stroke={wc} strokeWidth="1.2"/>
            <text x="206" y="268" fill="#64ffda" fontSize="9" fontFamily="monospace">GND</text>
            <circle cx="75" cy="170" r="14" fill="#0a1a0a" stroke="#44aaff" strokeWidth="1.5"/>
            <text x="75" y="168" fill="#44aaff" fontSize="7" fontFamily="monospace" textAnchor="middle">VBE</text>
            <text x="75" y="178" fill="#44aaff" fontSize="7" fontFamily="monospace" textAnchor="middle">{vbe_op.toFixed(3)}V</text>
            <circle cx="300" cy="155" r="14" fill="#0a1a0a" stroke="#ff8844" strokeWidth="1.5"/>
            <text x="300" y="153" fill="#ff8844" fontSize="7" fontFamily="monospace" textAnchor="middle">VCE</text>
            <text x="300" y="163" fill="#ff8844" fontSize="7" fontFamily="monospace" textAnchor="middle">{vce_op.toFixed(2)}V</text>
            <circle cx="120" cy="40" r="10" fill="#0a1a0a" stroke="#ff44aa" strokeWidth="1.5"/>
            <text x="120" y="43" fill="#ff44aa" fontSize="8" fontFamily="monospace" textAnchor="middle">A</text>
            <text x="120" y="55" fill="#ff88cc" fontSize="7" fontFamily="monospace" textAnchor="middle">{(ib_op*1e6).toFixed(1)}μA</text>
            <circle cx="268" cy="90" r="10" fill="#0a1a0a" stroke="#44ffaa" strokeWidth="1.5"/>
            <text x="268" y="93" fill="#44ffaa" fontSize="8" fontFamily="monospace" textAnchor="middle">A</text>
            <text x="242" y="82" fill="#88ffcc" fontSize="7" fontFamily="monospace" textAnchor="middle">{(ic_op*1e3).toFixed(2)}mA</text>
          </svg>
        </div>
        <div style={P()}>
          <LBL text="CONTROLS"/>
          <Ctrl label="V_BB" value={vbb} min={0} max={10} step={0.1} onChange={setVbb} unit="V" color="#44aaff"/>
          <Ctrl label="V_CC" value={vcc} min={1} max={20} step={0.5} onChange={setVcc} unit="V" color="#ff8844"/>
          <Ctrl label="R_B" value={rb} min={1000} max={1000000} onChange={setRb} unit="Ω" color="#ffcc44" log/>
          <Ctrl label="R_C" value={rc} min={100} max={10000} onChange={setRc} unit="Ω" color="#ffcc44" log/>
          <Ctrl label="β (hFE)" value={beta} min={20} max={500} step={1} onChange={setBeta} unit="" color="#ff44aa"/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>REGION</div>
            <div style={{fontSize:12,color:vce_op<0.3?"#ff4444":vbe_op<0.55?"#ffcc44":"#00ff88"}}>{vce_op<0.3?"SATURATION":vbe_op<0.55?"CUT-OFF":"ACTIVE"}</div>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        <DigitalMeter label="V" sub="BE" value={vbe_op} unit="V" color="#44aaff"/>
        <DigitalMeter label="V" sub="CE" value={vce_op} unit="V" color="#ff8844"/>
        <DigitalMeter label="I" sub="B" value={ib_op} unit="μA" color="#ff44aa"/>
        <DigitalMeter label="I" sub="C" value={ic_op} unit="mA" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:16}}>
        <div style={{...P(),overflowY:"auto",maxHeight:400}}>
          <LBL text={`TABULATION [V_CE=${vce_op.toFixed(2)}V]`}/>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr>{["V_BE","I_B (μA)","I_C (mA)"].map(h=><th key={h} style={{color:"#446644",fontWeight:"normal",padding:"4px 8px",borderBottom:"1px solid #1a3a1a",textAlign:"right",fontSize:10}}>{h}</th>)}</tr></thead>
            <tbody>{tableData.map((r,i)=><tr key={i} style={{background:r.isOp?"#002a1a":"transparent"}}>
              <td style={{padding:"3px 8px",textAlign:"right",color:r.isOp?"#00ff88":"#6a9a6a"}}>{r.vbe}</td>
              <td style={{padding:"3px 8px",textAlign:"right",color:r.isOp?"#00ff88":"#ff88cc"}}>{r.ib}</td>
              <td style={{padding:"3px 8px",textAlign:"right",color:r.isOp?"#00ff88":"#88ffcc"}}>{r.ic}</td>
            </tr>)}</tbody>
          </table>
          <div style={{marginTop:10,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ I_B=(V_BB−V_BE)/R_B<br/>▸ I_C=β×I_B<br/>▸ V_CE=V_CC−I_C×R_C</div>
        </div>
        <div style={P()}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <LBL text="CHARACTERISTICS"/>
            <div style={{marginLeft:"auto",display:"flex",gap:4}}>
              {["input","output"].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:"4px 10px",borderRadius:3,cursor:"pointer",fontFamily:"monospace",fontSize:10,background:mode===m?"#00ff8820":"transparent",color:mode===m?"#00ff88":"#446644",border:mode===m?"1px solid #00ff8844":"1px solid #1a3a1a"}}>{m==="input"?"INPUT":"OUTPUT"}</button>)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mode==="input"?inputData:outputData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey={mode==="input"?"vbe":"vce"} stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:mode==="input"?"V_BE (V)":"V_CE (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(1)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:mode==="input"?"I_B (μA)":"I_C (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Legend wrapperStyle={{fontSize:10,fontFamily:"monospace"}}/>
              {mode==="input"?VCE_VALS.map((v,i)=><Line key={v} type="monotone" dataKey={`vce${v}`} stroke={VC[i]} strokeWidth={1.8} dot={false} name={`V_CE=${v}V`}/>)
              :IB_VALS.map((ib,i)=><Line key={ib} type="monotone" dataKey={`ib${ib}`} stroke={IC[i]} strokeWidth={1.8} dot={false} name={`I_B=${ib}μA`}/>)}
              <ReferenceDot x={parseFloat(mode==="input"?vbe_op.toFixed(2):vce_op.toFixed(2))} y={mode==="input"?ib_op*1e6:ic_op*1e3} r={5} fill="#fff" stroke="#00ff88" strokeWidth={2} label={{value:"Q",fill:"#00ff88",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── PN DIODE ──────────────────────────────────────────────────────────
function DiodeSimulator() {
  const [vs,setVs]=useState(1.5), [rs,setRs]=useState(100);
  const {vd,id}=useMemo(()=>{
    if(vs<=0) return {vd:vs,id:0};
    let vd=0.65;
    for(let i=0;i<200;i++){
      const ex=Math.exp(Math.min(vd/VT,40));
      const f=(vs-vd)/rs-IS_D*(ex-1);
      const df=-1/rs-IS_D*ex/VT;
      const s=-f/df;
      vd+=Math.max(-0.05,Math.min(0.05,s));
      if(Math.abs(s)<1e-12) break;
    }
    return {vd:Math.max(0,Math.min(vd,vs)),id:Math.max(0,(vs-vd)/rs)};
  },[vs,rs]);

  const chartData=useMemo(()=>Array.from({length:71},(_,i)=>{
    const v=-1+i*0.04;
    return {v:parseFloat(v.toFixed(2)),i:Math.max(-0.0005,Math.min(IS_D*(Math.exp(Math.min(v/VT,40))-1)*1000,50))};
  }),[]);

  const tableData=useMemo(()=>Array.from({length:16},(_,i)=>{
    const v=-0.5+i*0.1;
    const curr=IS_D*(Math.exp(Math.min(v/VT,40))-1)*1000;
    return {v:v.toFixed(2),i:Math.abs(curr)<0.0001?"≈0":curr.toFixed(4),r:v<0?"Reverse":v<0.6?"Near":v<0.7?"Threshold":"Forward"};
  }),[]);

  return (
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={P()}>
          <LBL text="PN JUNCTION DIODE"/>
          <svg viewBox="0 0 320 180" width="100%" style={{maxHeight:180}}>
            <rect width="320" height="180" fill="#080f08" rx="6"/>
            <defs><filter id="dg"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <circle cx="40" cy="70" r="18" fill="#080f08" stroke="#4d96ff" strokeWidth="1.5"/>
            <text x="40" y="67" fill="#4d96ff" fontSize="8" fontFamily="monospace" textAnchor="middle">V</text>
            <text x="40" y="77" fill="#4d96ff" fontSize="7" fontFamily="monospace" textAnchor="middle">{vs.toFixed(1)}V</text>
            <line x1="40" y1="88" x2="40" y2="140" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="40" y1="52" x2="40" y2="20" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="40" y1="20" x2="120" y2="20" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="120,20 124,12 128,28 132,12 136,28 140,12 144,28 148,20" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#dg)"/>
            <text x="132" y="10" fill="#ffcc44" fontSize="8" fontFamily="monospace" textAnchor="middle">R_S={rs}Ω</text>
            <line x1="148" y1="20" x2="200" y2="20" stroke="#64ffda" strokeWidth="1.5"/>
            <polygon points="200,8 200,32 222,20" fill="none" stroke="#00ff88" strokeWidth="2.5" filter="url(#dg)"/>
            <line x1="222" y1="8" x2="222" y2="32" stroke="#00ff88" strokeWidth="2.5" filter="url(#dg)"/>
            <line x1="222" y1="20" x2="280" y2="20" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="280" y1="20" x2="280" y2="140" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="280" y1="140" x2="40" y2="140" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="155" y1="147" x2="165" y2="147" stroke="#64ffda" strokeWidth="2.5"/>
            <line x1="158" y1="152" x2="162" y2="152" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="190" y="45" fill="#00ff88" fontSize="9" fontFamily="monospace">A</text>
            <text x="226" y="45" fill="#00ff88" fontSize="9" fontFamily="monospace">K</text>
            <text x="100" y="65" fill="#44aaff" fontSize="8" fontFamily="monospace">V_D={vd.toFixed(3)}V</text>
            <text x="100" y="78" fill="#ff9f43" fontSize="8" fontFamily="monospace">I_D={(id*1000).toFixed(2)}mA</text>
            <text x="100" y="91" fill={vd>0.6?"#00ff88":vd>0?"#ffcc44":"#ff4444"} fontSize="8" fontFamily="monospace">{vd>0.6?"FORWARD":vd>0?"NEAR":"REVERSE"}</text>
          </svg>
        </div>
        <div style={P()}>
          <LBL text="CONTROLS"/>
          <Ctrl label="V_S (Supply)" value={vs} min={-3} max={5} step={0.1} onChange={setVs} unit="V" color="#44aaff"/>
          <Ctrl label="R_S (Series)" value={rs} min={10} max={10000} onChange={setRs} unit="Ω" color="#ffcc44" log/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>STATE</div>
            <div style={{fontSize:11,color:vd>0.6?"#00ff88":vd>0?"#ffcc44":"#ff4444"}}>{vd>0.6?"FORWARD BIAS":vd>0?"NEAR THRESHOLD":"REVERSE BIAS"}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ I = I_S(e^V/VT − 1)<br/>▸ V_T = 26mV<br/>▸ I_S = 10⁻¹² A</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <DigitalMeter label="V" sub="D" value={vd} unit="V" color="#44aaff"/>
        <DigitalMeter label="V" sub="R" value={vs-vd} unit="V" color="#ff8844"/>
        <DigitalMeter label="I" sub="D" value={id} unit="mA" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16}}>
        <div style={{...P(),overflowY:"auto",maxHeight:340}}>
          <LBL text="TABLE: V_D vs I_D"/>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr>{["V_D","I_D (mA)","Region"].map(h=><th key={h} style={{color:"#446644",fontWeight:"normal",padding:"4px 6px",borderBottom:"1px solid #1a3a1a",textAlign:"right",fontSize:10}}>{h}</th>)}</tr></thead>
            <tbody>{tableData.map((r,i)=>{
              const op=Math.abs(parseFloat(r.v)-vd)<0.06;
              return <tr key={i} style={{background:op?"#002a1a":"transparent"}}>
                <td style={{padding:"3px 6px",textAlign:"right",color:op?"#00ff88":"#6a9a6a"}}>{r.v}</td>
                <td style={{padding:"3px 6px",textAlign:"right",color:op?"#00ff88":"#ff88cc"}}>{r.i}</td>
                <td style={{padding:"3px 6px",textAlign:"right",fontSize:9,color:r.r==="Forward"?"#00ff88":r.r==="Reverse"?"#ff4444":"#ffcc44"}}>{r.r}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div style={P()}>
          <LBL text="I-V CHARACTERISTIC"/>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="v" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_D (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(1)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_D (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}} formatter={v=>[`${parseFloat(v).toFixed(4)} mA`,"I_D"]}/>
              <Line type="monotone" dataKey="i" stroke="#44ccff" strokeWidth={2} dot={false} name="I_D (mA)"/>
              <ReferenceDot x={parseFloat(vd.toFixed(2))} y={parseFloat((id*1000).toFixed(4))} r={5} fill="#fff" stroke="#44ccff" strokeWidth={2} label={{value:"Q",fill:"#44ccff",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── JFET ──────────────────────────────────────────────────────────────
function JFETSimulator() {
  const [vdd,setVdd]=useState(12), [vgs,setVgs]=useState(-1), [rd,setRd]=useState(1000);
  const VGS_VALS=[0,-1,-2,-3];
  const C4=["#00ff88","#44ccff","#ff8844","#ff44aa"];

  const {vds_op,id_op}=useMemo(()=>{
    if(vgs<=VP) return {vds_op:vdd,id_op:0};
    const id_sat=IDSS*Math.pow(1-vgs/VP,2);
    const knee=vgs-VP;
    const vds_trial=vdd-id_sat*rd;
    if(vds_trial>=knee) return {vds_op:Math.max(0,vds_trial),id_op:id_sat};
    let vd=knee*0.5;
    for(let i=0;i<100;i++){
      const id_t=IDSS*(2*(1-vgs/VP)*(vd/(-VP))-(vd/(-VP))**2);
      const vd_new=vdd-id_t*rd;
      if(Math.abs(vd_new-vd)<1e-6) break;
      vd=vd+(vd_new-vd)*0.5;
    }
    return {vds_op:Math.max(0,vd),id_op:Math.max(0,(vdd-vd)/rd)};
  },[vdd,vgs,rd]);

  const outputData=useMemo(()=>Array.from({length:81},(_,i)=>{
    const vds=i*0.2; const row={vds};
    VGS_VALS.forEach(vg=>{
      if(vg<=VP){row[`vgs${vg}`]=0;return;}
      const sat=IDSS*Math.pow(1-vg/VP,2);
      const k=vg-VP;
      const id=vds>=k?sat:IDSS*(2*(1-vg/VP)*(vds/(-VP))-(vds/(-VP))**2);
      row[`vgs${vg}`]=Math.max(0,Math.min(id*1000,15));
    });
    return row;
  }),[]);

  const transferData=useMemo(()=>Array.from({length:41},(_,i)=>{
    const vg=VP+i*0.1;
    return {vgs:parseFloat(vg.toFixed(2)),id:Math.max(0,vg>VP?IDSS*Math.pow(1-vg/VP,2)*1000:0)};
  }),[]);

  const region=vgs<=VP?"CUT-OFF":vds_op<(vgs-VP)?"TRIODE":"SATURATION";

  return (
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={P()}>
          <LBL text="N-CHANNEL JFET — COMMON SOURCE"/>
          <svg viewBox="0 0 320 220" width="100%" style={{maxHeight:220}}>
            <rect width="320" height="220" fill="#080f08" rx="6"/>
            <defs><filter id="jg"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <text x="160" y="16" fill="#64ff9a" fontSize="9" fontFamily="monospace" textAnchor="middle">V_DD={vdd}V</text>
            <line x1="160" y1="18" x2="160" y2="32" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="160,32 156,24 152,40 148,24 144,40 140,24 136,40 132,32" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#jg)"/>
            <text x="118" y="28" fill="#ffcc44" fontSize="8" fontFamily="monospace">R_D={(rd/1000).toFixed(1)}kΩ</text>
            <line x1="132" y1="32" x2="132" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="160" y1="32" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="132" y1="55" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="175" y1="75" x2="175" y2="155" stroke="#ffcc44" strokeWidth="3" filter="url(#jg)"/>
            <line x1="163" y1="90" x2="163" y2="140" stroke="#ffcc44" strokeWidth="2" filter="url(#jg)"/>
            <line x1="140" y1="115" x2="162" y2="115" stroke="#ffcc44" strokeWidth="2" filter="url(#jg)"/>
            <line x1="175" y1="75" x2="175" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="175" y1="55" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="175" y1="155" x2="175" y2="185" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="175" y1="185" x2="40" y2="185" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="40" y1="185" x2="40" y2="115" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="160" y1="192" x2="190" y2="192" stroke="#64ffda" strokeWidth="2.5"/>
            <line x1="164" y1="197" x2="186" y2="197" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="12" y="100" fill="#64ff9a" fontSize="8" fontFamily="monospace">V_GS={vgs}V</text>
            <text x="183" y="72" fill="#44ccff" fontSize="9" fontFamily="monospace">D</text>
            <text x="126" y="118" fill="#44ccff" fontSize="9" fontFamily="monospace">G</text>
            <text x="183" y="162" fill="#44ccff" fontSize="9" fontFamily="monospace">S</text>
            <text x="190" y="100" fill="#88ccff" fontSize="8" fontFamily="monospace">V_DS={vds_op.toFixed(2)}V</text>
            <text x="190" y="112" fill="#ff88cc" fontSize="8" fontFamily="monospace">I_D={(id_op*1000).toFixed(2)}mA</text>
            <text x="190" y="124" fill={region==="SATURATION"?"#00ff88":region==="TRIODE"?"#ffcc44":"#ff4444"} fontSize="8" fontFamily="monospace">{region}</text>
          </svg>
        </div>
        <div style={P()}>
          <LBL text="CONTROLS"/>
          <Ctrl label="V_DD" value={vdd} min={1} max={20} step={0.5} onChange={setVdd} unit="V" color="#44aaff"/>
          <Ctrl label="V_GS" value={vgs} min={-4} max={0} step={0.1} onChange={setVgs} unit="V" color="#ff44aa"/>
          <Ctrl label="R_D" value={rd} min={100} max={10000} onChange={setRd} unit="Ω" color="#ffcc44" log/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>REGION</div>
            <div style={{fontSize:12,color:region==="SATURATION"?"#00ff88":region==="TRIODE"?"#ffcc44":"#ff4444"}}>{region}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ I_DSS={IDSS*1000}mA<br/>▸ V_P={VP}V (pinch-off)<br/>▸ Depletion mode</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <DigitalMeter label="V" sub="DS" value={vds_op} unit="V" color="#44aaff"/>
        <DigitalMeter label="V" sub="GS" value={vgs} unit="V" color="#ff44aa"/>
        <DigitalMeter label="I" sub="D" value={id_op} unit="mA" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={P()}>
          <LBL text="OUTPUT: I_D vs V_DS"/>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={outputData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vds" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_DS (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_D (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              {VGS_VALS.map((v,i)=><Line key={v} type="monotone" dataKey={`vgs${v}`} stroke={C4[i]} strokeWidth={1.8} dot={false} name={`V_GS=${v}V`}/>)}
              <ReferenceDot x={parseFloat(vds_op.toFixed(1))} y={parseFloat((id_op*1000).toFixed(2))} r={5} fill="#fff" stroke="#00ff88" strokeWidth={2} label={{value:"Q",fill:"#00ff88",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={P()}>
          <LBL text="TRANSFER: I_D vs V_GS"/>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={transferData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vgs" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_GS (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(1)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_D (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Line type="monotone" dataKey="id" stroke="#ff44aa" strokeWidth={2} dot={false} name="I_D (mA)"/>
              <ReferenceDot x={vgs} y={parseFloat((id_op*1000).toFixed(3))} r={5} fill="#fff" stroke="#ff44aa" strokeWidth={2} label={{value:"Q",fill:"#ff44aa",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── MOSFET ────────────────────────────────────────────────────────────
function MOSFETSimulator() {
  const [vdd,setVdd]=useState(12), [vgs,setVgs]=useState(5), [rd,setRd]=useState(1000);
  const VGS_VALS=[3,4,5,6];
  const C4=["#00ff88","#44ccff","#ff8844","#ff44aa"];

  const {vds_op,id_op}=useMemo(()=>{
    if(vgs<VTH_MOS) return {vds_op:vdd,id_op:0};
    const knee=vgs-VTH_MOS;
    const id_sat=(KN/2)*knee*knee;
    const vds_trial=vdd-id_sat*rd;
    if(vds_trial>=knee) return {vds_op:Math.max(0,vds_trial),id_op:id_sat};
    let vd=knee*0.5;
    for(let i=0;i<100;i++){
      const id_t=KN*((vgs-VTH_MOS)*vd-vd*vd/2);
      const vd_new=vdd-id_t*rd;
      if(Math.abs(vd_new-vd)<1e-6) break;
      vd=vd+(vd_new-vd)*0.5;
    }
    return {vds_op:Math.max(0,vd),id_op:Math.max(0,(vdd-vd)/rd)};
  },[vdd,vgs,rd]);

  const outputData=useMemo(()=>Array.from({length:81},(_,i)=>{
    const vds=i*0.2; const row={vds};
    VGS_VALS.forEach(vg=>{
      if(vg<VTH_MOS){row[`vgs${vg}`]=0;return;}
      const k=vg-VTH_MOS;
      const id=vds>=k?(KN/2)*k*k:KN*((vg-VTH_MOS)*vds-vds*vds/2);
      row[`vgs${vg}`]=Math.max(0,Math.min(id*1000,50));
    });
    return row;
  }),[]);

  const transferData=useMemo(()=>Array.from({length:61},(_,i)=>{
    const vg=i*0.15;
    return {vgs:parseFloat(vg.toFixed(2)),id:Math.min(vg<VTH_MOS?0:(KN/2)*(vg-VTH_MOS)**2*1000,50)};
  }),[]);

  const region=vgs<VTH_MOS?"CUT-OFF":vds_op<(vgs-VTH_MOS)?"TRIODE":"SATURATION";

  return (
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={P()}>
          <LBL text="N-CH ENHANCEMENT MOSFET — COMMON SOURCE"/>
          <svg viewBox="0 0 320 220" width="100%" style={{maxHeight:220}}>
            <rect width="320" height="220" fill="#080f08" rx="6"/>
            <defs><filter id="mg"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <text x="160" y="16" fill="#64ff9a" fontSize="9" fontFamily="monospace" textAnchor="middle">V_DD={vdd}V</text>
            <line x1="160" y1="18" x2="160" y2="32" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="160,32 156,24 152,40 148,24 144,40 140,24 136,40 132,32" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#mg)"/>
            <text x="118" y="28" fill="#ffcc44" fontSize="8" fontFamily="monospace">R_D={(rd/1000).toFixed(1)}kΩ</text>
            <line x1="132" y1="32" x2="132" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="160" y1="32" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="132" y1="55" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="178" y1="75" x2="178" y2="155" stroke="#ff8844" strokeWidth="3" filter="url(#mg)"/>
            <line x1="165" y1="90" x2="165" y2="140" stroke="#ff8844" strokeWidth="2" filter="url(#mg)"/>
            <line x1="140" y1="115" x2="164" y2="115" stroke="#ff8844" strokeWidth="2" filter="url(#mg)"/>
            <polygon points="171,112 178,115 171,118" fill="#ff8844"/>
            <line x1="178" y1="75" x2="178" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="178" y1="55" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="178" y1="155" x2="178" y2="185" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="178" y1="185" x2="40" y2="185" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="40" y1="185" x2="40" y2="115" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="163" y1="192" x2="193" y2="192" stroke="#64ffda" strokeWidth="2.5"/>
            <line x1="167" y1="197" x2="189" y2="197" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="12" y="100" fill="#64ff9a" fontSize="8" fontFamily="monospace">V_GS={vgs}V</text>
            <text x="186" y="72" fill="#44ccff" fontSize="9" fontFamily="monospace">D</text>
            <text x="126" y="118" fill="#44ccff" fontSize="9" fontFamily="monospace">G</text>
            <text x="186" y="162" fill="#44ccff" fontSize="9" fontFamily="monospace">S</text>
            <text x="192" y="100" fill="#88ccff" fontSize="8" fontFamily="monospace">V_DS={vds_op.toFixed(2)}V</text>
            <text x="192" y="112" fill="#ff88cc" fontSize="8" fontFamily="monospace">I_D={(id_op*1000).toFixed(2)}mA</text>
            <text x="192" y="124" fill={region==="SATURATION"?"#00ff88":region==="TRIODE"?"#ffcc44":"#ff4444"} fontSize="8" fontFamily="monospace">{region}</text>
          </svg>
        </div>
        <div style={P()}>
          <LBL text="CONTROLS"/>
          <Ctrl label="V_DD" value={vdd} min={1} max={20} step={0.5} onChange={setVdd} unit="V" color="#44aaff"/>
          <Ctrl label="V_GS" value={vgs} min={0} max={10} step={0.1} onChange={setVgs} unit="V" color="#ff8844"/>
          <Ctrl label="R_D" value={rd} min={100} max={10000} onChange={setRd} unit="Ω" color="#ffcc44" log/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>REGION</div>
            <div style={{fontSize:12,color:region==="SATURATION"?"#00ff88":region==="TRIODE"?"#ffcc44":"#ff4444"}}>{region}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ V_TH={VTH_MOS}V<br/>▸ K_N={KN*1000}mA/V²<br/>▸ Enhancement mode</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <DigitalMeter label="V" sub="DS" value={vds_op} unit="V" color="#44aaff"/>
        <DigitalMeter label="V" sub="GS" value={vgs} unit="V" color="#ff8844"/>
        <DigitalMeter label="I" sub="D" value={id_op} unit="mA" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={P()}>
          <LBL text="OUTPUT: I_D vs V_DS"/>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={outputData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vds" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_DS (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_D (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              {VGS_VALS.map((v,i)=><Line key={v} type="monotone" dataKey={`vgs${v}`} stroke={C4[i]} strokeWidth={1.8} dot={false} name={`V_GS=${v}V`}/>)}
              <ReferenceDot x={parseFloat(vds_op.toFixed(1))} y={parseFloat((id_op*1000).toFixed(2))} r={5} fill="#fff" stroke="#00ff88" strokeWidth={2} label={{value:"Q",fill:"#00ff88",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={P()}>
          <LBL text="TRANSFER: I_D vs V_GS"/>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={transferData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vgs" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_GS (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(1)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_D (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Line type="monotone" dataKey="id" stroke="#ff8844" strokeWidth={2} dot={false} name="I_D (mA)"/>
              <ReferenceDot x={vgs} y={parseFloat((id_op*1000).toFixed(3))} r={5} fill="#fff" stroke="#ff8844" strokeWidth={2} label={{value:"Q",fill:"#ff8844",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── IGBT ──────────────────────────────────────────────────────────────
function IGBTSimulator() {
  const [vcc,setVcc]=useState(400), [vge,setVge]=useState(15), [rc,setRc]=useState(10);
  const VGE_VALS=[10,12,14,16,18];
  const C5=["#00ff88","#44ccff","#ffcc44","#ff8844","#ff44aa"];

  const {vce_op,ic_op}=useMemo(()=>{
    if(vge<VTH_IGBT) return {vce_op:vcc,ic_op:0};
    const ic_sat=GM_IGBT*(vge-VTH_IGBT);
    const vce_trial=vcc-ic_sat*rc;
    const vce=Math.max(0.5,vce_trial);
    return {vce_op:vce,ic_op:Math.max(0,Math.min(ic_sat,(vcc-vce)/rc))};
  },[vcc,vge,rc]);

  const outputData=useMemo(()=>Array.from({length:81},(_,i)=>{
    const vce=i*0.6; const row={vce};
    VGE_VALS.forEach(vg=>{
      if(vg<VTH_IGBT){row[`vge${vg}`]=0;return;}
      row[`vge${vg}`]=Math.max(0,Math.min(GM_IGBT*(vg-VTH_IGBT)*(vce<1?vce:1),100));
    });
    return row;
  }),[]);

  const transferData=useMemo(()=>Array.from({length:61},(_,i)=>{
    const vg=i*0.3;
    return {vge:parseFloat(vg.toFixed(1)),ic:Math.min(vg<VTH_IGBT?0:GM_IGBT*(vg-VTH_IGBT),100)};
  }),[]);

  const region=vge<VTH_IGBT?"CUT-OFF":vce_op<1?"SATURATION":"ACTIVE";

  return (
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={P()}>
          <LBL text="IGBT — INSULATED GATE BIPOLAR TRANSISTOR"/>
          <svg viewBox="0 0 320 220" width="100%" style={{maxHeight:220}}>
            <rect width="320" height="220" fill="#080f08" rx="6"/>
            <defs><filter id="ig"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <text x="160" y="16" fill="#64ff9a" fontSize="8" fontFamily="monospace" textAnchor="middle">V_CC={vcc}V (HIGH POWER)</text>
            <line x1="160" y1="18" x2="160" y2="32" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="160,32 156,24 152,40 148,24 144,40 140,24 136,40 132,32" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#ig)"/>
            <text x="115" y="28" fill="#ffcc44" fontSize="8" fontFamily="monospace">R_C={rc}Ω</text>
            <line x1="132" y1="32" x2="132" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="160" y1="32" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="132" y1="55" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <circle cx="195" cy="120" r="35" fill="none" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2" filter={vge>=VTH_IGBT?"url(#ig)":""}/>
            <line x1="178" y1="103" x2="178" y2="137" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2.5"/>
            <line x1="165" y1="115" x2="177" y2="115" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2"/>
            <line x1="158" y1="104" x2="158" y2="126" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2"/>
            <line x1="140" y1="115" x2="157" y2="115" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2"/>
            <line x1="178" y1="107" x2="215" y2="88" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2.5"/>
            <line x1="178" y1="133" x2="215" y2="152" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2.5"/>
            <polygon points="207,148 215,152 210,144" fill={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"}/>
            <text x="185" y="123" fill={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} fontSize="10" fontFamily="monospace" fontWeight="bold">IGBT</text>
            <line x1="215" y1="88" x2="215" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="215" y1="55" x2="160" y2="55" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="215" y1="152" x2="215" y2="195" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="215" y1="195" x2="40" y2="195" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="40" y1="195" x2="40" y2="115" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="200" y1="202" x2="230" y2="202" stroke="#64ffda" strokeWidth="2.5"/>
            <line x1="204" y1="207" x2="226" y2="207" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="12" y="100" fill="#64ff9a" fontSize="8" fontFamily="monospace">V_GE={vge}V</text>
            <text x="222" y="85" fill="#44ccff" fontSize="9" fontFamily="monospace">C</text>
            <text x="124" y="118" fill="#44ccff" fontSize="9" fontFamily="monospace">G</text>
            <text x="222" y="158" fill="#44ccff" fontSize="9" fontFamily="monospace">E</text>
            <text x="230" y="100" fill="#88ccff" fontSize="8" fontFamily="monospace">V_CE={vce_op.toFixed(1)}V</text>
            <text x="230" y="112" fill="#ff88cc" fontSize="8" fontFamily="monospace">I_C={ic_op.toFixed(1)}A</text>
          </svg>
        </div>
        <div style={P()}>
          <LBL text="CONTROLS"/>
          <Ctrl label="V_CC (High Voltage)" value={vcc} min={10} max={600} step={10} onChange={setVcc} unit="V" color="#44aaff"/>
          <Ctrl label="V_GE (Gate-Emitter)" value={vge} min={0} max={20} step={0.5} onChange={setVge} unit="V" color="#c77dff"/>
          <Ctrl label="R_C (Load)" value={rc} min={1} max={100} step={1} onChange={setRc} unit="Ω" color="#ffcc44"/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>REGION</div>
            <div style={{fontSize:12,color:region==="ACTIVE"?"#00ff88":region==="SATURATION"?"#ffcc44":"#ff4444"}}>{region}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ V_TH={VTH_IGBT}V<br/>▸ gm={GM_IGBT}A/V<br/>▸ High power switching</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <DigitalMeter label="V" sub="CE" value={vce_op} unit="V" color="#44aaff"/>
        <DigitalMeter label="V" sub="GE" value={vge} unit="V" color="#c77dff"/>
        <DigitalMeter label="I" sub="C" value={ic_op} unit="A" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={P()}>
          <LBL text="OUTPUT: I_C vs V_CE"/>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={outputData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vce" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_CE (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_C (A)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              {VGE_VALS.map((v,i)=><Line key={v} type="monotone" dataKey={`vge${v}`} stroke={C5[i]} strokeWidth={1.8} dot={false} name={`V_GE=${v}V`}/>)}
              <ReferenceDot x={parseFloat(vce_op.toFixed(1))} y={parseFloat(ic_op.toFixed(1))} r={5} fill="#fff" stroke="#00ff88" strokeWidth={2} label={{value:"Q",fill:"#00ff88",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={P()}>
          <LBL text="TRANSFER: I_C vs V_GE"/>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={transferData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vge" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_GE (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_C (A)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Line type="monotone" dataKey="ic" stroke="#c77dff" strokeWidth={2} dot={false} name="I_C (A)"/>
              <ReferenceDot x={vge} y={parseFloat(ic_op.toFixed(1))} r={5} fill="#fff" stroke="#c77dff" strokeWidth={2} label={{value:"Q",fill:"#c77dff",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── SCR ───────────────────────────────────────────────────────────────
function SCRSimulator() {
  const [vak,setVak]=useState(50), [ig,setIg]=useState(0);
  const [rl,setRl]=useState(100), [igt,setIgt]=useState(20);
  const triggered = ig >= igt;
  const vd=1.5;
  const ia=triggered?Math.max(0,(vak-vd)/rl):0;
  const vt=triggered?vd:vak;
  const state=triggered?ia>0.001?"CONDUCTING":"LATCHED-ON":"FORWARD BLOCKING";
  const sc=state==="CONDUCTING"?"#00ff88":"#ff4444";

  const chartData=useMemo(()=>{
    const pts=[];
    for(let i=0;i<=100;i++){
      const v=i*0.5;
      pts.push({v:parseFloat(v.toFixed(1)),blocking:Math.min(v*0.0005,0.1),conduction:null});
    }
    for(let i=0;i<=40;i++){
      const v=i*0.05;
      const c=IS_D*(Math.exp(Math.min(v/VT,40))-1)*200;
      if(pts[i]) pts[i].conduction=Math.min(c,(vak>0?vak/rl:0));
    }
    return pts;
  },[vak,rl]);

  return (
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={P()}>
          <LBL text="SCR — SILICON CONTROLLED RECTIFIER (THYRISTOR)"/>
          <svg viewBox="0 0 320 200" width="100%" style={{maxHeight:200}}>
            <rect width="320" height="200" fill="#080f08" rx="6"/>
            <defs><filter id="sg"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <circle cx="38" cy="60" r="18" fill="#080f08" stroke="#4d96ff" strokeWidth="1.5"/>
            <text x="38" y="58" fill="#4d96ff" fontSize="8" fontFamily="monospace" textAnchor="middle">V_AK</text>
            <text x="38" y="68" fill="#4d96ff" fontSize="7" fontFamily="monospace" textAnchor="middle">{vak}V</text>
            <line x1="38" y1="78" x2="38" y2="140" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="38" y1="42" x2="38" y2="15" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="38" y1="15" x2="120" y2="15" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="120,15 124,7 128,23 132,7 136,23 140,7 144,23 148,15" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#sg)"/>
            <text x="134" y="5" fill="#ffcc44" fontSize="8" fontFamily="monospace" textAnchor="middle">R_L={rl}Ω</text>
            <line x1="148" y1="15" x2="200" y2="15" stroke="#64ffda" strokeWidth="1.5"/>
            <polygon points="200,5 200,27 220,16" fill="none" stroke={triggered?"#00ff88":"#446644"} strokeWidth="2.5" filter={triggered?"url(#sg)":""}/>
            <line x1="220" y1="5" x2="220" y2="27" stroke={triggered?"#00ff88":"#446644"} strokeWidth="2.5" filter={triggered?"url(#sg)":""}/>
            <line x1="220" y1="16" x2="280" y2="16" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="220" y1="26" x2="250" y2="50" stroke="#ff9f43" strokeWidth="2" filter="url(#sg)"/>
            <circle cx="254" cy="54" r="8" fill="#080f08" stroke="#ff9f43" strokeWidth="1.5"/>
            <text x="254" y="57" fill="#ff9f43" fontSize="7" fontFamily="monospace" textAnchor="middle">G</text>
            <text x="268" y="58" fill="#ff9f43" fontSize="8" fontFamily="monospace">I_G={ig}mA</text>
            <line x1="280" y1="16" x2="280" y2="140" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="280" y1="140" x2="38" y2="140" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="155" y1="147" x2="165" y2="147" stroke="#64ffda" strokeWidth="2.5"/>
            <line x1="158" y1="152" x2="162" y2="152" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="190" y="35" fill="#44ccff" fontSize="8" fontFamily="monospace">A</text>
            <text x="222" y="35" fill="#44ccff" fontSize="8" fontFamily="monospace">K</text>
            <rect x="60" y="155" width="200" height="36" rx="5" fill={`${sc}15`} stroke={`${sc}44`} strokeWidth="1"/>
            <text x="160" y="170" fill={sc} fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{state}</text>
            <text x="160" y="184" fill={sc} fontSize="9" fontFamily="monospace" textAnchor="middle">I_A={ia.toFixed(3)}A  V_T={vt.toFixed(2)}V</text>
          </svg>
        </div>
        <div style={P()}>
          <LBL text="CONTROLS"/>
          <Ctrl label="V_AK (Anode-Cathode)" value={vak} min={0} max={200} step={1} onChange={setVak} unit="V" color="#44aaff"/>
          <Ctrl label="I_G (Gate Current)" value={ig} min={0} max={100} step={1} onChange={setIg} unit="mA" color="#ff9f43"/>
          <Ctrl label="R_L (Load)" value={rl} min={1} max={1000} onChange={setRl} unit="Ω" color="#ffcc44" log/>
          <Ctrl label="I_GT (Trigger Level)" value={igt} min={1} max={100} step={1} onChange={setIgt} unit="mA" color="#ff44aa"/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>TRIGGER STATUS</div>
            <div style={{fontSize:10,color:triggered?"#00ff88":"#ff4444"}}>{triggered?`✓ TRIGGERED (I_G≥I_GT)`:`✗ Need I_G ≥ ${igt}mA`}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ Once ON, gate loses control<br/>▸ Stays ON until I_A {"<"} I_H<br/>▸ PNPN latching device</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        <DigitalMeter label="V" sub="AK" value={vak} unit="V" color="#44aaff"/>
        <DigitalMeter label="V" sub="T" value={vt} unit="V" color="#ff8844"/>
        <DigitalMeter label="I" sub="A" value={ia} unit="A" color="#44ffaa"/>
        <DigitalMeter label="I" sub="G" value={ig/1000} unit="mA" color="#ff9f43"/>
      </div>
      <div style={P()}>
        <LBL text="SCR I-V CHARACTERISTICS — BLOCKING vs CONDUCTION"/>
        <div style={{fontSize:9,color:"#334433",marginBottom:8}}>Increase I_G past I_GT to see the device switch from blocking (red) to conduction (green)</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{top:5,right:20,bottom:20,left:10}}>
            <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
            <XAxis dataKey="v" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_AK (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
            <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_A (A)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
            <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
            <Legend wrapperStyle={{fontSize:10}}/>
            <Line type="monotone" dataKey="blocking" stroke="#ff4444" strokeWidth={1.5} dot={false} name="Blocking (I_G=0)" strokeDasharray="5 3"/>
            <Line type="monotone" dataKey="conduction" stroke="#00ff88" strokeWidth={2} dot={false} name="Conduction (Triggered)" connectNulls={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────
const DEVICES = [
  {id:"BJT",    label:"BJT",      color:"#00ff88", desc:"Bipolar Junction Transistor — NPN CE"},
  {id:"PN",     label:"PN Diode", color:"#44ccff", desc:"PN Junction Diode — I-V Characteristic"},
  {id:"JFET",   label:"JFET",     color:"#ffcc44", desc:"N-Channel JFET — Shockley Equation"},
  {id:"MOSFET", label:"MOSFET",   color:"#ff8844", desc:"N-Ch Enhancement MOSFET — Square Law"},
  {id:"IGBT",   label:"IGBT",     color:"#c77dff", desc:"Insulated Gate BJT — High Power"},
  {id:"SCR",    label:"SCR",      color:"#ff9f43", desc:"Silicon Controlled Rectifier — Thyristor"},
];

export default function SemiconductorLab() {
  const [activeDevice, setActiveDevice] = useState("BJT");
  const dev = DEVICES.find(d => d.id === activeDevice);
  return (
    <div style={{minHeight:"100vh",background:"#040a04",fontFamily:"'Courier New',monospace",color:"#aabbaa",paddingBottom:40}}>
      <div style={{background:"linear-gradient(90deg,#040a04,#0a1a0a,#040a04)",borderBottom:"1px solid #1a3a1a",padding:"16px 24px",display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"radial-gradient(circle,#00ff88 0%,#006633 60%,#001a0a 100%)",boxShadow:"0 0 16px #00ff88aa",flexShrink:0}}/>
        <div>
          <div style={{fontSize:18,color:"#00ff88",letterSpacing:4,textShadow:"0 0 12px #00ff88"}}>SEMICONDUCTOR LAB</div>
          <div style={{fontSize:10,color:"#446644",letterSpacing:3}}>DEVICE CHARACTERISTICS ANALYZER v3.0</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {["#ff4444","#ffcc00","#00ff88"].map((c,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:c,boxShadow:`0 0 6px ${c}`}}/>)}
        </div>
      </div>
      <div style={{display:"flex",gap:2,padding:"12px 24px",borderBottom:"1px solid #0d1f0d",background:"#050d05",overflowX:"auto"}}>
        {DEVICES.map(d=>(
          <button key={d.id} onClick={()=>setActiveDevice(d.id)} style={{
            padding:"6px 16px",borderRadius:4,border:"none",cursor:"pointer",
            fontFamily:"monospace",fontSize:11,letterSpacing:1,whiteSpace:"nowrap",
            background:activeDevice===d.id?`${d.color}18`:"transparent",
            color:activeDevice===d.id?d.color:"#446644",
            borderBottom:activeDevice===d.id?`2px solid ${d.color}`:"2px solid transparent",
            transition:"all 0.15s"
          }}>{d.label}</button>
        ))}
      </div>
      <div style={{padding:"8px 24px",background:"#050d05",borderBottom:"1px solid #0d1f0d"}}>
        <span style={{color:dev?.color,fontSize:11,letterSpacing:1}}>● {dev?.desc}</span>
      </div>
      {activeDevice==="BJT"    && <BJTSimulator/>}
      {activeDevice==="PN"     && <DiodeSimulator/>}
      {activeDevice==="JFET"   && <JFETSimulator/>}
      {activeDevice==="MOSFET" && <MOSFETSimulator/>}
      {activeDevice==="IGBT"   && <IGBTSimulator/>}
      {activeDevice==="SCR"    && <SCRSimulator/>}
    </div>
  );
}