import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine, ReferenceDot
} from "recharts";

// ─── Physics constants ────────────────────────────────────────────────
const VT = 0.02585;
const IS = 1e-15;
const VA = 80; // Early voltage

function bjt_ib(vbe, beta) {
  if (vbe <= 0) return 0;
  return (IS / beta) * (Math.exp(Math.min(vbe / VT, 30)) - 1);
}

function bjt_ic(ib, beta, vce) {
  if (ib <= 0) return 0;
  return beta * ib * (1 + vce / VA);
}

// ─── BJT Circuit SVG ─────────────────────────────────────────────────
function BJTCircuit({ vbb, vcc, rb, rc, beta, vbe_op, vce_op, ib_op, ic_op }) {
  const active = vbe_op >= 0.6;
  const glow = active ? "#00ff88" : "#334";
  const wireColor = "#64ffda";
  const rb_kohm = (rb / 1000).toFixed(0);
  const rc_kohm = (rc / 1000).toFixed(1);

  return (
    <svg viewBox="0 0 320 280" width="100%" style={{ maxHeight: 260 }}>
      {/* Grid background */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1a2a1a" strokeWidth="0.5" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow2">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <rect width="320" height="280" fill="#080f08" rx="6" />
      <rect width="320" height="280" fill="url(#grid)" rx="6" />

      {/* ── VBB supply (left) ── */}
      <text x="12" y="52" fill="#aed6a0" fontSize="10" fontFamily="monospace">V_BB</text>
      <text x="12" y="63" fill="#64ff9a" fontSize="9" fontFamily="monospace">{vbb.toFixed(1)}V</text>
      {/* battery symbol */}
      <line x1="22" y1="68" x2="22" y2="80" stroke={wireColor} strokeWidth="1.5" />
      <line x1="16" y1="80" x2="28" y2="80" stroke={wireColor} strokeWidth="2.5" />
      <line x1="18" y1="84" x2="26" y2="84" stroke={wireColor} strokeWidth="1.5" />
      <line x1="16" y1="88" x2="28" y2="88" stroke={wireColor} strokeWidth="2.5" />
      <line x1="18" y1="92" x2="26" y2="92" stroke={wireColor} strokeWidth="1.5" />
      <line x1="22" y1="92" x2="22" y2="100" stroke={wireColor} strokeWidth="1.5" />

      {/* RB resistor (base resistor) */}
      <line x1="22" y1="68" x2="22" y2="40" stroke={wireColor} strokeWidth="1.5" />
      <line x1="22" y1="40" x2="80" y2="40" stroke={wireColor} strokeWidth="1.5" />
      {/* zigzag resistor */}
      <polyline points="80,40 84,32 88,48 92,32 96,48 100,32 104,48 108,40"
        fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#glow)" />
      <text x="87" y="28" fill="#ffcc44" fontSize="9" fontFamily="monospace">R_B</text>
      <text x="82" y="20" fill="#ffaa00" fontSize="8" fontFamily="monospace">{rb_kohm}kΩ</text>
      <line x1="108" y1="40" x2="140" y2="40" stroke={wireColor} strokeWidth="1.5" />
      {/* base node */}
      <circle cx="140" cy="40" r="2.5" fill={wireColor} />
      <line x1="140" y1="40" x2="140" y2="140" stroke={wireColor} strokeWidth="1.5" />

      {/* ── VCC supply (right top) ── */}
      <text x="258" y="22" fill="#aed6a0" fontSize="10" fontFamily="monospace">V_CC</text>
      <text x="258" y="33" fill="#64ff9a" fontSize="9" fontFamily="monospace">{vcc.toFixed(1)}V</text>
      <line x1="268" y1="38" x2="268" y2="60" stroke={wireColor} strokeWidth="1.5" />

      {/* RC resistor */}
      <polyline points="268,60 272,52 276,68 280,52 284,68 288,52 292,68 296,60"
        fill="none" stroke="#ffcc44" strokeWidth="1.8" filter="url(#glow)" />
      <text x="272" y="48" fill="#ffcc44" fontSize="9" fontFamily="monospace">R_C</text>
      <text x="268" y="40" fill="#ffaa00" fontSize="8" fontFamily="monospace">{rc_kohm}kΩ</text>
      <line x1="268" y1="68" x2="268" y2="120" stroke={wireColor} strokeWidth="1.5" />
      {/* collector node */}
      <circle cx="268" cy="120" r="2.5" fill={wireColor} />

      {/* ── NPN BJT symbol ── */}
      {/* Circle */}
      <circle cx="200" cy="155" r="32" fill="none" stroke={active ? "#00ff88" : "#1a4a1a"}
        strokeWidth="2" filter={active ? "url(#glow2)" : ""} />
      {/* Base line */}
      <line x1="155" y1="140" x2="172" y2="140" stroke={active ? "#00ff88" : "#336633"} strokeWidth="2.5" />
      <line x1="172" y1="125" x2="172" y2="155" stroke={active ? "#00ff88" : "#336633"} strokeWidth="2.5" />
      {/* Collector */}
      <line x1="172" y1="128" x2="215" y2="108" stroke={active ? "#00ff88" : "#336633"} strokeWidth="2.5" />
      {/* Emitter with arrow */}
      <line x1="172" y1="152" x2="215" y2="172" stroke={active ? "#00ff88" : "#336633"} strokeWidth="2.5" />
      <polygon points="205,167 215,172 210,162" fill={active ? "#00ff88" : "#336633"} />
      {/* BJT label */}
      <text x="190" y="158" fill={active ? "#00ff88" : "#336633"} fontSize="11"
        fontFamily="monospace" fontWeight="bold">NPN</text>

      {/* Wire: base to BJT */}
      <line x1="140" y1="140" x2="155" y2="140" stroke={wireColor} strokeWidth="1.5" />

      {/* Wire: collector to RC */}
      <line x1="215" y1="108" x2="268" y2="108" stroke={wireColor} strokeWidth="1.5" />
      <line x1="268" y1="108" x2="268" y2="120" stroke={wireColor} strokeWidth="1.5" />

      {/* Emitter to ground */}
      <line x1="215" y1="172" x2="215" y2="230" stroke={wireColor} strokeWidth="1.5" />
      <line x1="215" y1="230" x2="22" y2="230" stroke={wireColor} strokeWidth="1.5" />
      <line x1="22" y1="230" x2="22" y2="100" stroke={wireColor} strokeWidth="1.5" />

      {/* Ground symbol */}
      <line x1="215" y1="230" x2="215" y2="245" stroke={wireColor} strokeWidth="1.5" />
      <line x1="200" y1="245" x2="230" y2="245" stroke={wireColor} strokeWidth="2.5" />
      <line x1="205" y1="250" x2="225" y2="250" stroke={wireColor} strokeWidth="1.8" />
      <line x1="210" y1="255" x2="220" y2="255" stroke={wireColor} strokeWidth="1.2" />
      <text x="206" y="268" fill="#64ffda" fontSize="9" fontFamily="monospace">GND</text>

      {/* ── Voltmeter VBE ── */}
      <circle cx="75" cy="170" r="14" fill="#0a1a0a" stroke="#44aaff" strokeWidth="1.5" />
      <text x="75" y="168" fill="#44aaff" fontSize="8" fontFamily="monospace" textAnchor="middle">V</text>
      <text x="75" y="178" fill="#44aaff" fontSize="7" fontFamily="monospace" textAnchor="middle">BE</text>
      <line x1="75" y1="156" x2="75" y2="140" stroke="#44aaff" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="75" y1="140" x2="140" y2="140" stroke="#44aaff" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="75" y1="184" x2="75" y2="200" stroke="#44aaff" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="75" y1="200" x2="215" y2="200" stroke="#44aaff" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="215" y1="200" x2="215" y2="172" stroke="#44aaff" strokeWidth="1" strokeDasharray="3,2" />
      <text x="36" y="172" fill="#88ccff" fontSize="8" fontFamily="monospace">{vbe_op.toFixed(3)}V</text>

      {/* ── Voltmeter VCE ── */}
      <circle cx="300" cy="155" r="14" fill="#0a1a0a" stroke="#ff8844" strokeWidth="1.5" />
      <text x="300" y="153" fill="#ff8844" fontSize="8" fontFamily="monospace" textAnchor="middle">V</text>
      <text x="300" y="163" fill="#ff8844" fontSize="7" fontFamily="monospace" textAnchor="middle">CE</text>
      <line x1="300" y1="141" x2="300" y2="120" stroke="#ff8844" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="300" y1="120" x2="268" y2="120" stroke="#ff8844" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="300" y1="169" x2="300" y2="230" stroke="#ff8844" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="300" y1="230" x2="268" y2="230" stroke="#ff8844" strokeWidth="1" strokeDasharray="3,2" />
      <text x="294" y="185" fill="#ffaa88" fontSize="8" fontFamily="monospace">{vce_op.toFixed(2)}V</text>

      {/* ── Ammeter IB ── */}
      <circle cx="120" cy="40" r="10" fill="#0a1a0a" stroke="#ff44aa" strokeWidth="1.5" />
      <text x="120" y="43" fill="#ff44aa" fontSize="8" fontFamily="monospace" textAnchor="middle">A</text>
      <text x="120" y="55" fill="#ff88cc" fontSize="7" fontFamily="monospace" textAnchor="middle">
        {(ib_op * 1e6).toFixed(1)}μA
      </text>

      {/* ── Ammeter IC ── */}
      <circle cx="268" cy="90" r="10" fill="#0a1a0a" stroke="#44ffaa" strokeWidth="1.5" />
      <text x="268" y="93" fill="#44ffaa" fontSize="8" fontFamily="monospace" textAnchor="middle">A</text>
      <text x="242" y="82" fill="#88ffcc" fontSize="7" fontFamily="monospace" textAnchor="middle">
        {(ic_op * 1e3).toFixed(2)}mA
      </text>

      {/* Operating point indicator */}
      {active && (
        <text x="160" y="275" fill="#00ff88" fontSize="8" fontFamily="monospace" textAnchor="middle"
          filter="url(#glow)">● ACTIVE REGION</text>
      )}
      {!active && (
        <text x="160" y="275" fill="#664444" fontSize="8" fontFamily="monospace" textAnchor="middle">
          ○ CUT-OFF
        </text>
      )}
    </svg>
  );
}

// ─── Meter Display ───────────────────────────────────────────────────
function DigitalMeter({ label, value, unit, color, sub }) {
  const display = Math.abs(value) < 1e-12 ? "0.000"
    : Math.abs(value) >= 1000 ? value.toExponential(2)
    : Math.abs(value) >= 0.001 ? value.toFixed(3)
    : (value * 1e6).toFixed(2) + "µ";

  return (
    <div style={{
      background: "linear-gradient(135deg, #080f08 0%, #0d1a0d 100%)",
      border: `1px solid ${color}33`,
      borderRadius: 8, padding: "10px 14px",
      boxShadow: `0 0 12px ${color}22, inset 0 1px 0 ${color}22`,
      minWidth: 110
    }}>
      <div style={{ color: "#667766", fontSize: 10, fontFamily: "monospace", marginBottom: 4 }}>
        {label}{sub && <sub style={{ fontSize: 8 }}>{sub}</sub>}
      </div>
      <div style={{
        color, fontSize: 20, fontFamily: "'Courier New', monospace", fontWeight: "bold",
        textShadow: `0 0 8px ${color}`, letterSpacing: 2
      }}>
        {typeof value === "number" && Math.abs(value) < 1e-12 ? "0.000"
          : unit === "μA" ? (value * 1e6).toFixed(2)
          : unit === "mA" ? (value * 1e3).toFixed(3)
          : value.toFixed(3)}
      </div>
      <div style={{ color: "#446644", fontSize: 10, fontFamily: "monospace" }}>{unit}</div>
    </div>
  );
}

// ─── Slider control ──────────────────────────────────────────────────
function SliderControl({ label, value, min, max, step, onChange, unit, color = "#64ffda", log }) {
  const handleChange = (e) => {
    let v = parseFloat(e.target.value);
    if (log) v = Math.pow(10, v);
    onChange(v);
  };
  const sliderVal = log ? Math.log10(value) : value;
  const sliderMin = log ? Math.log10(min) : min;
  const sliderMax = log ? Math.log10(max) : max;
  const sliderStep = log ? 0.01 : step;

  const displayVal = value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value >= 1 ? value.toFixed(1) : value.toFixed(2);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: "#aabba0", fontSize: 11, fontFamily: "monospace" }}>{label}</span>
        <span style={{ color, fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}>
          {displayVal} {unit}
        </span>
      </div>
      <div style={{ position: "relative" }}>
        <input
          type="range" min={sliderMin} max={sliderMax} step={sliderStep}
          value={sliderVal} onChange={handleChange}
          style={{
            width: "100%", appearance: "none", height: 4,
            background: `linear-gradient(to right, ${color} 0%, ${color} ${((sliderVal - sliderMin) / (sliderMax - sliderMin)) * 100}%, #1a2a1a ${((sliderVal - sliderMin) / (sliderMax - sliderMin)) * 100}%, #1a2a1a 100%)`,
            borderRadius: 2, outline: "none", cursor: "pointer"
          }}
        />
      </div>
    </div>
  );
}

// ─── Device placeholder ──────────────────────────────────────────────
function DevicePlaceholder({ name }) {
  const icons = { "PN Junction": "⊕", JFET: "⊢", MOSFET: "⊣", IGBT: "⊗", SCR: "⊙" };
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: 300, color: "#334433"
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{icons[name] || "◈"}</div>
      <div style={{ fontFamily: "monospace", fontSize: 16, color: "#446644" }}>{name}</div>
      <div style={{ fontFamily: "monospace", fontSize: 11, color: "#334433", marginTop: 8 }}>
        simulation coming soon
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────
const DEVICES = ["PN Junction", "BJT", "JFET", "MOSFET", "IGBT", "SCR"];
const VCE_COLORS = ["#00ff88", "#44ccff", "#ff8844", "#ff44aa"];
const VCE_VALS = [1, 2, 5, 10];
const IB_COLORS = ["#00ff88", "#44ccff", "#ffcc44", "#ff8844", "#ff44aa", "#cc44ff"];
const IB_VALS = [10, 20, 40, 60, 80, 100]; // μA

export default function SemiconductorLab() {
  const [activeDevice, setActiveDevice] = useState("BJT");
  const [vbb, setVbb] = useState(3.0);
  const [vcc, setVcc] = useState(10.0);
  const [rb, setRb] = useState(100000);
  const [rc, setRc] = useState(2000);
  const [beta, setBeta] = useState(100);
  const [chartMode, setChartMode] = useState("input");

  // ── Operating point ──────────────────────────────────────────────
  const { vbe_op, ib_op, ic_op, vce_op } = useMemo(() => {
    const VBE_THRESH = 0.6;
    if (vbb < VBE_THRESH) return { vbe_op: vbb, ib_op: 0, ic_op: 0, vce_op: vcc };
    // Iterative solve
    let vbe = 0.7, ib, ic, vce;
    for (let i = 0; i < 50; i++) {
      ib = (vbb - vbe) / rb;
      if (ib < 0) { ib = 0; break; }
      ic = beta * ib;
      vce = vcc - ic * rc;
      if (vce < 0.2) {
        // Saturation
        vce = 0.2;
        ic = (vcc - vce) / rc;
        ib = ic / beta;
        vbe = 0.75;
        break;
      }
      // Early effect feedback
      ic = beta * ib * (1 + vce / VA);
      vce = vcc - ic * rc;
      const ib_new = (IS / beta) * (Math.exp(vbe / VT) - 1);
      vbe = VT * Math.log(ib / (IS / beta) + 1);
      if (Math.abs(vbe - vbe) < 1e-6) break;
    }
    ib = Math.max(0, ib);
    ic = Math.max(0, ic);
    vce = Math.max(0.1, vce);
    vbe = Math.min(vbe, 0.9);
    return { vbe_op: vbe, ib_op: ib, ic_op: ic, vce_op: vce };
  }, [vbb, vcc, rb, rc, beta]);

  // ── Input characteristic data: IB vs VBE, param=VCE ─────────────
  const inputData = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const vbe = i * 0.01; // 0..0.8
      const row = { vbe };
      VCE_VALS.forEach((vce) => {
        const earlyFactor = 1 + vce / VA;
        const ib = (IS / beta) * (Math.exp(Math.min(vbe / VT, 25)) - 1) * earlyFactor;
        row[`vce${vce}`] = Math.max(0, Math.min(ib * 1e6, 300)); // μA
      });
      pts.push(row);
    }
    return pts;
  }, [beta]);

  // ── Output characteristic data: IC vs VCE, param=IB ─────────────
  const outputData = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 100; i++) {
      const vce = i * 0.15; // 0..15V
      const row = { vce };
      IB_VALS.forEach((ib_ua) => {
        const ib = ib_ua * 1e-6;
        let ic;
        if (vce < 0.2) {
          ic = (vce / 0.2) * beta * ib;
        } else {
          ic = beta * ib * (1 + vce / VA);
        }
        row[`ib${ib_ua}`] = Math.max(0, Math.min(ic * 1000, 60)); // mA
      });
      pts.push(row);
    }
    return pts;
  }, [beta]);

  // ── Table data: sweep VBE, show IB at current VCE ───────────────
  const tableData = useMemo(() => {
    const rows = [];
    for (let i = 0; i <= 16; i++) {
      const vbe = 0.4 + i * 0.025;
      const earlyFactor = 1 + vce_op / VA;
      const ib_ua = (IS / beta) * (Math.exp(Math.min(vbe / VT, 25)) - 1) * earlyFactor * 1e6;
      const ic_ma = ib_ua * beta / 1000;
      rows.push({
        vbe: vbe.toFixed(3),
        ib: ib_ua < 0.001 ? "≈ 0" : ib_ua < 100 ? ib_ua.toFixed(2) : ib_ua.toFixed(1),
        ic: ic_ma < 0.001 ? "≈ 0" : ic_ma.toFixed(3),
        isOp: Math.abs(vbe - vbe_op) < 0.015
      });
    }
    return rows;
  }, [beta, vce_op, vbe_op]);

  // ── Operating point on graph ─────────────────────────────────────
  const opIB_uA = ib_op * 1e6;
  const opIC_mA = ic_op * 1e3;

  return (
    <div style={{
      minHeight: "100vh", background: "#040a04",
      fontFamily: "'Courier New', monospace", color: "#aabbaa",
      padding: "0 0 40px"
    }}>
      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(90deg, #040a04 0%, #0a1a0a 40%, #040a04 100%)",
        borderBottom: "1px solid #1a3a1a", padding: "16px 24px",
        display: "flex", alignItems: "center", gap: 16
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "radial-gradient(circle, #00ff88 0%, #006633 60%, #001a0a 100%)",
          boxShadow: "0 0 16px #00ff88aa", flexShrink: 0
        }} />
        <div>
          <div style={{ fontSize: 18, color: "#00ff88", letterSpacing: 4, textShadow: "0 0 12px #00ff88" }}>
            SEMICONDUCTOR LAB
          </div>
          <div style={{ fontSize: 10, color: "#446644", letterSpacing: 3 }}>
            DEVICE CHARACTERISTICS ANALYZER v2.0
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {["●", "●", "●"].map((d, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: i === 0 ? "#ff4444" : i === 1 ? "#ffcc00" : "#00ff88",
              boxShadow: `0 0 6px ${i === 0 ? "#ff4444" : i === 1 ? "#ffcc00" : "#00ff88"}`
            }} />
          ))}
        </div>
      </div>

      {/* ── Device selector ── */}
      <div style={{
        display: "flex", gap: 2, padding: "12px 24px",
        borderBottom: "1px solid #0d1f0d", background: "#050d05",
        overflowX: "auto"
      }}>
        {DEVICES.map(d => (
          <button key={d} onClick={() => setActiveDevice(d)} style={{
            padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer",
            fontFamily: "monospace", fontSize: 11, letterSpacing: 1,
            background: activeDevice === d ? "#00ff8822" : "transparent",
            color: activeDevice === d ? "#00ff88" : "#446644",
            borderBottom: activeDevice === d ? "2px solid #00ff88" : "2px solid transparent",
            boxShadow: activeDevice === d ? "0 0 8px #00ff8833" : "none",
            transition: "all 0.15s"
          }}>{d}</button>
        ))}
      </div>

      {activeDevice !== "BJT" ? (
        <DevicePlaceholder name={activeDevice} />
      ) : (
        <div style={{ padding: "16px 24px" }}>

          {/* ── Row 1: Circuit + Controls + Meters ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 16, marginBottom: 16 }}>

            {/* Circuit diagram */}
            <div style={{
              background: "#050f05", border: "1px solid #1a3a1a", borderRadius: 10,
              padding: 12, boxShadow: "inset 0 0 30px #00110022"
            }}>
              <div style={{ fontSize: 10, color: "#446644", marginBottom: 8, letterSpacing: 2 }}>
                ◈ NPN BJT — COMMON EMITTER CONFIGURATION
              </div>
              <BJTCircuit
                vbb={vbb} vcc={vcc} rb={rb} rc={rc} beta={beta}
                vbe_op={vbe_op} vce_op={vce_op} ib_op={ib_op} ic_op={ic_op}
              />
            </div>

            {/* Controls */}
            <div style={{
              background: "#050f05", border: "1px solid #1a3a1a", borderRadius: 10, padding: 16
            }}>
              <div style={{ fontSize: 10, color: "#446644", marginBottom: 12, letterSpacing: 2 }}>
                ◈ CONTROLS
              </div>
              <SliderControl label="V_BB" value={vbb} min={0} max={10} step={0.1}
                onChange={setVbb} unit="V" color="#44aaff" />
              <SliderControl label="V_CC" value={vcc} min={1} max={20} step={0.5}
                onChange={setVcc} unit="V" color="#ff8844" />
              <SliderControl label="R_B" value={rb} min={1000} max={1000000} step={1}
                onChange={setRb} unit="Ω" color="#ffcc44" log />
              <SliderControl label="R_C" value={rc} min={100} max={10000} step={100}
                onChange={setRc} unit="Ω" color="#ffcc44" log />
              <SliderControl label="β (hFE)" value={beta} min={20} max={500} step={1}
                onChange={setBeta} unit="" color="#ff44aa" />
              <div style={{
                marginTop: 12, padding: "8px 10px", background: "#0a1a0a",
                borderRadius: 6, border: "1px solid #1a3a1a"
              }}>
                <div style={{ fontSize: 9, color: "#446644", marginBottom: 4 }}>REGION</div>
                <div style={{
                  fontSize: 12,
                  color: vce_op < 0.3 ? "#ff4444" : vce_op < 1 ? "#ffcc44" : "#00ff88",
                  textShadow: `0 0 6px ${vce_op < 0.3 ? "#ff4444" : "#00ff88"}`
                }}>
                  {vce_op < 0.3 ? "SATURATION" : vbe_op < 0.55 ? "CUT-OFF" : "ACTIVE"}
                </div>
              </div>
            </div>
          </div>

          {/* ── Row 2: Meters ── */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16
          }}>
            <DigitalMeter label="V" sub="BE" value={vbe_op} unit="V" color="#44aaff" />
            <DigitalMeter label="V" sub="CE" value={vce_op} unit="V" color="#ff8844" />
            <DigitalMeter label="I" sub="B" value={ib_op} unit="μA" color="#ff44aa" />
            <DigitalMeter label="I" sub="C" value={ic_op} unit="mA" color="#44ffaa" />
          </div>

          {/* ── Row 3: Table + Graph ── */}
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>

            {/* Table */}
            <div style={{
              background: "#050f05", border: "1px solid #1a3a1a", borderRadius: 10,
              padding: 14, overflowY: "auto", maxHeight: 400
            }}>
              <div style={{ fontSize: 10, color: "#446644", marginBottom: 10, letterSpacing: 2 }}>
                ◈ TABULATION  [V_CE = {vce_op.toFixed(2)}V]
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr>
                    {["V_BE (V)", "I_B (μA)", "I_C (mA)"].map(h => (
                      <th key={h} style={{
                        color: "#446644", fontWeight: "normal", padding: "4px 8px",
                        borderBottom: "1px solid #1a3a1a", textAlign: "right", fontSize: 10
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i} style={{
                      background: row.isOp ? "#002a1a" : "transparent",
                      borderLeft: row.isOp ? "2px solid #00ff88" : "2px solid transparent"
                    }}>
                      <td style={{
                        padding: "3px 8px", textAlign: "right",
                        color: row.isOp ? "#00ff88" : "#6a9a6a", fontSize: 11
                      }}>{row.vbe}</td>
                      <td style={{
                        padding: "3px 8px", textAlign: "right",
                        color: row.isOp ? "#00ff88" : "#ff88cc", fontSize: 11
                      }}>{row.ib}</td>
                      <td style={{
                        padding: "3px 8px", textAlign: "right",
                        color: row.isOp ? "#00ff88" : "#88ffcc", fontSize: 11
                      }}>{row.ic}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 10, fontSize: 9, color: "#334433", lineHeight: 1.6 }}>
                ▸ Highlighted row = operating point<br />
                ▸ I_B = (V_BB - V_BE) / R_B<br />
                ▸ I_C = β × I_B<br />
                ▸ V_CE = V_CC - I_C × R_C
              </div>
            </div>

            {/* Graph */}
            <div style={{
              background: "#050f05", border: "1px solid #1a3a1a", borderRadius: 10, padding: 14
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 12
              }}>
                <div style={{ fontSize: 10, color: "#446644", letterSpacing: 2 }}>◈ CHARACTERISTICS</div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                  {["input", "output"].map(m => (
                    <button key={m} onClick={() => setChartMode(m)} style={{
                      padding: "4px 10px", borderRadius: 3, border: "none", cursor: "pointer",
                      fontFamily: "monospace", fontSize: 10, letterSpacing: 1,
                      background: chartMode === m ? "#00ff8820" : "transparent",
                      color: chartMode === m ? "#00ff88" : "#446644",
                      border: chartMode === m ? "1px solid #00ff8844" : "1px solid #1a3a1a"
                    }}>
                      {m === "input" ? "INPUT (IB-VBE)" : "OUTPUT (IC-VCE)"}
                    </button>
                  ))}
                </div>
              </div>

              {chartMode === "input" ? (
                <>
                  <div style={{ fontSize: 9, color: "#334433", marginBottom: 8 }}>
                    I_B (μA) vs V_BE (V) — parameter: V_CE
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={inputData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                      <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3" />
                      <XAxis dataKey="vbe" stroke="#446644" tick={{ fill: "#446644", fontSize: 10 }}
                        label={{ value: "V_BE (V)", position: "insideBottom", fill: "#446644", fontSize: 10, dy: 16 }}
                        tickFormatter={v => v.toFixed(1)} />
                      <YAxis stroke="#446644" tick={{ fill: "#446644", fontSize: 10 }}
                        label={{ value: "I_B (μA)", angle: -90, position: "insideLeft", fill: "#446644", fontSize: 10, dx: -4 }} />
                      <Tooltip contentStyle={{ background: "#0a1a0a", border: "1px solid #1a3a1a", fontSize: 11, fontFamily: "monospace" }}
                        formatter={(v, n) => [`${v.toFixed(2)} μA`, n]}
                        labelFormatter={l => `V_BE = ${parseFloat(l).toFixed(2)}V`} />
                      <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                      {VCE_VALS.map((vce, i) => (
                        <Line key={vce} type="monotone" dataKey={`vce${vce}`}
                          stroke={VCE_COLORS[i]} strokeWidth={1.8} dot={false}
                          name={`V_CE=${vce}V`} />
                      ))}
                      {/* Operating point dot */}
                      <ReferenceDot x={parseFloat(vbe_op.toFixed(2))} y={opIB_uA}
                        r={5} fill="#ffffff" stroke="#00ff88" strokeWidth={2}
                        label={{ value: "Q", fill: "#00ff88", fontSize: 10, dx: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 9, color: "#334433", marginBottom: 8 }}>
                    I_C (mA) vs V_CE (V) — parameter: I_B (μA)
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={outputData} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                      <CartesianGrid stroke="#0d1f0d" strokeDasharray="3 3" />
                      <XAxis dataKey="vce" stroke="#446644" tick={{ fill: "#446644", fontSize: 10 }}
                        label={{ value: "V_CE (V)", position: "insideBottom", fill: "#446644", fontSize: 10, dy: 16 }}
                        tickFormatter={v => v.toFixed(0)} />
                      <YAxis stroke="#446644" tick={{ fill: "#446644", fontSize: 10 }}
                        label={{ value: "I_C (mA)", angle: -90, position: "insideLeft", fill: "#446644", fontSize: 10, dx: -4 }} />
                      <Tooltip contentStyle={{ background: "#0a1a0a", border: "1px solid #1a3a1a", fontSize: 11, fontFamily: "monospace" }}
                        formatter={(v, n) => [`${v.toFixed(3)} mA`, n]}
                        labelFormatter={l => `V_CE = ${parseFloat(l).toFixed(2)}V`} />
                      <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                      {IB_VALS.map((ib, i) => (
                        <Line key={ib} type="monotone" dataKey={`ib${ib}`}
                          stroke={IB_COLORS[i]} strokeWidth={1.8} dot={false}
                          name={`I_B=${ib}μA`} />
                      ))}
                      <ReferenceDot x={parseFloat(vce_op.toFixed(2))} y={opIC_mA}
                        r={5} fill="#ffffff" stroke="#00ff88" strokeWidth={2}
                        label={{ value: "Q", fill: "#00ff88", fontSize: 10, dx: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </div>

          {/* ── Formulas footer ── */}
          <div style={{
            marginTop: 14, padding: "10px 16px", background: "#050f05",
            border: "1px solid #0d1f0d", borderRadius: 8,
            display: "flex", gap: 32, flexWrap: "wrap"
          }}>
            {[
              ["I_B", `(V_BB − V_BE) / R_B = ${(ib_op * 1e6).toFixed(2)} μA`],
              ["I_C", `β × I_B = ${(ic_op * 1e3).toFixed(3)} mA`],
              ["V_CE", `V_CC − I_C × R_C = ${vce_op.toFixed(3)} V`],
              ["β (hFE)", `I_C / I_B = ${beta}`],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ fontSize: 10 }}>
                <span style={{ color: "#446644" }}>{lbl} = </span>
                <span style={{ color: "#8abf8a" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}