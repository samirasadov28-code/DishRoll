import { useState, useEffect, Fragment } from "react";

// ─── VERSION ────────────────────────────────────────────────────────────────
const APP_VERSION = "0.0.1";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const CUISINE_OPTIONS = ['Italian','Asian','Mexican','Mediterranean','Indian','French','American','Middle Eastern','Japanese','Thai','Greek','Spanish','Moroccan','Lebanese','Vietnamese'];
const DIETARY_OPTIONS = ['Vegetarian','Vegan','Gluten-Free','Dairy-Free','Keto','Paleo','Nut-Free','Low-Carb','High-Protein','Pescatarian'];
const CURRENCY_SYMBOLS = { EUR:'€', GBP:'£', USD:'$', CAD:'CA$', AUD:'A$' };
const ML = { breakfast:'🌅 Breakfast', lunch:'🕐 Lunch', dinner:'🌙 Dinner' };
const ROLL_MSGS = ['Rolling your week…','The dice are in the air…','Spinning up your menu…','Shuffling the deck…','Fate is choosing your meals…'];
const CAT_ICONS = {Produce:'🥬',Proteins:'🥩',Dairy:'🧀',Pantry:'🫙',Grains:'🌾',Spices:'🌿',Frozen:'🧊',Other:'🛒',Bakery:'🍞',Beverages:'🥛',Seafood:'🐟',Condiments:'🥫',Canned:'🥫',Meat:'🥩',Vegetables:'🥦',Fruit:'🍎'};
const STEPS_IDX = { welcome:1, cuisines:2, dietary:3, variability:4, budget:5, servings:6, generating:7, mealplan:8, shopping:9 };
const DEFAULT_PREFS = { mealScope:'dinner', mealTypes:['dinner'], cuisines:[], dietary:[], variability:40, favoriteMeals:[], favInput:'', servings:2, currency:'EUR', weeklyBudget:'', budgetEnabled:false };

// ─── WEEK HELPERS ────────────────────────────────────────────────────────────
function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}
function weekKey(date) {
  const m = getMondayOf(date);
  return m.toISOString().slice(0,10);
}
function currentWeekKey() { return weekKey(new Date()); }
function weekLabel(key) {
  const mon = new Date(key + 'T00:00:00');
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = d => d.toLocaleDateString('en-IE', { day:'numeric', month:'short' });
  return `${fmt(mon)} – ${fmt(sun)}`;
}
function isCurrentWeek(key) { return key === currentWeekKey(); }
function isFutureWeek(key) { return key > currentWeekKey(); }
function weeksAround(centerKey, count = 8) {
  const keys = [];
  const center = new Date(centerKey + 'T00:00:00');
  for (let i = -(count); i <= 2; i++) {
    const d = new Date(center);
    d.setDate(d.getDate() + i * 7);
    keys.push(weekKey(d));
  }
  // deduplicate and sort
  return [...new Set(keys)].sort();
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const WEEK_PREFIX = 'dishroll-week-';
const FAVS_KEY    = 'dishroll-favs';

function saveWeekData(key, data) {
  try { localStorage.setItem(WEEK_PREFIX + key, JSON.stringify({ ...data, savedAt: Date.now() })); } catch {}
}
function loadWeekData(key) {
  try { const s = localStorage.getItem(WEEK_PREFIX + key); return s ? JSON.parse(s) : null; } catch { return null; }
}
function getAllWeekKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(WEEK_PREFIX)) keys.push(k.replace(WEEK_PREFIX, ''));
  }
  return keys.sort().reverse();
}
function deleteWeekData(key) {
  try { localStorage.removeItem(WEEK_PREFIX + key); } catch {}
}

// ─── API ─────────────────────────────────────────────────────────────────────
async function callDishRoll(prompt, maxTokens) {
  maxTokens = maxTokens || 4000;
  const res = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens })
  });
  if (!res.ok) throw new Error('API error ' + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const clean = (data.text || '').replace(/```json|```/g, '').trim();
  const m = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return m ? m[1] : clean;
}

// ─── GRADIENT ────────────────────────────────────────────────────────────────
function getDishGradient(name) {
  name = name || '';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const g = ['linear-gradient(135deg,#0d7272,#1a9a9a)','linear-gradient(135deg,#c87800,#f09200)','linear-gradient(135deg,#2a7a4a,#3aaa6a)','linear-gradient(135deg,#6a3a8a,#9a5aba)','linear-gradient(135deg,#8a3030,#c04040)','linear-gradient(135deg,#1a5a8a,#2a7aba)','linear-gradient(135deg,#5a5a1a,#9a9230)'];
  return g[Math.abs(h) % g.length];
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');`;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#f4fafa;color:#1a2f2f}
.app{min-height:100vh;background:#f4fafa}
.header{background:#0a4848;padding:12px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.logo img{height:44px;width:auto;display:block;cursor:pointer}
.hdr-right{display:flex;align-items:center;gap:12px}
.version-badge{font-size:11px;color:#6abcbc;font-weight:500;background:rgba(255,255,255,.08);padding:4px 10px;border-radius:100px;letter-spacing:.4px}
.prog-bar{height:3px;background:#c8e4e4}
.prog-fill{height:100%;background:linear-gradient(90deg,#0d7272,#f09200);transition:width .4s ease}
.main{max-width:920px;margin:0 auto;padding:36px 22px 80px}
.scr-title{font-family:'Cormorant Garamond',serif;font-size:40px;font-weight:600;color:#0a4848;line-height:1.15;margin-bottom:8px}
.scr-sub{font-size:15px;color:#4a7070;font-weight:300;margin-bottom:32px;line-height:1.6}
.card{background:#fff;border-radius:16px;padding:26px;margin-bottom:14px;box-shadow:0 2px 10px rgba(13,114,114,.07);border:1px solid #c8e4e4}
.chip-grid{display:flex;flex-wrap:wrap;gap:9px}
.chip{padding:8px 17px;border-radius:100px;border:1.5px solid #b8d8d8;background:#fff;font-size:14px;font-weight:500;cursor:pointer;transition:all .17s;color:#1a3a3a;font-family:'Plus Jakarta Sans',sans-serif;user-select:none}
.chip:hover{border-color:#0d7272;color:#0d7272}
.chip.sel{background:#0d7272;border-color:#0d7272;color:#fff}
.chip.asel{background:#f09200;border-color:#f09200;color:#fff}
.btn{display:inline-flex;align-items:center;gap:8px;padding:12px 26px;border-radius:100px;border:none;cursor:pointer;font-size:15px;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.btn-p{background:#0d7272;color:#fff}
.btn-p:hover:not(:disabled){background:#0a5858;transform:translateY(-1px);box-shadow:0 4px 16px rgba(13,114,114,.28)}
.btn-a{background:#f09200;color:#fff}
.btn-a:hover:not(:disabled){background:#d07e00;transform:translateY(-1px);box-shadow:0 4px 16px rgba(240,146,0,.32)}
.btn-g{background:transparent;color:#0d7272;border:1.5px solid #9acaca}
.btn-g:hover:not(:disabled){border-color:#0d7272}
.btn-danger{background:transparent;color:#c04040;border:1.5px solid #e8a0a0}
.btn-danger:hover:not(:disabled){background:#fef0f0;border-color:#c04040}
.btn-sm{padding:7px 15px;font-size:13px}
.btn:disabled{opacity:.42;cursor:not-allowed}
.btn-roll{background:linear-gradient(135deg,#f09200,#c87800);color:#fff;font-size:16px;padding:14px 32px;letter-spacing:.3px}
.btn-roll:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 20px rgba(240,146,0,.42)}
.inp{width:100%;padding:12px 15px;border-radius:10px;border:1.5px solid #b8d8d8;background:#f8fefe;font-size:15px;font-family:'Plus Jakarta Sans',sans-serif;color:#1a2f2f;outline:none;transition:border-color .2s}
.inp:focus{border-color:#0d7272}
.slider{width:100%;accent-color:#f09200;cursor:pointer}
.tag{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;background:#e0f4f4;border-radius:100px;font-size:13px;color:#0a4848;font-weight:500}
.tag button{background:none;border:none;cursor:pointer;color:#3a9898;font-size:15px;line-height:1;padding:0 2px}
.tag button:hover{color:#f09200}
.lbl{font-size:11px;font-weight:600;color:#4a7070;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}

/* ── LANDING ── */
.landing-hero{text-align:center;padding:52px 0 40px}
.landing-logo{width:110px;height:auto;margin:0 auto 18px;display:block}
.landing-title{font-family:'Cormorant Garamond',serif;font-size:48px;font-weight:600;color:#0a4848;line-height:1.1;margin-bottom:10px}
.landing-sub{font-size:16px;color:#4a7070;max-width:440px;margin:0 auto 32px;line-height:1.65;font-weight:300}
.cw-card{background:linear-gradient(135deg,#0a4848,#0d7272);border-radius:20px;padding:28px 32px;margin-bottom:24px;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.cw-left{}
.cw-tag{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.6);margin-bottom:6px}
.cw-week{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#fff;margin-bottom:4px}
.cw-status{font-size:14px;color:rgba(255,255,255,.7)}
.cw-actions{display:flex;gap:10px;flex-wrap:wrap}
.btn-white{background:#fff;color:#0a4848;border:none;padding:11px 22px;border-radius:100px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s;display:inline-flex;align-items:center;gap:7px}
.btn-white:hover{background:#e0f4f4;transform:translateY(-1px)}
.btn-outline-white{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.45);padding:10px 20px;border-radius:100px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s;display:inline-flex;align-items:center;gap:7px}
.btn-outline-white:hover{background:rgba(255,255,255,.12);border-color:#fff}
.cal-section-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;color:#0a4848;margin-bottom:16px;display:flex;align-items:center;gap:10px}
.week-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:32px}
.week-card{background:#fff;border-radius:14px;padding:18px 20px;border:1.5px solid #c8e4e4;cursor:pointer;transition:all .2s;position:relative}
.week-card:hover{border-color:#0d7272;transform:translateY(-2px);box-shadow:0 4px 16px rgba(13,114,114,.12)}
.week-card.current{border-color:#f09200;background:linear-gradient(135deg,#fffbf0,#fff)}
.week-card.empty{border-style:dashed;cursor:default;background:#f8fefe}
.week-card.empty:hover{transform:none;box-shadow:none}
.wk-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:#7a9898;margin-bottom:5px}
.wk-range{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#0a4848;margin-bottom:8px;line-height:1.2}
.wk-meals{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px}
.wk-meal-chip{font-size:11px;padding:3px 9px;background:#f0fafa;border-radius:100px;color:#0d7272;font-weight:500;border:1px solid #c8e4e4}
.wk-meta{font-size:12px;color:#7a9898}
.wk-badge{position:absolute;top:14px;right:14px;font-size:10px;font-weight:700;padding:3px 9px;border-radius:100px;text-transform:uppercase;letter-spacing:.5px}
.wk-badge.now{background:#f09200;color:#fff}
.wk-badge.done{background:#e0f4f4;color:#0d7272}
.wk-actions{display:flex;gap:7px;margin-top:10px;flex-wrap:wrap}
.empty-week-text{font-size:13px;color:#9abcbc;text-align:center;padding:8px 0}
.force-update-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:16px 20px;background:#f0fafa;border-radius:12px;border:1px solid #c8e4e4;margin-bottom:24px}
.fu-left{font-size:13px;color:#4a7070}
.fu-ver{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#0a4848}
.fu-hint{font-size:11px;color:#7a9898;margin-top:2px}
.btn-fu{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:100px;border:1.5px solid #0d7272;background:#fff;color:#0d7272;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.btn-fu:hover{background:#0d7272;color:#fff}
.spinning{animation:spin360 .7s linear infinite}
@keyframes spin360{to{transform:rotate(360deg)}}

/* ── MEAL PLAN ── */
.meal-grid{display:grid;grid-template-columns:106px repeat(7,1fr);gap:5px}
.g-hdr{font-size:11px;font-weight:600;color:#4a7070;text-align:center;padding:6px 2px;text-transform:uppercase;letter-spacing:.5px}
.g-lbl{font-size:12px;font-weight:600;color:#0a4848;display:flex;align-items:center;padding:4px 5px;line-height:1.3}
.m-cell{background:#fff;border-radius:10px;padding:9px 8px;border:1.5px solid #c8e4e4;position:relative;min-height:108px;display:flex;flex-direction:column;transition:border-color .18s}
.m-cell:hover{border-color:#6abcbc}
.m-cell.sshop{border-color:#0d7272;background:#f0fafa}
.m-name{font-size:12px;font-weight:600;color:#0a4848;line-height:1.3;margin-bottom:3px;cursor:pointer}
.m-name:hover{color:#0d7272;text-decoration:underline}
.m-desc{font-size:11px;color:#4a7070;line-height:1.4;flex:1}
.m-meta{display:flex;align-items:center;justify-content:space-between;margin-top:5px}
.m-time{font-size:10px;color:#7a9898}
.m-cost{font-size:10px;font-weight:600;color:#0a7070;background:#e8f8f8;padding:2px 6px;border-radius:4px}
.m-actions{display:flex;gap:2px;margin-top:5px}
.ibtn{background:none;border:none;cursor:pointer;padding:3px 4px;border-radius:5px;font-size:13px;transition:background .14s;line-height:1}
.ibtn:hover{background:#e0f4f4}
.chk-badge{position:absolute;top:6px;left:6px;width:15px;height:15px;background:#0d7272;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff}
.fav-dot{position:absolute;top:5px;right:5px;font-size:10px}

/* ── SHOPPING ── */
.shop-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #e0f0f0}
.shop-row:last-child{border:none}
.shop-chk{width:16px;height:16px;accent-color:#0d7272;cursor:pointer;flex-shrink:0}
.shop-item{font-size:14px;color:#1a3a3a}
.shop-item.done{text-decoration:line-through;color:#bbb}
.cat-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#0a4848;margin-bottom:9px}

/* ── GENERATING ── */
.load-scr{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:58vh;gap:24px;text-align:center}
.dice-anim{animation:diceRoll .7s ease-in-out infinite alternate;display:inline-block}
@keyframes diceRoll{from{transform:rotate(-12deg) scale(.95)}to{transform:rotate(12deg) scale(1.05)}}
.load-msg{font-family:'Cormorant Garamond',serif;font-size:22px;color:#0a4848;font-style:italic;max-width:320px}
.load-sub{font-size:13px;color:#7a9898}

/* ── MODALS ── */
.modal-ov{position:fixed;inset:0;background:rgba(10,40,40,.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:22px;backdrop-filter:blur(4px)}
.modal{background:#fff;border-radius:20px;padding:26px;max-width:450px;width:100%}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#0a4848;margin-bottom:3px}
.modal-sub{font-size:13px;color:#4a7070;margin-bottom:18px}
.swap-card{padding:13px;border-radius:11px;border:1.5px solid #c8e4e4;margin-bottom:8px;cursor:pointer;transition:all .17s}
.swap-card:hover{border-color:#0d7272;background:#f0fafa;transform:translateX(3px)}
.swap-name{font-weight:600;font-size:14px;color:#0a4848;margin-bottom:2px}
.swap-desc{font-size:12px;color:#4a7070}
.swap-foot{display:flex;gap:10px;margin-top:5px;font-size:11px;color:#7a9898}
.recipe-ov{position:fixed;inset:0;background:rgba(10,40,40,.6);z-index:300;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(6px)}
@media(min-width:600px){.recipe-ov{align-items:center;padding:24px}}
.recipe-modal{background:#fff;border-radius:24px 24px 0 0;max-width:560px;width:100%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column}
@media(min-width:600px){.recipe-modal{border-radius:24px;max-height:88vh}}
.recipe-photo{width:100%;height:220px;object-fit:cover;display:block}
.recipe-photo-fb{width:100%;height:220px;display:flex;align-items:center;justify-content:center;font-size:72px}
.recipe-hdr{padding:18px 22px 14px;border-bottom:1px solid #e8f4f4;flex-shrink:0}
.recipe-hdr-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:11px}
.recipe-close{background:#f0fafa;border:none;color:#4a7070;width:32px;height:32px;border-radius:50%;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;line-height:1;transition:background .14s}
.recipe-close:hover{background:#c8e4e4;color:#0a4848}
.recipe-rname{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#0a4848;line-height:1.25;flex:1}
.recipe-pills{display:flex;gap:7px;flex-wrap:wrap}
.recipe-pill{display:inline-flex;align-items:center;gap:4px;background:#f0fafa;border:1px solid #c8e4e4;border-radius:100px;padding:4px 11px;font-size:12px;font-weight:500;color:#0a4848}
.recipe-body{overflow-y:auto;padding:16px 22px 28px;flex:1}
.recipe-stitle{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#4a7070;margin:18px 0 10px}
.recipe-stitle:first-child{margin-top:0}
.recipe-ing{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #e8f4f4;font-size:14px;color:#1a3a3a}
.recipe-ing:last-child{border:none}
.recipe-ing-dot{width:7px;height:7px;border-radius:50%;background:#0d7272;flex-shrink:0}
.recipe-step{display:flex;gap:12px;margin-bottom:14px;align-items:flex-start}
.recipe-step-n{min-width:28px;height:28px;border-radius:50%;background:#f09200;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.recipe-step-t{font-size:14px;color:#1a3a3a;line-height:1.65;flex:1}
.recipe-tip{background:#f0fafa;border-left:3px solid #0d7272;padding:12px 14px;border-radius:0 10px 10px 0;font-size:13px;color:#0a4848;line-height:1.6;margin-top:4px}
.recipe-loading{display:flex;flex-direction:column;align-items:center;gap:12px;padding:32px 0;color:#4a7070;font-size:13px}
.recipe-spin{width:32px;height:32px;border:3px solid #c8e4e4;border-top-color:#0d7272;border-radius:50%;animation:rspin .8s linear infinite}
@keyframes rspin{to{transform:rotate(360deg)}}

/* ── ONBOARDING ── */
.mt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
.mt-card{padding:18px 12px;border-radius:14px;border:2px solid #b8d8d8;background:#fff;cursor:pointer;text-align:center;transition:all .2s;user-select:none}
.mt-card:hover{border-color:#0d7272}
.mt-card.sel{border-color:#0d7272;background:#f0fafa}
.mt-icon{font-size:26px;margin-bottom:7px}
.mt-lbl{font-weight:600;font-size:14px;color:#0a4848}
.mt-sub{font-size:11px;color:#4a7070;margin-top:2px}
.srv-row{display:flex;align-items:center;gap:14px;justify-content:center}
.srv-btn{width:40px;height:40px;border-radius:50%;border:2px solid #0d7272;background:#fff;font-size:20px;cursor:pointer;color:#0d7272;display:flex;align-items:center;justify-content:center;transition:all .14s}
.srv-btn:hover{background:#0d7272;color:#fff}
.srv-num{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;color:#0a4848;min-width:50px;text-align:center}
.nav-row{display:flex;gap:11px;margin-top:26px;align-items:center;flex-wrap:wrap}
.var-lbls{display:flex;justify-content:space-between;font-size:11px;color:#7a9898;margin-top:5px}
.err{background:#fff8e0;border:1px solid #f0cc70;color:#7a5200;padding:11px 14px;border-radius:10px;font-size:13px;margin-top:12px}
.fav-notice{background:#f0fafa;border-left:3px solid #3a9898;padding:10px 14px;border-radius:0 10px 10px 0;font-size:13px;color:#0a4848;margin-bottom:13px}
.hint{font-size:12px;color:#4a7070;margin-bottom:10px;line-height:1.6}
.roll-badge{display:inline-flex;align-items:center;gap:6px;background:#fff8e8;border:1px solid #f0cc80;border-radius:100px;padding:5px 12px;font-size:12px;font-weight:600;color:#a06000}
.bsum{background:#f0fafa;border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border:1px solid #c8e4e4}
.bsum-lbl{font-size:13px;color:#2a6060;font-weight:500}
.bsum-val{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#0a5858}
.bsum-over{color:#c93939}
.curr-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.curr-chip{padding:7px 14px;border-radius:8px;border:1.5px solid #b8d8d8;background:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all .16s;color:#1a3a3a}
.curr-chip:hover{border-color:#0d7272}
.curr-chip.sel{background:#0d7272;border-color:#0d7272;color:#fff}
.brow{display:flex;align-items:center;gap:12px}
.bwrap{position:relative;flex:1}
.bpfx{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-weight:600;font-size:15px;color:#4a7070;pointer-events:none}
.binp{padding-left:30px}
.perlbl{font-size:13px;color:#4a7070;white-space:nowrap;font-weight:500}
.meal-pills{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.meal-pill{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;background:#f0fafa;border:1.5px solid #b8d8d8;border-radius:100px;font-size:13px;color:#0d7272;font-weight:500;cursor:pointer;transition:all .16s}
.meal-pill:hover{border-color:#0d7272;background:#e0f4f4}
.alexa-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;background:#1a73e8;color:#fff;border-radius:100px;font-size:14px;font-weight:500;cursor:pointer;border:none;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.alexa-btn:hover{background:#1557b0}
.toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:#0a4848;color:#fff;padding:10px 24px;border-radius:100px;font-size:14px;font-weight:500;z-index:400;animation:fiu .3s ease;pointer-events:none;white-space:nowrap}
@keyframes fiu{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.sec-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}
.week-context-bar{background:#e8f4f4;border-radius:10px;padding:10px 16px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.wcb-label{font-size:13px;color:#0a4848;font-weight:600}
.wcb-range{font-size:12px;color:#4a7070}
`;

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── view state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState('landing'); // landing | welcome | cuisines | dietary | variability | budget | servings | generating | mealplan | shopping
  const [activeWeekKey, setActiveWeekKey] = useState(null); // which week we're working on
  const [allWeekKeys, setAllWeekKeys] = useState([]); // all stored week keys

  // ── prefs ───────────────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS });

  // ── plan data ───────────────────────────────────────────────────────────────
  const [mealPlan, setMealPlan]     = useState(null);
  const [planCosts, setPlanCosts]   = useState({});
  const [shoppingList, setShoppingList] = useState(null);
  const [shopSel, setShopSel]       = useState(new Set());
  const [checked, setChecked]       = useState(new Set());

  // ── ui state ────────────────────────────────────────────────────────────────
  const [favorites, setFavorites]   = useState([]);
  const [recipe, setRecipe]         = useState(null);
  const [swapping, setSwapping]     = useState(null);
  const [swapOpts, setSwapOpts]     = useState([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [loadMsg, setLoadMsg]       = useState('');
  const [err, setErr]               = useState('');
  const [toastMsg, setToastMsg]     = useState('');
  const [showToast, setShowToast]   = useState(false);
  const [updating, setUpdating]     = useState(false);

  const sym = CURRENCY_SYMBOLS[prefs.currency] || '€';
  const budget = parseFloat(prefs.weeklyBudget) || 0;
  const totalCost = Object.values(planCosts).reduce((s,v) => s+(v||0), 0);
  const overBudget = prefs.budgetEnabled && budget > 0 && totalCost > budget;

  // ── boot ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    try { const s = localStorage.getItem(FAVS_KEY); if (s) setFavorites(JSON.parse(s)); } catch {}
    refreshWeekKeys();
  }, []);

  function refreshWeekKeys() {
    setAllWeekKeys(getAllWeekKeys());
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  const sp = (k,v) => setPrefs(p => ({ ...p, [k]: v }));
  const toast = msg => { setToastMsg(msg); setShowToast(true); setTimeout(() => setShowToast(false), 3000); };
  const saveFavs = f => { try { localStorage.setItem(FAVS_KEY, JSON.stringify(f)); } catch {} };
  const toggleFav = name => { const n = favorites.includes(name) ? favorites.filter(x=>x!==name) : [...favorites,name]; setFavorites(n); saveFavs(n); };
  const addFavMeal = () => { if (!prefs.favInput.trim()) return; sp('favoriteMeals', [...prefs.favoriteMeals, prefs.favInput.trim()]); sp('favInput',''); };
  const setScope = s => { const t=s==='dinner'?['dinner']:s==='all'?['breakfast','lunch','dinner']:prefs.mealTypes; setPrefs(p=>({...p,mealScope:s,mealTypes:t})); };
  const toggleType = t => { const n=prefs.mealTypes.includes(t)?prefs.mealTypes.filter(x=>x!==t):[...prefs.mealTypes,t]; if(n.length) sp('mealTypes',n); };

  // ── save current plan ───────────────────────────────────────────────────────
  function persistCurrentPlan(plan, costs, shopList) {
    if (!activeWeekKey || !plan) return;
    saveWeekData(activeWeekKey, {
      mealPlan: plan,
      planCosts: costs || planCosts,
      prefs,
      shoppingList: shopList || shoppingList,
    });
    refreshWeekKeys();
  }

  // ── open a stored week ──────────────────────────────────────────────────────
  function openStoredWeek(key) {
    const data = loadWeekData(key);
    if (!data) return;
    setActiveWeekKey(key);
    setMealPlan(data.mealPlan);
    setPlanCosts(data.planCosts || {});
    if (data.prefs) setPrefs({ ...DEFAULT_PREFS, ...data.prefs });
    setShoppingList(data.shoppingList || null);
    setShopSel(new Set());
    setChecked(new Set());
    setErr('');
    setStep('mealplan');
  }

  // ── start new roll for a week ───────────────────────────────────────────────
  function startNewRoll(key) {
    setActiveWeekKey(key);
    setMealPlan(null);
    setPlanCosts({});
    setShoppingList(null);
    setShopSel(new Set());
    setChecked(new Set());
    setErr('');
    setStep('welcome');
  }

  // ── force update ─────────────────────────────────────────────────────────────
  function forceUpdate() {
    setUpdating(true);
    // Clear only app cache (not week data / favs)
    try {
      if ('caches' in window) {
        caches.keys().then(names => names.forEach(n => caches.delete(n)));
      }
    } catch {}
    setTimeout(() => { window.location.reload(true); }, 800);
  }

  // ── generate meal plan ───────────────────────────────────────────────────────
  async function roll() {
    setStep('generating'); setErr('');
    let i=0; setLoadMsg(ROLL_MSGS[0]);
    const iv = setInterval(() => { i=(i+1)%ROLL_MSGS.length; setLoadMsg(ROLL_MSGS[i]); }, 2500);
    try {
      const favHint = [...prefs.favoriteMeals, ...favorites.slice(0,4)].filter(Boolean).join(', ');
      const budgetNote = prefs.budgetEnabled && budget > 0 ? `Budget: ${sym}${budget}/week, ≈${sym}${(budget/(7*prefs.mealTypes.length)).toFixed(1)}/meal.` : '';
      const dayT = `{"${prefs.mealTypes.join('":MEAL,"')}":MEAL}`.replace(/MEAL/g, `{"name":"string","description":"8-word description","time":"X min","estCost":0.00,"ingredients":["qty unit item"]}`);
      const prompt = `Generate a 7-day meal plan. Return ONLY compact JSON.
Meal types:${prefs.mealTypes.join(',')} | Cuisines:${prefs.cuisines.length?prefs.cuisines.join(','):'varied'} | Dietary:${prefs.dietary.length?prefs.dietary.join(','):'none'} | Adventure:${prefs.variability}/100 | Servings:${prefs.servings} | Favourites:${favHint||'none'} | ${budgetNote}
estCost=grocery cost in ${prefs.currency} for ${prefs.servings} servings.
Return:{"monday":${dayT},"tuesday":${dayT},"wednesday":${dayT},"thursday":${dayT},"friday":${dayT},"saturday":${dayT},"sunday":${dayT}}`;
      const raw = await callDishRoll(prompt, 4000);
      const plan = JSON.parse(raw);
      const costs = {};
      DAYS.forEach(d => prefs.mealTypes.forEach(t => { const m=plan[d.toLowerCase()]?.[t]; if(m?.estCost) costs[`${d.toLowerCase()}-${t}`]=m.estCost; }));
      clearInterval(iv);
      setMealPlan(plan); setPlanCosts(costs);
      persistCurrentPlan(plan, costs, null);
      setStep('mealplan');
    } catch(e) {
      clearInterval(iv);
      setErr('Could not roll your plan: ' + e.message + '. Please try again.');
      setStep('servings');
    }
  }

  // ── swap ─────────────────────────────────────────────────────────────────────
  async function openSwap(day, mealType) {
    const cur = mealPlan?.[day.toLowerCase()]?.[mealType]; if (!cur) return;
    setSwapping({day,mealType}); setSwapLoading(true); setSwapOpts([]);
    try {
      const raw = await callDishRoll(`Suggest 3 alternative ${mealType} recipes to replace "${cur.name}". Cuisines:${prefs.cuisines.join(',')||'any'}. Dietary:${prefs.dietary.join(',')||'none'}. Adventure:${prefs.variability}/100. Servings:${prefs.servings}.
Return ONLY JSON array:[{"name":"...","description":"8-word max","time":"X min","estCost":0.00,"ingredients":["qty unit item"]},...]`, 1200);
      setSwapOpts(JSON.parse(raw));
    } catch { setSwapOpts([]); }
    setSwapLoading(false);
  }

  function applySwap(opt) {
    const key=`${swapping.day.toLowerCase()}-${swapping.mealType}`;
    const newCosts = {...planCosts,[key]:opt.estCost||0};
    const newPlan = {...mealPlan,[swapping.day.toLowerCase()]:{...mealPlan[swapping.day.toLowerCase()],[swapping.mealType]:opt}};
    setPlanCosts(newCosts); setMealPlan(newPlan);
    persistCurrentPlan(newPlan, newCosts, shoppingList);
    setSwapping(null); setSwapOpts([]);
  }

  // ── shopping ──────────────────────────────────────────────────────────────────
  const toggleShop = key => setShopSel(p => { const n=new Set(p); n.has(key)?n.delete(key):n.add(key); return n; });
  const selectAll = () => { const s=new Set(); DAYS.forEach(d=>prefs.mealTypes.forEach(t=>{if(mealPlan?.[d.toLowerCase()]?.[t]) s.add(`${d.toLowerCase()}-${t}`);})); setShopSel(s); };

  async function buildList() {
    if (!shopSel.size) return; setLoading(true); setLoadMsg('Assembling your shopping list…');
    try {
      const sel = []; DAYS.forEach(d=>prefs.mealTypes.forEach(t=>{if(shopSel.has(`${d.toLowerCase()}-${t}`)){const m=mealPlan?.[d.toLowerCase()]?.[t];if(m) sel.push({meal:m.name,servings:prefs.servings,ingredients:m.ingredients});}}));
      const raw = await callDishRoll(`Combine into an organised grocery list for ${prefs.servings} people. Merge similar items. Group by aisle.
Meals:${JSON.stringify(sel)}
Return ONLY JSON:{"categories":[{"name":"Produce","items":["2 onions"]},{"name":"Proteins","items":["600g chicken"]},{"name":"Pantry","items":["400g tomatoes"]}]}
Use:Produce,Proteins,Dairy,Grains,Pantry,Condiments,Frozen,Bakery,Beverages,Other.`, 2000);
      const list = JSON.parse(raw);
      setShoppingList(list);
      persistCurrentPlan(mealPlan, planCosts, list);
      setStep('shopping');
    } catch { setErr('Could not build shopping list. Please try again.'); }
    setLoading(false);
  }

  const copyAlexa = () => { navigator.clipboard.writeText(shoppingList.categories.flatMap(c=>c.items).join('\n')); toast('✓ Copied — paste into your Alexa app'); };
  const copyAll   = () => { navigator.clipboard.writeText(shoppingList.categories.map(c=>`${c.name}:\n${c.items.map(i=>`• ${i}`).join('\n')}`).join('\n\n')); toast('✓ Shopping list copied'); };

  // ── recipe ────────────────────────────────────────────────────────────────────
  async function openRecipe(meal, mealType) {
    setRecipe({ meal, mealType, steps:[], tip:'', imgOk:true, loading:true });
    try {
      const raw = await callDishRoll(
        `Provide a detailed recipe for "${meal.name}" for ${prefs.servings} servings.
Return ONLY JSON: {"steps":["Full step 1 instruction","Full step 2 instruction","Full step 3 instruction"],"tip":"one helpful chef tip"}`, 1200);
      const data = JSON.parse(raw);
      setRecipe(prev => prev ? {...prev, steps:data.steps||[], tip:data.tip||'', loading:false} : null);
    } catch {
      setRecipe(prev => prev ? {...prev, steps:['Could not load recipe steps. Please try again.'], loading:false} : null);
    }
  }

  // ── LANDING PAGE ──────────────────────────────────────────────────────────────
  function Landing() {
    const cwKey = currentWeekKey();
    const cwData = loadWeekData(cwKey);
    const cwLabel = weekLabel(cwKey);
    const storedKeys = getAllWeekKeys();
    // build calendar: past 6 weeks + current + next 2
    const calKeys = weeksAround(cwKey, 6);
    const [confirmDelete, setConfirmDelete] = useState(null);

    function mealSample(data) {
      if (!data?.mealPlan) return [];
      const names = [];
      DAYS.slice(0,3).forEach(d => {
        const day = data.mealPlan[d.toLowerCase()];
        if (day) {
          const first = Object.values(day)[0];
          if (first?.name) names.push(first.name);
        }
      });
      return names;
    }

    function handleDelete(key) {
      deleteWeekData(key);
      refreshWeekKeys();
      setConfirmDelete(null);
      toast('Week deleted');
    }

    return (
      <div>
        {/* Hero */}
        <div className="landing-hero">
          <img src="/logo.png" alt="DishRoll" className="landing-logo"/>
          <div className="landing-title">Your weekly<br/><span style={{color:'#f09200',fontStyle:'italic'}}>meal command centre</span></div>
          <p className="landing-sub">Plan every week, store every roll, and always know what's for dinner.</p>
        </div>

        {/* Version + force update */}
        <div className="force-update-row">
          <div className="fu-left">
            <div className="fu-ver">v{APP_VERSION}</div>
            <div className="fu-hint">DishRoll · {new Date().getFullYear()}</div>
          </div>
          <button className="btn-fu" onClick={forceUpdate} disabled={updating}>
            <span className={updating ? 'spinning' : ''} style={{display:'inline-block'}}>↻</span>
            {updating ? 'Updating…' : 'Force update'}
          </button>
        </div>

        {/* Current week hero card */}
        <div className="cw-card">
          <div className="cw-left">
            <div className="cw-tag">📅 This week</div>
            <div className="cw-week">{cwLabel}</div>
            <div className="cw-status">
              {cwData ? `✓ ${getAllWeekKeys().filter(k=>k===cwKey).length > 0 ? 'Rolled' : 'Saved'} · tap to open or roll again` : '🎲 Not rolled yet — start now!'}
            </div>
          </div>
          <div className="cw-actions">
            {cwData && (
              <button className="btn-white" onClick={() => openStoredWeek(cwKey)}>
                📖 Open this week
              </button>
            )}
            <button className={cwData ? 'btn-outline-white' : 'btn-white'} onClick={() => startNewRoll(cwKey)}>
              🎲 {cwData ? 'Re-roll' : 'Roll this week'}
            </button>
          </div>
        </div>

        {/* Calendar */}
        <div className="cal-section-title">🗓️ Week calendar</div>
        <div className="week-grid">
          {calKeys.map(key => {
            const data   = loadWeekData(key);
            const isCur  = isCurrentWeek(key);
            const isFut  = isFutureWeek(key);
            const sample = mealSample(data);
            return (
              <div key={key} className={`week-card ${isCur?'current':''} ${!data&&!isFut?'empty':''}`}>
                {isCur && <span className="wk-badge now">This week</span>}
                {!isCur && data && <span className="wk-badge done">Saved</span>}
                <div className="wk-label">{isFut ? 'Upcoming' : isCur ? 'Current' : 'Past'}</div>
                <div className="wk-range">{weekLabel(key)}</div>
                {data && sample.length > 0 && (
                  <div className="wk-meals">
                    {sample.map((n,i) => <span key={i} className="wk-meal-chip">{n}</span>)}
                    {Object.keys(data.mealPlan || {}).length > 3 && <span className="wk-meal-chip">+more</span>}
                  </div>
                )}
                {!data && (
                  <div className="empty-week-text">{isFut ? 'Plan ahead →' : 'No roll yet'}</div>
                )}
                {data && <div className="wk-meta">Saved {new Date(data.savedAt).toLocaleDateString('en-IE',{day:'numeric',month:'short'})}</div>}
                <div className="wk-actions">
                  {data && <button className="btn btn-p btn-sm" onClick={() => openStoredWeek(key)}>📖 Open</button>}
                  <button className="btn btn-g btn-sm" onClick={() => startNewRoll(key)}>🎲 {data?'Re-roll':'Roll'}</button>
                  {data && confirmDelete !== key && <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(key)}>🗑️</button>}
                  {data && confirmDelete === key && (
                    <>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(key)}>Confirm delete</button>
                      <button className="btn btn-g btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* All stored weeks if any outside the calendar window */}
        {storedKeys.filter(k => !calKeys.includes(k)).length > 0 && (
          <>
            <div className="cal-section-title" style={{marginTop:8}}>📦 Older rolls</div>
            <div className="week-grid">
              {storedKeys.filter(k => !calKeys.includes(k)).map(key => {
                const data = loadWeekData(key);
                const sample = mealSample(data);
                return (
                  <div key={key} className="week-card">
                    <span className="wk-badge done">Saved</span>
                    <div className="wk-label">Past</div>
                    <div className="wk-range">{weekLabel(key)}</div>
                    {sample.length > 0 && <div className="wk-meals">{sample.map((n,i)=><span key={i} className="wk-meal-chip">{n}</span>)}</div>}
                    <div className="wk-actions">
                      <button className="btn btn-p btn-sm" onClick={() => openStoredWeek(key)}>📖 Open</button>
                      <button className="btn btn-g btn-sm" onClick={() => startNewRoll(key)}>🎲 Re-roll</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── RECIPE MODAL ──────────────────────────────────────────────────────────────
  function RecipeModal() {
    if (!recipe) return null;
    const { meal, mealType, steps, tip, imgOk, loading: rLoading } = recipe;
    const mlLabel = { breakfast:'Breakfast', lunch:'Lunch', dinner:'Dinner' };
    const photoUrl = 'https://source.unsplash.com/640x360/?' + encodeURIComponent(meal.name.split(' ').slice(0,3).join(',') + ',food,cooking');
    return (
      <div className="recipe-ov" onClick={() => setRecipe(null)}>
        <div className="recipe-modal" onClick={e => e.stopPropagation()}>
          {imgOk
            ? <img src={photoUrl} alt={meal.name} className="recipe-photo" onError={() => setRecipe(p => p ? {...p,imgOk:false} : null)} />
            : <div className="recipe-photo-fb" style={{background:getDishGradient(meal.name)}}>🍽️</div>
          }
          <div className="recipe-hdr">
            <div className="recipe-hdr-top">
              <div className="recipe-rname">{meal.name}</div>
              <button className="recipe-close" onClick={() => setRecipe(null)}>×</button>
            </div>
            <div className="recipe-pills">
              {meal.time && <span className="recipe-pill">⏱ {meal.time}</span>}
              <span className="recipe-pill">👥 {prefs.servings} serving{prefs.servings>1?'s':''}</span>
              {mealType && <span className="recipe-pill">🍽️ {mlLabel[mealType]||mealType}</span>}
              {prefs.budgetEnabled && meal.estCost && <span className="recipe-pill">💰 {sym}{meal.estCost}</span>}
            </div>
          </div>
          <div className="recipe-body">
            <div className="recipe-stitle">Ingredients — {prefs.servings} serving{prefs.servings>1?'s':''}</div>
            {(meal.ingredients||[]).map((ing,i) => <div key={i} className="recipe-ing"><div className="recipe-ing-dot"/>{ing}</div>)}
            <div className="recipe-stitle">How to cook</div>
            {rLoading
              ? <div className="recipe-loading"><div className="recipe-spin"/><span>Fetching recipe steps…</span></div>
              : <div>
                  {steps.map((s,i) => <div key={i} className="recipe-step"><div className="recipe-step-n">{i+1}</div><div className="recipe-step-t">{s}</div></div>)}
                  {tip && <div className="recipe-tip">💡 {tip}</div>}
                </div>
            }
          </div>
        </div>
      </div>
    );
  }

  // ── SWAP MODAL ────────────────────────────────────────────────────────────────
  function SwapModal() {
    if (!swapping) return null;
    const cur = mealPlan?.[swapping.day.toLowerCase()]?.[swapping.mealType];
    return (
      <div className="modal-ov" onClick={() => setSwapping(null)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-title">🎲 Re-roll {swapping.mealType}</div>
          <div className="modal-sub">{swapping.day} · Currently: <strong>{cur?.name}</strong></div>
          {swapLoading
            ? <div style={{textAlign:'center',padding:'28px 0'}}><div style={{fontSize:40,animation:'diceRoll .6s ease-in-out infinite alternate',display:'inline-block'}}>🎲</div><div style={{fontSize:13,color:'#4a7070',marginTop:12}}>Rolling alternatives…</div></div>
            : swapOpts.length===0
              ? <div style={{color:'#4a7070',fontSize:14,padding:'14px 0'}}>No alternatives found — try again.</div>
              : swapOpts.map((o,i) => (
                  <div key={i} className="swap-card" onClick={() => applySwap(o)}>
                    <div className="swap-name">{o.name}</div>
                    <div className="swap-desc">{o.description}</div>
                    <div className="swap-foot"><span>⏱ {o.time}</span>{prefs.budgetEnabled&&o.estCost!=null&&<span>💰 {sym}{o.estCost}</span>}</div>
                  </div>
                ))
          }
          <button className="btn btn-g btn-sm" style={{marginTop:10}} onClick={() => setSwapping(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  // ── PROGRESS (onboarding steps) ───────────────────────────────────────────────
  const prog = Math.round(((STEPS_IDX[step]||1) / 9) * 100);

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{FONTS+CSS}</style>
      <div className="app">

        {/* Header */}
        <div className="header">
          <div className="logo"><img src="/logo.png" alt="DishRoll" onClick={() => setStep('landing')}/></div>
          <div className="hdr-right">
            {step !== 'landing' && step !== 'generating' && (
              <span className="version-badge">v{APP_VERSION}</span>
            )}
            {step === 'landing' && (
              <span className="version-badge">v{APP_VERSION}</span>
            )}
            {step !== 'landing' && step !== 'generating' && (
              <button className="btn btn-g btn-sm" style={{fontSize:12}} onClick={() => setStep('landing')}>← Home</button>
            )}
          </div>
        </div>

        {/* Progress bar (onboarding only) */}
        {!['landing','generating','mealplan','shopping'].includes(step) && (
          <div className="prog-bar"><div className="prog-fill" style={{width:`${prog}%`}}/></div>
        )}

        <div className="main">

          {/* ── LANDING ── */}
          {step === 'landing' && <Landing />}

          {/* ── WEEK CONTEXT BAR (shown when editing a specific week) ── */}
          {activeWeekKey && ['mealplan','shopping'].includes(step) && (
            <div className="week-context-bar">
              <div>
                <div className="wcb-label">{isCurrentWeek(activeWeekKey) ? '📅 This week' : `📅 Week of ${weekLabel(activeWeekKey)}`}</div>
                <div className="wcb-range">{isCurrentWeek(activeWeekKey) ? 'Current week' : isFutureWeek(activeWeekKey) ? 'Future week' : 'Past week'} · Auto-saved</div>
              </div>
              <button className="btn btn-g btn-sm" onClick={() => setStep('landing')}>← Back to calendar</button>
            </div>
          )}

          {/* ── WELCOME ── */}
          {step === 'welcome' && (
            <div>
              <div style={{textAlign:'center',paddingTop:20,marginBottom:32}}>
                <div className="scr-title">Roll your week.<br/><span style={{color:'#f09200',fontStyle:'italic'}}>Eat well.</span></div>
                {activeWeekKey && <p style={{fontSize:14,color:'#4a7070',marginTop:8}}>📅 Rolling for {weekLabel(activeWeekKey)}</p>}
                <p className="scr-sub" style={{maxWidth:440,margin:'12px auto 8px'}}>Tell DishRoll your tastes, budget, and adventure level — and we'll roll a perfect week of meals.</p>
                <div className="roll-badge" style={{margin:'0 auto'}}>🎲 AI-powered random meal generation</div>
              </div>
              <div className="card">
                <div className="lbl">What would you like to roll?</div>
                <div className="mt-grid">
                  {[{id:'dinner',icon:'🌙',label:'Dinner Only',sub:'Evening meals'},{id:'all',icon:'☀️',label:'All Meals',sub:'Breakfast, lunch & dinner'},{id:'custom',icon:'✏️',label:'Custom',sub:'Choose what you need'}].map(o=>(
                    <div key={o.id} className={`mt-card ${prefs.mealScope===o.id?'sel':''}`} onClick={() => setScope(o.id)}>
                      <div className="mt-icon">{o.icon}</div><div className="mt-lbl">{o.label}</div><div className="mt-sub">{o.sub}</div>
                    </div>
                  ))}
                </div>
                {prefs.mealScope==='custom' && (
                  <div style={{marginTop:16}}>
                    <div className="lbl">Choose meal types</div>
                    <div className="chip-grid">{['breakfast','lunch','dinner'].map(t=><div key={t} className={`chip ${prefs.mealTypes.includes(t)?'sel':''}`} onClick={()=>toggleType(t)} style={{textTransform:'capitalize'}}>{ML[t]}</div>)}</div>
                  </div>
                )}
              </div>
              {favorites.length>0 && <div className="fav-notice">⭐ {favorites.length} saved favourite{favorites.length>1?'s':''} — we'll roll them in where they fit.</div>}
              <div className="nav-row">
                <button className="btn btn-g" onClick={() => setStep('landing')}>← Back</button>
                <button className="btn btn-p" onClick={() => setStep('cuisines')}>Let's roll →</button>
              </div>
            </div>
          )}

          {/* ── CUISINES ── */}
          {step === 'cuisines' && (
            <div>
              <div className="scr-title">Cuisine<br/><span style={{color:'#f09200',fontStyle:'italic'}}>preferences</span></div>
              <p className="scr-sub">Choose cuisines to roll from. Leave blank for maximum variety.</p>
              <div className="card">
                <div className="lbl">Select your favourites</div>
                <div className="chip-grid">{CUISINE_OPTIONS.map(c=><div key={c} className={`chip ${prefs.cuisines.includes(c)?'sel':''}`} onClick={()=>{const n=prefs.cuisines.includes(c)?prefs.cuisines.filter(x=>x!==c):[...prefs.cuisines,c];sp('cuisines',n);}}>{c}</div>)}</div>
              </div>
              <div className="nav-row"><button className="btn btn-g" onClick={() => setStep('welcome')}>← Back</button><button className="btn btn-p" onClick={() => setStep('dietary')}>Continue →</button></div>
            </div>
          )}

          {/* ── DIETARY ── */}
          {step === 'dietary' && (
            <div>
              <div className="scr-title">Dietary<br/><span style={{color:'#f09200',fontStyle:'italic'}}>requirements</span></div>
              <p className="scr-sub">Any restrictions we should keep out of the roll?</p>
              <div className="card">
                <div className="lbl">Select all that apply</div>
                <div className="chip-grid">{DIETARY_OPTIONS.map(d=><div key={d} className={`chip ${prefs.dietary.includes(d)?'asel':''}`} onClick={()=>{const n=prefs.dietary.includes(d)?prefs.dietary.filter(x=>x!==d):[...prefs.dietary,d];sp('dietary',n);}}>{d}</div>)}</div>
              </div>
              <div className="nav-row"><button className="btn btn-g" onClick={() => setStep('cuisines')}>← Back</button><button className="btn btn-p" onClick={() => setStep('variability')}>Continue →</button></div>
            </div>
          )}

          {/* ── VARIABILITY — inlined (has input, must not be sub-component) ── */}
          {step === 'variability' && (
            <div>
              <div className="scr-title">How wild<br/><span style={{color:'#f09200',fontStyle:'italic'}}>should we roll?</span></div>
              <p className="scr-sub">Set your adventure level and lock in any all-time favourite dishes.</p>
              <div className="card">
                <div className="lbl">Adventure level</div>
                <input type="range" min={0} max={100} value={prefs.variability} onChange={e=>sp('variability',+e.target.value)} className="slider"/>
                <div className="var-lbls">
                  <span>🏠 Classics</span>
                  <span style={{fontWeight:600,color:'#f09200'}}>{prefs.variability<33?'Safe & familiar':prefs.variability<66?'Balanced mix':'Wild & adventurous 🎲'}</span>
                  <span>🌏 Surprises</span>
                </div>
              </div>
              <div className="card">
                <div className="lbl">Lock in favourites (optional)</div>
                <p className="hint">Name dishes you love — we'll make sure they land in the roll.</p>
                <div style={{display:'flex',gap:9,marginBottom:11}}>
                  <input className="inp" placeholder="e.g. Chicken tikka masala, carbonara…" value={prefs.favInput} onChange={e=>sp('favInput',e.target.value)} onKeyDown={e=>e.key==='Enter'&&addFavMeal()} style={{flex:1}}/>
                  <button className="btn btn-g btn-sm" onClick={addFavMeal}>Add</button>
                </div>
                <div className="chip-grid">{prefs.favoriteMeals.map((m,i)=><div key={i} className="tag">{m}<button onClick={()=>sp('favoriteMeals',prefs.favoriteMeals.filter((_,j)=>j!==i))}>×</button></div>)}</div>
              </div>
              <div className="nav-row"><button className="btn btn-g" onClick={() => setStep('dietary')}>← Back</button><button className="btn btn-p" onClick={() => setStep('budget')}>Continue →</button></div>
            </div>
          )}

          {/* ── BUDGET — inlined (has input, must not be sub-component) ── */}
          {step === 'budget' && (
            <div>
              <div className="scr-title">Weekly<br/><span style={{color:'#f09200',fontStyle:'italic'}}>food budget</span></div>
              <p className="scr-sub">Set a grocery budget and we'll roll meals within range. Optional.</p>
              <div className="card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <div className="lbl" style={{margin:0}}>Enable budget planning</div>
                  <div style={{display:'flex',gap:10}}>
                    {[{v:true,l:'Yes'},{v:false,l:'Skip'}].map(o=><div key={String(o.v)} className={`chip ${prefs.budgetEnabled===o.v?'sel':''}`} onClick={()=>sp('budgetEnabled',o.v)}>{o.l}</div>)}
                  </div>
                </div>
                {prefs.budgetEnabled ? (
                  <>
                    <div className="lbl">Currency</div>
                    <div className="curr-row">{Object.entries(CURRENCY_SYMBOLS).map(([c,s])=><div key={c} className={`curr-chip ${prefs.currency===c?'sel':''}`} onClick={()=>sp('currency',c)}>{s} {c}</div>)}</div>
                    <div className="lbl">Weekly grocery budget</div>
                    <div className="brow">
                      <div className="bwrap"><span className="bpfx">{sym}</span><input className="inp binp" type="number" min="0" placeholder="e.g. 120" value={prefs.weeklyBudget} onChange={e=>sp('weeklyBudget',e.target.value)}/></div>
                      <span className="perlbl">per week · {prefs.servings} person{prefs.servings>1?'s':''}</span>
                    </div>
                    {prefs.weeklyBudget&&<p style={{fontSize:12,color:'#4a8888',marginTop:8}}>≈ {sym}{(parseFloat(prefs.weeklyBudget)/(7*prefs.mealTypes.length)).toFixed(1)} per meal</p>}
                  </>
                ) : <p style={{fontSize:13,color:'#7a9898',fontStyle:'italic'}}>No budget — rolling purely on taste.</p>}
              </div>
              <div className="nav-row"><button className="btn btn-g" onClick={() => setStep('variability')}>← Back</button><button className="btn btn-p" onClick={() => setStep('servings')}>Continue →</button></div>
            </div>
          )}

          {/* ── SERVINGS ── */}
          {step === 'servings' && (
            <div>
              <div className="scr-title">How many are<br/><span style={{color:'#f09200',fontStyle:'italic'}}>you rolling for?</span></div>
              <p className="scr-sub">We'll scale all ingredients and portions accordingly.</p>
              <div className="card" style={{textAlign:'center',padding:'44px 28px'}}>
                <div className="srv-row" style={{marginBottom:10}}>
                  <button className="srv-btn" onClick={()=>prefs.servings>1&&sp('servings',prefs.servings-1)}>−</button>
                  <div className="srv-num">{prefs.servings}</div>
                  <button className="srv-btn" onClick={()=>prefs.servings<10&&sp('servings',prefs.servings+1)}>+</button>
                </div>
                <div style={{fontSize:14,color:'#4a7070'}}>{prefs.servings===1?'Just me':prefs.servings<=2?'A couple':prefs.servings<=4?'Small family':'Larger group'}</div>
              </div>
              {err && <div className="err">⚠️ {err}</div>}
              <div className="nav-row"><button className="btn btn-g" onClick={() => setStep('budget')}>← Back</button><button className="btn btn-roll" onClick={roll}>🎲 Roll my week</button></div>
            </div>
          )}

          {/* ── GENERATING ── */}
          {step === 'generating' && (
            <div className="load-scr">
              <div className="dice-anim"><img src="/logo.png" alt="DishRoll" style={{width:100,height:'auto'}}/></div>
              <div className="load-msg">{loadMsg}</div>
              <p className="load-sub">Usually takes around 5–10 seconds…</p>
            </div>
          )}

          {/* ── MEAL PLAN ── */}
          {step === 'mealplan' && mealPlan && (
            <div>
              <div className="sec-hdr">
                <div>
                  <div className="scr-title" style={{fontSize:28,marginBottom:4}}>Your roll<br/><span style={{color:'#f09200',fontStyle:'italic'}}>is in.</span></div>
                  <p style={{fontSize:12,color:'#4a7070',lineHeight:1.7}}>Click meal name or 📖 for recipe · ☆ to favourite · 🎲 to re-roll · click cell to add to shop</p>
                </div>
                <button className="btn btn-g btn-sm" onClick={() => { startNewRoll(activeWeekKey||currentWeekKey()); }}>🎲 Full re-roll</button>
              </div>

              {prefs.budgetEnabled && Object.keys(planCosts).length > 0 && (
                <div className="bsum">
                  <div><div className="bsum-lbl">Estimated weekly grocery cost</div><div style={{fontSize:12,color:'#4a8080'}}>{prefs.servings} serving{prefs.servings>1?'s':''}</div></div>
                  <div><div className={`bsum-val ${overBudget?'bsum-over':''}`}>{sym}{totalCost.toFixed(0)}</div>{budget>0&&<div style={{fontSize:12,color:overBudget?'#c93939':'#4a8888',textAlign:'right'}}>{overBudget?`${sym}${(totalCost-budget).toFixed(0)} over`:`${sym}${(budget-totalCost).toFixed(0)} under`}</div>}</div>
                </div>
              )}

              <div style={{overflowX:'auto',marginBottom:18}}>
                <div className="meal-grid" style={{minWidth:840}}>
                  <div/>{DAYS.map(d=><div key={d} className="g-hdr">{d.slice(0,3)}</div>)}
                  {prefs.mealTypes.map(mt=>(
                    <Fragment key={mt}>
                      <div className="g-lbl">{ML[mt]}</div>
                      {DAYS.map(day=>{
                        const m=mealPlan?.[day.toLowerCase()]?.[mt];
                        const key=`${day.toLowerCase()}-${mt}`;
                        const sel=shopSel.has(key); const fav=m&&favorites.includes(m.name); const cost=planCosts[key];
                        return (
                          <div key={day} className={`m-cell ${sel?'sshop':''}`} onClick={()=>m&&toggleShop(key)}>
                            {m ? (
                              <>
                                {sel&&<div className="chk-badge">✓</div>}
                                {fav&&<div className="fav-dot">⭐</div>}
                                <div className="m-name" onClick={e=>{e.stopPropagation();openRecipe(m,mt);}}>{m.name}</div>
                                <div className="m-desc">{m.description}</div>
                                <div className="m-meta">
                                  <span className="m-time">⏱ {m.time}</span>
                                  {prefs.budgetEnabled&&cost!=null&&<span className="m-cost">{sym}{cost}</span>}
                                </div>
                                <div className="m-actions" onClick={e=>e.stopPropagation()}>
                                  <button className="ibtn" onClick={()=>toggleFav(m.name)}>{fav?'⭐':'☆'}</button>
                                  <button className="ibtn" onClick={()=>openRecipe(m,mt)}>📖</button>
                                  <button className="ibtn" onClick={()=>openSwap(day,mt)}>🎲</button>
                                </div>
                              </>
                            ) : <div style={{color:'#ddd',fontSize:11,textAlign:'center',margin:'auto'}}>—</div>}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>

              <div className="card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:12}}>
                  <div><div style={{fontWeight:600,fontSize:15,color:'#0a4848',marginBottom:2}}>🛒 Build your shopping list</div><div style={{fontSize:13,color:'#4a7070'}}>{shopSel.size} of {DAYS.length*prefs.mealTypes.length} meals selected</div></div>
                  <div style={{display:'flex',gap:8}}><button className="btn btn-g btn-sm" onClick={selectAll}>Select all</button><button className="btn btn-g btn-sm" onClick={()=>setShopSel(new Set())}>Clear</button></div>
                </div>
                {err && <div className="err" style={{marginBottom:10}}>⚠️ {err}</div>}
                {shoppingList && <button className="btn btn-g btn-sm" style={{marginBottom:10}} onClick={() => setStep('shopping')}>📋 View existing list</button>}
                <button className="btn btn-p" onClick={buildList} disabled={!shopSel.size||loading}>{loading?'⏳ Building…':`Build shopping list (${shopSel.size} meal${shopSel.size!==1?'s':''})`}</button>
              </div>
            </div>
          )}

          {/* ── SHOPPING ── */}
          {step === 'shopping' && shoppingList && (() => {
            const all = shoppingList.categories.flatMap(c => c.items);
            const done = all.filter(i => checked.has(i)).length;
            const selCost = Array.from(shopSel).reduce((s,k) => s+(planCosts[k]||0), 0);
            const selectedMeals = mealPlan ? DAYS.flatMap(d=>prefs.mealTypes.map(t=>{const key=`${d.toLowerCase()}-${t}`;const meal=mealPlan[d.toLowerCase()]?.[t];return shopSel.has(key)&&meal?{key,meal,mealType:t}:null;})).filter(Boolean) : [];
            return (
              <div>
                <div className="sec-hdr">
                  <div><div className="scr-title" style={{fontSize:28,marginBottom:4}}>Shopping<br/><span style={{color:'#f09200',fontStyle:'italic'}}>list</span></div><p style={{fontSize:13,color:'#4a7070'}}>{done} of {all.length} items ticked</p></div>
                  <button className="btn btn-g btn-sm" onClick={() => setStep('mealplan')}>← Back to plan</button>
                </div>

                {prefs.budgetEnabled&&selCost>0&&<div className="bsum" style={{marginBottom:16}}><div className="bsum-lbl">Estimated cost</div><div className={`bsum-val ${prefs.weeklyBudget&&selCost>budget?'bsum-over':''}`}>{sym}{selCost.toFixed(0)}</div></div>}

                {selectedMeals.length>0 && (
                  <div className="card" style={{padding:'18px 22px',marginBottom:14}}>
                    <div className="lbl">Meals in this shop — tap to view recipe</div>
                    <div className="meal-pills">{selectedMeals.map(({key,meal,mealType})=><span key={key} className="meal-pill" onClick={()=>openRecipe(meal,mealType)}>📖 {meal.name}</span>)}</div>
                  </div>
                )}

                <div style={{display:'flex',gap:9,marginBottom:20,flexWrap:'wrap'}}>
                  <button className="alexa-btn" onClick={copyAlexa}><span>🔵</span> Copy for Alexa</button>
                  <button className="btn btn-g btn-sm" onClick={copyAll}>📋 Copy all</button>
                  <button className="btn btn-g btn-sm" onClick={()=>setChecked(new Set())}>↺ Reset</button>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:13}}>
                  {shoppingList.categories.map(cat=>(
                    <div key={cat.name} className="card" style={{padding:17}}>
                      <div className="cat-title">{CAT_ICONS[cat.name]||'🛒'} {cat.name}</div>
                      {cat.items.map((item,i)=>(
                        <div key={i} className="shop-row">
                          <input type="checkbox" className="shop-chk" checked={checked.has(item)} onChange={()=>setChecked(p=>{const n=new Set(p);n.has(item)?n.delete(item):n.add(item);return n;})}/>
                          <span className={`shop-item ${checked.has(item)?'done':''}`}>{item}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div style={{marginTop:18,padding:16,background:'#f0fafa',borderRadius:13,border:'1px solid #c8e4e4'}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#0a4848',marginBottom:4}}>📱 How to add to Alexa</div>
                  <div style={{fontSize:13,color:'#3a7070',lineHeight:1.7}}>Tap <strong>"Copy for Alexa"</strong> → open the <strong>Alexa app</strong> → <strong>Lists</strong> → <strong>Shopping List</strong> → paste.</div>
                </div>
              </div>
            );
          })()}

        </div>{/* /main */}

        <RecipeModal/>
        <SwapModal/>
        {showToast && <div className="toast">{toastMsg}</div>}
      </div>
    </div>
  );
}
