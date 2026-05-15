import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase'

// ─── Fonts & CSS ────────────────────────────────────────────────────────────

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap'

const css = `
@import url('${FONT_URL}');

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #f0eafa;
  background-image:
    radial-gradient(ellipse at 10% 20%, rgba(255,180,220,0.45) 0%, transparent 55%),
    radial-gradient(ellipse at 85% 10%, rgba(160,200,255,0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 60% 85%, rgba(200,160,255,0.35) 0%, transparent 50%),
    radial-gradient(ellipse at 0% 80%, rgba(255,210,160,0.3) 0%, transparent 45%);
  background-attachment: fixed;
  min-height: 100vh;
}

.app { color:#1e1535; font-family:'DM Sans',sans-serif; min-height:100vh; padding:28px 20px 72px; max-width:880px; margin:0 auto; }
.header { border-bottom:1px solid rgba(180,150,220,0.25); padding-bottom:22px; margin-bottom:28px; }

.label-tag {
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:0.2em;
  background:linear-gradient(90deg,#e879c0,#a78bfa,#60a5fa);
  -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
  text-transform:uppercase; margin-bottom:8px;
}

h1 { font-family:'Bebas Neue',sans-serif; font-size:clamp(34px,8vw,62px); letter-spacing:0.04em; color:#1e1535; line-height:1; }
h1 span { background:linear-gradient(90deg,#e879c0,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.subtitle { font-family:'IBM Plex Mono',monospace; font-size:10px; color:#a89ec0; margin-top:10px; letter-spacing:0.1em; }

.sync-badge {
  display:inline-flex; align-items:center; gap:5px;
  font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:0.1em;
  padding:3px 10px; border-radius:20px; margin-top:10px;
}
.sync-badge.synced { background:rgba(52,168,122,0.12); color:#2a9068; border:1px solid rgba(52,168,122,0.25); }
.sync-badge.saving { background:rgba(167,139,250,0.12); color:#8b72e8; border:1px solid rgba(167,139,250,0.25); }
.sync-badge.error  { background:rgba(224,85,133,0.1);  color:#c0446e; border:1px solid rgba(224,85,133,0.2);  }
.sync-dot { width:6px; height:6px; border-radius:50%; }
.sync-badge.synced .sync-dot { background:#34a87a; }
.sync-badge.saving .sync-dot { background:#a78bfa; animation:pulse 1s infinite; }
.sync-badge.error  .sync-dot { background:#e05585; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

.tabs { display:flex; gap:2px; margin-bottom:28px; border-bottom:1px solid rgba(180,150,220,0.25); overflow-x:auto; }
.tab { font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:0.15em; text-transform:uppercase; padding:10px 16px; cursor:pointer; color:#a89ec0; border-bottom:2px solid transparent; transition:all 0.2s; background:none; border-top:none; border-left:none; border-right:none; white-space:nowrap; }
.tab:hover { color:#a78bfa; }
.tab.active { color:#a78bfa; border-image:linear-gradient(90deg,#e879c0,#a78bfa) 1; border-bottom:2px solid; }

.section { margin-bottom:26px; }
.section-title { font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:0.2em; background:linear-gradient(90deg,#e879c0,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; text-transform:uppercase; margin-bottom:12px; display:flex; align-items:center; gap:10px; }
.section-title::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,rgba(167,139,250,0.3),transparent); -webkit-text-fill-color:unset; }

.card { background:rgba(255,255,255,0.65); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border:1px solid rgba(200,180,240,0.35); border-radius:12px; padding:14px 16px; margin-bottom:8px; }

.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; }
.span2 { grid-column:1/-1; }

.input-row { display:flex; align-items:center; gap:12px; padding:10px 14px; background:rgba(255,255,255,0.65); backdrop-filter:blur(12px); border:1px solid rgba(200,180,240,0.35); border-radius:10px; margin-bottom:6px; }
.input-label { font-size:11px; color:#a89ec0; font-family:'IBM Plex Mono',monospace; flex:1; letter-spacing:0.05em; }

input[type="number"], input[type="text"] { background:rgba(255,255,255,0.8); border:1px solid rgba(200,180,240,0.4); color:#1e1535; font-family:'IBM Plex Mono',monospace; font-size:13px; padding:5px 9px; border-radius:6px; width:130px; outline:none; transition:border 0.2s,box-shadow 0.2s; }
input[type="number"]:focus, input[type="text"]:focus { border-color:#a78bfa; box-shadow:0 0 0 3px rgba(167,139,250,0.15); }
input[type="range"] { width:110px; padding:0; accent-color:#a78bfa; }
.range-val { font-family:'IBM Plex Mono',monospace; font-size:13px; color:#1e1535; min-width:36px; text-align:right; }
input[type="checkbox"] { width:14px; height:14px; accent-color:#a78bfa; cursor:pointer; }

.stat { background:rgba(255,255,255,0.65); backdrop-filter:blur(12px); border:1px solid rgba(200,180,240,0.35); border-radius:10px; padding:14px 16px; }
.stat-label { font-size:10px; color:#a89ec0; font-family:'IBM Plex Mono',monospace; letter-spacing:0.05em; margin-bottom:6px; }
.stat-value { font-family:'IBM Plex Mono',monospace; font-size:16px; font-weight:600; color:#1e1535; }
.stat.highlight { background:rgba(255,220,235,0.5); border-color:rgba(232,121,192,0.35); }
.stat.highlight .stat-value { color:#e05585; }
.stat.positive { background:rgba(210,245,230,0.5); border-color:rgba(52,168,122,0.3); }
.stat.positive .stat-value { color:#34a87a; }

.progress-bar { height:6px; background:rgba(200,180,240,0.2); border-radius:3px; margin:14px 0 4px; overflow:hidden; }
.progress-fill { height:100%; border-radius:3px; transition:width 0.5s ease; }
.progress-label { display:flex; justify-content:space-between; font-family:'IBM Plex Mono',monospace; font-size:10px; color:#a89ec0; }

.verdict { margin-top:16px; padding:16px; border-radius:10px; border:1px solid; font-family:'IBM Plex Mono',monospace; font-size:11px; line-height:1.9; letter-spacing:0.03em; white-space:pre-line; backdrop-filter:blur(10px); }
.verdict.loss { background:rgba(255,220,235,0.45); border-color:rgba(224,85,133,0.3); color:#c0446e; }
.verdict.ok   { background:rgba(210,245,230,0.45); border-color:rgba(52,168,122,0.3);  color:#2a9068; }
.verdict-title { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; margin-bottom:6px; opacity:0.7; }

.tier-card { background:rgba(255,255,255,0.65); backdrop-filter:blur(12px); border:1px solid rgba(200,180,240,0.35); border-radius:12px; padding:14px; position:relative; overflow:hidden; }
.tier-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
.t1::before { background:linear-gradient(90deg,#f472b6,#e879c0); }
.t2::before { background:linear-gradient(90deg,#fb923c,#f97316); }
.t3::before { background:rgba(200,180,240,0.5); }
.tier-name { font-family:'Bebas Neue',sans-serif; font-size:17px; letter-spacing:0.08em; margin-bottom:2px; }
.t1 .tier-name { color:#e05585; } .t2 .tier-name { color:#ea7c3a; } .t3 .tier-name { color:#a89ec0; }
.tier-desc { font-size:9px; color:#a89ec0; font-family:'IBM Plex Mono',monospace; margin-bottom:12px; }
.tier-field { margin-bottom:8px; }
.tier-field label { font-size:9px; color:#a89ec0; font-family:'IBM Plex Mono',monospace; display:block; margin-bottom:4px; }
.tier-field input { width:100%; }
.tier-revenue { margin-top:10px; padding-top:8px; border-top:1px solid rgba(200,180,240,0.2); font-family:'IBM Plex Mono',monospace; font-size:11px; color:#a89ec0; }
.tier-revenue span { color:#1e1535; font-weight:600; }

.crew-row { display:flex; align-items:center; gap:10px; padding:11px 14px; background:rgba(255,255,255,0.65); backdrop-filter:blur(12px); border:1px solid rgba(200,180,240,0.3); border-radius:10px; margin-bottom:6px; flex-wrap:wrap; }
.crew-name { font-family:'Bebas Neue',sans-serif; font-size:20px; letter-spacing:0.06em; flex:1; min-width:80px; color:#1e1535; }
.crew-badge { font-family:'IBM Plex Mono',monospace; font-size:9px; padding:3px 8px; border-radius:20px; text-transform:uppercase; }
.badge-paid    { background:rgba(52,168,122,0.12); color:#2a9068; border:1px solid rgba(52,168,122,0.3); }
.badge-unpaid  { background:rgba(224,85,133,0.1);  color:#c0446e; border:1px solid rgba(224,85,133,0.25); }
.badge-access  { background:rgba(167,139,250,0.12); color:#8b72e8; border:1px solid rgba(167,139,250,0.3); }
.badge-noaccess{ background:rgba(200,180,240,0.12); color:#a89ec0; border:1px solid rgba(200,180,240,0.3); }

.toggle-row { display:flex; align-items:center; gap:12px; padding:9px 14px; border-bottom:1px solid rgba(200,180,240,0.15); }
.toggle-row:last-child { border-bottom:none; }
.toggle-label { font-size:11px; color:#6b5e88; font-family:'IBM Plex Mono',monospace; flex:1; letter-spacing:0.04em; }
.toggle-sub { font-size:9px; color:#a89ec0; display:block; margin-top:2px; }

.timeline-scroll { overflow-x:auto; padding-bottom:8px; }
.day-cell { width:16px; height:26px; border:1px solid rgba(200,180,240,0.25); border-radius:3px; cursor:pointer; transition:background 0.15s; background:rgba(255,255,255,0.5); flex-shrink:0; }
.day-cell:hover { background:rgba(167,139,250,0.15); }
.day-cell.on { background:linear-gradient(160deg,#e879c0,#a78bfa); border-color:rgba(167,139,250,0.5); }
.day-cell.ev { background:rgba(167,139,250,0.12); border-color:rgba(167,139,250,0.3); }
.day-cell.ev.on { background:linear-gradient(160deg,#e879c0,#a78bfa); }

@media(max-width:580px){.grid2,.grid3{grid-template-columns:1fr;}.span2{grid-column:1;}}
`

// ─── Constants ──────────────────────────────────────────────────────────────

const fmt = (n) => '$' + Math.round(n).toLocaleString('es-AR')

const ROLES = ['warmup', 'main', 'headliner', 'close']
const ROLE_LABELS = { warmup: 'WARMUP', main: 'MAIN', headliner: 'HEADLINER', close: 'CLOSE' }

const TASKS = [
  'Armado Propuesta', 'Planificación Gráfica', 'KeyCards', 'Publicaciones IG',
  'Llamado DJs', 'Reserva equipos', 'Armado Escenografía', 'Evento / Rodaje',
  'Edición de Post', 'Planif. Publicación YT',
]
const WEEKS = ['S−4', 'S−3', 'S−2', 'S−1', 'S0', 'S+1', 'S+2']
const WFULL = ['SEMANA −4', 'SEMANA −3', 'SEMANA −2', 'SEMANA −1', 'SEMANA 0', 'SEMANA +1', 'SEMANA +2']
const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

// ─── Default state ───────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  lineup: [
    { time: '00:00 – 01:00', name: 'RIXA',        fee: 0,      role: 'warmup'    },
    { time: '01:00 – 02:00', name: 'VECTRIL',     fee: 0,      role: 'main'      },
    { time: '02:00 – 03:00', name: 'GOLONDRINA',  fee: 0,      role: 'main'      },
    { time: '03:00 – 04:00', name: 'OMEN LEAGUE', fee: 150000, role: 'headliner' },
    { time: '04:00 – 05:00', name: 'OMEN LEAGUE', fee: 0,      role: 'close'     },
    { time: '05:00 – 06:00', name: 'OMEN LEAGUE', fee: 0,      role: 'close'     },
  ],
  crew: [
    { name: 'CCX',     paid: false, access: true, amount: 0 },
    { name: 'ACE',     paid: false, access: true, amount: 0 },
    { name: 'NOISED',  paid: false, access: true, amount: 0 },
    { name: 'JOTAEME', paid: false, access: true, amount: 0 },
  ],
  tiers: [
    { name: 'EARLY BIRD', desc: 'primeras 20 entradas',    qty: 20,  price: 5000  },
    { name: 'ANTICIPADA', desc: 'lote principal preventa', qty: 40,  price: 7500  },
    { name: 'PUERTA',     desc: 'en el evento',            qty: 999, price: 11000 },
  ],
  publi: 0,
  extras: 0,
  inclAudio: false,
  inclVideo: false,
  inclPlatform: true,
  att: 80,
  wPrice: 2000,
  wPct: 50,
  cells: (() => {
    const o = {}
    TASKS.forEach((_, ti) => WEEKS.forEach((_, wi) => DAYS.forEach((_, di) => {
      o[`${ti}-${wi}-${di}`] = false
    })))
    return o
  })(),
}

const DOC_ID = 'hex-event-1'  // cambiá por el nombre del evento si necesitás varios

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab]       = useState(0)
  const [state, setState]   = useState(DEFAULT_STATE)
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced' | 'saving' | 'error'
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef(null)
  const isRemoteUpdate = useRef(false)

  // ── Destructure state ──────────────────────────────────────────────────────
  const { lineup, crew, tiers, publi, extras, inclAudio, inclVideo, inclPlatform, att, wPrice, wPct, cells } = state

  // ── Firebase: subscribe to real-time updates ───────────────────────────────
  useEffect(() => {
    const ref = doc(db, 'events', DOC_ID)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          isRemoteUpdate.current = true
          setState(prev => ({ ...prev, ...snap.data() }))
        }
        setLoaded(true)
        setSyncStatus('synced')
      },
      (err) => {
        console.error('Firestore error:', err)
        setSyncStatus('error')
        setLoaded(true)
      }
    )
    return () => unsub()
  }, [])

  // ── Firebase: debounced save on every state change ─────────────────────────
  useEffect(() => {
    if (!loaded) return
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }
    setSyncStatus('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'events', DOC_ID), state, { merge: true })
        setSyncStatus('synced')
      } catch (e) {
        console.error('Save error:', e)
        setSyncStatus('error')
      }
    }, 800) // 800ms debounce — espera que el usuario deje de escribir
  }, [state, loaded])

  // ── State updaters ─────────────────────────────────────────────────────────
  const set = (key, val) => setState(prev => ({ ...prev, [key]: val }))

  const upLineup = (i, f, v) => {
    const l = [...lineup]; l[i] = { ...l[i], [f]: v }; set('lineup', l)
  }
  const addSlot   = () => set('lineup', [...lineup, { time: '', name: '', fee: 0, role: 'main' }])
  const removeSlot = i => set('lineup', lineup.filter((_, idx) => idx !== i))

  const upTier = (i, f, v) => {
    const t = [...tiers]; t[i] = { ...t[i], [f]: Number(v) }; set('tiers', t)
  }

  const upCrew = (i, f, v) => {
    const c = [...crew]; c[i] = { ...c[i], [f]: v }; set('crew', c)
  }

  const toggleCell = (k) => set('cells', { ...cells, [k]: !cells[k] })

  // ── Derived financials ─────────────────────────────────────────────────────
  const totalDjFee      = lineup.reduce((a, dj) => a + (Number(dj.fee) || 0), 0)
  const totalCrewContrib = crew.reduce((a, c)  => a + (Number(c.amount) || 0), 0)
  const optCosts         = (inclAudio ? 50000 : 0) + (inclVideo ? 70000 : 0)
  const totalFixed       = 900000 + totalDjFee + publi + extras + optCosts
  const netCost          = totalFixed - totalCrewContrib

  let rem = att
  const sold = tiers.map(t => { if (rem <= 0) return 0; const s = Math.min(t.qty, rem); rem -= s; return s })
  const revs  = tiers.map((t, i) => sold[i] * t.price)
  const tickRev  = revs.reduce((a, b) => a + b, 0)
  const platFee  = inclPlatform ? tickRev * 0.1 : 0
  const wRev     = Math.round(att * wPct / 100) * wPrice
  const totalRev = tickRev + wRev - platFee
  const balance  = totalRev - netCost
  const cov      = Math.min(100, Math.round(totalRev / Math.max(netCost, 1) * 100))

  const TABS = ['FINANZAS', 'LINEUP', 'CREW', 'PRODUCCIÓN']

  if (!loaded) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'IBM Plex Mono, monospace', fontSize:12, color:'#a89ec0', letterSpacing:'0.1em' }}>
      CARGANDO...
    </div>
  )

  return (
    <>
      <style>{css}</style>
      <div className="app">

        {/* Header */}
        <div className="header">
          <div className="label-tag">@theomenrecords × @meltunderground · drum &amp; bass</div>
          <h1>HEX <span>EVENT</span></h1>
          <div className="subtitle">melt underground · recoleta, caba · cap. 150 · 00:00–06:00</div>
          <div className={`sync-badge ${syncStatus}`}>
            <div className="sync-dot" />
            {syncStatus === 'synced' ? 'guardado' : syncStatus === 'saving' ? 'guardando...' : 'error al guardar'}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={i} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* ── FINANZAS ── */}
        {tab === 0 && <>
          <div className="section">
            <div className="section-title">costos fijos</div>
            <div className="grid2">
              <div className="stat">
                <div className="stat-label">VENUE MELT (opción 1)</div>
                <div className="stat-value">{fmt(900000)}</div>
              </div>
              <div className="stat">
                <div className="stat-label">FEE DJS (desde lineup)</div>
                <div className="stat-value">{fmt(totalDjFee)}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#a89ec0', marginTop:4 }}>editá en tab LINEUP</div>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">costos opcionales</div>
            <div className="card" style={{ padding:'4px 0' }}>
              {[
                { l:'Publicidad / Flyers',            s:'editable',            edit:true,  val:publi,        set:(v) => set('publi', v)        },
                { l:'Otros gastos',                   s:'editable',            edit:true,  val:extras,       set:(v) => set('extras', v)       },
                { l:'Grabación audio (noche compl.)', s:fmt(50000),            edit:false, checked:inclAudio,    toggle:() => set('inclAudio', !inclAudio)       },
                { l:'Grabación video (GoPro 360)',    s:fmt(70000),            edit:false, checked:inclVideo,    toggle:() => set('inclVideo', !inclVideo)       },
                { l:'Fee plataforma ticketing',       s:'~10% sobre entradas', edit:false, checked:inclPlatform, toggle:() => set('inclPlatform', !inclPlatform) },
              ].map((row, i) => (
                <div className="toggle-row" key={i}>
                  <div className="toggle-label">{row.l}<span className="toggle-sub">{row.s}</span></div>
                  {row.edit
                    ? <input type="number" value={row.val} onChange={e => row.set(Number(e.target.value))} step={5000} min={0} />
                    : <input type="checkbox" checked={row.checked} onChange={row.toggle} />
                  }
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section-title">asistencia estimada</div>
            <div className="input-row">
              <span className="input-label">personas (máx. 150)</span>
              <input type="range" min={20} max={150} step={5} value={att} onChange={e => set('att', Number(e.target.value))} />
              <span className="range-val">{att}</span>
            </div>
          </div>

          <div className="section">
            <div className="section-title">tandas de ticketing</div>
            <div className="grid3">
              {tiers.map((t, i) => (
                <div key={i} className={`tier-card t${i + 1}`}>
                  <div className="tier-name">{t.name}</div>
                  <div className="tier-desc">{t.desc}</div>
                  {i < 2
                    ? <div className="tier-field"><label>CUPO</label><input type="number" value={t.qty} min={1} max={149} onChange={e => upTier(i, 'qty', e.target.value)} /></div>
                    : <div className="tier-field"><label>DISP.</label><input type="number" value={sold[i]} disabled style={{ opacity:0.4 }} /></div>
                  }
                  <div className="tier-field"><label>PRECIO $ARS</label><input type="number" value={t.price} step={500} min={0} onChange={e => upTier(i, 'price', e.target.value)} /></div>
                  <div className="tier-revenue">vendidas: <span>{sold[i]}</span><br />subtotal: <span>{fmt(revs[i])}</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section-title">guardarropa (100% productora)</div>
            <div className="card" style={{ padding:'4px 0' }}>
              <div className="toggle-row">
                <span className="toggle-label">precio por persona</span>
                <input type="number" value={wPrice} step={500} min={0} onChange={e => set('wPrice', Number(e.target.value))} />
              </div>
              <div className="toggle-row">
                <span className="toggle-label">% personas que usan guardarropa</span>
                <input type="range" min={0} max={100} step={5} value={wPct} onChange={e => set('wPct', Number(e.target.value))} />
                <span className="range-val">{wPct}%</span>
              </div>
              <div style={{ padding:'8px 14px', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0' }}>
                estimado: {fmt(wRev)} · {Math.round(att * wPct / 100)} personas
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">resumen financiero</div>
            <div className="grid2">
              <div className="stat"><div className="stat-label">TICKETS</div><div className="stat-value">{fmt(tickRev)}</div></div>
              <div className="stat"><div className="stat-label">GUARDARROPA</div><div className="stat-value">{fmt(wRev)}</div></div>
              {inclPlatform && <div className="stat highlight"><div className="stat-label">FEE PLATAFORMA (−)</div><div className="stat-value">−{fmt(platFee)}</div></div>}
              <div className={`stat ${inclPlatform ? '' : 'span2'}`}><div className="stat-label">INGRESOS TOTALES</div><div className="stat-value">{fmt(totalRev)}</div></div>
            </div>

            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', letterSpacing:'0.12em', margin:'14px 0 8px', textTransform:'uppercase' }}>desglose de costos</div>
            <div style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(12px)', border:'1px solid rgba(200,180,240,0.35)', borderRadius:12, overflow:'hidden', marginBottom:8 }}>
              {[
                ['VENUE (opción 1)', 900000],
                ['DJS', totalDjFee],
                ...(publi  > 0 ? [['PUBLICIDAD', publi]]         : []),
                ...(extras > 0 ? [['OTROS', extras]]             : []),
                ...(inclAudio   ? [['GRABACIÓN AUDIO', 50000]]   : []),
                ...(inclVideo   ? [['GRABACIÓN VIDEO', 70000]]   : []),
              ].map(([label, val], i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom:'1px solid rgba(200,180,240,0.15)' }}>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', letterSpacing:'0.08em' }}>{label}</span>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color: val > 0 ? '#1e1535' : 'rgba(168,158,192,0.4)', fontWeight:600 }}>{fmt(val)}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom:'1px solid rgba(200,180,240,0.15)' }}>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', letterSpacing:'0.08em' }}>SUBTOTAL</span>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#1e1535', fontWeight:600 }}>{fmt(totalFixed)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom:'1px solid rgba(200,180,240,0.15)', background:'rgba(210,245,230,0.35)' }}>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#2a9068', letterSpacing:'0.08em' }}>APORTES CREW</span>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#2a9068', fontWeight:600 }}>−{fmt(totalCrewContrib)}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 14px', background:'rgba(255,220,235,0.45)' }}>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', letterSpacing:'0.12em' }}>COSTO NETO</span>
                <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:14, color:'#e05585', fontWeight:600 }}>{fmt(netCost)}</span>
              </div>
            </div>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width:`${cov}%`, background: balance >= 0 ? 'linear-gradient(90deg,#34a87a,#44d4a0)' : 'linear-gradient(90deg,#e879c0,#e05585)' }} />
            </div>
            <div className="progress-label"><span>$0</span><span>cobertura {cov}%</span><span>{fmt(netCost)}</span></div>
            <div className={`verdict ${balance >= 0 ? 'ok' : 'loss'}`}>
              <div className="verdict-title">{balance >= 0 ? '✓ resultado positivo' : '⚠ pérdida proyectada'}</div>
              {balance >= 0
                ? `GANANCIA: ${fmt(balance)} con ${att} personas.`
                : `PÉRDIDA: ${fmt(Math.abs(balance))} con ${att} personas.\nNecesitás aprox. ${Math.ceil(netCost / (totalRev / Math.max(att, 1)))} personas para cubrir el costo neto.`}
            </div>
          </div>
        </>}

        {/* ── LINEUP ── */}
        {tab === 1 && <>
          <div className="section">
            <div className="section-title">lineup editable</div>
            {lineup.map((dj, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.65)', backdropFilter:'blur(12px)', border:'1px solid rgba(200,180,240,0.3)', borderRadius:10, padding:'12px 14px', marginBottom:6, borderLeft:`3px solid ${dj.role === 'headliner' ? '#a78bfa' : dj.role === 'main' ? '#fb923c' : dj.role === 'close' ? '#60a5fa' : 'rgba(200,180,240,0.4)'}` }}>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <div style={{ flex:'0 0 auto' }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#a89ec0', marginBottom:3, letterSpacing:'0.1em' }}>HORARIO</div>
                    <input type="text" value={dj.time} onChange={e => upLineup(i, 'time', e.target.value)} placeholder="00:00 – 01:00" style={{ width:130 }} />
                  </div>
                  <div style={{ flex:'1 1 120px' }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#a89ec0', marginBottom:3, letterSpacing:'0.1em' }}>NOMBRE</div>
                    <input type="text" value={dj.name} onChange={e => upLineup(i, 'name', e.target.value)} placeholder="DJ NAME" style={{ width:'100%', fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:'0.06em' }} />
                  </div>
                  <div style={{ flex:'0 0 auto' }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#a89ec0', marginBottom:3, letterSpacing:'0.1em' }}>ROL</div>
                    <select value={dj.role} onChange={e => upLineup(i, 'role', e.target.value)} style={{ background:'rgba(255,255,255,0.8)', border:'1px solid rgba(200,180,240,0.4)', color:'#1e1535', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'5px 8px', borderRadius:6, outline:'none' }}>
                      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:'0 0 auto' }}>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#a89ec0', marginBottom:3, letterSpacing:'0.1em' }}>FEE $ARS</div>
                    <input type="number" value={dj.fee} min={0} step={5000} onChange={e => upLineup(i, 'fee', Number(e.target.value))} style={{ width:120, color: dj.fee > 0 ? '#ea7c3a' : '#a89ec0', fontWeight:600 }} />
                  </div>
                  <button onClick={() => removeSlot(i)} style={{ background:'none', border:'1px solid rgba(224,85,133,0.3)', color:'#e05585', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, padding:'5px 10px', borderRadius:6, cursor:'pointer', marginTop:14, letterSpacing:'0.1em' }}>✕</button>
                </div>
              </div>
            ))}
            <button onClick={addSlot} style={{ width:'100%', background:'rgba(255,255,255,0.5)', border:'1px dashed rgba(200,180,240,0.5)', color:'#a89ec0', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, padding:'12px', borderRadius:8, cursor:'pointer', letterSpacing:'0.12em', marginTop:4 }}>
              + AGREGAR SLOT
            </button>
          </div>

          <div className="section">
            <div className="section-title">resumen de fees</div>
            <div className="grid3">
              {lineup.filter(dj => dj.fee > 0).map((dj, i) => (
                <div key={i} className="stat">
                  <div className="stat-label">{dj.name || '—'}</div>
                  <div className="stat-value" style={{ fontSize:14 }}>{fmt(dj.fee)}</div>
                </div>
              ))}
              <div className="stat highlight span2">
                <div className="stat-label">TOTAL FEES DJS</div>
                <div className="stat-value">{fmt(totalDjFee)}</div>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">rider técnico</div>
            <div className="card">
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#a89ec0', lineHeight:2 }}>
                PA: 4× dB Technologies · 2× subs QSC · 2× retornos QSC<br />
                DJ Booth: CDJs Nexus 2 + DJM 900 NXS2<br />
                Vinilos: 2× Reloop 8000 MK2 + Model 1<br />
                Ilum. completa · Láser · Humo · Pantalla · Proyector (alquiler externo)
              </div>
            </div>
          </div>
        </>}

        {/* ── CREW ── */}
        {tab === 2 && <>
          <div className="section">
            <div className="section-title">team the omen records</div>
            {crew.map((c, i) => (
              <div key={i} className="crew-row">
                <span className="crew-name">{c.name}</span>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" checked={c.paid} onChange={e => upCrew(i, 'paid', e.target.checked)} />
                  <span className={`crew-badge ${c.paid ? 'badge-paid' : 'badge-unpaid'}`}>{c.paid ? 'pagó' : 'pendiente'}</span>
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                  <input type="checkbox" checked={c.access} onChange={e => upCrew(i, 'access', e.target.checked)} />
                  <span className={`crew-badge ${c.access ? 'badge-access' : 'badge-noaccess'}`}>{c.access ? 'acceso' : 'sin acceso'}</span>
                </label>
                <input type="number" value={c.amount} step={1000} min={0} onChange={e => upCrew(i, 'amount', Number(e.target.value))} style={{ width:100 }} placeholder="aporte $" />
              </div>
            ))}
          </div>
          <div className="section">
            <div className="section-title">resumen</div>
            <div className="grid3">
              <div className="stat"><div className="stat-label">TOTAL CREW</div><div className="stat-value">{crew.length}</div></div>
              <div className="stat positive"><div className="stat-label">CON ACCESO</div><div className="stat-value">{crew.filter(c => c.access).length}</div></div>
              <div className="stat positive"><div className="stat-label">TOTAL APORTADO</div><div className="stat-value">{fmt(totalCrewContrib)}</div></div>
            </div>
          </div>
        </>}

        {/* ── PRODUCCIÓN ── */}
        {tab === 3 && <>
          <div className="section">
            <div className="section-title">cronograma de producción</div>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', marginBottom:12, letterSpacing:'0.06em' }}>
              Clic en celdas para marcar días activos · <span style={{ color:'#a78bfa' }}>■</span> = semana del evento (S0)
            </div>
            <div className="timeline-scroll">
              <div style={{ minWidth:640 }}>
                <div style={{ display:'flex', marginLeft:164, marginBottom:4 }}>
                  {WEEKS.map((w, wi) => (
                    <div key={wi} style={{ flex:1, textAlign:'center' }}>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color: wi === 4 ? '#a78bfa' : 'rgba(200,180,240,0.5)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:2 }}>{w}</div>
                      <div style={{ display:'flex', gap:1, justifyContent:'center' }}>
                        {DAYS.map(d => <div key={d} style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:7, color:'rgba(200,180,240,0.5)', width:16, textAlign:'center' }}>{d}</div>)}
                      </div>
                    </div>
                  ))}
                </div>
                {TASKS.map((task, ti) => (
                  <div key={ti} style={{ display:'flex', alignItems:'center', marginBottom:3 }}>
                    <div style={{ fontSize:11, color:'#6b5e88', minWidth:164, padding:'6px 0', fontFamily:"'IBM Plex Mono',monospace", letterSpacing:'0.02em' }}>{task}</div>
                    <div style={{ display:'flex', flex:1 }}>
                      {WEEKS.map((_, wi) => (
                        <div key={wi} style={{ flex:1, display:'flex', gap:1, justifyContent:'center', marginRight:2 }}>
                          {DAYS.map((_, di) => {
                            const k = `${ti}-${wi}-${di}`
                            return <div key={di} className={`day-cell ${cells[k] ? 'on' : ''} ${wi === 4 && di === 5 ? 'ev' : ''}`} onClick={() => toggleCell(k)} title={`${WFULL[wi]} · ${DAYS[di]}`} />
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'rgba(168,158,192,0.4)', letterSpacing:'0.1em', textAlign:'center', marginTop:40, lineHeight:2 }}>
          OPCIÓN 1 · 100% BARRA→MELT · 100% PUERTA+GUARDARROPA→PRODUCTORA<br />
          MELT UNDERGROUND · LAPRIDA Y AV. SANTA FE · RECOLETA · CAP. 150
        </div>
      </div>
    </>
  )
}
