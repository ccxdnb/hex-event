import { useState, useEffect, useRef } from 'react'
import { collection, doc, onSnapshot, setDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import {
  ResponsiveContainer, ComposedChart, BarChart, LineChart, AreaChart, PieChart,
  Bar, Line, Area, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { db } from './firebase'

// ─── Fonts & CSS ─────────────────────────────────────────────────────────────

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

/* ── Sidebar ── */
.sidebar {
  position: fixed; left: 0; top: 0; bottom: 0; width: 260px;
  background: rgba(248,245,255,0.94);
  backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
  border-right: 1px solid rgba(200,180,240,0.3);
  display: flex; flex-direction: column;
  z-index: 200;
  transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
}
.sidebar.closed { transform: translateX(-260px); }

.sidebar-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 14px 12px;
  border-bottom: 1px solid rgba(200,180,240,0.18);
  flex-shrink: 0;
}
.sidebar-label {
  font-family: 'IBM Plex Mono', monospace; font-size: 9px;
  letter-spacing: 0.25em; color: #a89ec0; text-transform: uppercase;
}
.sidebar-compose-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.25);
  border-radius: 8px; cursor: pointer; color: #8b72e8;
  transition: background 0.2s, border-color 0.2s;
}
.sidebar-compose-btn:hover { background: rgba(167,139,250,0.2); border-color: rgba(167,139,250,0.4); }

.sidebar-new-form {
  padding: 10px 12px 12px;
  border-bottom: 1px solid rgba(200,180,240,0.18);
  display: flex; flex-direction: column; gap: 7px;
  flex-shrink: 0;
}
.sidebar-new-form input[type="text"] {
  width: 100%; font-size: 12px;
  background: rgba(255,255,255,0.85); border: 1px solid rgba(200,180,240,0.4);
  color: #1e1535; font-family: 'IBM Plex Mono', monospace;
  padding: 7px 10px; border-radius: 7px; outline: none;
  transition: border 0.2s, box-shadow 0.2s;
}
.sidebar-new-form input[type="text"]:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167,139,250,0.12); }
.sidebar-new-form input[type="date"] {
  width: 100%; color-scheme: light;
  font-family: 'IBM Plex Mono', monospace; font-size: 12px;
  background: rgba(255,255,255,0.85); border: 1px solid rgba(200,180,240,0.4);
  color: #1e1535; padding: 7px 10px; border-radius: 7px; outline: none;
  transition: border 0.2s;
}
.sidebar-new-form input[type="date"]:focus { border-color: #a78bfa; }
.sidebar-create-btn {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.15em;
  padding: 8px; border-radius: 7px; cursor: pointer; text-transform: uppercase;
  background: linear-gradient(90deg, rgba(232,121,192,0.12), rgba(167,139,250,0.12));
  border: 1px solid rgba(167,139,250,0.3); color: #8b72e8;
  transition: background 0.2s;
}
.sidebar-create-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sidebar-create-btn:not(:disabled):hover { background: linear-gradient(90deg, rgba(232,121,192,0.22), rgba(167,139,250,0.22)); }

.sidebar-events { flex: 1; overflow-y: auto; padding: 6px 8px; }
.sidebar-events::-webkit-scrollbar { width: 3px; }
.sidebar-events::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.25); border-radius: 2px; }

.sidebar-empty {
  padding: 32px 12px; text-align: center;
  font-family: 'IBM Plex Mono', monospace; font-size: 10px;
  color: #c4b8e0; letter-spacing: 0.08em; line-height: 2;
}

.sidebar-item {
  padding: 10px 10px; border-radius: 9px; cursor: pointer;
  transition: background 0.15s; margin-bottom: 2px;
  border: 1px solid transparent;
}
.sidebar-item:hover { background: rgba(167,139,250,0.07); }
.sidebar-item.active {
  background: rgba(167,139,250,0.11);
  border-color: rgba(167,139,250,0.18);
}
.sidebar-item-row { display: flex; align-items: center; gap: 8px; }
.sidebar-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: rgba(200,180,240,0.45); flex-shrink: 0;
}
.sidebar-item.active .sidebar-dot { background: linear-gradient(135deg, #e879c0, #a78bfa); }
.sidebar-item-name {
  font-family: 'Bebas Neue', sans-serif; font-size: 14px;
  letter-spacing: 0.05em; color: #1e1535; flex: 1;
  line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sidebar-name-input {
  font-family: 'Bebas Neue', sans-serif; font-size: 14px;
  letter-spacing: 0.05em; color: #1e1535; flex: 1;
  background: transparent; border: none; outline: none;
  padding: 0; width: 0; min-width: 0; flex: 1;
}
.sidebar-name-input::placeholder { color: #c4b8e0; }
.sidebar-item-date {
  font-family: 'IBM Plex Mono', monospace; font-size: 9px;
  color: #b8aed4; padding-left: 13px; margin-top: 3px;
}
.sidebar-date-input {
  font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #b8aed4;
  background: transparent; border: none; outline: none;
  padding: 0; margin-left: 13px; margin-top: 3px;
  color-scheme: light; cursor: pointer; width: 130px;
  display: block;
}
.sidebar-item-row { position: relative; }
.sidebar-item-actions { display:flex; gap:2px; align-items:center; opacity:0; transition:opacity 0.15s; flex-shrink:0; margin-left:auto; }
.sidebar-item:hover .sidebar-item-actions { opacity:1; }
.sidebar-action-btn { width:22px; height:22px; display:flex; align-items:center; justify-content:center; background:none; border:none; cursor:pointer; border-radius:5px; color:#c4b8e0; transition:all 0.15s; padding:0; flex-shrink:0; }
.sidebar-action-btn:hover { background:rgba(167,139,250,0.12); color:#8b72e8; }
.sidebar-action-btn.del:hover { background:rgba(224,85,133,0.1); color:#e05585; }
.sidebar-delete-confirm { display:flex; gap:4px; align-items:center; flex-shrink:0; margin-left:auto; }
.sidebar-confirm-btn { font-family:'IBM Plex Mono',monospace; font-size:8px; letter-spacing:0.08em; padding:3px 8px; border-radius:5px; cursor:pointer; border:1px solid; transition:background 0.15s; }
.sidebar-confirm-yes { background:rgba(224,85,133,0.08); color:#e05585; border-color:rgba(224,85,133,0.25); }
.sidebar-confirm-yes:hover { background:rgba(224,85,133,0.18); }
.sidebar-confirm-no  { background:rgba(200,180,240,0.08); color:#a89ec0; border-color:rgba(200,180,240,0.25); }

/* ── Overlay (mobile) ── */
.sidebar-overlay {
  display: none; position: fixed; inset: 0;
  background: rgba(30,21,53,0.25); z-index: 190;
}
@media (max-width: 768px) {
  .sidebar-overlay { display: block; opacity: 0; pointer-events: none; transition: opacity 0.28s; }
  .sidebar-overlay.visible { opacity: 1; pointer-events: auto; }
  .main-wrap, .main-wrap.open { margin-left: 0 !important; }
}

/* ── Main content ── */
.main-wrap {
  margin-left: 0;
  transition: margin-left 0.28s cubic-bezier(0.4,0,0.2,1);
  min-height: 100vh;
}
.main-wrap.open { margin-left: 260px; }

.app {
  color: #1e1535; font-family: 'DM Sans', sans-serif;
  min-height: 100vh; padding: 28px 28px 72px;
  max-width: 900px;
}

.header { border-bottom: 1px solid rgba(180,150,220,0.25); padding-bottom: 22px; margin-bottom: 28px; }
.header-top { display: flex; align-items: center; gap: 14px; margin-bottom: 6px; }

.sidebar-toggle {
  width: 34px; height: 34px; flex-shrink: 0;
  display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px;
  background: none; border: 1px solid rgba(200,180,240,0.3);
  border-radius: 8px; cursor: pointer; color: #a89ec0;
  transition: border-color 0.2s, color 0.2s; margin-top: 2px;
}
.sidebar-toggle:hover { border-color: rgba(167,139,250,0.5); color: #a78bfa; }
.toggle-bar { width: 14px; height: 1.5px; background: currentColor; border-radius: 1px; display: block; }

.label-tag {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.2em;
  background: linear-gradient(90deg,#e879c0,#a78bfa,#60a5fa);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  text-transform: uppercase; margin-bottom: 8px;
}
h1 { font-family: 'Bebas Neue', sans-serif; font-size: clamp(34px,8vw,62px); letter-spacing: 0.04em; color: #1e1535; line-height: 1; }
h1 span { background: linear-gradient(90deg,#e879c0,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.subtitle { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #a89ec0; margin-top: 10px; letter-spacing: 0.1em; }

.sync-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'IBM Plex Mono', monospace; font-size: 9px; letter-spacing: 0.1em;
  padding: 3px 10px; border-radius: 20px; margin-top: 10px;
}
.sync-badge.synced { background: rgba(52,168,122,0.12); color: #2a9068; border: 1px solid rgba(52,168,122,0.25); }
.sync-badge.saving { background: rgba(167,139,250,0.12); color: #8b72e8; border: 1px solid rgba(167,139,250,0.25); }
.sync-badge.error  { background: rgba(224,85,133,0.1);  color: #c0446e; border: 1px solid rgba(224,85,133,0.2);  }
.sync-dot { width: 6px; height: 6px; border-radius: 50%; }
.sync-badge.synced .sync-dot { background: #34a87a; }
.sync-badge.saving .sync-dot { background: #a78bfa; animation: pulse 1s infinite; }
.sync-badge.error  .sync-dot { background: #e05585; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

/* ── Tabs & layout ── */
.tabs { display: flex; gap: 2px; margin-bottom: 28px; border-bottom: 1px solid rgba(180,150,220,0.25); overflow-x: auto; }
.tab { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; padding: 10px 16px; cursor: pointer; color: #a89ec0; border-bottom: 2px solid transparent; transition: all 0.2s; background: none; border-top: none; border-left: none; border-right: none; white-space: nowrap; }
.tab:hover { color: #a78bfa; }
.tab.active { color: #a78bfa; border-image: linear-gradient(90deg,#e879c0,#a78bfa) 1; border-bottom: 2px solid; }

.section { margin-bottom: 26px; }
.section-title { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.2em; background: linear-gradient(90deg,#e879c0,#a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg,rgba(167,139,250,0.3),transparent); -webkit-text-fill-color: unset; }

.card { background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(200,180,240,0.35); border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.span2 { grid-column: 1/-1; }

.input-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); border: 1px solid rgba(200,180,240,0.35); border-radius: 10px; margin-bottom: 6px; }
.input-label { font-size: 11px; color: #a89ec0; font-family: 'IBM Plex Mono', monospace; flex: 1; letter-spacing: 0.05em; }

input[type="number"], input[type="text"] { background: rgba(255,255,255,0.8); border: 1px solid rgba(200,180,240,0.4); color: #1e1535; font-family: 'IBM Plex Mono', monospace; font-size: 13px; padding: 5px 9px; border-radius: 6px; width: 130px; outline: none; transition: border 0.2s, box-shadow 0.2s; }
input[type="number"]:focus, input[type="text"]:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(167,139,250,0.15); }
input[type="range"] { width: 110px; padding: 0; accent-color: #a78bfa; }
.range-val { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #1e1535; min-width: 36px; text-align: right; }
input[type="checkbox"] { width: 14px; height: 14px; accent-color: #a78bfa; cursor: pointer; }

.stat { background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); border: 1px solid rgba(200,180,240,0.35); border-radius: 10px; padding: 14px 16px; }
.stat-label { font-size: 10px; color: #a89ec0; font-family: 'IBM Plex Mono', monospace; letter-spacing: 0.05em; margin-bottom: 6px; }
.stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 600; color: #1e1535; }
.stat.highlight { background: rgba(255,220,235,0.5); border-color: rgba(232,121,192,0.35); }
.stat.highlight .stat-value { color: #e05585; }
.stat.positive { background: rgba(210,245,230,0.5); border-color: rgba(52,168,122,0.3); }
.stat.positive .stat-value { color: #34a87a; }

.progress-bar { height: 6px; background: rgba(200,180,240,0.2); border-radius: 3px; margin: 14px 0 4px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.progress-label { display: flex; justify-content: space-between; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #a89ec0; }

.verdict { margin-top: 16px; padding: 16px; border-radius: 10px; border: 1px solid; font-family: 'IBM Plex Mono', monospace; font-size: 11px; line-height: 1.9; letter-spacing: 0.03em; white-space: pre-line; backdrop-filter: blur(10px); }
.verdict.loss { background: rgba(255,220,235,0.45); border-color: rgba(224,85,133,0.3); color: #c0446e; }
.verdict.ok   { background: rgba(210,245,230,0.45); border-color: rgba(52,168,122,0.3); color: #2a9068; }
.verdict-title { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 6px; opacity: 0.7; }

.tier-card { background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); border: 1px solid rgba(200,180,240,0.35); border-radius: 12px; padding: 14px; position: relative; overflow: hidden; }
.tier-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
.t1::before { background: linear-gradient(90deg,#f472b6,#e879c0); }
.t2::before { background: linear-gradient(90deg,#fb923c,#f97316); }
.t3::before { background: rgba(200,180,240,0.5); }
.tier-name { font-family: 'Bebas Neue', sans-serif; font-size: 17px; letter-spacing: 0.08em; margin-bottom: 2px; }
.t1 .tier-name { color: #e05585; } .t2 .tier-name { color: #ea7c3a; } .t3 .tier-name { color: #a89ec0; }
.tier-desc { font-size: 9px; color: #a89ec0; font-family: 'IBM Plex Mono', monospace; margin-bottom: 12px; }
.tier-field { margin-bottom: 8px; }
.tier-field label { font-size: 9px; color: #a89ec0; font-family: 'IBM Plex Mono', monospace; display: block; margin-bottom: 4px; }
.tier-field input { width: 100%; }
.tier-revenue { margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(200,180,240,0.2); font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #a89ec0; }
.tier-revenue span { color: #1e1535; font-weight: 600; }
.tier-name-input { width: 100%; background: rgba(255,255,255,0.55); border: 1px solid rgba(200,180,240,0.35); border-radius: 6px; padding: 5px 26px 5px 8px; font-family: 'Bebas Neue', sans-serif; font-size: 17px; letter-spacing: 0.08em; color: #1e1535; margin-bottom: 6px; }
.tier-desc-input { width: 100%; background: rgba(255,255,255,0.55); border: 1px solid rgba(200,180,240,0.35); border-radius: 6px; padding: 4px 8px; font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: #6b5e88; margin-bottom: 12px; }
.tier-remove { position: absolute; top: 8px; right: 8px; z-index: 2; background: none; border: 1px solid rgba(224,85,133,0.3); color: #e05585; font-family: 'IBM Plex Mono', monospace; font-size: 10px; line-height: 1; padding: 3px 7px; border-radius: 6px; cursor: pointer; }
.tier-remove:hover { background: rgba(224,85,133,0.1); }
.crew-name-input { flex: 1; min-width: 80px; background: rgba(255,255,255,0.55); border: 1px solid rgba(200,180,240,0.35); border-radius: 6px; padding: 4px 8px; font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.06em; color: #1e1535; }
.crew-remove { background: none; border: 1px solid rgba(224,85,133,0.3); color: #e05585; font-family: 'IBM Plex Mono', monospace; font-size: 10px; line-height: 1; padding: 5px 9px; border-radius: 6px; cursor: pointer; }
.crew-remove:hover { background: rgba(224,85,133,0.1); }
.add-row-btn { width: 100%; background: rgba(255,255,255,0.5); border: 1px dashed rgba(200,180,240,0.5); color: #a89ec0; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 12px; border-radius: 8px; cursor: pointer; letter-spacing: 0.12em; margin-top: 12px; }
.add-row-btn:hover { background: rgba(167,139,250,0.08); color: #8b72e8; }

.crew-row { display: flex; align-items: center; gap: 10px; padding: 11px 14px; background: rgba(255,255,255,0.65); backdrop-filter: blur(12px); border: 1px solid rgba(200,180,240,0.3); border-radius: 10px; margin-bottom: 6px; flex-wrap: wrap; }
.crew-name { font-family: 'Bebas Neue', sans-serif; font-size: 20px; letter-spacing: 0.06em; flex: 1; min-width: 80px; color: #1e1535; }
.crew-badge { font-family: 'IBM Plex Mono', monospace; font-size: 9px; padding: 3px 8px; border-radius: 20px; text-transform: uppercase; }
.badge-paid    { background: rgba(52,168,122,0.12); color: #2a9068; border: 1px solid rgba(52,168,122,0.3); }
.badge-unpaid  { background: rgba(224,85,133,0.1);  color: #c0446e; border: 1px solid rgba(224,85,133,0.25); }
.badge-access  { background: rgba(167,139,250,0.12); color: #8b72e8; border: 1px solid rgba(167,139,250,0.3); }
.badge-noaccess{ background: rgba(200,180,240,0.12); color: #a89ec0; border: 1px solid rgba(200,180,240,0.3); }

.toggle-row { display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-bottom: 1px solid rgba(200,180,240,0.15); }
.toggle-row:last-child { border-bottom: none; }
.toggle-label { font-size: 11px; color: #6b5e88; font-family: 'IBM Plex Mono', monospace; flex: 1; letter-spacing: 0.04em; }
.toggle-sub { font-size: 9px; color: #a89ec0; display: block; margin-top: 2px; }

.timeline-scroll { overflow-x: auto; padding-bottom: 8px; }
.day-cell { width: 16px; height: 26px; border: 1px solid rgba(200,180,240,0.25); border-radius: 3px; cursor: pointer; transition: background 0.15s; background: rgba(255,255,255,0.5); flex-shrink: 0; }
.day-cell:hover { background: rgba(167,139,250,0.15); }
.day-cell.on { background: linear-gradient(160deg,#e879c0,#a78bfa); border-color: rgba(167,139,250,0.5); }
.day-cell.ev { background: rgba(167,139,250,0.12); border-color: rgba(167,139,250,0.3); }
.day-cell.ev.on { background: linear-gradient(160deg,#e879c0,#a78bfa); }

@media(max-width:580px){ .grid2,.grid3{ grid-template-columns:1fr; } .span2{ grid-column:1; } }

/* ── Admin modal ── */
.admin-overlay { position:fixed; inset:0; z-index:500; background:rgba(30,21,53,0.45); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; }
.admin-modal { background:rgba(248,245,255,0.98); border:1px solid rgba(200,180,240,0.4); border-radius:16px; padding:28px 24px; width:300px; max-width:90vw; box-shadow:0 24px 60px rgba(30,21,53,0.18); }
.admin-modal h3 { font-family:'Bebas Neue',sans-serif; font-size:26px; letter-spacing:0.06em; color:#1e1535; margin-bottom:4px; }
.admin-modal p { font-family:'IBM Plex Mono',monospace; font-size:9px; color:#a89ec0; letter-spacing:0.1em; margin-bottom:18px; }
.admin-modal input[type="password"] { width:100%; margin-bottom:10px; font-size:14px; letter-spacing:0.2em; }
.admin-submit { width:100%; padding:10px; border-radius:8px; cursor:pointer; font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:0.15em; text-transform:uppercase; background:linear-gradient(90deg,rgba(232,121,192,0.12),rgba(167,139,250,0.12)); border:1px solid rgba(167,139,250,0.3); color:#8b72e8; transition:background 0.2s; }
.admin-submit:hover { background:linear-gradient(90deg,rgba(232,121,192,0.22),rgba(167,139,250,0.22)); }
.admin-error-msg { font-family:'IBM Plex Mono',monospace; font-size:9px; color:#e05585; margin-top:8px; letter-spacing:0.06em; text-align:center; }
.admin-cancel { width:100%; padding:7px; border-radius:8px; cursor:pointer; font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:0.1em; text-transform:uppercase; background:none; border:none; color:#a89ec0; margin-top:6px; }
.admin-cancel:hover { color:#8b72e8; }

/* ── Lock / admin badge ── */
.lock-btn { display:inline-flex; align-items:center; gap:5px; font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:0.1em; padding:4px 10px; border-radius:20px; border:1px solid; cursor:pointer; transition:all 0.2s; margin-top:10px; background:none; }
.lock-btn.locked   { color:#c0446e; border-color:rgba(224,85,133,0.25); background:rgba(224,85,133,0.06); }
.lock-btn.unlocked { color:#2a9068; border-color:rgba(52,168,122,0.25);  background:rgba(52,168,122,0.08); }
.lock-btn:hover { filter:brightness(1.1); }

/* ── Sidebar dashboard button ── */
.sidebar-footer { padding:8px; border-top:1px solid rgba(200,180,240,0.18); flex-shrink:0; }
.sidebar-dash-btn { width:100%; padding:9px 10px; border-radius:9px; background:none; border:1px solid transparent; cursor:pointer; font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:0.14em; color:#a89ec0; text-align:left; display:flex; align-items:center; gap:8px; transition:all 0.15s; text-transform:uppercase; }
.sidebar-dash-btn:hover  { background:rgba(167,139,250,0.07); color:#8b72e8; }
.sidebar-dash-btn.active { background:rgba(167,139,250,0.11); border-color:rgba(167,139,250,0.18); color:#8b72e8; }

/* ── Dashboard ── */
.dash-kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; margin-bottom:24px; }
.dash-kpi { background:rgba(255,255,255,0.65); backdrop-filter:blur(12px); border:1px solid rgba(200,180,240,0.35); border-radius:12px; padding:14px 16px; }
.dash-kpi-label { font-family:'IBM Plex Mono',monospace; font-size:9px; color:#a89ec0; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:6px; }
.dash-kpi-value { font-family:'IBM Plex Mono',monospace; font-size:18px; font-weight:600; color:#1e1535; }
.dash-kpi-value.pos { color:#34a87a; }
.dash-kpi-value.neg { color:#e05585; }
.dash-kpi-value.grad { background:linear-gradient(90deg,#e879c0,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

.dash-event-row { background:rgba(255,255,255,0.65); backdrop-filter:blur(12px); border:1px solid rgba(200,180,240,0.35); border-radius:12px; padding:14px 16px; margin-bottom:8px; display:flex; align-items:center; gap:16px; flex-wrap:wrap; cursor:pointer; transition:border-color 0.2s; }
.dash-event-row:hover { border-color:rgba(167,139,250,0.35); }
.dash-event-identity { flex:1; min-width:120px; }
.dash-event-name { font-family:'Bebas Neue',sans-serif; font-size:20px; letter-spacing:0.05em; color:#1e1535; line-height:1.1; }
.dash-event-date-lbl { font-family:'IBM Plex Mono',monospace; font-size:9px; color:#b8aed4; margin-top:2px; }
.dash-ev-metric { text-align:right; min-width:80px; }
.dash-ev-metric-lbl { font-family:'IBM Plex Mono',monospace; font-size:8px; color:#a89ec0; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:3px; }
.dash-ev-metric-val { font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:600; color:#1e1535; }
.dash-ev-metric-val.pos { color:#34a87a; }
.dash-ev-metric-val.neg { color:#e05585; }

.dash-bar-row { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.dash-bar-label { font-family:'IBM Plex Mono',monospace; font-size:10px; color:#6b5e88; width:150px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dash-bar-track { flex:1; height:8px; background:rgba(200,180,240,0.15); border-radius:4px; overflow:hidden; }
.dash-bar-fill { height:100%; border-radius:4px; transition:width 0.6s ease; }
.dash-bar-val { font-family:'IBM Plex Mono',monospace; font-size:10px; color:#a89ec0; width:90px; text-align:right; flex-shrink:0; }

/* ── Analytics ── */
.chart-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(340px,1fr)); gap:14px; margin-bottom:14px; }
.chart-card { background:rgba(255,255,255,0.65); backdrop-filter:blur(12px); border:1px solid rgba(200,180,240,0.35); border-radius:14px; padding:16px 14px 8px; }
.chart-card.wide { grid-column:1 / -1; }
.chart-card-title { font-family:'IBM Plex Mono',monospace; font-size:10px; color:#6b5e88; letter-spacing:0.12em; text-transform:uppercase; margin:0 4px 2px; }
.chart-card-sub { font-family:'IBM Plex Mono',monospace; font-size:9px; color:#a89ec0; letter-spacing:0.04em; margin:0 4px 12px; }
.recharts-cartesian-axis-tick-value { font-family:'IBM Plex Mono',monospace; font-size:9px; fill:#a89ec0; }
.recharts-legend-item-text { font-family:'IBM Plex Mono',monospace; font-size:10px; color:#6b5e88 !important; }
.recharts-default-tooltip { border-radius:10px !important; border:1px solid rgba(200,180,240,0.5) !important; background:rgba(248,245,255,0.97) !important; font-family:'IBM Plex Mono',monospace !important; font-size:11px !important; box-shadow:0 12px 30px rgba(30,21,53,0.12); }
.recharts-tooltip-label { font-family:'IBM Plex Mono',monospace; font-size:10px; color:#1e1535; font-weight:600; }

.ro-wrap { border:none; padding:0; margin:0; min-width:0; display:contents; }
`

// ─── Constants ───────────────────────────────────────────────────────────────

const fmt = (n) => '$' + Math.round(n).toLocaleString('es-AR')

const ROLES = ['warmup', 'main', 'headliner', 'close']
const ROLE_LABELS = { warmup: 'WARMUP', main: 'MAIN', headliner: 'HEADLINER', close: 'CLOSE' }


// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  name: '',
  date: '',
  lineup: [
    { time: '00:00 – 01:00', name: 'RIXA',        fee: 0,      role: 'warmup',    paid: false },
    { time: '01:00 – 02:00', name: 'VECTRIL',     fee: 0,      role: 'main',      paid: false },
    { time: '02:00 – 03:00', name: 'GOLONDRINA',  fee: 0,      role: 'main',      paid: false },
    { time: '03:00 – 04:00', name: 'OMEN LEAGUE', fee: 150000, role: 'headliner', paid: false },
    { time: '04:00 – 05:00', name: 'OMEN LEAGUE', fee: 0,      role: 'close',     paid: false },
    { time: '05:00 – 06:00', name: 'OMEN LEAGUE', fee: 0,      role: 'close',     paid: false },
  ],
  crew: [
    { name: 'CCX',     paid: false, access: true, amount: 0 },
    { name: 'ACE',     paid: false, access: true, amount: 0 },
    { name: 'NOISED',  paid: false, access: true, amount: 0 },
    { name: 'JOTAEME',    paid: false, access: true, amount: 0 },
    { name: 'ZAI',        paid: false, access: true, amount: 0 },
    { name: 'GOLONDRINA', paid: false, access: true, amount: 0 },
  ],
  tiers: [
    { name: 'EARLY BIRD', desc: 'primeras 20 entradas',    qty: 20, price: 5000,  sold: 20 },
    { name: 'ANTICIPADA', desc: 'lote principal preventa', qty: 40, price: 7500,  sold: 40 },
    { name: 'PUERTA',     desc: 'en el evento',            qty: 90, price: 11000, sold: 20 },
  ],
  aportes: [],
  comps: 0,
  publi: 0,
  extras: 0,
  optionalCosts: [],
  inclAudio: false,
  inclVideo: false,
  inclPlatform: true,
  venueCost: 900000,
  venueDeposit: 0,
  venuePaid: false,
  usdRate: 0,
  wardrobe: [
    { label: 'antes de las 02', people: 25, price: 2000 },
    { label: 'después de las 02', people: 15, price: 3000 },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d) => {
  if (!d) return ''
  const parts = d.split('-')
  if (parts.length !== 3) return d
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC']
  return `${parts[2]} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`
}

// ─── Admin ────────────────────────────────────────────────────────────────────

const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'OMEN2025'

// ─── Cross-event financial summary ───────────────────────────────────────────

// Asistencia = suma de tickets vendidos por tanda. Para eventos viejos (sin
// `sold` por tanda) se reparte el total `att` guardado entre las tandas por cupo.
const deriveTickets = (s) => {
  const tiers = s.tiers || []
  const hasSold = tiers.some(t => t && t.sold !== undefined && t.sold !== null && t.sold !== '')
  let sold
  if (hasSold) {
    sold = tiers.map(t => Math.max(0, Number(t.sold) || 0))
  } else {
    let rem = Number(s.att) || 0
    sold = tiers.map(t => { if (rem <= 0) return 0; const v = Math.min(Number(t.qty) || 0, rem); rem -= v; return v })
  }
  const att = sold.reduce((a, b) => a + b, 0)
  return { sold, att }
}

// Guardarropa por tandas (el precio varía según el horario de la noche). Para
// eventos viejos (con wPeople/wPrice o wPct) se arma una tanda única equivalente.
const deriveWardrobe = (s, att) => {
  if (Array.isArray(s.wardrobe) && s.wardrobe.length) {
    return s.wardrobe.map(w => ({
      label:  w.label || '',
      people: Math.max(0, Number(w.people) || 0),
      price:  Math.max(0, Number(w.price)  || 0),
    }))
  }
  const people = (s.wPeople !== undefined && s.wPeople !== null && s.wPeople !== '')
    ? Math.max(0, Number(s.wPeople) || 0)
    : Math.round(att * (Number(s.wPct) || 50) / 100)
  return [{ label: 'general', people, price: Math.max(0, Number(s.wPrice) || 2000) }]
}

// Reparto del balance entre el crew, proporcional a los aportes de cada uno
// (aporte directo del integrante + sus aportes cargados en la lista).
const computeLiquidacion = (s, balance) => {
  const byMember = {}
  for (const c of (s.crew || [])) {
    const a = Number(c.amount) || 0
    if (a && c.name) byMember[c.name] = (byMember[c.name] || 0) + a
  }
  for (const ap of (s.aportes || [])) {
    const v = Number(ap.amount) || 0
    if (v && ap.crew) byMember[ap.crew] = (byMember[ap.crew] || 0) + v
  }
  const total = Object.values(byMember).reduce((a, b) => a + b, 0)
  const rows = Object.entries(byMember)
    .map(([name, aporte]) => ({ name, aporte, pct: total ? aporte / total * 100 : 0, share: total ? balance * aporte / total : 0 }))
    .sort((a, b) => b.aporte - a.aporte)
  return { rows, total }
}

const computeFinancials = (s) => {
  if (!s) return null
  const lineup    = s.lineup  || []
  const crew      = s.crew    || []
  const tiers     = s.tiers   || []
  const aportes   = s.aportes || []
  const publi     = Number(s.publi)     || 0
  const extras    = Number(s.extras)    || 0
  const venueCost = Number(s.venueCost) || 900000

  const { sold, att } = deriveTickets(s)
  const wardrobe = deriveWardrobe(s, att)
  const wPeople  = wardrobe.reduce((a, w) => a + w.people, 0)
  const wRev     = wardrobe.reduce((a, w) => a + w.people * w.price, 0)
  const comps    = Math.max(0, Number(s.comps) || 0)
  const totalPeople = att + comps

  const totalDjFee       = lineup.reduce((a, dj) => a + (Number(dj.fee) || 0), 0)
  const crewDirect       = crew.reduce((a, c) => a + (Number(c.amount) || 0), 0)
  const totalAportes     = aportes.reduce((a, c) => a + (Number(c.amount) || 0), 0)
  const totalCrewContrib = crewDirect + totalAportes
  const optCosts         = (s.inclAudio ? 50000 : 0) + (s.inclVideo ? 70000 : 0)
  const customCostTotal  = (s.optionalCosts || []).reduce((a, c) => a + (Number(c.amount) || 0), 0) + publi + extras
  const totalFixed       = venueCost + totalDjFee + customCostTotal + optCosts
  const netCost          = totalFixed - totalCrewContrib

  const revs  = tiers.map((t, i) => sold[i] * (Number(t.price) || 0))
  const tickRev  = revs.reduce((a, b) => a + b, 0)
  const platFee  = s.inclPlatform ? tickRev * 0.1 : 0
  const totalRev = tickRev + wRev - platFee
  const balance  = totalRev - netCost
  const margin   = totalRev > 0 ? (balance / totalRev) * 100 : 0
  const usdRate  = Number(s.usdRate) || 0

  return { sold, revs, att, comps, totalPeople, wardrobe, wPeople, netCost, tickRev, wRev, platFee,
           totalRev, balance, margin, totalDjFee, totalCrewContrib, totalAportes, optCosts, customCostTotal,
           totalFixed, venueCost, usdRate }
}

// ─── Analytics panel ──────────────────────────────────────────────────────────

const A_COLORS = {
  rev: '#a78bfa', cost: '#e05585', bal: '#34a87a',
  tickets: '#e879c0', guarda: '#fb923c',
  venue: '#a78bfa', djs: '#f472b6', grab: '#60a5fa', otros: '#fbbf24',
  margin: '#8b72e8', att: '#60a5fa', sala: '#c084fc', ticketProm: '#e879c0',
}
const PIE_REV  = ['#e879c0', '#fb923c']
const PIE_COST = ['#a78bfa', '#f472b6', '#60a5fa', '#fbbf24']
const PIE_TIER = ['#f472b6', '#fb923c', '#a78bfa', '#60a5fa', '#34d399', '#fbbf24']

const kfmt = (n) => {
  const a = Math.abs(n)
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M'
  if (a >= 1e3) return Math.round(n / 1e3) + 'k'
  return '' + Math.round(n)
}
const AXIS = { tick: { fontSize: 9, fill: '#a89ec0', fontFamily: 'IBM Plex Mono, monospace' }, axisLine: { stroke: 'rgba(200,180,240,0.4)' }, tickLine: false }
const GRID = 'rgba(200,180,240,0.2)'
const tipMoney  = (v) => fmt(Number(v))
const tipPct    = (v) => Number(v).toFixed(1) + '%'
const tipPeople = (v) => Number(v) + ' pers.'

function ChartCard({ title, sub, wide, height = 260, children }) {
  return (
    <div className={`chart-card${wide ? ' wide' : ''}`}>
      <div className="chart-card-title">{title}</div>
      {sub && <div className="chart-card-sub">{sub}</div>}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

function Analytics({ events }) {
  const evs = events.filter(e => e.lineup).map(e => ({ ev: e, fin: computeFinancials(e) }))
    .sort((a, b) => (a.ev.date || '').localeCompare(b.ev.date || ''))

  if (evs.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 20px', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#a89ec0', letterSpacing:'0.1em', lineHeight:2 }}>
      NO HAY EVENTOS CON DATOS AÚN<br />CREÁ EVENTOS PARA VER LA ANALÍTICA
    </div>
  )

  let acum = 0
  const series = evs.map(({ ev, fin }) => {
    acum += fin.balance
    const grabacion = (ev.inclAudio ? 50000 : 0) + (ev.inclVideo ? 70000 : 0)
    const otros = (Number(ev.publi) || 0) + (Number(ev.extras) || 0) + (ev.optionalCosts || []).reduce((a, c) => a + (Number(c.amount) || 0), 0)
    return {
      fecha: ev.date ? formatDate(ev.date) : (ev.name || 's/n'),
      recaudacion: Math.round(fin.totalRev),
      costos: Math.round(fin.netCost),
      balance: Math.round(fin.balance),
      acumulado: Math.round(acum),
      margen: +fin.margin.toFixed(1),
      asistencia: fin.att,
      enSala: fin.totalPeople,
      ticketProm: fin.att ? Math.round(fin.totalRev / fin.att) : 0,
      tickets: Math.round(fin.tickRev),
      guardarropa: Math.round(fin.wRev),
      venue: Math.round(fin.venueCost),
      djs: Math.round(fin.totalDjFee),
      grabacion, otros,
    }
  })

  const sum = (k) => series.reduce((a, r) => a + (r[k] || 0), 0)
  const ingresosMix = [
    { name: 'Tickets', value: sum('tickets') },
    { name: 'Guardarropa', value: sum('guardarropa') },
  ].filter(d => d.value > 0)
  const costosMix = [
    { name: 'Venue', value: sum('venue') },
    { name: 'DJs', value: sum('djs') },
    { name: 'Grabación', value: sum('grabacion') },
    { name: 'Otros', value: sum('otros') },
  ].filter(d => d.value > 0)

  const tierAgg = {}
  evs.forEach(({ ev, fin }) => (ev.tiers || []).forEach((t, i) => {
    const key = (t.name || 'TANDA').toUpperCase()
    tierAgg[key] = (tierAgg[key] || 0) + ((fin.sold && fin.sold[i]) || 0)
  }))
  const tierData = Object.entries(tierAgg).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)

  const aporteByMember = {}
  evs.forEach(({ ev }) => {
    (ev.crew || []).forEach(c => { const a = Number(c.amount) || 0; if (a && c.name) aporteByMember[c.name] = (aporteByMember[c.name] || 0) + a })
    ;(ev.aportes || []).forEach(a => { const v = Number(a.amount) || 0; if (v && a.crew) aporteByMember[a.crew] = (aporteByMember[a.crew] || 0) + v })
  })
  const aporteData = Object.entries(aporteByMember).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const pieLabel = ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`

  return (
    <>
      <div className="section-title" style={{ marginBottom:16 }}>analítica · finanzas del proyecto</div>
      <div className="chart-grid">

        <ChartCard wide title="recaudación · costos · balance" sub="barras = recaudación y costo neto · línea = balance, por fecha">
          <ComposedChart data={series} margin={{ top:6, right:10, left:0, bottom:0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="fecha" {...AXIS} />
            <YAxis tickFormatter={kfmt} {...AXIS} />
            <Tooltip formatter={tipMoney} />
            <Legend />
            <Bar isAnimationActive={false} dataKey="recaudacion" name="Recaudación" fill={A_COLORS.rev} radius={[4,4,0,0]} maxBarSize={42} />
            <Bar isAnimationActive={false} dataKey="costos" name="Costo neto" fill={A_COLORS.cost} radius={[4,4,0,0]} maxBarSize={42} />
            <Line isAnimationActive={false} type="monotone" dataKey="balance" name="Balance" stroke={A_COLORS.bal} strokeWidth={2.5} dot={{ r:3 }} />
          </ComposedChart>
        </ChartCard>

        <ChartCard wide title="balance acumulado" sub="ganancia/pérdida sumada evento tras evento">
          <AreaChart data={series} margin={{ top:6, right:10, left:0, bottom:0 }}>
            <defs>
              <linearGradient id="gAcum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={A_COLORS.bal} stopOpacity={0.5} />
                <stop offset="100%" stopColor={A_COLORS.bal} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="fecha" {...AXIS} />
            <YAxis tickFormatter={kfmt} {...AXIS} />
            <Tooltip formatter={tipMoney} />
            <Area isAnimationActive={false} type="monotone" dataKey="acumulado" name="Acumulado" stroke={A_COLORS.bal} strokeWidth={2.5} fill="url(#gAcum)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="margen %" sub="rentabilidad sobre la recaudación">
          <LineChart data={series} margin={{ top:6, right:10, left:0, bottom:0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="fecha" {...AXIS} />
            <YAxis tickFormatter={(v) => v + '%'} {...AXIS} />
            <Tooltip formatter={tipPct} />
            <Line isAnimationActive={false} type="monotone" dataKey="margen" name="Margen" stroke={A_COLORS.margin} strokeWidth={2.5} dot={{ r:3 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="asistencia" sub="entradas vendidas vs total en sala">
          <LineChart data={series} margin={{ top:6, right:10, left:0, bottom:0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="fecha" {...AXIS} />
            <YAxis {...AXIS} />
            <Tooltip formatter={tipPeople} />
            <Legend />
            <Line isAnimationActive={false} type="monotone" dataKey="asistencia" name="Vendidas" stroke={A_COLORS.att} strokeWidth={2.5} dot={{ r:3 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="enSala" name="En sala" stroke={A_COLORS.sala} strokeWidth={2} strokeDasharray="4 3" dot={{ r:2 }} />
          </LineChart>
        </ChartCard>

        <ChartCard title="ticket promedio" sub="recaudación / entradas vendidas">
          <LineChart data={series} margin={{ top:6, right:10, left:0, bottom:0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="fecha" {...AXIS} />
            <YAxis tickFormatter={kfmt} {...AXIS} />
            <Tooltip formatter={tipMoney} />
            <Line isAnimationActive={false} type="monotone" dataKey="ticketProm" name="Ticket prom." stroke={A_COLORS.ticketProm} strokeWidth={2.5} dot={{ r:3 }} />
          </LineChart>
        </ChartCard>

        <ChartCard wide title="composición de ingresos por evento" sub="tickets + guardarropa (bruto)">
          <BarChart data={series} margin={{ top:6, right:10, left:0, bottom:0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="fecha" {...AXIS} />
            <YAxis tickFormatter={kfmt} {...AXIS} />
            <Tooltip formatter={tipMoney} />
            <Legend />
            <Bar isAnimationActive={false} dataKey="tickets" name="Tickets" stackId="i" fill={A_COLORS.tickets} maxBarSize={48} />
            <Bar isAnimationActive={false} dataKey="guardarropa" name="Guardarropa" stackId="i" fill={A_COLORS.guarda} radius={[4,4,0,0]} maxBarSize={48} />
          </BarChart>
        </ChartCard>

        <ChartCard wide title="composición de costos por evento" sub="venue · djs · grabación · otros (antes de aportes)">
          <BarChart data={series} margin={{ top:6, right:10, left:0, bottom:0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="fecha" {...AXIS} />
            <YAxis tickFormatter={kfmt} {...AXIS} />
            <Tooltip formatter={tipMoney} />
            <Legend />
            <Bar isAnimationActive={false} dataKey="venue" name="Venue" stackId="c" fill={A_COLORS.venue} maxBarSize={48} />
            <Bar isAnimationActive={false} dataKey="djs" name="DJs" stackId="c" fill={A_COLORS.djs} maxBarSize={48} />
            <Bar isAnimationActive={false} dataKey="grabacion" name="Grabación" stackId="c" fill={A_COLORS.grab} maxBarSize={48} />
            <Bar isAnimationActive={false} dataKey="otros" name="Otros" stackId="c" fill={A_COLORS.otros} radius={[4,4,0,0]} maxBarSize={48} />
          </BarChart>
        </ChartCard>

        <ChartCard title="mix de ingresos (total)" sub="tickets vs guardarropa">
          <PieChart>
            <Tooltip formatter={tipMoney} />
            <Pie isAnimationActive={false} data={ingresosMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={88} paddingAngle={2} label={pieLabel} labelLine={false}>
              {ingresosMix.map((d, i) => <Cell key={i} fill={PIE_REV[i % PIE_REV.length]} />)}
            </Pie>
          </PieChart>
        </ChartCard>

        <ChartCard title="mix de costos (total)" sub="dónde se va la plata">
          <PieChart>
            <Tooltip formatter={tipMoney} />
            <Pie isAnimationActive={false} data={costosMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={88} paddingAngle={2} label={pieLabel} labelLine={false}>
              {costosMix.map((d, i) => <Cell key={i} fill={PIE_COST[i % PIE_COST.length]} />)}
            </Pie>
          </PieChart>
        </ChartCard>

        <ChartCard title="entradas vendidas por tanda" sub="agregado de todos los eventos">
          <BarChart data={tierData} margin={{ top:6, right:10, left:0, bottom:0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="name" {...AXIS} />
            <YAxis {...AXIS} />
            <Tooltip formatter={(v) => v + ' entradas'} />
            <Bar isAnimationActive={false} dataKey="value" name="Vendidas" radius={[4,4,0,0]} maxBarSize={60}>
              {tierData.map((d, i) => <Cell key={i} fill={PIE_TIER[i % PIE_TIER.length]} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        {aporteData.length > 0 && (
          <ChartCard wide title="aportes del team por integrante" sub="cuánto puso cada uno (reduce los costos)" height={Math.max(180, aporteData.length * 38 + 40)}>
            <BarChart data={aporteData} layout="vertical" margin={{ top:6, right:16, left:10, bottom:0 }}>
              <CartesianGrid stroke={GRID} horizontal={false} />
              <XAxis type="number" tickFormatter={kfmt} {...AXIS} />
              <YAxis type="category" dataKey="name" width={90} {...AXIS} />
              <Tooltip formatter={tipMoney} />
              <Bar isAnimationActive={false} dataKey="value" name="Aportado" fill={A_COLORS.bal} radius={[0,4,4,0]} maxBarSize={26} />
            </BarChart>
          </ChartCard>
        )}

      </div>
    </>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // ── Admin + view ──────────────────────────────────────────────────────────────
  const [isAdmin, setIsAdmin]           = useState(() => sessionStorage.getItem('hex-admin') === 'true')
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminPin, setAdminPin]         = useState('')
  const [adminError, setAdminError]     = useState(false)
  const [currentView, setCurrentView]   = useState('event') // 'event' | 'dashboard' | 'analytics'

  // ── Sidebar ───────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(
    () => window.innerWidth > 768 ? localStorage.getItem('hex-sidebar') !== 'false' : false
  )
  const [showNewForm, setShowNewForm] = useState(false)

  // ── Events list ───────────────────────────────────────────────────────────────
  const [events, setEvents]           = useState([])
  const [currentEventId, setCurrentEventId] = useState(
    () => localStorage.getItem('hex-current-event') || null
  )
  const [newName, setNewName]         = useState('')
  const [newDate, setNewDate]         = useState('')
  const [creating, setCreating]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [editingValue, setEditingValue] = useState('')
  const [deletingId, setDeletingId]   = useState(null)

  // ── Current event data ────────────────────────────────────────────────────────
  const [tab, setTab]                 = useState(0)
  const [state, setState]             = useState(DEFAULT_STATE)
  const [syncStatus, setSyncStatus]   = useState('synced')
  const [loaded, setLoaded]           = useState(false)
  // loadedEventId is set only after onSnapshot confirms the right event's
  // data is in `state`. The save effect uses it to guard against the first
  // render after an event switch, where currentEventId is already the new
  // event but `state` still holds the previous event's data.
  const [loadedEventId, setLoadedEventId] = useState(null)
  const saveTimer      = useRef(null)
  const isRemoteUpdate = useRef(false)
  const eventVersion   = useRef(0)

  const { name, date, lineup, crew, tiers, aportes, publi, extras, optionalCosts, inclAudio, inclVideo, inclPlatform, venuePaid, venueDeposit } = state

  // ── Persist sidebar state ─────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('hex-sidebar', sidebarOpen)
  }, [sidebarOpen])

  // ── Load events list ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'events'), (snapshot) => {
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (a.date && b.date) return b.date.localeCompare(a.date)
          if (a.date) return -1
          if (b.date) return 1
          return a.name.localeCompare(b.name)
        })
      setEvents(list)
      setCurrentEventId(prev => (!prev && list.length > 0) ? list[0].id : prev)
      if (list.length === 0) setShowNewForm(true)
    })
    return () => unsub()
  }, [])

  // ── Persist selected event ────────────────────────────────────────────────────
  useEffect(() => {
    if (currentEventId) localStorage.setItem('hex-current-event', currentEventId)
  }, [currentEventId])

  // ── Subscribe to current event data ──────────────────────────────────────────
  useEffect(() => {
    if (!currentEventId) return

    // Cancel any pending save from the previous event immediately
    clearTimeout(saveTimer.current)
    // Bump version so any in-flight timer callback can self-abort
    eventVersion.current += 1
    const myVersion = eventVersion.current
    const myEventId = currentEventId

    // Reset — loadedEventId stays null until onSnapshot confirms correct data
    setLoaded(false)
    setLoadedEventId(null)
    setState(DEFAULT_STATE)

    const ref = doc(db, 'events', currentEventId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        // Ignore callbacks that arrive after we've already switched away
        if (eventVersion.current !== myVersion) return
        if (snap.exists()) {
          isRemoteUpdate.current = true
          setState(prev => ({ ...DEFAULT_STATE, ...snap.data() }))
        }
        // Only now is `state` guaranteed to belong to this event
        setLoadedEventId(myEventId)
        setLoaded(true)
        setSyncStatus('synced')
      },
      (err) => {
        if (eventVersion.current !== myVersion) return
        console.error('Firestore error:', err)
        setSyncStatus('error')
        setLoaded(true)
      }
    )
    return () => unsub()
  }, [currentEventId])

  // ── Debounced save ────────────────────────────────────────────────────────────
  useEffect(() => {
    // loadedEventId === currentEventId guarantees that `state` actually
    // belongs to this event. Without this check, the effect fires on the very
    // first render after switching events — `currentEventId` is already the
    // new event but `state` still holds the PREVIOUS event's data, which
    // would overwrite the new event's Firestore document.
    if (!loaded || !currentEventId || loadedEventId !== currentEventId) return
    if (isRemoteUpdate.current) { isRemoteUpdate.current = false; return }

    const savedVersion = eventVersion.current
    const savedEventId = currentEventId
    const savedState   = state

    setSyncStatus('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (eventVersion.current !== savedVersion) return   // switched — abort
      try {
        await setDoc(doc(db, 'events', savedEventId), savedState, { merge: true })
        if (eventVersion.current === savedVersion) setSyncStatus('synced')
      } catch (e) {
        console.error('Save error:', e)
        if (eventVersion.current === savedVersion) setSyncStatus('error')
      }
    }, 800)
  }, [state, loaded, currentEventId, loadedEventId])

  // ── Create new event ──────────────────────────────────────────────────────────
  const createEvent = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const newDoc = await addDoc(collection(db, 'events'), {
        ...DEFAULT_STATE,
        name: newName.trim().toUpperCase(),
        date: newDate,
        createdAt: serverTimestamp(),
      })
      setCurrentEventId(newDoc.id)
      setNewName('')
      setNewDate('')
      setShowNewForm(false)
      setTab(0)
    } catch (e) {
      console.error('Create error:', e)
    }
    setCreating(false)
  }

  // ── Rename any event directly in Firestore ────────────────────────────────────
  const saveEventName = async (id, val) => {
    const trimmed = val.trim().toUpperCase()
    if (id === currentEventId) {
      set('name', trimmed)
    } else {
      try { await setDoc(doc(db, 'events', id), { name: trimmed }, { merge: true }) } catch (e) { console.error(e) }
    }
    setEditingId(null)
  }

  // ── Delete event ──────────────────────────────────────────────────────────────
  const deleteEvent = async (id) => {
    try { await deleteDoc(doc(db, 'events', id)) } catch (e) { console.error(e) }
    if (id === currentEventId) {
      const next = events.find(e => e.id !== id)
      setCurrentEventId(next?.id || null)
    }
    setDeletingId(null)
  }

  // ── Admin ─────────────────────────────────────────────────────────────────────
  const tryUnlock = () => {
    if (adminPin === ADMIN_PASS) {
      setIsAdmin(true)
      sessionStorage.setItem('hex-admin', 'true')
      setShowAdminModal(false)
      setAdminPin('')
      setAdminError(false)
    } else {
      setAdminError(true)
    }
  }
  const lock = () => {
    setIsAdmin(false)
    sessionStorage.removeItem('hex-admin')
  }

  // ── State updaters ────────────────────────────────────────────────────────────
  const set = (key, val) => setState(prev => ({ ...prev, [key]: val }))

  const upLineup = (i, f, v) => {
    const l = [...lineup]; l[i] = { ...l[i], [f]: v }; set('lineup', l)
  }
  const addSlot    = () => set('lineup', [...lineup, { time: '', name: '', fee: 0, role: 'main' }])
  const removeSlot = i  => set('lineup', lineup.filter((_, idx) => idx !== i))

  const upTier = (i, f, v) => {
    const t = [...tiers]
    const val = (f === 'qty' || f === 'price') ? Number(v) : v
    t[i] = { ...t[i], [f]: val }; set('tiers', t)
  }
  const addTier    = () => set('tiers', [...tiers, { name: 'NUEVA TANDA', desc: '', qty: 50, price: 8000 }])
  const removeTier = i  => set('tiers', tiers.filter((_, idx) => idx !== i))

  const upCrew = (i, f, v) => {
    const c = [...crew]; c[i] = { ...c[i], [f]: v }; set('crew', c)
  }
  const addCrew    = () => set('crew', [...crew, { name: '', paid: false, access: true, amount: 0 }])
  const removeCrew = i  => set('crew', crew.filter((_, idx) => idx !== i))

  // Vendidas: al editar una tanda sembramos `sold` en TODAS (desde la
  // distribución derivada actual) para no perder el conteo de eventos viejos.
  const setSold = (i, v) => {
    const next = tiers.map((t, idx) => ({
      ...t,
      sold: idx === i ? Math.max(0, Number(v) || 0) : Math.max(0, Number(t.sold ?? sold[idx]) || 0),
    }))
    set('tiers', next)
  }

  const aportesList = aportes || []
  const addAporte    = () => set('aportes', [...aportesList, { crew: crew[0]?.name || '', concept: '', amount: 0 }])
  const upAporte     = (i, f, v) => {
    const a = [...aportesList]; a[i] = { ...a[i], [f]: (f === 'amount' ? Number(v) : v) }; set('aportes', a)
  }
  const removeAporte = i => set('aportes', aportesList.filter((_, idx) => idx !== i))

  // ── Derived financials (fuente única: computeFinancials) ───────────────────────
  const fin = computeFinancials(state) || {}
  const {
    sold = [], revs = [], att = 0, comps = 0, totalPeople = 0,
    wardrobe = [], wPeople = 0, wRev = 0, tickRev = 0, platFee = 0, totalRev = 0,
    netCost = 0, balance = 0, margin = 0, totalDjFee = 0, totalCrewContrib = 0,
    totalAportes = 0, totalFixed = 0, venueCost = 0, usdRate = 0,
  } = fin
  const cov         = Math.min(100, Math.round(totalRev / Math.max(netCost, 1) * 100))
  const liquidacion = computeLiquidacion(state, balance)
  const toUsd       = (n) => usdRate > 0 ? 'U$D ' + Math.round(n / usdRate).toLocaleString('es-AR') : null

  // Guardarropa por tandas (mismo patrón de migración que tandas de ticketing)
  const upWardrobe = (i, f, v) => {
    const w = wardrobe.map((row, idx) => idx === i ? { ...row, [f]: (f === 'label' ? v : Math.max(0, Number(v) || 0)) } : row)
    set('wardrobe', w)
  }
  const addWardrobe    = () => set('wardrobe', [...wardrobe, { label: '', people: 0, price: 2000 }])
  const removeWardrobe = i => set('wardrobe', wardrobe.filter((_, idx) => idx !== i))

  const TABS = ['FINANZAS', 'LINEUP', 'CREW']

  if (!loaded && !!currentEventId) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'IBM Plex Mono, monospace', fontSize:12, color:'#a89ec0', letterSpacing:'0.1em' }}>
      CARGANDO...
    </div>
  )

  return (
    <>
      <style>{css}</style>

      {/* Admin password modal */}
      {showAdminModal && (
        <div className="admin-overlay" onClick={() => { setShowAdminModal(false); setAdminPin(''); setAdminError(false) }}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <h3>ACCESO ADMIN</h3>
            <p>INGRESÁ LA CONTRASEÑA DE ADMINISTRADOR</p>
            <input
              type="password"
              placeholder="••••••••"
              value={adminPin}
              autoFocus
              onChange={e => { setAdminPin(e.target.value); setAdminError(false) }}
              onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            />
            {adminError && <div className="admin-error-msg">CONTRASEÑA INCORRECTA</div>}
            <button className="admin-submit" style={{ marginTop: adminError ? 10 : 0 }} onClick={tryUnlock}>
              DESBLOQUEAR
            </button>
            <button className="admin-cancel" onClick={() => { setShowAdminModal(false); setAdminPin(''); setAdminError(false) }}>
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>

        <div className="sidebar-header">
          <span className="sidebar-label">Eventos</span>
          {isAdmin && <button
            className="sidebar-compose-btn"
            onClick={() => setShowNewForm(v => !v)}
            title="Nuevo evento"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>}
        </div>

        {/* New event form */}
        {showNewForm && isAdmin && (
          <div className="sidebar-new-form">
            <input
              type="text"
              placeholder="NOMBRE DEL EVENTO"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createEvent()}
              autoFocus
            />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
            />
            <button className="sidebar-create-btn" onClick={createEvent} disabled={creating || !newName.trim()}>
              {creating ? 'CREANDO...' : 'CREAR EVENTO'}
            </button>
          </div>
        )}

        {/* Events list */}
        <div className="sidebar-events">
          {events.length === 0 ? (
            <div className="sidebar-empty">SIN EVENTOS<br />USÁ EL + PARA CREAR UNO</div>
          ) : events.map(ev => {
            const isActive   = ev.id === currentEventId
            const isEditing  = editingId === ev.id
            const isDeleting = deletingId === ev.id

            return (
              <div
                key={ev.id}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (isEditing || isDeleting) return
                  if (!isActive) { setCurrentEventId(ev.id); setTab(0); setDeletingId(null); setEditingId(null) }
                }}
              >
                <div className="sidebar-item-row">
                  <div className="sidebar-dot" />

                  {/* Name — editable for active via state, editable for others via direct Firestore */}
                  {isActive ? (
                    <input
                      className="sidebar-name-input"
                      value={name}
                      placeholder="SIN NOMBRE"
                      readOnly={!isAdmin}
                      onChange={e => isAdmin && set('name', e.target.value.toUpperCase())}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : isEditing ? (
                    <input
                      className="sidebar-name-input"
                      value={editingValue}
                      autoFocus
                      placeholder="NOMBRE DEL EVENTO"
                      onChange={e => setEditingValue(e.target.value.toUpperCase())}
                      onBlur={() => saveEventName(ev.id, editingValue)}
                      onKeyDown={e => {
                        if (e.key === 'Enter')  saveEventName(ev.id, editingValue)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="sidebar-item-name">{ev.name || 'SIN NOMBRE'}</span>
                  )}

                  {/* Actions (edit + delete) — admin only */}
                  {isAdmin && isDeleting ? (
                    <div className="sidebar-delete-confirm" onClick={e => e.stopPropagation()}>
                      <button className="sidebar-confirm-btn sidebar-confirm-yes" onClick={() => deleteEvent(ev.id)}>SÍ</button>
                      <button className="sidebar-confirm-btn sidebar-confirm-no"  onClick={() => setDeletingId(null)}>NO</button>
                    </div>
                  ) : isAdmin ? (
                    <div className="sidebar-item-actions" onClick={e => e.stopPropagation()}>
                      {/* Rename */}
                      {!isActive && (
                        <button className="sidebar-action-btn" title="Renombrar"
                          onClick={() => { setEditingId(ev.id); setEditingValue(ev.name || '') }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="m18.5 2.5 2.5 2.5-10 10-3.5.5.5-3.5z"/>
                          </svg>
                        </button>
                      )}
                      {/* Delete */}
                      <button className="sidebar-action-btn del" title="Eliminar"
                        onClick={() => { setDeletingId(ev.id); setEditingId(null) }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Date row */}
                {isActive ? (
                  <input type="date" className="sidebar-date-input" value={date} readOnly={!isAdmin}
                    onChange={e => isAdmin && set('date', e.target.value)} onClick={e => e.stopPropagation()} />
                ) : (
                  ev.date && <div className="sidebar-item-date">{formatDate(ev.date)}</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Sidebar footer — dashboard + analytics nav */}
        <div className="sidebar-footer">
          <button
            className={`sidebar-dash-btn ${currentView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentView(v => v === 'dashboard' ? 'event' : 'dashboard')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="3" width="7" height="9" rx="1"/><rect x="15" y="3" width="7" height="5" rx="1"/>
              <rect x="15" y="12" width="7" height="9" rx="1"/><rect x="2" y="16" width="7" height="5" rx="1"/>
            </svg>
            Dashboard
          </button>
          <button
            className={`sidebar-dash-btn ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => setCurrentView(v => v === 'analytics' ? 'event' : 'analytics')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 3v18h18"/><path d="M7 14l3-4 4 3 5-7"/>
            </svg>
            Analítica
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className={`main-wrap ${sidebarOpen ? 'open' : ''}`}>
        <div className="app">

          {/* Header */}
          <div className="header">
            <div className="header-top">
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(v => !v)} title="Toggle sidebar">
                <span className="toggle-bar" />
                <span className="toggle-bar" />
                <span className="toggle-bar" />
              </button>
              <div>
                <div className="label-tag">@theomenrecords × @meltunderground · drum &amp; bass</div>
                <h1>HEX <span>EVENT</span></h1>
              </div>
            </div>
            <div className="subtitle">melt underground · recoleta, caba · cap. 150 · 00:00–06:00</div>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              {currentEventId && currentView === 'event' && (
                <div className={`sync-badge ${syncStatus}`}>
                  <div className="sync-dot" />
                  {syncStatus === 'synced' ? 'guardado' : syncStatus === 'saving' ? 'guardando...' : 'error al guardar'}
                </div>
              )}
              <button
                className={`lock-btn ${isAdmin ? 'unlocked' : 'locked'}`}
                onClick={() => isAdmin ? lock() : setShowAdminModal(true)}
                title={isAdmin ? 'Bloquear edición' : 'Desbloquear edición'}
              >
                {isAdmin ? (
                  <>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                    </svg>
                    ADMIN
                  </>
                ) : (
                  <>
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    SOLO LECTURA
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── DASHBOARD VIEW ── */}
          {currentView === 'dashboard' && (() => {
            const eventsWithData = events.filter(ev => ev.lineup)
            const finances = eventsWithData.map(ev => ({ ev, fin: computeFinancials(ev) }))
            const totalRev  = finances.reduce((a, { fin }) => a + (fin?.totalRev  || 0), 0)
            const totalCost = finances.reduce((a, { fin }) => a + (fin?.netCost   || 0), 0)
            const totalBal  = finances.reduce((a, { fin }) => a + (fin?.balance   || 0), 0)
            const avgAtt    = finances.length ? Math.round(finances.reduce((a, { fin }) => a + (fin?.att || 0), 0) / finances.length) : 0
            const avgMargin = finances.length ? finances.reduce((a, { fin }) => a + (fin?.margin || 0), 0) / finances.length : 0
            const usdFinances = finances.filter(({ fin }) => (fin?.usdRate || 0) > 0)
            const totalBalUsd = usdFinances.reduce((a, { fin }) => a + (fin.balance / fin.usdRate), 0)
            const maxRev    = Math.max(...finances.map(({ fin }) => fin?.totalRev || 0), 1)
            const maxAtt    = Math.max(...finances.map(({ fin }) => fin?.att || 0), 1)
            const sorted    = [...finances].sort((a, b) => (b.ev.date || '').localeCompare(a.ev.date || ''))

            // Aportes del team agregados por integrante (aporte $ por miembro + lista de aportes)
            const aporteByMember = {}
            eventsWithData.forEach(ev => {
              (ev.crew || []).forEach(c => {
                const amt = Number(c.amount) || 0
                if (amt && c.name) aporteByMember[c.name] = (aporteByMember[c.name] || 0) + amt
              })
              ;(ev.aportes || []).forEach(a => {
                const amt = Number(a.amount) || 0
                if (amt && a.crew) aporteByMember[a.crew] = (aporteByMember[a.crew] || 0) + amt
              })
            })
            const aporteRanking = Object.entries(aporteByMember).sort((a, b) => b[1] - a[1])
            const totalAportes  = aporteRanking.reduce((a, [, v]) => a + v, 0)
            const maxAporte     = Math.max(...aporteRanking.map(([, v]) => v), 1)
            return (
              <>
                <div className="section-title" style={{ marginBottom:16 }}>resumen general</div>

                {/* KPI row */}
                <div className="dash-kpi-grid">
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">EVENTOS TOTALES</div>
                    <div className="dash-kpi-value grad">{eventsWithData.length}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">RECAUDACIÓN TOTAL</div>
                    <div className="dash-kpi-value">{fmt(totalRev)}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">COSTOS TOTALES</div>
                    <div className="dash-kpi-value neg">{fmt(totalCost)}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">BALANCE NETO</div>
                    <div className={`dash-kpi-value ${totalBal >= 0 ? 'pos' : 'neg'}`}>{totalBal >= 0 ? '+' : ''}{fmt(totalBal)}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">MARGEN PROM.</div>
                    <div className={`dash-kpi-value ${avgMargin >= 0 ? 'pos' : 'neg'}`}>{avgMargin >= 0 ? '+' : ''}{avgMargin.toFixed(1)}%</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">ASISTENCIA PROM.</div>
                    <div className="dash-kpi-value">{avgAtt} <span style={{ fontSize:11, color:'#a89ec0' }}>pers.</span></div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">TICKET PROM.</div>
                    <div className="dash-kpi-value">{eventsWithData.length ? fmt(totalRev / eventsWithData.length) : '—'}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">APORTES DEL TEAM</div>
                    <div className="dash-kpi-value pos">{fmt(totalAportes)}</div>
                  </div>
                </div>

                {/* NETO final — cuánto está generando la productora */}
                <div style={{ background: totalBal >= 0 ? 'linear-gradient(135deg,rgba(52,168,122,0.12),rgba(167,139,250,0.10))' : 'linear-gradient(135deg,rgba(224,85,133,0.12),rgba(167,139,250,0.10))', border:`1px solid ${totalBal >= 0 ? 'rgba(52,168,122,0.3)' : 'rgba(224,85,133,0.3)'}`, borderRadius:16, padding:'20px 22px', marginBottom:24, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                  <div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:4 }}>NETO GENERADO · {eventsWithData.length} evento{eventsWithData.length === 1 ? '' : 's'}</div>
                    <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:44, lineHeight:1, letterSpacing:'0.02em', color: totalBal >= 0 ? '#2a9068' : '#e05585' }}>{totalBal >= 0 ? '+' : ''}{fmt(totalBal)}</div>
                    {usdFinances.length > 0 && (
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#8b72e8', marginTop:4, letterSpacing:'0.04em' }}>
                        ≈ U$D {Math.round(totalBalUsd).toLocaleString('es-AR')} <span style={{ color:'#a89ec0' }}>({usdFinances.length}/{eventsWithData.length} con cotización)</span>
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:'right', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', letterSpacing:'0.06em', lineHeight:1.9 }}>
                    recaudación {fmt(totalRev)}<br />− costos {fmt(totalCost)}<br />
                    <span style={{ color:'#2a9068' }}>incl. aportes team {fmt(totalAportes)}</span>
                  </div>
                </div>

                {/* Revenue chart */}
                {sorted.length > 0 && <>
                  <div className="section-title" style={{ marginBottom:12 }}>ingresos por evento</div>
                  <div style={{ marginBottom:24 }}>
                    {sorted.map(({ ev, fin }) => (
                      <div key={ev.id} className="dash-bar-row">
                        <div className="dash-bar-label">{ev.name || 'SIN NOMBRE'}</div>
                        <div className="dash-bar-track">
                          <div className="dash-bar-fill" style={{ width:`${((fin?.totalRev||0)/maxRev*100).toFixed(1)}%`, background:'linear-gradient(90deg,#e879c0,#a78bfa)' }} />
                        </div>
                        <div className="dash-bar-val">{fmt(fin?.totalRev||0)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="section-title" style={{ marginBottom:12 }}>asistencia</div>
                  <div style={{ marginBottom:24 }}>
                    {sorted.map(({ ev, fin }) => (
                      <div key={ev.id} className="dash-bar-row">
                        <div className="dash-bar-label">{ev.name || 'SIN NOMBRE'}</div>
                        <div className="dash-bar-track">
                          <div className="dash-bar-fill" style={{ width:`${((fin?.att||0)/maxAtt*100).toFixed(1)}%`, background:'linear-gradient(90deg,#60a5fa,#a78bfa)' }} />
                        </div>
                        <div className="dash-bar-val">{fin?.att||0} pers.</div>
                      </div>
                    ))}
                  </div>

                  {/* Aportes del team chart */}
                  {aporteRanking.length > 0 && <>
                    <div className="section-title" style={{ marginBottom:12 }}>aportes del team <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#a89ec0', letterSpacing:'0.08em', textTransform:'none' }}>· reducen los gastos · total {fmt(totalAportes)}</span></div>
                    <div style={{ marginBottom:24 }}>
                      {aporteRanking.map(([member, amt]) => (
                        <div key={member} className="dash-bar-row">
                          <div className="dash-bar-label">{member}</div>
                          <div className="dash-bar-track">
                            <div className="dash-bar-fill" style={{ width:`${(amt/maxAporte*100).toFixed(1)}%`, background:'linear-gradient(90deg,#34a87a,#44d4a0)' }} />
                          </div>
                          <div className="dash-bar-val">{fmt(amt)}</div>
                        </div>
                      ))}
                    </div>
                  </>}

                  {/* Per-event breakdown */}
                  <div className="section-title" style={{ marginBottom:12 }}>desglose por evento</div>
                  {sorted.map(({ ev, fin }) => (
                    <div key={ev.id} className="dash-event-row" onClick={() => { setCurrentEventId(ev.id); setCurrentView('event'); setTab(0) }}>
                      <div className="dash-event-identity">
                        <div className="dash-event-name">{ev.name || 'SIN NOMBRE'}</div>
                        {ev.date && <div className="dash-event-date-lbl">{formatDate(ev.date)}</div>}
                      </div>
                      <div className="dash-ev-metric">
                        <div className="dash-ev-metric-lbl">ASISTENCIA</div>
                        <div className="dash-ev-metric-val">{fin?.att||0}</div>
                      </div>
                      <div className="dash-ev-metric">
                        <div className="dash-ev-metric-lbl">RECAUDACIÓN</div>
                        <div className="dash-ev-metric-val">{fmt(fin?.totalRev||0)}</div>
                      </div>
                      <div className="dash-ev-metric">
                        <div className="dash-ev-metric-lbl">COSTO NETO</div>
                        <div className="dash-ev-metric-val neg">{fmt(fin?.netCost||0)}</div>
                      </div>
                      <div className="dash-ev-metric">
                        <div className="dash-ev-metric-lbl">BALANCE</div>
                        <div className={`dash-ev-metric-val ${(fin?.balance||0) >= 0 ? 'pos' : 'neg'}`}>
                          {(fin?.balance||0) >= 0 ? '+' : ''}{fmt(fin?.balance||0)}
                        </div>
                        {(fin?.usdRate||0) > 0 && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#8b72e8', marginTop:2 }}>U$D {Math.round((fin.balance)/fin.usdRate).toLocaleString('es-AR')}</div>}
                      </div>
                      <div className="dash-ev-metric">
                        <div className="dash-ev-metric-lbl">MARGEN</div>
                        <div className={`dash-ev-metric-val ${(fin?.margin||0) >= 0 ? 'pos' : 'neg'}`}>{(fin?.margin||0) >= 0 ? '+' : ''}{(fin?.margin||0).toFixed(0)}%</div>
                      </div>
                      <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:8, color:'#c4b8e0', letterSpacing:'0.06em' }}>VER →</div>
                    </div>
                  ))}
                </>}

                {eventsWithData.length === 0 && (
                  <div style={{ textAlign:'center', padding:'40px 20px', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#a89ec0', letterSpacing:'0.1em', lineHeight:2 }}>
                    NO HAY EVENTOS CON DATOS AÚN<br />CREÁ UN EVENTO PARA VER EL DASHBOARD
                  </div>
                )}
              </>
            )
          })()}

          {/* ── ANALYTICS VIEW ── */}
          {currentView === 'analytics' && <Analytics events={events} />}

          {/* Empty state (event view) */}
          {currentView === 'event' && !currentEventId && (
            <div style={{ textAlign:'center', padding:'60px 20px', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#a89ec0', letterSpacing:'0.1em', lineHeight:2 }}>
              {events.length === 0
                ? 'CREÁ TU PRIMER EVENTO CON EL + EN LA BARRA LATERAL'
                : 'SELECCIONÁ UN EVENTO DE LA BARRA LATERAL'
              }
            </div>
          )}

          {/* Main content */}
          {currentView === 'event' && currentEventId && loaded && <>

            <div className="tabs">
              {TABS.map((t, i) => (
                <button key={i} className={`tab ${tab === i ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
              ))}
            </div>

            <fieldset disabled={!isAdmin} style={{ border:'none', padding:0, margin:0, minWidth:0 }}>
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
                  {/* Dynamic user-defined costs */}
                  {(optionalCosts || []).map((oc, i) => (
                    <div className="toggle-row" key={oc.id ?? i} style={{ gap: 8 }}>
                      <input
                        type="text"
                        placeholder="descripción del costo"
                        value={oc.label}
                        onChange={e => { const c = [...(optionalCosts||[])]; c[i] = { ...c[i], label: e.target.value }; set('optionalCosts', c) }}
                        style={{ flex: 1, width: 'auto', minWidth: 0 }}
                      />
                      <input
                        type="number"
                        value={oc.amount}
                        step={5000}
                        min={0}
                        onChange={e => { const c = [...(optionalCosts||[])]; c[i] = { ...c[i], amount: Number(e.target.value) }; set('optionalCosts', c) }}
                        style={{ width: 130 }}
                      />
                      <button
                        onClick={() => set('optionalCosts', (optionalCosts||[]).filter((_, j) => j !== i))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#e05585', fontSize:16, padding:'0 4px', lineHeight:1, flexShrink:0 }}
                      >✕</button>
                    </div>
                  ))}
                  {/* Add cost button */}
                  <div style={{ padding:'8px 14px' }}>
                    <button
                      onClick={() => set('optionalCosts', [...(optionalCosts||[]), { id: Date.now(), label: '', amount: 0 }])}
                      style={{ background:'none', border:'1px dashed rgba(167,139,250,0.35)', color:'#a89ec0', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, letterSpacing:'0.1em', padding:'7px 14px', borderRadius:7, cursor:'pointer', width:'100%' }}
                    >+ AGREGAR COSTO</button>
                  </div>
                  {/* Fixed toggles */}
                  {[
                    { l:'Grabación audio (noche compl.)', s:fmt(50000),            checked:inclAudio,    toggle:() => set('inclAudio', !inclAudio)       },
                    { l:'Grabación video (GoPro 360)',    s:fmt(70000),            checked:inclVideo,    toggle:() => set('inclVideo', !inclVideo)       },
                    { l:'Fee plataforma ticketing',       s:'~10% sobre entradas', checked:inclPlatform, toggle:() => set('inclPlatform', !inclPlatform) },
                  ].map((row, i) => (
                    <div className="toggle-row" key={i}>
                      <div className="toggle-label">{row.l}<span className="toggle-sub">{row.s}</span></div>
                      <input type="checkbox" checked={row.checked} onChange={row.toggle} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="section">
                <div className="section-title">asistencia</div>
                <div className="card" style={{ padding:'4px 0' }}>
                  <div className="toggle-row">
                    <span className="toggle-label">entradas vendidas<span className="toggle-sub">suma de tandas de ticketing</span></span>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:'0.04em', color:'#8b72e8', lineHeight:1 }}>{att}</span>
                  </div>
                  <div className="toggle-row">
                    <span className="toggle-label">cortesías / invitados<span className="toggle-sub">ocupan cupo, no pagan</span></span>
                    <input type="number" min={0} value={comps} onChange={e => set('comps', Math.max(0, Number(e.target.value) || 0))} style={{ width:90 }} />
                  </div>
                  <div className="toggle-row" style={{ background:'rgba(167,139,250,0.06)' }}>
                    <span className="toggle-label" style={{ color:'#1e1535', fontWeight:600 }}>total en sala</span>
                    <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:30, letterSpacing:'0.04em', color: totalPeople > 150 ? '#e05585' : '#1e1535', lineHeight:1 }}>{totalPeople}</span>
                    <span className="range-val" style={{ color: totalPeople > 150 ? '#e05585' : '#a89ec0', fontSize:11, minWidth:'auto' }}>
                      {totalPeople > 150 ? '⚠ supera el cap de 150' : '/ 150 cap'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-title">tandas de ticketing</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:12 }}>
                  {tiers.map((t, i) => (
                    <div key={i} className={`tier-card t${(i % 3) + 1}`}>
                      <button className="tier-remove" title="quitar tanda" onClick={() => removeTier(i)}>✕</button>
                      <input className="tier-name-input" type="text" value={t.name} onChange={e => upTier(i, 'name', e.target.value)} placeholder="NOMBRE TANDA" />
                      <input className="tier-desc-input" type="text" value={t.desc} onChange={e => upTier(i, 'desc', e.target.value)} placeholder="descripción" />
                      <div className="tier-field"><label>VENDIDAS</label><input type="number" value={sold[i]} min={0} onChange={e => setSold(i, e.target.value)} style={{ fontWeight:600, color:'#8b72e8' }} /></div>
                      <div className="tier-field"><label>CUPO (objetivo)</label><input type="number" value={t.qty} min={0} onChange={e => upTier(i, 'qty', e.target.value)} /></div>
                      <div className="tier-field"><label>PRECIO $ARS</label><input type="number" value={t.price} step={500} min={0} onChange={e => upTier(i, 'price', e.target.value)} /></div>
                      <div className="tier-revenue">{sold[i]}/{t.qty || 0} vendidas<br />subtotal: <span>{fmt(revs[i])}</span></div>
                    </div>
                  ))}
                </div>
                <button className="add-row-btn" onClick={addTier}>+ AGREGAR TANDA</button>
              </div>

              <div className="section">
                <div className="section-title">guardarropa por tanda (100% productora)</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', margin:'0 2px 10px', letterSpacing:'0.04em' }}>
                  el precio varía según el horario de la noche
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:12 }}>
                  {wardrobe.map((w, i) => (
                    <div key={i} className={`tier-card t${(i % 3) + 1}`}>
                      <button className="tier-remove" title="quitar tanda" onClick={() => removeWardrobe(i)}>✕</button>
                      <input className="tier-name-input" type="text" value={w.label} onChange={e => upWardrobe(i, 'label', e.target.value)} placeholder="FRANJA HORARIA" />
                      <div className="tier-field"><label>PERSONAS</label><input type="number" min={0} value={w.people} onChange={e => upWardrobe(i, 'people', e.target.value)} /></div>
                      <div className="tier-field"><label>PRECIO $ARS</label><input type="number" step={500} min={0} value={w.price} onChange={e => upWardrobe(i, 'price', e.target.value)} /></div>
                      <div className="tier-revenue">{w.people} pers.<br />subtotal: <span>{fmt(w.people * w.price)}</span></div>
                    </div>
                  ))}
                </div>
                <button className="add-row-btn" onClick={addWardrobe}>+ AGREGAR FRANJA</button>
                <div style={{ padding:'10px 2px 0', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#6b5e88', letterSpacing:'0.04em' }}>
                  total guardarropa: <strong style={{ color:'#1e1535' }}>{fmt(wRev)}</strong> · {wPeople} personas
                </div>
              </div>

              <div className="section">
                <div className="section-title">venue · pago</div>
                <div className="card" style={{ padding:'4px 0' }}>
                  <div className="toggle-row">
                    <span className="toggle-label">costo del venue</span>
                    <input type="number" step={10000} min={0} value={venueCost} onChange={e => set('venueCost', Math.max(0, Number(e.target.value) || 0))} style={{ width:130 }} />
                  </div>
                  <div className="toggle-row">
                    <span className="toggle-label">seña / adelanto pagado</span>
                    <input type="number" step={10000} min={0} value={venueDeposit || 0} onChange={e => set('venueDeposit', Math.max(0, Number(e.target.value) || 0))} style={{ width:130 }} />
                  </div>
                  <div className="toggle-row">
                    <span className="toggle-label">venue pagado en su totalidad</span>
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!venuePaid} onChange={e => set('venuePaid', e.target.checked)} />
                      <span className={`crew-badge ${venuePaid ? 'badge-paid' : 'badge-unpaid'}`}>{venuePaid ? 'pagado' : 'pendiente'}</span>
                    </label>
                  </div>
                  <div style={{ padding:'8px 14px', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color: venuePaid ? '#2a9068' : '#c0446e' }}>
                    {venuePaid
                      ? '✓ saldado'
                      : `saldo pendiente: ${fmt(Math.max(0, venueCost - (Number(venueDeposit) || 0)))}`}
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-title">contexto · cotización USD</div>
                <div className="card" style={{ padding:'4px 0' }}>
                  <div className="toggle-row">
                    <span className="toggle-label">dólar a la fecha del evento<span className="toggle-sub">para comparar entre fechas sin que la inflación distorsione</span></span>
                    <input type="number" step={10} min={0} value={usdRate || 0} onChange={e => set('usdRate', Math.max(0, Number(e.target.value) || 0))} style={{ width:110 }} placeholder="$/USD" />
                  </div>
                  <div style={{ padding:'8px 14px', fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0' }}>
                    {usdRate > 0 ? `neto en dólares: ${toUsd(balance)}` : 'cargá la cotización para ver el neto en USD'}
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
                    ['VENUE', venueCost],
                    ['DJS', totalDjFee],
                    ...(optionalCosts || []).filter(c => c.amount > 0).map(c => [c.label || 'COSTO EXTRA', c.amount]),
                    ...(publi  > 0 ? [['PUBLICIDAD', publi]]       : []),
                    ...(extras > 0 ? [['OTROS', extras]]           : []),
                    ...(inclAudio   ? [['GRABACIÓN AUDIO', 50000]] : []),
                    ...(inclVideo   ? [['GRABACIÓN VIDEO', 70000]] : []),
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

                <div className="grid2" style={{ marginTop:4 }}>
                  <div className={`stat ${balance >= 0 ? 'positive' : 'highlight'}`}>
                    <div className="stat-label">{balance >= 0 ? 'NETO (ganancia)' : 'NETO (pérdida)'}</div>
                    <div className="stat-value">{balance >= 0 ? '+' : ''}{fmt(balance)}</div>
                    {usdRate > 0 && <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', marginTop:4 }}>{toUsd(balance)}</div>}
                  </div>
                  <div className="stat">
                    <div className="stat-label">MARGEN</div>
                    <div className="stat-value" style={{ color: margin >= 0 ? '#34a87a' : '#e05585' }}>{margin >= 0 ? '+' : ''}{margin.toFixed(1)}%</div>
                    <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', marginTop:4 }}>sobre ingresos</div>
                  </div>
                </div>

                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${cov}%`, background: balance >= 0 ? 'linear-gradient(90deg,#34a87a,#44d4a0)' : 'linear-gradient(90deg,#e879c0,#e05585)' }} />
                </div>
                <div className="progress-label"><span>$0</span><span>cobertura {cov}%</span><span>{fmt(netCost)}</span></div>
                <div className={`verdict ${balance >= 0 ? 'ok' : 'loss'}`}>
                  <div className="verdict-title">{balance >= 0 ? '✓ resultado positivo' : '⚠ pérdida'}</div>
                  {balance >= 0
                    ? `GANANCIA: ${fmt(balance)} con ${att} entradas vendidas (${totalPeople} en sala).`
                    : `PÉRDIDA: ${fmt(Math.abs(balance))} con ${att} entradas vendidas.\nNecesitás aprox. ${Math.ceil(netCost / (totalRev / Math.max(att, 1)))} entradas para cubrir el costo neto.`}
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
                      {dj.fee > 0 && (
                        <div style={{ flex:'0 0 auto' }}>
                          <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'#a89ec0', marginBottom:3, letterSpacing:'0.1em' }}>PAGO</div>
                          <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', padding:'5px 0' }}>
                            <input type="checkbox" checked={!!dj.paid} onChange={e => upLineup(i, 'paid', e.target.checked)} />
                            <span className={`crew-badge ${dj.paid ? 'badge-paid' : 'badge-unpaid'}`}>{dj.paid ? 'pagado' : 'pendiente'}</span>
                          </label>
                        </div>
                      )}
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
                    <input className="crew-name-input" type="text" value={c.name} onChange={e => upCrew(i, 'name', e.target.value)} placeholder="NOMBRE" />
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                      <input type="checkbox" checked={c.paid} onChange={e => upCrew(i, 'paid', e.target.checked)} />
                      <span className={`crew-badge ${c.paid ? 'badge-paid' : 'badge-unpaid'}`}>{c.paid ? 'pagó' : 'pendiente'}</span>
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}>
                      <input type="checkbox" checked={c.access} onChange={e => upCrew(i, 'access', e.target.checked)} />
                      <span className={`crew-badge ${c.access ? 'badge-access' : 'badge-noaccess'}`}>{c.access ? 'acceso' : 'sin acceso'}</span>
                    </label>
                    <input type="number" value={c.amount} step={1000} min={0} onChange={e => upCrew(i, 'amount', Number(e.target.value))} style={{ width:100 }} placeholder="aporte $" />
                    <button className="crew-remove" title="quitar integrante" onClick={() => removeCrew(i)}>✕</button>
                  </div>
                ))}
                <button className="add-row-btn" onClick={addCrew}>+ AGREGAR INTEGRANTE</button>
              </div>

              <div className="section">
                <div className="section-title">aportes del team</div>
                {aportesList.length === 0 && (
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', padding:'4px 2px 10px', letterSpacing:'0.06em' }}>
                    sin aportes cargados · agregá un aporte de dinero asociado a un integrante
                  </div>
                )}
                {aportesList.map((a, i) => (
                  <div key={i} className="crew-row">
                    <select value={a.crew} onChange={e => upAporte(i, 'crew', e.target.value)} style={{ background:'rgba(255,255,255,0.8)', border:'1px solid rgba(200,180,240,0.4)', color:'#1e1535', fontFamily:"'Bebas Neue',sans-serif", fontSize:18, letterSpacing:'0.05em', padding:'5px 8px', borderRadius:6, outline:'none', flex:'0 0 auto', minWidth:120 }}>
                      {crew.length === 0 && <option value="">—</option>}
                      {crew.map((c, ci) => <option key={ci} value={c.name}>{c.name || '—'}</option>)}
                    </select>
                    <input type="text" value={a.concept} onChange={e => upAporte(i, 'concept', e.target.value)} placeholder="concepto (ej: adelanto barra)" style={{ flex:'1 1 140px', minWidth:120 }} />
                    <input type="number" value={a.amount} step={1000} min={0} onChange={e => upAporte(i, 'amount', e.target.value)} style={{ width:110 }} placeholder="monto $" />
                    <button className="crew-remove" title="quitar aporte" onClick={() => removeAporte(i)}>✕</button>
                  </div>
                ))}
                <button className="add-row-btn" onClick={addAporte}>+ AGREGAR APORTE</button>
              </div>

              <div className="section">
                <div className="section-title">resumen</div>
                <div className="grid3">
                  <div className="stat"><div className="stat-label">TOTAL CREW</div><div className="stat-value">{crew.length}</div></div>
                  <div className="stat positive"><div className="stat-label">CON ACCESO</div><div className="stat-value">{crew.filter(c => c.access).length}</div></div>
                  <div className="stat positive"><div className="stat-label">APORTES LISTA</div><div className="stat-value">{fmt(totalAportes)}</div></div>
                  <div className="stat positive span2"><div className="stat-label">TOTAL APORTADO (incl. aporte $ por integrante)</div><div className="stat-value">{fmt(totalCrewContrib)}</div></div>
                </div>
              </div>

              <div className="section">
                <div className="section-title">liquidación · reparto por aportes</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', margin:'0 2px 10px', letterSpacing:'0.04em' }}>
                  el neto del evento ({balance >= 0 ? 'ganancia' : 'pérdida'} {fmt(Math.abs(balance))}) se reparte en proporción a lo que aportó cada integrante
                </div>
                {liquidacion.total === 0 ? (
                  <div className="card" style={{ padding:'14px', fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:'#a89ec0', letterSpacing:'0.04em' }}>
                    sin aportes cargados · cargá aportes (arriba) para calcular el reparto
                  </div>
                ) : (
                  <>
                    {liquidacion.rows.map((r) => (
                      <div key={r.name} className="crew-row">
                        <span className="crew-name" style={{ flex:'1 1 auto' }}>{r.name}</span>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#a89ec0', minWidth:90, textAlign:'right' }}>aportó {fmt(r.aporte)}</span>
                        <span className="crew-badge badge-access" style={{ minWidth:48, textAlign:'center' }}>{r.pct.toFixed(1)}%</span>
                        <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:14, fontWeight:600, color: r.share >= 0 ? '#2a9068' : '#e05585', minWidth:100, textAlign:'right' }}>
                          {r.share >= 0 ? '+' : ''}{fmt(r.share)}
                        </span>
                      </div>
                    ))}
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 14px', marginTop:6, background: balance >= 0 ? 'rgba(210,245,230,0.45)' : 'rgba(255,220,235,0.45)', borderRadius:10 }}>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:10, color:'#6b5e88', letterSpacing:'0.1em' }}>TOTAL A REPARTIR</span>
                      <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:14, fontWeight:600, color: balance >= 0 ? '#2a9068' : '#e05585' }}>{balance >= 0 ? '+' : ''}{fmt(balance)}</span>
                    </div>
                  </>
                )}
              </div>
            </>}


            </fieldset>

            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:9, color:'rgba(168,158,192,0.4)', letterSpacing:'0.1em', textAlign:'center', marginTop:40, lineHeight:2 }}>
              OPCIÓN 1 · 100% BARRA→MELT · 100% PUERTA+GUARDARROPA→PRODUCTORA<br />
              MELT UNDERGROUND · LAPRIDA Y AV. SANTA FE · RECOLETA · CAP. 150
            </div>

          </>}
        </div>
      </div>
    </>
  )
}
