import { useState, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot } from "recharts";

// ── Physics ───────────────────────────────────────────────────────────
const VT=0.02585,IS_BJT=1e-15,IS_D=1e-12,VA=80;
const IDSS=10e-3,VP=-4,KN=2e-3,VTH_MOS=2,VTH_IGBT=6,GM_IGBT=8;

// ── Shared UI ─────────────────────────────────────────────────────────
function DM({label,value,unit,color,sub}){
  const d=typeof value==="number"&&isFinite(value)
    ?unit==="μA"?(value*1e6).toFixed(3):unit==="mA"?(value*1e3).toFixed(3):unit==="nA"?(value*1e9).toFixed(3):value.toFixed(3):"---";
  return(
    <div style={{background:"linear-gradient(135deg,#080f08,#0d1a0d)",border:`1px solid ${color}33`,borderTop:`2px solid ${color}`,borderRadius:8,padding:"10px 14px",textAlign:"center",flex:1,minWidth:100}}>
      <div style={{color:"#667766",fontSize:10,fontFamily:"monospace",marginBottom:4}}>{label}{sub&&<sub style={{fontSize:8}}>{sub}</sub>}</div>
      <div style={{color,fontSize:20,fontFamily:"'Courier New',monospace",fontWeight:"bold",textShadow:`0 0 8px ${color}`,letterSpacing:2}}>{d}</div>
      <div style={{color:`${color}77`,fontSize:10,fontFamily:"monospace"}}>{unit}</div>
    </div>
  );
}

function Ctrl({label,value,min,max,step,onChange,unit,color="#64ffda",log}){
  const toS=v=>log?Math.log10(v):v,frS=v=>log?Math.pow(10,v):v;
  const sv=toS(value),smin=toS(min),smax=toS(max),pct=((sv-smin)/(smax-smin))*100;
  const disp=value>=1e6?`${(value/1e6).toFixed(2)}M`:value>=1000?`${(value/1000).toFixed(1)}k`:value>=1?value.toFixed(1):value.toFixed(2);
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
        <span style={{color:"#aabba0",fontSize:11,fontFamily:"monospace"}}>{label}</span>
        <span style={{color,fontSize:11,fontFamily:"monospace",fontWeight:"bold"}}>{disp} {unit}</span>
      </div>
      <input type="range" min={smin} max={smax} step={log?0.01:step} value={sv}
        onChange={e=>onChange(frS(parseFloat(e.target.value)))}
        style={{width:"100%",accentColor:color,cursor:"pointer",
          background:`linear-gradient(to right,${color} 0%,${color} ${pct}%,#1a2a1a ${pct}%,#1a2a1a 100%)`,
          height:4,borderRadius:2,outline:"none",appearance:"none"}}/>
    </div>
  );
}

const Pnl=(e={})=>({background:"#050f05",border:"1px solid #1a3a1a",borderRadius:10,padding:14,...e});
const Lbl=({t})=><div style={{fontSize:10,color:"#446644",marginBottom:10,letterSpacing:2}}>◈ {t}</div>;

// ── Generate Graph Button wrapper ─────────────────────────────────────
function GraphBox({children,label="CHARACTERISTICS"}){
  const [show,setShow]=useState(false);
  return(
    <div style={Pnl()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <Lbl t={label}/>
        <div style={{display:"flex",gap:6}}>
          {show&&<button onClick={()=>setShow(false)} style={{padding:"4px 10px",borderRadius:3,cursor:"pointer",fontFamily:"monospace",fontSize:10,background:"transparent",color:"#ff4444",border:"1px solid #ff444433"}}>✕ Hide</button>}
          <button onClick={()=>setShow(s=>!s)} style={{padding:"6px 16px",borderRadius:5,cursor:"pointer",fontFamily:"monospace",fontSize:11,fontWeight:"bold",background:show?"#00ff8820":"#0a2a0a",color:"#00ff88",border:"1px solid #00ff8844",boxShadow:show?"0 0 10px #00ff8833":"none",transition:"all 0.2s"}}>
            {show?"⟳ Refresh":"📊 Generate Graph"}
          </button>
        </div>
      </div>
      {!show&&(
        <div style={{height:180,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#080f08",borderRadius:8,border:"1px solid #0d2a0d"}}>
          <div style={{fontSize:32,marginBottom:12,opacity:0.3}}>📈</div>
          <div style={{color:"#334433",fontSize:12,fontFamily:"monospace"}}>Set parameters then click Generate Graph</div>
        </div>
      )}
      {show&&children}
    </div>
  );
}

// ════════════════════════════════════════════
// BJT
// ════════════════════════════════════════════
function BJTSim(){
  const [vbb,setVbb]=useState(3),[vcc,setVcc]=useState(10),[rb,setRb]=useState(100000),[rc,setRc]=useState(2000),[beta,setBeta]=useState(100),[mode,setMode]=useState("input");
  const VCE_V=[1,2,5,10],IB_V=[10,20,40,60,80,100];
  const VC=["#00ff88","#44ccff","#ff8844","#ff44aa"],IC=["#00ff88","#44ccff","#ffcc44","#ff8844","#ff44aa","#cc44ff"];
  const {vbe_op,ib_op,ic_op,vce_op}=useMemo(()=>{
    if(vbb<0.6)return{vbe_op:vbb,ib_op:0,ic_op:0,vce_op:vcc};
    let vbe=0.7,ib=0,ic=0,vce=vcc;
    for(let i=0;i<50;i++){ib=(vbb-vbe)/rb;if(ib<0){ib=0;break;}ic=beta*ib*(1+vce/VA);vce=vcc-ic*rc;if(vce<0.2){vce=0.2;ic=(vcc-vce)/rc;ib=ic/beta;vbe=0.75;break;}const vn=VT*Math.log(ib/(IS_BJT/beta)+1);if(Math.abs(vn-vbe)<1e-6)break;vbe=vn;}
    return{vbe_op:Math.min(vbe||0.7,0.9),ib_op:Math.max(0,ib||0),ic_op:Math.max(0,ic||0),vce_op:Math.max(0.1,vce||vcc)};
  },[vbb,vcc,rb,rc,beta]);
  const inputData=useMemo(()=>Array.from({length:81},(_,i)=>{const vbe=i*0.01,row={vbe};VCE_V.forEach(v=>{row[`vce${v}`]=Math.max(0,Math.min((IS_BJT/beta)*(Math.exp(Math.min(vbe/VT,25))-1)*(1+v/VA)*1e6,300));});return row;}),[beta]);
  const outputData=useMemo(()=>Array.from({length:101},(_,i)=>{const vce=i*0.15,row={vce};IB_V.forEach(ib_ua=>{const ib=ib_ua*1e-6;row[`ib${ib_ua}`]=Math.max(0,Math.min((vce<0.2?vce/0.2:1)*beta*ib*(1+vce/VA)*1000,60));});return row;}),[beta]);
  const tableData=useMemo(()=>Array.from({length:17},(_,i)=>{const vbe=0.4+i*0.025,ib=(IS_BJT/beta)*(Math.exp(Math.min(vbe/VT,25))-1)*(1+vce_op/VA)*1e6;return{vbe:vbe.toFixed(3),ib:ib<0.001?"≈0":ib.toFixed(2),ic:(ib*beta/1000).toFixed(3),isOp:Math.abs(vbe-vbe_op)<0.015};}),[beta,vce_op,vbe_op]);
  const wc="#64ffda";
  return(
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={Pnl()}>
          <Lbl t="NPN BJT — COMMON EMITTER"/>
          <svg viewBox="0 0 320 280" width="100%" style={{maxHeight:260}}>
            <defs><pattern id="g1" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a2a1a" strokeWidth="0.5"/></pattern><filter id="gl"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <rect width="320" height="280" fill="#080f08" rx="6"/><rect width="320" height="280" fill="url(#g1)" rx="6"/>
            <text x="12" y="52" fill="#aed6a0" fontSize="10" fontFamily="monospace">V_BB={vbb.toFixed(1)}V</text>
            <line x1="22" y1="68" x2="22" y2="80" stroke={wc} strokeWidth="1.5"/><line x1="16" y1="80" x2="28" y2="80" stroke={wc} strokeWidth="2.5"/><line x1="18" y1="84" x2="26" y2="84" stroke={wc} strokeWidth="1.5"/><line x1="16" y1="88" x2="28" y2="88" stroke={wc} strokeWidth="2.5"/><line x1="22" y1="92" x2="22" y2="100" stroke={wc} strokeWidth="1.5"/>
            <line x1="22" y1="68" x2="22" y2="40" stroke={wc} strokeWidth="1.5"/><line x1="22" y1="40" x2="80" y2="40" stroke={wc} strokeWidth="1.5"/>
            <polyline points="80,40 84,32 88,48 92,32 96,48 100,32 104,48 108,40" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#gl)"/>
            <text x="87" y="28" fill="#ffcc44" fontSize="9" fontFamily="monospace">R_B={(rb/1000).toFixed(0)}kΩ</text>
            <line x1="108" y1="40" x2="140" y2="40" stroke={wc} strokeWidth="1.5"/><circle cx="140" cy="40" r="2.5" fill={wc}/><line x1="140" y1="40" x2="140" y2="140" stroke={wc} strokeWidth="1.5"/>
            <text x="258" y="22" fill="#aed6a0" fontSize="10" fontFamily="monospace">V_CC={vcc.toFixed(1)}V</text>
            <line x1="268" y1="38" x2="268" y2="60" stroke={wc} strokeWidth="1.5"/>
            <polyline points="268,60 272,52 276,68 280,52 284,68 288,52 292,68 296,60" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#gl)"/>
            <text x="268" y="48" fill="#ffcc44" fontSize="9" fontFamily="monospace">R_C={(rc/1000).toFixed(1)}kΩ</text>
            <line x1="268" y1="68" x2="268" y2="120" stroke={wc} strokeWidth="1.5"/><circle cx="268" cy="120" r="2.5" fill={wc}/>
            <circle cx="200" cy="155" r="32" fill="none" stroke={vbe_op>=0.6?"#00ff88":"#1a4a1a"} strokeWidth="2" filter={vbe_op>=0.6?"url(#gl)":""}/>
            <line x1="155" y1="140" x2="172" y2="140" stroke={vbe_op>=0.6?"#00ff88":"#336633"} strokeWidth="2.5"/>
            <line x1="172" y1="125" x2="172" y2="155" stroke={vbe_op>=0.6?"#00ff88":"#336633"} strokeWidth="2.5"/>
            <line x1="172" y1="128" x2="215" y2="108" stroke={vbe_op>=0.6?"#00ff88":"#336633"} strokeWidth="2.5"/>
            <line x1="172" y1="152" x2="215" y2="172" stroke={vbe_op>=0.6?"#00ff88":"#336633"} strokeWidth="2.5"/>
            <polygon points="205,167 215,172 210,162" fill={vbe_op>=0.6?"#00ff88":"#336633"}/>
            <text x="190" y="158" fill={vbe_op>=0.6?"#00ff88":"#336633"} fontSize="11" fontFamily="monospace" fontWeight="bold">NPN</text>
            <line x1="140" y1="140" x2="155" y2="140" stroke={wc} strokeWidth="1.5"/>
            <line x1="215" y1="108" x2="268" y2="108" stroke={wc} strokeWidth="1.5"/><line x1="268" y1="108" x2="268" y2="120" stroke={wc} strokeWidth="1.5"/>
            <line x1="215" y1="172" x2="215" y2="230" stroke={wc} strokeWidth="1.5"/><line x1="215" y1="230" x2="22" y2="230" stroke={wc} strokeWidth="1.5"/><line x1="22" y1="230" x2="22" y2="100" stroke={wc} strokeWidth="1.5"/>
            <line x1="215" y1="230" x2="215" y2="245" stroke={wc} strokeWidth="1.5"/><line x1="200" y1="245" x2="230" y2="245" stroke={wc} strokeWidth="2.5"/><line x1="205" y1="250" x2="225" y2="250" stroke={wc} strokeWidth="1.8"/><line x1="210" y1="255" x2="220" y2="255" stroke={wc} strokeWidth="1.2"/>
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
        <div style={Pnl()}>
          <Lbl t="CONTROLS"/>
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
        <DM label="V" sub="BE" value={vbe_op} unit="V" color="#44aaff"/>
        <DM label="V" sub="CE" value={vce_op} unit="V" color="#ff8844"/>
        <DM label="I" sub="B" value={ib_op} unit="μA" color="#ff44aa"/>
        <DM label="I" sub="C" value={ic_op} unit="mA" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:16}}>
        <div style={{...Pnl(),overflowY:"auto",maxHeight:400}}>
          <Lbl t={`TABULATION [VCE=${vce_op.toFixed(2)}V]`}/>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr>{["V_BE","I_B(μA)","I_C(mA)"].map(h=><th key={h} style={{color:"#446644",fontWeight:"normal",padding:"4px 8px",borderBottom:"1px solid #1a3a1a",textAlign:"right",fontSize:10}}>{h}</th>)}</tr></thead>
            <tbody>{tableData.map((r,i)=><tr key={i} style={{background:r.isOp?"#002a1a":"transparent"}}>
              <td style={{padding:"3px 8px",textAlign:"right",color:r.isOp?"#00ff88":"#6a9a6a"}}>{r.vbe}</td>
              <td style={{padding:"3px 8px",textAlign:"right",color:r.isOp?"#00ff88":"#ff88cc"}}>{r.ib}</td>
              <td style={{padding:"3px 8px",textAlign:"right",color:r.isOp?"#00ff88":"#88ffcc"}}>{r.ic}</td>
            </tr>)}</tbody>
          </table>
          <div style={{marginTop:10,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ I_B=(V_BB−V_BE)/R_B<br/>▸ I_C=β×I_B<br/>▸ V_CE=V_CC−I_C×R_C</div>
        </div>
        <GraphBox label="CHARACTERISTICS — BJT">
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {["input","output"].map(m=><button key={m} onClick={()=>setMode(m)} style={{padding:"4px 10px",borderRadius:3,cursor:"pointer",fontFamily:"monospace",fontSize:10,background:mode===m?"#00ff8820":"transparent",color:mode===m?"#00ff88":"#446644",border:mode===m?"1px solid #00ff8844":"1px solid #1a3a1a"}}>{m==="input"?"INPUT (IB-VBE)":"OUTPUT (IC-VCE)"}</button>)}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mode==="input"?inputData:outputData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey={mode==="input"?"vbe":"vce"} stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:mode==="input"?"V_BE (V)":"V_CE (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(1)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:mode==="input"?"I_B (μA)":"I_C (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              {mode==="input"?VCE_V.map((v,i)=><Line key={v} type="monotone" dataKey={`vce${v}`} stroke={VC[i]} strokeWidth={1.8} dot={false} name={`VCE=${v}V`}/>)
              :IB_V.map((ib,i)=><Line key={ib} type="monotone" dataKey={`ib${ib}`} stroke={IC[i]} strokeWidth={1.8} dot={false} name={`IB=${ib}μA`}/>)}
              <ReferenceDot x={parseFloat(mode==="input"?vbe_op.toFixed(2):vce_op.toFixed(2))} y={mode==="input"?ib_op*1e6:ic_op*1e3} r={5} fill="#fff" stroke="#00ff88" strokeWidth={2} label={{value:"Q",fill:"#00ff88",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </GraphBox>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// DIODE
// ════════════════════════════════════════════
function DiodeSim(){
  const [vs,setVs]=useState(1.5),[rs,setRs]=useState(100);
  const {vd,id}=useMemo(()=>{
    if(vs<=0)return{vd:vs,id:0};
    let vd=0.65;
    for(let i=0;i<200;i++){const ex=Math.exp(Math.min(vd/VT,40)),f=(vs-vd)/rs-IS_D*(ex-1),df=-1/rs-IS_D*ex/VT,s=-f/df;vd+=Math.max(-0.05,Math.min(0.05,s));if(Math.abs(s)<1e-12)break;}
    return{vd:Math.max(0,Math.min(vd,vs)),id:Math.max(0,(vs-vd)/rs)};
  },[vs,rs]);
  const chartData=useMemo(()=>Array.from({length:71},(_,i)=>{const v=-1+i*0.04;return{v:parseFloat(v.toFixed(2)),i:Math.max(-0.001,Math.min(IS_D*(Math.exp(Math.min(v/VT,40))-1)*1000,50))};}),[]);
  const tableData=useMemo(()=>Array.from({length:16},(_,i)=>{const v=-0.5+i*0.1,curr=IS_D*(Math.exp(Math.min(v/VT,40))-1)*1000;return{v:v.toFixed(2),i:Math.abs(curr)<0.0001?"≈0":curr.toFixed(4),r:v<0?"Reverse":v<0.6?"Near":v<0.7?"Threshold":"Forward"};}),[]);
  return(
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={Pnl()}>
          <Lbl t="PN JUNCTION DIODE — SERIES CIRCUIT"/>
          <svg viewBox="0 0 320 180" width="100%" style={{maxHeight:180}}>
            <rect width="320" height="180" fill="#080f08" rx="6"/>
            <defs><filter id="dgl"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <circle cx="40" cy="70" r="18" fill="#080f08" stroke="#4d96ff" strokeWidth="1.5"/>
            <text x="40" y="67" fill="#4d96ff" fontSize="8" fontFamily="monospace" textAnchor="middle">V={vs.toFixed(1)}</text>
            <text x="40" y="77" fill="#4d96ff" fontSize="7" fontFamily="monospace" textAnchor="middle">Volt</text>
            <line x1="40" y1="88" x2="40" y2="140" stroke="#64ffda" strokeWidth="1.5"/><line x1="40" y1="52" x2="40" y2="15" stroke="#64ffda" strokeWidth="1.5"/><line x1="40" y1="15" x2="120" y2="15" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="120,15 124,7 128,23 132,7 136,23 140,7 144,23 148,15" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#dgl)"/>
            <text x="134" y="5" fill="#ffcc44" fontSize="8" fontFamily="monospace" textAnchor="middle">R_S={rs}Ω</text>
            <line x1="148" y1="15" x2="200" y2="15" stroke="#64ffda" strokeWidth="1.5"/>
            <polygon points="200,5 200,27 222,16" fill="none" stroke="#44ccff" strokeWidth="2.5" filter="url(#dgl)"/>
            <line x1="222" y1="5" x2="222" y2="27" stroke="#44ccff" strokeWidth="2.5" filter="url(#dgl)"/>
            <line x1="222" y1="16" x2="280" y2="16" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="280" y1="16" x2="280" y2="140" stroke="#64ffda" strokeWidth="1.5"/><line x1="280" y1="140" x2="40" y2="140" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="155" y1="147" x2="165" y2="147" stroke="#64ffda" strokeWidth="2.5"/><line x1="158" y1="152" x2="162" y2="152" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="190" y="38" fill="#44ccff" fontSize="9" fontFamily="monospace">A</text><text x="225" y="38" fill="#44ccff" fontSize="9" fontFamily="monospace">K</text>
            <text x="100" y="58" fill="#44aaff" fontSize="8" fontFamily="monospace">V_D={vd.toFixed(3)}V</text>
            <text x="100" y="70" fill="#ff9f43" fontSize="8" fontFamily="monospace">I_D={(id*1000).toFixed(2)}mA</text>
            <text x="100" y="82" fill={vd>0.6?"#00ff88":vd>0?"#ffcc44":"#ff4444"} fontSize="8" fontFamily="monospace">{vd>0.6?"FWD BIAS":vd>0?"NEAR":"REV BIAS"}</text>
          </svg>
        </div>
        <div style={Pnl()}>
          <Lbl t="CONTROLS"/>
          <Ctrl label="V_S (Supply)" value={vs} min={-3} max={5} step={0.1} onChange={setVs} unit="V" color="#44aaff"/>
          <Ctrl label="R_S (Series)" value={rs} min={10} max={10000} onChange={setRs} unit="Ω" color="#ffcc44" log/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>STATE</div>
            <div style={{fontSize:11,color:vd>0.6?"#00ff88":vd>0?"#ffcc44":"#ff4444"}}>{vd>0.6?"FORWARD BIAS":vd>0?"NEAR THRESHOLD":"REVERSE BIAS"}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ I=I_S(e^V/VT−1)<br/>▸ V_T=26mV<br/>▸ I_S=10⁻¹²A</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <DM label="V" sub="D" value={vd} unit="V" color="#44aaff"/>
        <DM label="V" sub="R" value={vs-vd} unit="V" color="#ff8844"/>
        <DM label="I" sub="D" value={id} unit="mA" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:16}}>
        <div style={{...Pnl(),overflowY:"auto",maxHeight:340}}>
          <Lbl t="TABLE: V_D vs I_D"/>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr>{["V_D","I_D (mA)","Region"].map(h=><th key={h} style={{color:"#446644",fontWeight:"normal",padding:"4px 6px",borderBottom:"1px solid #1a3a1a",textAlign:"right",fontSize:10}}>{h}</th>)}</tr></thead>
            <tbody>{tableData.map((r,i)=>{const op=Math.abs(parseFloat(r.v)-vd)<0.06;return<tr key={i} style={{background:op?"#002a1a":"transparent"}}>
              <td style={{padding:"3px 6px",textAlign:"right",color:op?"#00ff88":"#6a9a6a"}}>{r.v}</td>
              <td style={{padding:"3px 6px",textAlign:"right",color:op?"#00ff88":"#ff88cc"}}>{r.i}</td>
              <td style={{padding:"3px 6px",textAlign:"right",fontSize:9,color:r.r==="Forward"?"#00ff88":r.r==="Reverse"?"#ff4444":"#ffcc44"}}>{r.r}</td>
            </tr>;})}
            </tbody>
          </table>
        </div>
        <GraphBox label="I-V CHARACTERISTIC — DIODE">
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
        </GraphBox>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// JFET
// ════════════════════════════════════════════
function JFETSim(){
  const [vdd,setVdd]=useState(12),[vgs,setVgs]=useState(-1),[rd,setRd]=useState(1000);
  const VGS_V=[0,-1,-2,-3],C4=["#00ff88","#44ccff","#ff8844","#ff44aa"];
  const {vds_op,id_op}=useMemo(()=>{
    if(vgs<=VP)return{vds_op:vdd,id_op:0};
    const id_sat=IDSS*Math.pow(1-vgs/VP,2),knee=vgs-VP,vt=vdd-id_sat*rd;
    if(vt>=knee)return{vds_op:Math.max(0,vt),id_op:id_sat};
    let vd=knee*0.5;
    for(let i=0;i<100;i++){const it=IDSS*(2*(1-vgs/VP)*(vd/(-VP))-(vd/(-VP))**2),vn=vdd-it*rd;if(Math.abs(vn-vd)<1e-6)break;vd=vd+(vn-vd)*0.5;}
    return{vds_op:Math.max(0,vd),id_op:Math.max(0,(vdd-vd)/rd)};
  },[vdd,vgs,rd]);
  const outputData=useMemo(()=>Array.from({length:81},(_,i)=>{const vds=i*0.2,row={vds};VGS_V.forEach(vg=>{if(vg<=VP){row[`vgs${vg}`]=0;return;}const sat=IDSS*Math.pow(1-vg/VP,2),k=vg-VP,id=vds>=k?sat:IDSS*(2*(1-vg/VP)*(vds/(-VP))-(vds/(-VP))**2);row[`vgs${vg}`]=Math.max(0,Math.min(id*1000,15));});return row;}),[]);
  const transferData=useMemo(()=>Array.from({length:41},(_,i)=>{const vg=VP+i*0.1;return{vgs:parseFloat(vg.toFixed(2)),id:Math.max(0,vg>VP?IDSS*Math.pow(1-vg/VP,2)*1000:0)};}),[]);
  const region=vgs<=VP?"CUT-OFF":vds_op<(vgs-VP)?"TRIODE":"SATURATION";
  return(
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={Pnl()}><Lbl t="N-CHANNEL JFET — COMMON SOURCE"/>
          <svg viewBox="0 0 320 200" width="100%" style={{maxHeight:200}}>
            <rect width="320" height="200" fill="#080f08" rx="6"/>
            <defs><filter id="jgl"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <text x="160" y="14" fill="#64ff9a" fontSize="9" fontFamily="monospace" textAnchor="middle">V_DD={vdd}V</text>
            <line x1="160" y1="16" x2="160" y2="28" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="160,28 156,20 152,36 148,20 144,36 140,20 136,36 132,28" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#jgl)"/>
            <text x="115" y="24" fill="#ffcc44" fontSize="8" fontFamily="monospace">R_D={(rd/1000).toFixed(1)}k</text>
            <line x1="132" y1="28" x2="132" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="160" y1="28" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="132" y1="50" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="175" y1="65" x2="175" y2="135" stroke="#ffcc44" strokeWidth="3" filter="url(#jgl)"/>
            <line x1="163" y1="80" x2="163" y2="120" stroke="#ffcc44" strokeWidth="2" filter="url(#jgl)"/>
            <line x1="140" y1="100" x2="162" y2="100" stroke="#ffcc44" strokeWidth="2" filter="url(#jgl)"/>
            <line x1="175" y1="65" x2="175" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="175" y1="50" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="175" y1="135" x2="175" y2="165" stroke="#64ffda" strokeWidth="1.5"/><line x1="175" y1="165" x2="40" y2="165" stroke="#64ffda" strokeWidth="1.5"/><line x1="40" y1="165" x2="40" y2="100" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="160" y1="172" x2="190" y2="172" stroke="#64ffda" strokeWidth="2.5"/><line x1="164" y1="177" x2="186" y2="177" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="12" y="85" fill="#64ff9a" fontSize="8" fontFamily="monospace">VGS={vgs}V</text>
            <text x="182" y="62" fill="#44ccff" fontSize="9" fontFamily="monospace">D</text>
            <text x="126" y="103" fill="#44ccff" fontSize="9" fontFamily="monospace">G</text>
            <text x="182" y="142" fill="#44ccff" fontSize="9" fontFamily="monospace">S</text>
            <text x="190" y="88" fill="#88ccff" fontSize="8" fontFamily="monospace">VDS={vds_op.toFixed(2)}V</text>
            <text x="190" y="100" fill="#ff88cc" fontSize="8" fontFamily="monospace">ID={(id_op*1000).toFixed(2)}mA</text>
            <text x="190" y="112" fill={region==="SATURATION"?"#00ff88":region==="TRIODE"?"#ffcc44":"#ff4444"} fontSize="8" fontFamily="monospace">{region}</text>
          </svg>
        </div>
        <div style={Pnl()}>
          <Lbl t="CONTROLS"/>
          <Ctrl label="V_DD" value={vdd} min={1} max={20} step={0.5} onChange={setVdd} unit="V" color="#44aaff"/>
          <Ctrl label="V_GS" value={vgs} min={-4} max={0} step={0.1} onChange={setVgs} unit="V" color="#ff44aa"/>
          <Ctrl label="R_D" value={rd} min={100} max={10000} onChange={setRd} unit="Ω" color="#ffcc44" log/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>REGION</div>
            <div style={{fontSize:12,color:region==="SATURATION"?"#00ff88":region==="TRIODE"?"#ffcc44":"#ff4444"}}>{region}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ I_DSS={IDSS*1000}mA<br/>▸ V_P={VP}V</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <DM label="V" sub="DS" value={vds_op} unit="V" color="#44aaff"/>
        <DM label="V" sub="GS" value={vgs} unit="V" color="#ff44aa"/>
        <DM label="I" sub="D" value={id_op} unit="mA" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <GraphBox label="OUTPUT: I_D vs V_DS">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={outputData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vds" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_DS (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_D (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              {VGS_V.map((v,i)=><Line key={v} type="monotone" dataKey={`vgs${v}`} stroke={C4[i]} strokeWidth={1.8} dot={false} name={`VGS=${v}V`}/>)}
              <ReferenceDot x={parseFloat(vds_op.toFixed(1))} y={parseFloat((id_op*1000).toFixed(2))} r={5} fill="#fff" stroke="#00ff88" strokeWidth={2} label={{value:"Q",fill:"#00ff88",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </GraphBox>
        <GraphBox label="TRANSFER: I_D vs V_GS">
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
        </GraphBox>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// MOSFET
// ════════════════════════════════════════════
function MOSFETSim(){
  const [vdd,setVdd]=useState(12),[vgs,setVgs]=useState(5),[rd,setRd]=useState(1000);
  const VGS_V=[3,4,5,6],C4=["#00ff88","#44ccff","#ff8844","#ff44aa"];
  const {vds_op,id_op}=useMemo(()=>{
    if(vgs<VTH_MOS)return{vds_op:vdd,id_op:0};
    const k=vgs-VTH_MOS,id_sat=(KN/2)*k*k,vt=vdd-id_sat*rd;
    if(vt>=k)return{vds_op:Math.max(0,vt),id_op:id_sat};
    let vd=k*0.5;
    for(let i=0;i<100;i++){const it=KN*((vgs-VTH_MOS)*vd-vd*vd/2),vn=vdd-it*rd;if(Math.abs(vn-vd)<1e-6)break;vd=vd+(vn-vd)*0.5;}
    return{vds_op:Math.max(0,vd),id_op:Math.max(0,(vdd-vd)/rd)};
  },[vdd,vgs,rd]);
  const outputData=useMemo(()=>Array.from({length:81},(_,i)=>{const vds=i*0.2,row={vds};VGS_V.forEach(vg=>{if(vg<VTH_MOS){row[`vgs${vg}`]=0;return;}const k=vg-VTH_MOS,id=vds>=k?(KN/2)*k*k:KN*((vg-VTH_MOS)*vds-vds*vds/2);row[`vgs${vg}`]=Math.max(0,Math.min(id*1000,50));});return row;}),[]);
  const transferData=useMemo(()=>Array.from({length:61},(_,i)=>{const vg=i*0.15;return{vgs:parseFloat(vg.toFixed(2)),id:Math.min(vg<VTH_MOS?0:(KN/2)*(vg-VTH_MOS)**2*1000,50)};}),[]);
  const region=vgs<VTH_MOS?"CUT-OFF":vds_op<(vgs-VTH_MOS)?"TRIODE":"SATURATION";
  return(
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={Pnl()}><Lbl t="N-CH ENHANCEMENT MOSFET — CS"/>
          <svg viewBox="0 0 320 200" width="100%" style={{maxHeight:200}}>
            <rect width="320" height="200" fill="#080f08" rx="6"/>
            <defs><filter id="mgl"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <text x="160" y="14" fill="#64ff9a" fontSize="9" fontFamily="monospace" textAnchor="middle">V_DD={vdd}V</text>
            <line x1="160" y1="16" x2="160" y2="28" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="160,28 156,20 152,36 148,20 144,36 140,20 136,36 132,28" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#mgl)"/>
            <text x="115" y="24" fill="#ffcc44" fontSize="8" fontFamily="monospace">R_D={(rd/1000).toFixed(1)}k</text>
            <line x1="132" y1="28" x2="132" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="160" y1="28" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="132" y1="50" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="178" y1="65" x2="178" y2="135" stroke="#ff8844" strokeWidth="3" filter="url(#mgl)"/>
            <line x1="165" y1="80" x2="165" y2="120" stroke="#ff8844" strokeWidth="2" filter="url(#mgl)"/>
            <line x1="140" y1="100" x2="164" y2="100" stroke="#ff8844" strokeWidth="2" filter="url(#mgl)"/>
            <polygon points="171,97 178,100 171,103" fill="#ff8844"/>
            <line x1="178" y1="65" x2="178" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="178" y1="50" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="178" y1="135" x2="178" y2="165" stroke="#64ffda" strokeWidth="1.5"/><line x1="178" y1="165" x2="40" y2="165" stroke="#64ffda" strokeWidth="1.5"/><line x1="40" y1="165" x2="40" y2="100" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="163" y1="172" x2="193" y2="172" stroke="#64ffda" strokeWidth="2.5"/><line x1="167" y1="177" x2="189" y2="177" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="12" y="85" fill="#64ff9a" fontSize="8" fontFamily="monospace">VGS={vgs}V</text>
            <text x="185" y="62" fill="#44ccff" fontSize="9" fontFamily="monospace">D</text>
            <text x="126" y="103" fill="#44ccff" fontSize="9" fontFamily="monospace">G</text>
            <text x="185" y="142" fill="#44ccff" fontSize="9" fontFamily="monospace">S</text>
            <text x="192" y="88" fill="#88ccff" fontSize="8" fontFamily="monospace">VDS={vds_op.toFixed(2)}V</text>
            <text x="192" y="100" fill="#ff88cc" fontSize="8" fontFamily="monospace">ID={(id_op*1000).toFixed(2)}mA</text>
            <text x="192" y="112" fill={region==="SATURATION"?"#00ff88":region==="TRIODE"?"#ffcc44":"#ff4444"} fontSize="8" fontFamily="monospace">{region}</text>
          </svg>
        </div>
        <div style={Pnl()}>
          <Lbl t="CONTROLS"/>
          <Ctrl label="V_DD" value={vdd} min={1} max={20} step={0.5} onChange={setVdd} unit="V" color="#44aaff"/>
          <Ctrl label="V_GS" value={vgs} min={0} max={10} step={0.1} onChange={setVgs} unit="V" color="#ff8844"/>
          <Ctrl label="R_D" value={rd} min={100} max={10000} onChange={setRd} unit="Ω" color="#ffcc44" log/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>REGION</div>
            <div style={{fontSize:12,color:region==="SATURATION"?"#00ff88":region==="TRIODE"?"#ffcc44":"#ff4444"}}>{region}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ V_TH={VTH_MOS}V<br/>▸ K_N={KN*1000}mA/V²</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <DM label="V" sub="DS" value={vds_op} unit="V" color="#44aaff"/>
        <DM label="V" sub="GS" value={vgs} unit="V" color="#ff8844"/>
        <DM label="I" sub="D" value={id_op} unit="mA" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <GraphBox label="OUTPUT: I_D vs V_DS">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={outputData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vds" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_DS (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_D (mA)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              {VGS_V.map((v,i)=><Line key={v} type="monotone" dataKey={`vgs${v}`} stroke={C4[i]} strokeWidth={1.8} dot={false} name={`VGS=${v}V`}/>)}
              <ReferenceDot x={parseFloat(vds_op.toFixed(1))} y={parseFloat((id_op*1000).toFixed(2))} r={5} fill="#fff" stroke="#00ff88" strokeWidth={2} label={{value:"Q",fill:"#00ff88",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </GraphBox>
        <GraphBox label="TRANSFER: I_D vs V_GS">
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
        </GraphBox>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// IGBT
// ════════════════════════════════════════════
function IGBTSim(){
  const [vcc,setVcc]=useState(400),[vge,setVge]=useState(15),[rc,setRc]=useState(10);
  const VGE_V=[10,12,14,16,18],C5=["#00ff88","#44ccff","#ffcc44","#ff8844","#ff44aa"];
  const {vce_op,ic_op}=useMemo(()=>{
    if(vge<VTH_IGBT)return{vce_op:vcc,ic_op:0};
    const ic_sat=GM_IGBT*(vge-VTH_IGBT),vt=vcc-ic_sat*rc;
    return{vce_op:Math.max(0.5,vt),ic_op:Math.max(0,Math.min(ic_sat,(vcc-Math.max(0.5,vt))/rc))};
  },[vcc,vge,rc]);
  const outputData=useMemo(()=>Array.from({length:81},(_,i)=>{const vce=i*0.6,row={vce};VGE_V.forEach(vg=>{if(vg<VTH_IGBT){row[`vge${vg}`]=0;return;}row[`vge${vg}`]=Math.max(0,Math.min(GM_IGBT*(vg-VTH_IGBT)*(vce<1?vce:1),100));});return row;}),[]);
  const transferData=useMemo(()=>Array.from({length:61},(_,i)=>{const vg=i*0.3;return{vge:parseFloat(vg.toFixed(1)),ic:Math.min(vg<VTH_IGBT?0:GM_IGBT*(vg-VTH_IGBT),100)};}),[]);
  const region=vge<VTH_IGBT?"CUT-OFF":vce_op<1?"SATURATION":"ACTIVE";
  return(
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={Pnl()}><Lbl t="IGBT — HIGH POWER SWITCHING"/>
          <svg viewBox="0 0 320 200" width="100%" style={{maxHeight:200}}>
            <rect width="320" height="200" fill="#080f08" rx="6"/>
            <defs><filter id="igl"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <text x="160" y="14" fill="#64ff9a" fontSize="8" fontFamily="monospace" textAnchor="middle">V_CC={vcc}V (HIGH POWER)</text>
            <line x1="160" y1="16" x2="160" y2="28" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="160,28 156,20 152,36 148,20 144,36 140,20 136,36 132,28" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#igl)"/>
            <text x="112" y="24" fill="#ffcc44" fontSize="8" fontFamily="monospace">R_C={rc}Ω</text>
            <line x1="132" y1="28" x2="132" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="160" y1="28" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="132" y1="50" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/>
            <circle cx="195" cy="110" r="32" fill="none" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2" filter={vge>=VTH_IGBT?"url(#igl)":""}/>
            <line x1="178" y1="95" x2="178" y2="125" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2.5"/>
            <line x1="165" y1="107" x2="177" y2="107" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2"/>
            <line x1="158" y1="96" x2="158" y2="118" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2"/>
            <line x1="140" y1="107" x2="157" y2="107" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2"/>
            <line x1="178" y1="99" x2="215" y2="82" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2.5"/>
            <line x1="178" y1="121" x2="215" y2="138" stroke={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} strokeWidth="2.5"/>
            <polygon points="207,134 215,138 210,130" fill={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"}/>
            <text x="185" y="113" fill={vge>=VTH_IGBT?"#c77dff":"#2a1a2a"} fontSize="9" fontFamily="monospace" fontWeight="bold">IGBT</text>
            <line x1="215" y1="82" x2="215" y2="50" stroke="#64ffda" strokeWidth="1.5"/><line x1="215" y1="50" x2="160" y2="50" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="215" y1="138" x2="215" y2="175" stroke="#64ffda" strokeWidth="1.5"/><line x1="215" y1="175" x2="40" y2="175" stroke="#64ffda" strokeWidth="1.5"/><line x1="40" y1="175" x2="40" y2="107" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="200" y1="182" x2="230" y2="182" stroke="#64ffda" strokeWidth="2.5"/><line x1="204" y1="187" x2="226" y2="187" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="10" y="92" fill="#64ff9a" fontSize="8" fontFamily="monospace">VGE={vge}V</text>
            <text x="222" y="78" fill="#44ccff" fontSize="9" fontFamily="monospace">C</text>
            <text x="124" y="110" fill="#44ccff" fontSize="9" fontFamily="monospace">G</text>
            <text x="222" y="145" fill="#44ccff" fontSize="9" fontFamily="monospace">E</text>
            <text x="230" y="92" fill="#88ccff" fontSize="8" fontFamily="monospace">VCE={vce_op.toFixed(1)}V</text>
            <text x="230" y="104" fill="#ff88cc" fontSize="8" fontFamily="monospace">IC={ic_op.toFixed(1)}A</text>
          </svg>
        </div>
        <div style={Pnl()}>
          <Lbl t="CONTROLS"/>
          <Ctrl label="V_CC (High Voltage)" value={vcc} min={10} max={600} step={10} onChange={setVcc} unit="V" color="#44aaff"/>
          <Ctrl label="V_GE (Gate-Emitter)" value={vge} min={0} max={20} step={0.5} onChange={setVge} unit="V" color="#c77dff"/>
          <Ctrl label="R_C (Load)" value={rc} min={1} max={100} step={1} onChange={setRc} unit="Ω" color="#ffcc44"/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>REGION</div>
            <div style={{fontSize:12,color:region==="ACTIVE"?"#00ff88":region==="SATURATION"?"#ffcc44":"#ff4444"}}>{region}</div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#334433",lineHeight:1.8}}>▸ V_TH={VTH_IGBT}V<br/>▸ gm={GM_IGBT}A/V</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
        <DM label="V" sub="CE" value={vce_op} unit="V" color="#44aaff"/>
        <DM label="V" sub="GE" value={vge} unit="V" color="#c77dff"/>
        <DM label="I" sub="C" value={ic_op} unit="A" color="#44ffaa"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <GraphBox label="OUTPUT: I_C vs V_CE">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={outputData} margin={{top:5,right:10,bottom:20,left:10}}>
              <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
              <XAxis dataKey="vce" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_CE (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
              <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_C (A)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
              <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
              <Legend wrapperStyle={{fontSize:10}}/>
              {VGE_V.map((v,i)=><Line key={v} type="monotone" dataKey={`vge${v}`} stroke={C5[i]} strokeWidth={1.8} dot={false} name={`VGE=${v}V`}/>)}
              <ReferenceDot x={parseFloat(vce_op.toFixed(1))} y={parseFloat(ic_op.toFixed(1))} r={5} fill="#fff" stroke="#00ff88" strokeWidth={2} label={{value:"Q",fill:"#00ff88",fontSize:10,dx:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </GraphBox>
        <GraphBox label="TRANSFER: I_C vs V_GE">
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
        </GraphBox>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// SCR
// ════════════════════════════════════════════
function SCRSim(){
  const [vak,setVak]=useState(50),[ig,setIg]=useState(0),[rl,setRl]=useState(100),[igt,setIgt]=useState(20);
  const triggered=ig>=igt,vd=1.5;
  const ia=triggered?Math.max(0,(vak-vd)/rl):0;
  const vt=triggered?vd:vak;
  const state=triggered?ia>0.001?"CONDUCTING":"LATCHED-ON":"FORWARD BLOCKING";
  const sc=state==="CONDUCTING"?"#00ff88":"#ff4444";
  const chartData=useMemo(()=>{
    const pts=Array.from({length:101},(_,i)=>{const v=i*0.5;return{v:parseFloat(v.toFixed(1)),blocking:Math.min(v*0.0005,0.1),conduction:null};});
    for(let i=0;i<=40;i++){const v=i*0.05,c=IS_D*(Math.exp(Math.min(v/VT,40))-1)*200;if(pts[i])pts[i].conduction=Math.min(c,vak>0?vak/rl:0);}
    return pts;
  },[vak,rl]);
  return(
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 240px",gap:16,marginBottom:16}}>
        <div style={Pnl()}><Lbl t="SCR — SILICON CONTROLLED RECTIFIER"/>
          <svg viewBox="0 0 320 180" width="100%" style={{maxHeight:180}}>
            <rect width="320" height="180" fill="#080f08" rx="6"/>
            <defs><filter id="sgl"><feGaussianBlur stdDeviation="2" result="cb"/><feMerge><feMergeNode in="cb"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
            <circle cx="38" cy="55" r="16" fill="#080f08" stroke="#4d96ff" strokeWidth="1.5"/>
            <text x="38" y="52" fill="#4d96ff" fontSize="7" fontFamily="monospace" textAnchor="middle">V_AK</text>
            <text x="38" y="62" fill="#4d96ff" fontSize="7" fontFamily="monospace" textAnchor="middle">{vak}V</text>
            <line x1="38" y1="71" x2="38" y2="120" stroke="#64ffda" strokeWidth="1.5"/><line x1="38" y1="39" x2="38" y2="12" stroke="#64ffda" strokeWidth="1.5"/><line x1="38" y1="12" x2="118" y2="12" stroke="#64ffda" strokeWidth="1.5"/>
            <polyline points="118,12 122,4 126,20 130,4 134,20 138,4 142,20 146,12" fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#sgl)"/>
            <text x="132" y="3" fill="#ffcc44" fontSize="7" fontFamily="monospace" textAnchor="middle">R_L={rl}Ω</text>
            <line x1="146" y1="12" x2="196" y2="12" stroke="#64ffda" strokeWidth="1.5"/>
            <polygon points="196,3 196,23 215,13" fill="none" stroke={triggered?"#00ff88":"#446644"} strokeWidth="2.5" filter={triggered?"url(#sgl)":""}/>
            <line x1="215" y1="3" x2="215" y2="23" stroke={triggered?"#00ff88":"#446644"} strokeWidth="2.5" filter={triggered?"url(#sgl)":""}/>
            <line x1="215" y1="23" x2="245" y2="44" stroke="#ff9f43" strokeWidth="2" filter="url(#sgl)"/>
            <circle cx="248" cy="47" r="7" fill="#080f08" stroke="#ff9f43" strokeWidth="1.5"/>
            <text x="248" y="50" fill="#ff9f43" fontSize="7" fontFamily="monospace" textAnchor="middle">G</text>
            <text x="260" y="52" fill="#ff9f43" fontSize="8" fontFamily="monospace">IG={ig}mA</text>
            <line x1="215" y1="13" x2="278" y2="13" stroke="#64ffda" strokeWidth="1.5"/><line x1="278" y1="13" x2="278" y2="120" stroke="#64ffda" strokeWidth="1.5"/><line x1="278" y1="120" x2="38" y2="120" stroke="#64ffda" strokeWidth="1.5"/>
            <line x1="153" y1="127" x2="163" y2="127" stroke="#64ffda" strokeWidth="2.5"/><line x1="156" y1="132" x2="160" y2="132" stroke="#64ffda" strokeWidth="1.8"/>
            <text x="186" y="28" fill="#44ccff" fontSize="8" fontFamily="monospace">A</text><text x="217" y="28" fill="#44ccff" fontSize="8" fontFamily="monospace">K</text>
            <rect x="60" y="138" width="200" height="34" rx="4" fill={`${sc}15`} stroke={`${sc}44`} strokeWidth="1"/>
            <text x="160" y="152" fill={sc} fontSize="11" fontFamily="monospace" textAnchor="middle" fontWeight="bold">{state}</text>
            <text x="160" y="165" fill={sc} fontSize="8" fontFamily="monospace" textAnchor="middle">I_A={ia.toFixed(3)}A  V_T={vt.toFixed(2)}V</text>
          </svg>
        </div>
        <div style={Pnl()}>
          <Lbl t="CONTROLS"/>
          <Ctrl label="V_AK" value={vak} min={0} max={200} step={1} onChange={setVak} unit="V" color="#44aaff"/>
          <Ctrl label="I_G (Gate)" value={ig} min={0} max={100} step={1} onChange={setIg} unit="mA" color="#ff9f43"/>
          <Ctrl label="R_L (Load)" value={rl} min={1} max={1000} onChange={setRl} unit="Ω" color="#ffcc44" log/>
          <Ctrl label="I_GT (Trigger)" value={igt} min={1} max={100} step={1} onChange={setIgt} unit="mA" color="#ff44aa"/>
          <div style={{marginTop:10,padding:"8px 10px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
            <div style={{fontSize:9,color:"#446644",marginBottom:4}}>TRIGGER</div>
            <div style={{fontSize:10,color:triggered?"#00ff88":"#ff4444"}}>{triggered?`✓ ON (IG≥IGT)`:`✗ Need IG≥${igt}mA`}</div>
          </div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
        <DM label="V" sub="AK" value={vak} unit="V" color="#44aaff"/>
        <DM label="V" sub="T" value={vt} unit="V" color="#ff8844"/>
        <DM label="I" sub="A" value={ia} unit="A" color="#44ffaa"/>
        <DM label="I" sub="G" value={ig/1000} unit="mA" color="#ff9f43"/>
      </div>
      <GraphBox label="SCR I-V CHARACTERISTICS — BLOCKING vs CONDUCTION">
        <div style={{fontSize:9,color:"#334433",marginBottom:8}}>Raise I_G above I_GT to switch from blocking (red dashed) to conduction (green)</div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{top:5,right:20,bottom:20,left:10}}>
            <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3"/>
            <XAxis dataKey="v" stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"V_AK (V)",position:"insideBottom",fill:"#446644",fontSize:10,dy:16}} tickFormatter={v=>parseFloat(v).toFixed(0)}/>
            <YAxis stroke="#446644" tick={{fill:"#446644",fontSize:10}} label={{value:"I_A (A)",angle:-90,position:"insideLeft",fill:"#446644",fontSize:10,dx:-4}}/>
            <Tooltip contentStyle={{background:"#0a1a0a",border:"1px solid #1a3a1a",fontSize:11,fontFamily:"monospace"}}/>
            <Legend wrapperStyle={{fontSize:10}}/>
            <Line type="monotone" dataKey="blocking" stroke="#ff4444" strokeWidth={1.5} dot={false} name="Blocking" strokeDasharray="5 3"/>
            <Line type="monotone" dataKey="conduction" stroke="#00ff88" strokeWidth={2} dot={false} name="Conduction" connectNulls={false}/>
          </LineChart>
        </ResponsiveContainer>
      </GraphBox>
    </div>
  );
}

// ════════════════════════════════════════════
// CUSTOM CIRCUIT BUILDER
// ════════════════════════════════════════════
const CELL=40,COLS=18,ROWS=13;

const TOOLS=[
  {id:"select",label:"▶ Select",color:"#64ffda"},
  {id:"wire",label:"━ Wire",color:"#64ffda"},
  {id:"resistor",label:"⟿ Resistor",color:"#ffcc44"},
  {id:"vsource",label:"⊕ V Source",color:"#44aaff"},
  {id:"isource",label:"⊙ I Source",color:"#44ccff"},
  {id:"capacitor",label:"⊣ Capacitor",color:"#ff8844"},
  {id:"diode",label:"▷| Diode",color:"#00ff88"},
  {id:"bjt",label:"◯ BJT NPN",color:"#44ff88"},
  {id:"ground",label:"⏚ Ground",color:"#aabbaa"},
  {id:"node",label:"• Node",color:"#ffcc44"},
  {id:"delete",label:"✕ Delete",color:"#ff4444"},
];

function renderComp(c,selected){
  const x1=c.x1*CELL,y1=c.y1*CELL,x2=c.x2*CELL,y2=c.y2*CELL;
  const mx=(x1+x2)/2,my=(y1+y2)/2,isH=c.x1!==c.x2;
  const sel=selected===c.id,tc="#64ffda";
  const onClick=(e)=>{e.stopPropagation();};
  switch(c.type){
    case"resistor":return(
      <g key={c.id} onClick={onClick} style={{cursor:"pointer"}}>
        <line x1={x1} y1={y1} x2={isH?x1+12:x1} y2={isH?y1:y1+12} stroke={sel?"#fff":"#ffcc44"} strokeWidth="2"/>
        <rect x={isH?mx-18:x1-8} y={isH?my-8:my-18} width={isH?36:16} height={isH?16:36} fill="#0d1a0d" stroke={sel?"#fff":"#ffcc44"} strokeWidth={sel?2:1.5} rx="2"/>
        <line x1={isH?x2-12:x2} y1={isH?y2:y2-12} x2={x2} y2={y2} stroke={sel?"#fff":"#ffcc44"} strokeWidth="2"/>
        <circle cx={x1} cy={y1} r="3.5" fill={tc}/><circle cx={x2} cy={y2} r="3.5" fill={tc}/>
        <text x={mx} y={isH?my-14:mx+20} fill="#ffcc44" fontSize="9" textAnchor="middle" fontFamily="monospace">{c.label}</text>
        <text x={mx} y={isH?my+22:mx-14} fill="#ffaa00" fontSize="8" textAnchor="middle" fontFamily="monospace">{c.value}</text>
      </g>);
    case"vsource":return(
      <g key={c.id} onClick={onClick} style={{cursor:"pointer"}}>
        <line x1={x1} y1={y1} x2={isH?mx-16:x1} y2={isH?y1:my-16} stroke={sel?"#fff":"#44aaff"} strokeWidth="2"/>
        <circle cx={mx} cy={my} r="15" fill="#080f08" stroke={sel?"#fff":"#44aaff"} strokeWidth={sel?2:1.5}/>
        <text x={isH?mx-5:mx-1} y={isH?my+4:my-2} fill="#44aaff" fontSize="11" fontFamily="monospace">+</text>
        <text x={isH?mx+3:mx-1} y={isH?my+4:my+10} fill="#44aaff" fontSize="11" fontFamily="monospace">−</text>
        <line x1={isH?mx+16:x1} y1={isH?y1:my+16} x2={x2} y2={y2} stroke={sel?"#fff":"#44aaff"} strokeWidth="2"/>
        <circle cx={x1} cy={y1} r="3.5" fill={tc}/><circle cx={x2} cy={y2} r="3.5" fill={tc}/>
        <text x={mx} y={isH?my-20:mx-20} fill="#44aaff" fontSize="8" textAnchor="middle" fontFamily="monospace">{c.label}={c.value}</text>
      </g>);
    case"isource":return(
      <g key={c.id} onClick={onClick} style={{cursor:"pointer"}}>
        <line x1={x1} y1={y1} x2={isH?mx-16:x1} y2={isH?y1:my-16} stroke={sel?"#fff":"#44ccff"} strokeWidth="2"/>
        <circle cx={mx} cy={my} r="15" fill="#080f08" stroke={sel?"#fff":"#44ccff"} strokeWidth={sel?2:1.5}/>
        <polygon points={isH?`${mx-8},${my-5} ${mx-8},${my+5} ${mx+8},${my}`:`${mx-5},${my-8} ${mx+5},${my-8} ${mx},${my+8}`} fill={sel?"#fff":"#44ccff"}/>
        <line x1={isH?mx+16:x1} y1={isH?y1:my+16} x2={x2} y2={y2} stroke={sel?"#fff":"#44ccff"} strokeWidth="2"/>
        <circle cx={x1} cy={y1} r="3.5" fill={tc}/><circle cx={x2} cy={y2} r="3.5" fill={tc}/>
        <text x={mx} y={isH?my-20:mx-20} fill="#44ccff" fontSize="8" textAnchor="middle" fontFamily="monospace">{c.label}={c.value}</text>
      </g>);
    case"capacitor":return(
      <g key={c.id} onClick={onClick} style={{cursor:"pointer"}}>
        <line x1={x1} y1={y1} x2={isH?mx-6:x1} y2={isH?y1:my-6} stroke={sel?"#fff":"#ff8844"} strokeWidth="2"/>
        <line x1={isH?mx-6:x1-12} y1={isH?y1-12:my-6} x2={isH?mx-6:x1+12} y2={isH?y1+12:my-6} stroke={sel?"#fff":"#ff8844"} strokeWidth="2.5"/>
        <line x1={isH?mx+6:x1-12} y1={isH?y1-12:my+6} x2={isH?mx+6:x1+12} y2={isH?y1+12:my+6} stroke={sel?"#fff":"#ff8844"} strokeWidth="2.5"/>
        <line x1={isH?mx+6:x1} y1={isH?y1:my+6} x2={x2} y2={y2} stroke={sel?"#fff":"#ff8844"} strokeWidth="2"/>
        <circle cx={x1} cy={y1} r="3.5" fill={tc}/><circle cx={x2} cy={y2} r="3.5" fill={tc}/>
        <text x={mx} y={isH?my-18:mx+18} fill="#ff8844" fontSize="8" textAnchor="middle" fontFamily="monospace">{c.label}={c.value}</text>
      </g>);
    case"diode":return(
      <g key={c.id} onClick={onClick} style={{cursor:"pointer"}}>
        <line x1={x1} y1={y1} x2={isH?mx-12:x1} y2={isH?y1:my-12} stroke={sel?"#fff":"#00ff88"} strokeWidth="2"/>
        <polygon points={isH?`${mx-12},${y1-10} ${mx-12},${y1+10} ${mx+8},${y1}`:`${x1-10},${my-12} ${x1+10},${my-12} ${x1},${my+8}`} fill="none" stroke={sel?"#fff":"#00ff88"} strokeWidth="2"/>
        <line x1={isH?mx+8:x1-10} y1={isH?y1-10:my+8} x2={isH?mx+8:x1+10} y2={isH?y1+10:my+8} stroke={sel?"#fff":"#00ff88"} strokeWidth="2"/>
        <line x1={isH?mx+8:x1} y1={isH?y1:my+8} x2={x2} y2={y2} stroke={sel?"#fff":"#00ff88"} strokeWidth="2"/>
        <circle cx={x1} cy={y1} r="3.5" fill={tc}/><circle cx={x2} cy={y2} r="3.5" fill={tc}/>
        <text x={mx} y={isH?my-16:mx+16} fill="#00ff88" fontSize="8" textAnchor="middle" fontFamily="monospace">{c.label}</text>
      </g>);
    case"bjt":return(
      <g key={c.id} onClick={onClick} style={{cursor:"pointer"}}>
        <circle cx={x1*1+20} cy={y1*1} r="22" fill="none" stroke={sel?"#fff":"#44ff88"} strokeWidth={sel?2:1.5}/>
        <line x1={x1} y1={y1} x2={x1+8} y2={y1} stroke={sel?"#fff":"#44ff88"} strokeWidth="2"/>
        <line x1={x1+8} y1={y1-14} x2={x1+8} y2={y1+14} stroke={sel?"#fff":"#44ff88"} strokeWidth="2.5"/>
        <line x1={x1+8} y1={y1-10} x2={x1+30} y2={y1-22} stroke={sel?"#fff":"#44ff88"} strokeWidth="2"/>
        <line x1={x1+8} y1={y1+10} x2={x1+30} y2={y1+22} stroke={sel?"#fff":"#44ff88"} strokeWidth="2"/>
        <polygon points={`${x1+22},${y1+18} ${x1+30},${y1+22} ${x1+26},${y1+14}`} fill={sel?"#fff":"#44ff88"}/>
        <text x={x1+18} y={y1+4} fill={sel?"#fff":"#44ff88"} fontSize="8" fontFamily="monospace">NPN</text>
        <text x={x1-8} y={y1+4} fill="#44ccff" fontSize="8" fontFamily="monospace">B</text>
        <text x={x1+32} y={y1-20} fill="#44ccff" fontSize="8" fontFamily="monospace">C</text>
        <text x={x1+32} y={y1+26} fill="#44ccff" fontSize="8" fontFamily="monospace">E</text>
      </g>);
    case"ground":return(
      <g key={c.id} onClick={onClick} style={{cursor:"pointer"}}>
        <line x1={x1} y1={y1} x2={x1} y2={y1+10} stroke={sel?"#fff":"#aabbaa"} strokeWidth="2"/>
        <line x1={x1-14} y1={y1+10} x2={x1+14} y2={y1+10} stroke={sel?"#fff":"#aabbaa"} strokeWidth="2.5"/>
        <line x1={x1-9} y1={y1+15} x2={x1+9} y2={y1+15} stroke={sel?"#fff":"#aabbaa"} strokeWidth="2"/>
        <line x1={x1-4} y1={y1+20} x2={x1+4} y2={y1+20} stroke={sel?"#fff":"#aabbaa"} strokeWidth="1.5"/>
        <circle cx={x1} cy={y1} r="3.5" fill={tc}/>
      </g>);
    case"node":return(
      <g key={c.id} onClick={onClick} style={{cursor:"pointer"}}>
        <circle cx={x1} cy={y1} r="5" fill={sel?"#fff":"#ffcc44"} stroke={sel?"#ffcc44":"#ffaa00"} strokeWidth="1.5"/>
        {c.label&&<text x={x1+8} y={y1+4} fill="#ffcc44" fontSize="8" fontFamily="monospace">{c.label}</text>}
      </g>);
    default:return null;
  }
}

function CircuitBuilder(){
  const [tool,setTool]=useState("wire");
  const [orient,setOrient]=useState("h");
  const [comps,setComps]=useState([]);
  const [wires,setWires]=useState([]);
  const [wireStart,setWireStart]=useState(null);
  const [selected,setSelected]=useState(null);
  const [hover,setHover]=useState(null);
  const [editVal,setEditVal]=useState("");
  const [editLabel,setEditLabel]=useState("");

  const snap=v=>Math.round(v/CELL);
  const selectedComp=comps.find(c=>c.id===selected);

  const handleClick=(e)=>{
    const r=e.currentTarget.getBoundingClientRect();
    const gx=snap(e.clientX-r.left),gy=snap(e.clientY-r.top);
    if(gx<0||gx>COLS||gy<0||gy>ROWS)return;

    if(tool==="delete"){
      setComps(p=>p.filter(c=>{const cx=(c.x1+c.x2)/2,cy=(c.y1+c.y2)/2;return Math.abs(cx-gx)>1.2||Math.abs(cy-gy)>1.2;}));
      setWires(p=>p.filter(w=>{const wx=(w.x1+w.x2)/2,wy=(w.y1+w.y2)/2;return Math.abs(wx-gx)>1.2||Math.abs(wy-gy)>1.2;}));
      return;
    }
    if(tool==="select"){
      const c=comps.find(c=>{const cx=(c.x1+c.x2)/2,cy=(c.y1+c.y2)/2;return Math.abs(cx-gx)<=1.2&&Math.abs(cy-gy)<=1.2;});
      setSelected(c?.id||null);
      if(c){setEditVal(c.value||"");setEditLabel(c.label||"");}
      return;
    }
    if(tool==="wire"){
      if(!wireStart){setWireStart({x:gx,y:gy});return;}
      const{x:x1,y:y1}=wireStart;
      if(x1===gx&&y1===gy){setWireStart(null);return;}
      if(x1===gx||y1===gy){
        setWires(p=>[...p,{id:Date.now(),x1,y1,x2:gx,y2:gy}]);
      }else{
        const t=Date.now();
        setWires(p=>[...p,{id:t,x1,y1,x2:gx,y2:y1},{id:t+1,x1:gx,y1,x2:gx,y2:gy}]);
      }
      setWireStart(null);return;
    }
    if(tool==="ground"||tool==="node"){
      const id=`${tool}_${Date.now()}`;
      const n=comps.filter(c=>c.type===tool).length+1;
      setComps(p=>[...p,{id,type:tool,x1:gx,y1:gy,x2:gx,y2:gy,value:"0",label:tool==="node"?`N${n}`:""}]);
      return;
    }
    if(tool==="bjt"){
      const id=`bjt_${Date.now()}`;
      const n=comps.filter(c=>c.type==="bjt").length+1;
      setComps(p=>[...p,{id,type:"bjt",x1:gx,y1:gy,x2:gx,y2:gy,value:"β=100",label:`Q${n}`}]);
      return;
    }
    // Standard 2-terminal component
    const id=`${tool}_${Date.now()}`;
    const n=comps.filter(c=>c.type===tool).length+1;
    const lbl=`${tool==="resistor"?"R":tool==="vsource"?"V":tool==="isource"?"I":tool==="capacitor"?"C":"D"}${n}`;
    const def=tool==="resistor"?"1kΩ":tool==="vsource"?"5V":tool==="isource"?"1mA":tool==="capacitor"?"10µF":"1N4007";
    let x2=gx+(orient==="h"?2:0),y2=gy+(orient==="v"?2:0);
    if(x2>COLS){x2=gx;y2=gy+2;}
    if(y2>ROWS){x2=gx+2;y2=gy;}
    setComps(p=>[...p,{id,type:tool,x1:gx,y1:gy,x2,y2,value:def,label:lbl}]);
  };

  const applyEdit=()=>{
    if(!selected)return;
    setComps(p=>p.map(c=>c.id===selected?{...c,value:editVal,label:editLabel}:c));
    setSelected(null);
  };

  const toolColor=TOOLS.find(t=>t.id===tool)?.color||"#64ffda";

  return(
    <div style={{padding:"16px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:"170px 1fr",gap:16}}>
        {/* Palette */}
        <div style={Pnl()}>
          <Lbl t="COMPONENTS"/>
          {TOOLS.map(t=>(
            <button key={t.id} onClick={()=>{setTool(t.id);setWireStart(null);setSelected(null);}} style={{
              display:"block",width:"100%",marginBottom:5,padding:"7px 10px",borderRadius:5,border:"none",cursor:"pointer",
              fontFamily:"monospace",fontSize:11,textAlign:"left",
              background:tool===t.id?`${t.color}20`:"#0a1a0a",
              color:tool===t.id?t.color:"#446644",
              borderLeft:tool===t.id?`3px solid ${t.color}`:"3px solid transparent",
              transition:"all 0.1s"
            }}>{t.label}</button>
          ))}
          <hr style={{border:"1px solid #1a3a1a",margin:"8px 0"}}/>
          <button onClick={()=>setOrient(o=>o==="h"?"v":"h")} style={{
            display:"block",width:"100%",padding:"6px 8px",borderRadius:4,border:"1px solid #1a3a1a",
            cursor:"pointer",fontFamily:"monospace",fontSize:10,background:"#0a1a0a",color:"#446644",marginBottom:5
          }}>⟲ Orient: {orient==="h"?"Horiz":"Vert"}</button>
          <button onClick={()=>{setComps([]);setWires([]);setWireStart(null);setSelected(null);}} style={{
            display:"block",width:"100%",padding:"6px 8px",borderRadius:4,border:"1px solid #ff444433",
            cursor:"pointer",fontFamily:"monospace",fontSize:10,background:"#1a0a0a",color:"#ff4444",marginBottom:5
          }}>🗑 Clear All</button>
          <button onClick={()=>{if(wires.length>0)setWires(p=>p.slice(0,-1));else if(comps.length>0)setComps(p=>p.slice(0,-1));}} style={{
            display:"block",width:"100%",padding:"6px 8px",borderRadius:4,border:"1px solid #ffcc4433",
            cursor:"pointer",fontFamily:"monospace",fontSize:10,background:"#1a1a0a",color:"#ffcc44"
          }}>↩ Undo Last</button>

          {selectedComp&&(
            <div style={{marginTop:10,padding:"8px",background:"#0a1a0a",borderRadius:6,border:"1px solid #1a3a1a"}}>
              <div style={{fontSize:9,color:"#446644",marginBottom:6}}>EDIT — {selectedComp.label}</div>
              <div style={{fontSize:9,color:"#334433",marginBottom:3}}>Label:</div>
              <input value={editLabel} onChange={e=>setEditLabel(e.target.value)}
                style={{width:"100%",background:"#050f05",border:"1px solid #1a3a1a",borderRadius:3,color:"#00ff88",fontFamily:"monospace",fontSize:11,padding:"3px 5px",marginBottom:5}}/>
              <div style={{fontSize:9,color:"#334433",marginBottom:3}}>Value:</div>
              <input value={editVal} onChange={e=>setEditVal(e.target.value)}
                style={{width:"100%",background:"#050f05",border:"1px solid #1a3a1a",borderRadius:3,color:"#00ff88",fontFamily:"monospace",fontSize:11,padding:"3px 5px",marginBottom:6}}/>
              <button onClick={applyEdit} style={{width:"100%",padding:"4px",borderRadius:3,border:"none",background:"#00ff8820",color:"#00ff88",fontFamily:"monospace",fontSize:10,cursor:"pointer"}}>✓ Apply</button>
              <button onClick={()=>setSelected(null)} style={{width:"100%",padding:"4px",borderRadius:3,border:"none",background:"transparent",color:"#446644",fontFamily:"monospace",fontSize:10,cursor:"pointer",marginTop:3}}>Cancel</button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={Pnl()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:6}}>
            <div style={{fontSize:10,color:toolColor,letterSpacing:1}}>◈ CANVAS — <span style={{color:toolColor}}>{tool.toUpperCase()}</span> MODE {wireStart?<span style={{color:"#00ff88"}}> • CLICK END NODE</span>:""}</div>
            <div style={{fontSize:9,color:"#334433"}}>{comps.length} components · {wires.length} wires</div>
          </div>
          <div style={{overflowX:"auto",overflowY:"auto",borderRadius:6,border:"1px solid #0d2a0d"}}>
            <svg width={COLS*CELL} height={ROWS*CELL}
              style={{cursor:tool==="delete"?"crosshair":"crosshair",display:"block"}}
              onClick={handleClick}
              onMouseMove={e=>{const r=e.currentTarget.getBoundingClientRect();setHover({x:snap(e.clientX-r.left),y:snap(e.clientY-r.top)});}}
              onMouseLeave={()=>setHover(null)}>
              <rect width={COLS*CELL} height={ROWS*CELL} fill="#070e07"/>
              {/* Grid */}
              {Array.from({length:ROWS+1},(_,gy)=>Array.from({length:COLS+1},(_,gx)=>(
                <circle key={`${gx}-${gy}`} cx={gx*CELL} cy={gy*CELL} r="1.5" fill="#1a3a1a"/>
              )))}
              {/* Hover */}
              {hover&&hover.x>=0&&hover.x<=COLS&&hover.y>=0&&hover.y<=ROWS&&(
                <circle cx={hover.x*CELL} cy={hover.y*CELL} r="6" fill={`${toolColor}33`} stroke={`${toolColor}66`} strokeWidth="1"/>
              )}
              {/* Wires */}
              {wires.map(w=>(
                <line key={w.id} x1={w.x1*CELL} y1={w.y1*CELL} x2={w.x2*CELL} y2={w.y2*CELL} stroke="#64ffda" strokeWidth="2"/>
              ))}
              {/* Wire start */}
              {wireStart&&<circle cx={wireStart.x*CELL} cy={wireStart.y*CELL} r="7" fill="#00ff8855" stroke="#00ff88" strokeWidth="1.5"/>}
              {/* Wire preview */}
              {wireStart&&hover&&<line x1={wireStart.x*CELL} y1={wireStart.y*CELL} x2={hover.x*CELL} y2={hover.y*CELL} stroke="#00ff8855" strokeWidth="1.5" strokeDasharray="5,3"/>}
              {/* Components */}
              {comps.map(c=>renderComp(c,selected))}
            </svg>
          </div>
          <div style={{marginTop:10,padding:"8px 12px",background:"#0a1a0a",borderRadius:6,fontSize:9,color:"#334433",lineHeight:2,display:"grid",gridTemplateColumns:"1fr 1fr"}}>
            <span>▸ Wire: click two nodes to connect</span>
            <span>▸ Select: click component to edit</span>
            <span>▸ Orient ⟲: toggle horiz/vert</span>
            <span>▸ Delete: click near component</span>
            <span>▸ Undo: removes last placed item</span>
            <span>▸ Drag ends at grid intersections</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════
const DEVICES=[
  {id:"BJT",    label:"BJT",           color:"#00ff88", desc:"Bipolar Junction Transistor"},
  {id:"PN",     label:"PN Diode",      color:"#44ccff", desc:"PN Junction Diode"},
  {id:"JFET",   label:"JFET",          color:"#ffcc44", desc:"N-Channel Junction FET"},
  {id:"MOSFET", label:"MOSFET",        color:"#ff8844", desc:"N-Ch Enhancement MOSFET"},
  {id:"IGBT",   label:"IGBT",          color:"#c77dff", desc:"Insulated Gate BJT"},
  {id:"SCR",    label:"SCR",           color:"#ff9f43", desc:"Silicon Controlled Rectifier"},
  {id:"CUSTOM", label:"⚙ Custom",      color:"#64ffda", desc:"Build Your Own Circuit"},
];

export default function SemiconductorLab(){
  const [active,setActive]=useState("BJT");
  const dev=DEVICES.find(d=>d.id===active);
  return(
    <div style={{minHeight:"100vh",background:"#040a04",fontFamily:"'Courier New',monospace",color:"#aabbaa",paddingBottom:40}}>
      <div style={{background:"linear-gradient(90deg,#040a04,#0a1a0a,#040a04)",borderBottom:"1px solid #1a3a1a",padding:"16px 24px",display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:"radial-gradient(circle,#00ff88 0%,#006633 60%,#001a0a 100%)",boxShadow:"0 0 16px #00ff88aa",flexShrink:0}}/>
        <div>
          <div style={{fontSize:18,color:"#00ff88",letterSpacing:4,textShadow:"0 0 12px #00ff88"}}>SEMICONDUCTOR LAB</div>
          <div style={{fontSize:10,color:"#446644",letterSpacing:3}}>DEVICE CHARACTERISTICS ANALYZER v4.0</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {["#ff4444","#ffcc00","#00ff88"].map((c,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:c,boxShadow:`0 0 6px ${c}`}}/>)}
        </div>
      </div>
      <div style={{display:"flex",gap:2,padding:"10px 24px",borderBottom:"1px solid #0d1f0d",background:"#050d05",overflowX:"auto"}}>
        {DEVICES.map(d=>(
          <button key={d.id} onClick={()=>setActive(d.id)} style={{
            padding:"7px 16px",borderRadius:4,border:"none",cursor:"pointer",fontFamily:"monospace",fontSize:11,letterSpacing:1,whiteSpace:"nowrap",
            background:active===d.id?`${d.color}18`:"transparent",color:active===d.id?d.color:"#446644",
            borderBottom:active===d.id?`2px solid ${d.color}`:"2px solid transparent",transition:"all 0.15s"
          }}>{d.label}</button>
        ))}
      </div>
      <div style={{padding:"8px 24px",background:"#050d05",borderBottom:"1px solid #0d1f0d"}}>
        <span style={{color:dev?.color,fontSize:11,letterSpacing:1}}>● {dev?.desc}</span>
        {active==="CUSTOM"&&<span style={{color:"#334433",fontSize:10,marginLeft:16}}>Place components from the left panel → connect with Wire tool</span>}
      </div>
      {active==="BJT"    &&<BJTSim/>}
      {active==="PN"     &&<DiodeSim/>}
      {active==="JFET"   &&<JFETSim/>}
      {active==="MOSFET" &&<MOSFETSim/>}
      {active==="IGBT"   &&<IGBTSim/>}
      {active==="SCR"    &&<SCRSim/>}
      {active==="CUSTOM" &&<CircuitBuilder/>}
    </div>
  );
}