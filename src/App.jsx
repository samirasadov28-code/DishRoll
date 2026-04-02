import { useState, useEffect, Fragment, useRef } from "react";

const APP_VERSION = "0.0.6";

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };
const CUISINE_OPTIONS = ['Italian','Asian','Mexican','Mediterranean','Indian','French','American','Middle Eastern','Japanese','Thai','Greek','Spanish','Moroccan','Lebanese','Vietnamese','Ukrainian','Azerbaijani'];
const DIETARY_OPTIONS = ['Vegetarian','Vegan','Gluten-Free','Dairy-Free','Keto','Paleo','Nut-Free','Low-Carb','High-Protein','Pescatarian'];
const CURRENCY_SYMBOLS = { EUR:'€', GBP:'£', USD:'$', CAD:'CA$', AUD:'A$' };
const ML = { breakfast:'🌅 Breakfast', lunch:'🕐 Lunch', dinner:'🌙 Dinner' };
const ROLL_MSGS = ['Rolling your week…','The dice are in the air…','Spinning up your menu…','Shuffling the deck…','Fate is choosing your meals…'];
const CAT_ICONS = { Produce:'🥬', Proteins:'🥩', Dairy:'🧀', Pantry:'🫙', Grains:'🌾', Spices:'🌿', Frozen:'🧊', Bakery:'🍞', Beverages:'🥛', Seafood:'🐟', Condiments:'🥫', Canned:'🥫', Meat:'🥩', Vegetables:'🥦', Fruit:'🍎', Other:'🛒', 'My additions':'✏️' };
const COMPLEXITY_OPTS = [
  { id:'simple', label:'🥗 Simple', desc:'Quick & easy, under 30 min' },
  { id:'any', label:'⚖️ Any', desc:'Mix of simple and elaborate' },
  { id:'elaborate', label:'👨‍🍳 Elaborate', desc:'Impressive multi-step dishes' },
];
const STEPS_IDX = { welcome:1, days:2, cuisines:3, dietary:4, variability:5, budget:6, servings:7, generating:8, mealplan:9, shopping:10 };
const DEFAULT_PREFS = {
  mealScope:'dinner', mealTypes:['dinner'], selectedDays:[...DAYS],
  cuisines:[], dietary:[], variability:40, dishComplexity:'any',
  favoriteMeals:[], favInput:'', adults:2, kids:0, kidsDifferentFood:false,
  currency:'EUR', weeklyBudget:'', budgetEnabled:false,
};

// ─── PREMIUM / USAGE ──────────────────────────────────────────────────────────
const PREMIUM_KEY = 'dishroll-premium';
const USAGE_KEY   = 'dishroll-usage';
const FREE_ROLLS_PER_MONTH = 1;
const PRICE_MONTHLY = '€2.99';

function loadPremium() {
  try { return JSON.parse(localStorage.getItem(PREMIUM_KEY)||'null'); } catch { return null; }
}
function savePremium(data) {
  try { localStorage.setItem(PREMIUM_KEY, JSON.stringify(data)); } catch {}
}
function clearPremium() {
  try { localStorage.removeItem(PREMIUM_KEY); } catch {}
}
function isPremiumActive(p) {
  if(!p) return false;
  // validUntil is a Unix ms timestamp. Give a 2-day grace period.
  return p.validUntil > Date.now() - 2*24*60*60*1000;
}
function loadUsage() {
  try {
    const u = JSON.parse(localStorage.getItem(USAGE_KEY)||'null');
    const month = new Date().toISOString().slice(0,7); // "2026-04"
    if(u?.month === month) return u;
    return { month, count: 0 };
  } catch { return { month: new Date().toISOString().slice(0,7), count: 0 }; }
}
function saveUsage(u) {
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch {}
}
function incrementUsage() {
  const u = loadUsage();
  const next = { ...u, count: u.count + 1 };
  saveUsage(next); return next;
}

function getMondayOf(d) { const r=new Date(d),day=r.getDay(); r.setDate(r.getDate()+(day===0?-6:1-day)); r.setHours(0,0,0,0); return r; }
function weekKey(d) { return getMondayOf(d).toISOString().slice(0,10); }
function cwKey() { return weekKey(new Date()); }
function weekLabel(k) {
  const m=new Date(k+'T00:00:00'),s=new Date(m); s.setDate(m.getDate()+6);
  const f=d=>d.toLocaleDateString('en-IE',{weekday:'short',day:'numeric',month:'short'});
  return f(m)+' – '+f(s);
}
function isCW(k) { return k===cwKey(); }
function isFW(k) { return k>cwKey(); }
function weeksAround(ck,past) { past=past||6; const r=[],c=new Date(ck+'T00:00:00'); for(let i=-past;i<=2;i++){const d=new Date(c);d.setDate(d.getDate()+i*7);r.push(weekKey(d));} return [...new Set(r)].sort(); }

const WP='dishroll-week-', FK='dishroll-favs';
const saveWk=(k,d)=>{try{localStorage.setItem(WP+k,JSON.stringify(Object.assign({},d,{savedAt:Date.now()})));}catch{}};
const loadWk=k=>{try{const s=localStorage.getItem(WP+k);return s?JSON.parse(s):null;}catch{return null;}};
const allWkKeys=()=>{const r=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(WP))r.push(k.replace(WP,''));}return r.sort().reverse();};
const delWk=k=>{try{localStorage.removeItem(WP+k);}catch{}};

async function callAI(prompt, maxTokens) {
  maxTokens=maxTokens||4000;
  const r=await fetch('/.netlify/functions/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,maxTokens})});
  if(!r.ok) throw new Error('API error '+r.status);
  const d=await r.json(); if(d.error) throw new Error(d.error);
  const c=(d.text||'').replace(/```json|```/g,'').trim();
  const m=c.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); return m?m[1]:c;
}
async function fetchPhoto(name) {
  try {
    const q=encodeURIComponent(name.split(' ').slice(0,3).join(' '));
    const r=await fetch('/.netlify/functions/photo?q='+q);
    if(!r.ok) return null;
    return (await r.json()).photo||null;
  } catch { return null; }
}
function grad(name) {
  name=name||''; let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  const g=['linear-gradient(135deg,#0d7272,#1a9a9a)','linear-gradient(135deg,#c87800,#f09200)','linear-gradient(135deg,#2a7a4a,#3aaa6a)','linear-gradient(135deg,#6a3a8a,#9a5aba)','linear-gradient(135deg,#8a3030,#c04040)','linear-gradient(135deg,#1a5a8a,#2a7aba)'];
  return g[Math.abs(h)%g.length];
}

function mealEmoji(name='', mt='') {
  const n = name.toLowerCase();
  if (n.includes('chicken') || n.includes('poultry') || n.includes('turkey') || n.includes('duck')) return '🍗';
  if (n.includes('beef') || n.includes('steak') || n.includes('burger') || n.includes('meatball')) return '🥩';
  if (n.includes('lamb') || n.includes('mutton')) return '🍖';
  if (n.includes('pork') || n.includes('bacon') || n.includes('ham') || n.includes('sausage')) return '🥓';
  if (n.includes('salmon') || n.includes('tuna') || n.includes('cod') || n.includes('halibut')) return '🐟';
  if (n.includes('shrimp') || n.includes('prawn') || n.includes('lobster') || n.includes('crab')) return '🦐';
  if (n.includes('pasta') || n.includes('spaghetti') || n.includes('penne') || n.includes('linguine') || n.includes('carbonara') || n.includes('bolognese')) return '🍝';
  if (n.includes('pizza')) return '🍕';
  if (n.includes('soup') || n.includes('stew') || n.includes('chowder') || n.includes('borscht') || n.includes('broth')) return '🍲';
  if (n.includes('salad')) return '🥗';
  if (n.includes('curry') || n.includes('masala') || n.includes('tikka') || n.includes('korma')) return '🍛';
  if (n.includes('rice') || n.includes('risotto') || n.includes('pilaf') || n.includes('biryani') || n.includes('paella')) return '🍚';
  if (n.includes('taco') || n.includes('burrito') || n.includes('enchilada') || n.includes('quesadilla')) return '🌮';
  if (n.includes('bread') || n.includes('toast') || n.includes('sandwich') || n.includes('wrap') || n.includes('roll')) return '🥪';
  if (n.includes('egg') || n.includes('omelette') || n.includes('omelette') || n.includes('frittata')) return '🍳';
  if (n.includes('pancake') || n.includes('waffle') || n.includes('crepe')) return '🥞';
  if (n.includes('cake') || n.includes('dessert') || n.includes('pie') || n.includes('pudding')) return '🍰';
  if (n.includes('noodle') || n.includes('ramen') || n.includes('pho') || n.includes('udon')) return '🍜';
  if (n.includes('sushi') || n.includes('sashimi')) return '🍣';
  if (n.includes('dumpling') || n.includes('gyoza') || n.includes('vareniki') || n.includes('pierogi')) return '🥟';
  if (n.includes('vegetable') || n.includes('veg ') || n.includes('tofu')) return '🥦';
  if (n.includes('mushroom')) return '🍄';
  if (mt === 'breakfast') return '🥣';
  if (mt === 'lunch') return '🥙';
  return '🍽️';
}

const FONTS=`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');`;

const CSS=`
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#f4fafa;color:#1a2f2f}
.app{min-height:100vh}
.hdr{background:#0a4848;padding:11px 22px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.hdr-logo{height:40px;cursor:pointer;display:block}
.hdr-r{display:flex;align-items:center;gap:7px}
.ver{font-size:11px;color:#6abcbc;font-weight:600;background:rgba(255,255,255,.1);padding:3px 9px;border-radius:100px}
.pb{height:3px;background:#c8e4e4}
.pf{height:100%;background:linear-gradient(90deg,#0d7272,#f09200);transition:width .4s ease}
.main{max-width:900px;margin:0 auto;padding:28px 18px 80px}
.title{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;color:#0a4848;line-height:1.15;margin-bottom:7px}
.sub{font-size:14px;color:#4a7070;font-weight:300;margin-bottom:26px;line-height:1.6}
.card{background:#fff;border-radius:16px;padding:22px;margin-bottom:12px;box-shadow:0 2px 10px rgba(13,114,114,.06);border:1px solid #c8e4e4}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:7px 15px;border-radius:100px;border:1.5px solid #b8d8d8;background:#fff;font-size:13px;font-weight:500;cursor:pointer;transition:all .17s;color:#1a3a3a;font-family:'Plus Jakarta Sans',sans-serif;user-select:none}
.chip:hover{border-color:#0d7272;color:#0d7272}
.chip.s{background:#0d7272;border-color:#0d7272;color:#fff}
.chip.a{background:#f09200;border-color:#f09200;color:#fff}
.btn{display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:100px;border:none;cursor:pointer;font-size:14px;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.bp{background:#0d7272;color:#fff}
.bp:hover:not(:disabled){background:#0a5858;transform:translateY(-1px);box-shadow:0 4px 14px rgba(13,114,114,.25)}
.bg{background:transparent;color:#0d7272;border:1.5px solid #9acaca}
.bg:hover:not(:disabled){border-color:#0d7272;background:#f0fafa}
.bd{background:transparent;color:#c04040;border:1.5px solid #e8a0a0}
.bd:hover:not(:disabled){background:#fef0f0;border-color:#c04040}
.bsm{padding:6px 13px;font-size:12px}
.btn:disabled{opacity:.4;cursor:not-allowed}
.broll{background:linear-gradient(135deg,#f09200,#c87800);color:#fff;font-size:15px;padding:13px 28px}
.broll:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 18px rgba(240,146,0,.38)}
.inp{width:100%;padding:10px 13px;border-radius:10px;border:1.5px solid #b8d8d8;background:#f8fefe;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;color:#1a2f2f;outline:none;transition:border-color .2s}
.inp:focus{border-color:#0d7272}
.sl{width:100%;accent-color:#f09200;cursor:pointer}
.tag{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#e0f4f4;border-radius:100px;font-size:12px;color:#0a4848;font-weight:500}
.tag button{background:none;border:none;cursor:pointer;color:#3a9898;font-size:14px;line-height:1;padding:0 1px}
.lbl{font-size:11px;font-weight:600;color:#4a7070;text-transform:uppercase;letter-spacing:.8px;margin-bottom:9px}
.nr{display:flex;gap:9px;margin-top:22px;align-items:center;flex-wrap:wrap}
.err{background:#fff8e0;border:1px solid #f0cc70;color:#7a5200;padding:10px 13px;border-radius:10px;font-size:13px;margin-top:10px}
.fn{background:#f0fafa;border-left:3px solid #3a9898;padding:9px 13px;border-radius:0 10px 10px 0;font-size:12px;color:#0a4848;margin-bottom:11px}
.hint{font-size:12px;color:#4a7070;margin-bottom:9px;line-height:1.5}
.rb{display:inline-flex;align-items:center;gap:6px;background:#fff8e8;border:1px solid #f0cc80;border-radius:100px;padding:4px 11px;font-size:12px;font-weight:600;color:#a06000}
.vl{display:flex;justify-content:space-between;font-size:11px;color:#7a9898;margin-top:4px}

.dg{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}
.dc{padding:10px 3px;border-radius:11px;border:2px solid #b8d8d8;background:#fff;cursor:pointer;text-align:center;transition:all .18s;user-select:none}
.dc:hover{border-color:#0d7272}
.dc.s{background:#0d7272;border-color:#0d7272}
.dl{font-size:10px;color:#7a9898;margin-bottom:2px}
.dc.s .dl{color:rgba(255,255,255,.6)}
.dn{font-size:13px;font-weight:600;color:#0a4848}
.dc.s .dn{color:#fff}

.cxg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.cxc{padding:12px;border-radius:12px;border:2px solid #b8d8d8;background:#fff;cursor:pointer;text-align:center;transition:all .2s;user-select:none}
.cxc:hover{border-color:#0d7272}
.cxc.s{border-color:#0d7272;background:#f0fafa}
.cxl{font-size:13px;font-weight:600;color:#0a4848;margin-bottom:3px}
.cxd{font-size:11px;color:#4a7070;line-height:1.4}

.pg2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pc{padding:16px;border-radius:14px;border:1.5px solid #c8e4e4;background:#fff;text-align:center}
.pl{font-size:12px;font-weight:600;color:#4a7070;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.cr{display:flex;align-items:center;gap:10px;justify-content:center}
.cb{width:34px;height:34px;border-radius:50%;border:2px solid #0d7272;background:#fff;font-size:17px;cursor:pointer;color:#0d7272;display:flex;align-items:center;justify-content:center;transition:all .14s}
.cb:hover:not(:disabled){background:#0d7272;color:#fff}
.cb:disabled{opacity:.3;cursor:not-allowed}
.cn{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:600;color:#0a4848;min-width:36px;text-align:center}
.kt{display:flex;align-items:flex-start;gap:11px;padding:12px 15px;background:#f8fefe;border-radius:10px;border:1.5px solid #c8e4e4;cursor:pointer;margin-top:11px;user-select:none;transition:all .18s}
.kt.on{background:#f0fafa;border-color:#0d7272}
.kb{width:19px;height:19px;border-radius:5px;border:2px solid #9acaca;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .16s;margin-top:1px}
.kt.on .kb{background:#0d7272;border-color:#0d7272;color:#fff}
.kt-t{font-size:13px;color:#0a4848;font-weight:500}
.kt-s{font-size:11px;color:#4a7070;margin-top:1px}

.mg{display:grid;gap:5px}
.gh{font-size:10px;font-weight:600;color:#4a7070;text-align:center;padding:5px 2px;text-transform:uppercase;letter-spacing:.5px}
.gl{font-size:11px;font-weight:600;color:#0a4848;display:flex;align-items:center;padding:4px 5px;line-height:1.3}
.mc{background:#fff;border-radius:10px;padding:8px 7px;border:1.5px solid #c8e4e4;position:relative;min-height:104px;display:flex;flex-direction:column;transition:border-color .18s}
.mc:hover{border-color:#6abcbc}
.mc.ss{border-color:#0d7272;background:#f0fafa}
.mc.ssk{border-color:#2a7a2a;background:#f0f8f0}
.mn{font-size:11px;font-weight:600;color:#0a4848;line-height:1.3;margin-bottom:2px;cursor:pointer}
.mn:hover{color:#0d7272;text-decoration:underline}
.md{font-size:10px;color:#4a7070;line-height:1.4;flex:1}
.mk{font-size:10px;color:#2a7a2a;background:#e8f5e8;padding:2px 5px;border-radius:4px;margin-top:3px;display:inline-block}
.mm{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
.mt{font-size:10px;color:#7a9898}
.mco{font-size:10px;font-weight:600;color:#0a7070;background:#e8f8f8;padding:1px 5px;border-radius:4px}
.ma{display:flex;gap:2px;margin-top:4px}
.ib{background:none;border:none;cursor:pointer;padding:2px 4px;border-radius:5px;font-size:12px;transition:background .14s;line-height:1}
.ib:hover{background:#e0f4f4}
.cb2{position:absolute;top:5px;left:5px;width:14px;height:14px;background:#0d7272;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;color:#fff}
.fd{position:absolute;top:4px;right:4px;font-size:10px}

.lh{background:linear-gradient(135deg,#0a4848,#0d7272);border-radius:16px;padding:20px 22px;margin-bottom:18px;color:#fff}
.lh-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
.lt{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;margin-bottom:3px}
.ls{font-size:12px;color:rgba(255,255,255,.7)}
.lpw{background:rgba(255,255,255,.2);border-radius:100px;height:7px;overflow:hidden;margin-bottom:5px}
.lpf{height:100%;background:#fff;border-radius:100px;transition:width .4s ease}
.lpt{font-size:11px;color:rgba(255,255,255,.75);display:flex;justify-content:space-between}
.la{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
.lab{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;border-radius:100px;padding:6px 14px;font-size:12px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s;display:inline-flex;align-items:center;gap:5px}
.lab:hover{background:rgba(255,255,255,.25)}
.ldb{background:linear-gradient(135deg,#1a8a3a,#2aaa5a);border-radius:14px;padding:18px 22px;text-align:center;margin-bottom:16px;color:#fff}
.ldi{font-size:38px;margin-bottom:7px}
.ldt{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;margin-bottom:3px}
.lds{font-size:12px;color:rgba(255,255,255,.8)}
.cs{margin-bottom:16px}
.ch{display:flex;align-items:center;justify-content:space-between;padding:9px 0 7px;border-bottom:1px solid #e8f4f4;margin-bottom:2px}
.chn{font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:600;color:#0a4848;display:flex;align-items:center;gap:7px}
.chp{font-size:12px;color:#7a9898}
.li{display:flex;align-items:center;min-height:50px;cursor:pointer;border-radius:12px;transition:background .15s;user-select:none;padding:2px 4px}
.li:hover{background:#f0fafa}
.li.di{opacity:.5}
.lcb{width:48px;height:50px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.circ{width:24px;height:24px;border-radius:50%;border:2px solid #b8d8d8;background:#fff;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.li:not(.di) .circ:hover{border-color:#0d7272}
.circ.ck{background:#0d7272;border-color:#0d7272}
.tick{color:#fff;font-size:13px;font-weight:700;line-height:1}
.lit{flex:1;font-size:15px;color:#1a3a3a;line-height:1.4;padding:4px 0}
.li.di .lit{text-decoration:line-through;color:#9abcbc}
.ldiv{height:1px;background:#e8f4f4;margin:0 52px}
.air{display:flex;gap:8px;align-items:center;margin-top:12px;padding:9px;background:#f8fefe;border-radius:12px;border:1.5px dashed #b8d8d8}
.air:focus-within{border-color:#0d7272;background:#f0fafa}
.ai{flex:1;border:none;background:transparent;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;color:#1a2f2f;outline:none;padding:2px 0}
.ai::placeholder{color:#9abcbc}
.ab{background:#0d7272;color:#fff;border:none;border-radius:8px;padding:7px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0;transition:background .15s}
.ab:hover{background:#0a5858}

.bsum{background:#f0fafa;border-radius:12px;padding:12px 16px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:7px;border:1px solid #c8e4e4}
.bsl{font-size:12px;color:#2a6060;font-weight:500}
.bsv{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#0a5858}
.bso{color:#c93939}
.crr{display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap}
.cc{padding:6px 13px;border-radius:8px;border:1.5px solid #b8d8d8;background:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all .16s;color:#1a3a3a}
.cc:hover{border-color:#0d7272}
.cc.s{background:#0d7272;border-color:#0d7272;color:#fff}
.brow{display:flex;align-items:center;gap:11px}
.bw{position:relative;flex:1}
.bpx{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-weight:600;font-size:14px;color:#4a7070;pointer-events:none}
.bi{padding-left:28px}
.pl2{font-size:12px;color:#4a7070;white-space:nowrap;font-weight:500}

.lnd-h{text-align:center;padding:44px 0 32px}
.lnd-l{width:100px;margin:0 auto 14px;display:block}
.lnd-t{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;color:#0a4848;line-height:1.1;margin-bottom:9px}
.lnd-s{font-size:15px;color:#4a7070;max-width:400px;margin:0 auto 26px;line-height:1.6;font-weight:300}
.cwc{background:linear-gradient(135deg,#0a4848,#0d7272);border-radius:18px;padding:22px 26px;margin-bottom:16px;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.cwt{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,.6);margin-bottom:4px}
.cww{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;margin-bottom:3px}
.cws{font-size:13px;color:rgba(255,255,255,.7)}
.cwa{display:flex;gap:8px;flex-wrap:wrap}
.bw2{background:#fff;color:#0a4848;border:none;padding:9px 18px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s;display:inline-flex;align-items:center;gap:5px}
.bw2:hover{background:#e0f4f4;transform:translateY(-1px)}
.bow{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);padding:8px 16px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s;display:inline-flex;align-items:center;gap:5px}
.bow:hover{background:rgba(255,255,255,.12);border-color:#fff}
.ltt{background:#fff;border-radius:14px;border:1.5px solid #c8e4e4;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;cursor:pointer;transition:all .2s}
.ltt:hover{border-color:#0d7272;transform:translateY(-1px)}
.lti{font-size:26px}
.lttl{font-weight:600;font-size:14px;color:#0a4848}
.lts{font-size:11px;color:#4a7070;margin-top:1px}
.ltp{font-size:13px;font-weight:600;color:#0d7272}
.calt{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#0a4848;margin-bottom:12px}
.wg{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-bottom:22px}
.wc{background:#fff;border-radius:14px;padding:14px 16px;border:1.5px solid #c8e4e4;transition:all .2s;position:relative}
.wc.cl{cursor:pointer}
.wc.cl:hover{border-color:#0d7272;transform:translateY(-2px);box-shadow:0 4px 14px rgba(13,114,114,.1)}
.wc.cur{border-color:#f09200}
.wc.emp{border-style:dashed}
.wl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:#7a9898;margin-bottom:4px}
.wr{font-family:'Cormorant Garamond',serif;font-size:15px;font-weight:600;color:#0a4848;margin-bottom:6px}
.wm{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.wch{font-size:10px;padding:2px 7px;background:#f0fafa;border-radius:100px;color:#0d7272;border:1px solid #c8e4e4}
.wb{position:absolute;top:10px;right:10px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:100px;text-transform:uppercase;letter-spacing:.4px}
.wb.now{background:#f09200;color:#fff}
.wb.don{background:#e0f4f4;color:#0d7272}
.wa{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}
.wet{font-size:12px;color:#9abcbc;padding:5px 0}
.fub{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:9px;padding:12px 16px;background:#f0fafa;border-radius:12px;border:1px solid #c8e4e4;margin-bottom:18px}
.fuv{font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:#0a4848}
.fuh{font-size:11px;color:#7a9898;margin-top:1px}
.fubtn{display:inline-flex;align-items:center;gap:5px;padding:6px 15px;border-radius:100px;border:1.5px solid #0d7272;background:#fff;color:#0d7272;font-size:12px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.fubtn:hover{background:#0d7272;color:#fff}
.spin{animation:s360 .7s linear infinite}
@keyframes s360{to{transform:rotate(360deg)}}
.lsc{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:56vh;gap:20px;text-align:center}
.da{animation:dr .7s ease-in-out infinite alternate;display:inline-block}
@keyframes dr{from{transform:rotate(-12deg) scale(.95)}to{transform:rotate(12deg) scale(1.05)}}
.lm{font-family:'Cormorant Garamond',serif;font-size:21px;color:#0a4848;font-style:italic;max-width:290px}
.lsb{font-size:13px;color:#7a9898}
.mo{position:fixed;inset:0;background:rgba(10,40,40,.6);z-index:200;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(4px)}
.md2{background:#fff;border-radius:20px;padding:22px;max-width:430px;width:100%}
.mtt{font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:600;color:#0a4848;margin-bottom:3px}
.ms{font-size:13px;color:#4a7070;margin-bottom:14px}
.sc{padding:11px;border-radius:11px;border:1.5px solid #c8e4e4;margin-bottom:7px;cursor:pointer;transition:all .17s}
.sc:hover{border-color:#0d7272;background:#f0fafa;transform:translateX(3px)}
.sn{font-weight:600;font-size:14px;color:#0a4848;margin-bottom:2px}
.sd{font-size:12px;color:#4a7070}
.sf{display:flex;gap:9px;margin-top:4px;font-size:11px;color:#7a9898}
.ro{position:fixed;inset:0;background:rgba(10,40,40,.6);z-index:300;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(6px)}
@media(min-width:600px){.ro{align-items:center;padding:20px}}
.rm{background:#fff;border-radius:22px 22px 0 0;max-width:530px;width:100%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column}
@media(min-width:600px){.rm{border-radius:22px;max-height:88vh}}
.rph{width:100%;height:200px;object-fit:cover;display:block}
.rpf{width:100%;height:200px;display:flex;align-items:center;justify-content:center;font-size:64px}
.rpl{width:100%;height:200px;background:#e8f4f4;display:flex;align-items:center;justify-content:center}
.rph2{padding:15px 19px 12px;border-bottom:1px solid #e8f4f4;flex-shrink:0}
.rht{display:flex;align-items:flex-start;justify-content:space-between;gap:9px;margin-bottom:9px}
.rc{background:#f0fafa;border:none;color:#4a7070;width:28px;height:28px;border-radius:50%;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .14s}
.rc:hover{background:#c8e4e4}
.rn{font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:600;color:#0a4848;line-height:1.25;flex:1}
.rps{display:flex;gap:5px;flex-wrap:wrap}
.rp{background:#f0fafa;border:1px solid #c8e4e4;border-radius:100px;padding:3px 10px;font-size:11px;font-weight:500;color:#0a4848}
.rb2{overflow-y:auto;padding:13px 19px 22px;flex:1}
.rst{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#4a7070;margin:14px 0 8px}
.rst:first-child{margin-top:0}
.ri{display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid #e8f4f4;font-size:14px;color:#1a3a3a}
.ri:last-child{border:none}
.rd{width:7px;height:7px;border-radius:50%;background:#0d7272;flex-shrink:0}
.rstep{display:flex;gap:10px;margin-bottom:11px;align-items:flex-start}
.rsn{min-width:25px;height:25px;border-radius:50%;background:#f09200;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.rst2{font-size:14px;color:#1a3a3a;line-height:1.6;flex:1}
.rtip{background:#f0fafa;border-left:3px solid #0d7272;padding:9px 13px;border-radius:0 9px 9px 0;font-size:12px;color:#0a4848;line-height:1.5;margin-top:3px}
.rld{display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 0;color:#4a7070;font-size:13px}
.rsp{width:28px;height:28px;border:3px solid #c8e4e4;border-top-color:#0d7272;border-radius:50%;animation:rsp .8s linear infinite}
@keyframes rsp{to{transform:rotate(360deg)}}
.mp{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.mpl{display:inline-flex;align-items:center;gap:4px;padding:4px 11px;background:#f0fafa;border:1.5px solid #b8d8d8;border-radius:100px;font-size:12px;color:#0d7272;font-weight:500;cursor:pointer;transition:all .16s}
.mpl:hover{border-color:#0d7272;background:#e0f4f4}
.tst{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#0a4848;color:#fff;padding:8px 20px;border-radius:100px;font-size:13px;font-weight:500;z-index:500;animation:tst .3s ease;pointer-events:none;white-space:nowrap}
@keyframes tst{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.sh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
.wkc{background:#e8f4f4;border-radius:9px;padding:8px 13px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:9px;font-size:13px;color:#0a4848;font-weight:600}
.mtg{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.mtc{padding:14px 10px;border-radius:13px;border:2px solid #b8d8d8;background:#fff;cursor:pointer;text-align:center;transition:all .2s;user-select:none}
.mtc:hover{border-color:#0d7272}
.mtc.s{border-color:#0d7272;background:#f0fafa}
.mtic{font-size:22px;margin-bottom:5px}
.mtl{font-weight:600;font-size:13px;color:#0a4848}
.mts{font-size:11px;color:#4a7070;margin-top:1px}
`;

export default function App() {
  const [step, setStep]       = useState('landing');
  const [awk, setAwkState]     = useState(null);
  const awkRef                 = useRef(null);       // stable ref for async closures
  const setAwk = key => { setAwkState(key); awkRef.current = key; };
  const [prefs, setPrefs]     = useState({...DEFAULT_PREFS});
  const [plan, setPlan]       = useState(null);
  const [costs, setCosts]     = useState({});
  const [sl, setSl]           = useState(null);
  const [sel, setSel]         = useState(new Set());
  const [kidsSel, setKidsSel] = useState(new Set());
  const [chk, setChk]        = useState(new Set());
  const [custom, setCustom]   = useState([]);
  const [addTxt, setAddTxt]   = useState('');
  const [favs, setFavs]       = useState([]);
  const [recipe, setRecipe]   = useState(null);
  const [swap, setSwap]       = useState(null);
  const [swapOpts, setSwapOpts] = useState([]);
  const [swapLd, setSwapLd]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [err, setErr]         = useState('');
  const [toast, setToast]     = useState('');
  const [showT, setShowT]     = useState(false);
  const [upd, setUpd]         = useState(false);
  const [premium, setPremium] = useState(null);      // {email,customerId,validUntil}
  const [usage, setUsage]     = useState({month:'',count:0});
  const [showPaywall, setShowPaywall] = useState(false);
  const [verifying, setVerifying]    = useState(false); // true while checking Stripe return

  const isPro = isPremiumActive(premium);
  const rollsLeft = Math.max(0, FREE_ROLLS_PER_MONTH - usage.count);
  const canRoll   = isPro || rollsLeft > 0;

  const sym = CURRENCY_SYMBOLS[prefs.currency]||'€';
  const tsrv = prefs.adults + (prefs.kidsDifferentFood?0:prefs.kids);
  const bgt  = parseFloat(prefs.weeklyBudget)||0;
  const tcost = Object.values(costs).reduce((s,v)=>s+(v||0),0);
  const over = prefs.budgetEnabled&&bgt>0&&tcost>bgt;
  const sdays = (prefs.selectedDays||DAYS).filter(d=>DAYS.includes(d));
  const sp   = (k,v) => setPrefs(p=>({...p,[k]:v}));
  const pop  = msg => { setToast(msg); setShowT(true); setTimeout(()=>setShowT(false),2500); };
  const sf   = f => { try{localStorage.setItem(FK,JSON.stringify(f));}catch{} };
  const tf   = n => { const v=favs.includes(n)?favs.filter(x=>x!==n):[...favs,n]; setFavs(v); sf(v); };
  const afm  = () => { if(!prefs.favInput.trim()) return; sp('favoriteMeals',[...prefs.favoriteMeals,prefs.favInput.trim()]); sp('favInput',''); };
  const sc   = s => { const t=s==='dinner'?['dinner']:s==='all'?['breakfast','lunch','dinner']:prefs.mealTypes; setPrefs(p=>({...p,mealScope:s,mealTypes:t})); };
  const tt   = t => { const n=prefs.mealTypes.includes(t)?prefs.mealTypes.filter(x=>x!==t):[...prefs.mealTypes,t]; if(n.length) sp('mealTypes',n); };
  const td   = d => { const c=prefs.selectedDays||DAYS; const n=c.includes(d)?c.filter(x=>x!==d):[...c,d]; if(n.length) sp('selectedDays',n); };
  const prog = Math.round(((STEPS_IDX[step]||1)/10)*100);

  useEffect(()=>{
    // Load favourites
    try{const s=localStorage.getItem(FK);if(s)setFavs(JSON.parse(s));}catch{}
    // Load premium + usage
    const p=loadPremium(); setPremium(p);
    setUsage(loadUsage());
    // Handle Stripe checkout return (?session_id=xxx)
    const params=new URLSearchParams(window.location.search);
    const sid=params.get('session_id');
    if(sid){
      // Clean the URL immediately
      window.history.replaceState({},document.title,window.location.pathname);
      setVerifying(true);
      fetch('/.netlify/functions/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid})})
        .then(r=>r.json())
        .then(d=>{
          if(d.premium){
            const pdata={email:d.email,customerId:d.customerId,validUntil:d.validUntil};
            savePremium(pdata); setPremium(pdata);
            pop('🎉 Welcome to DishRoll Pro!');
          } else {
            pop('Could not verify payment — please contact support.');
          }
        })
        .catch(()=>pop('Could not verify payment. Try refreshing.'))
        .finally(()=>setVerifying(false));
    }
  },[]);

  function allItems() {
    if(!sl) return [];
    const base=sl.categories.flatMap(c=>c.items.map(i=>({id:i,text:i,cat:c.name})));
    const cu=custom.map(c=>({id:c.id,text:c.text,cat:'My additions'}));
    return [...base,...cu];
  }
  const total=allItems().length;
  const done=allItems().filter(i=>chk.has(i.id)).length;
  const allDone=total>0&&done===total;

  function persist(p2,c2,l2,chk2,cu2,ks2) {
    const key = awkRef.current;
    if(!key||!p2) return;
    saveWk(key,{mealPlan:p2,planCosts:c2!=null?c2:costs,prefs,shoppingList:l2!=null?l2:sl,checkedItems:[...(chk2!=null?chk2:chk)],customItems:cu2!=null?cu2:custom,kidsSelected:[...(ks2!=null?ks2:kidsSel)]});
  }

  function openPlan(key) {
    const d=loadWk(key); if(!d) return;
    setAwk(key); setPlan(d.mealPlan); setCosts(d.planCosts||{});
    if(d.prefs) setPrefs({...DEFAULT_PREFS,...d.prefs});
    setSl(d.shoppingList||null); setChk(new Set(d.checkedItems||[])); setCustom(d.customItems||[]);
    setSel(new Set()); setKidsSel(new Set(d.kidsSelected||[])); setErr(''); setStep('mealplan');
  }
  function openList(key) {
    const d=loadWk(key); if(!d?.shoppingList) return;
    setAwk(key); setPlan(d.mealPlan||null); setCosts(d.planCosts||{});
    if(d.prefs) setPrefs({...DEFAULT_PREFS,...d.prefs});
    setSl(d.shoppingList); setChk(new Set(d.checkedItems||[])); setCustom(d.customItems||[]);
    setSel(new Set()); setKidsSel(new Set(d.kidsSelected||[])); setErr(''); setStep('list');
  }
  function newRoll(key) {
    setAwk(key); setPlan(null); setCosts({}); setSl(null);
    setChk(new Set()); setCustom([]); setSel(new Set()); setKidsSel(new Set()); setErr(''); setStep('welcome');
  }
  function forceUpdate() {
    setUpd(true);
    try{if('caches' in window) caches.keys().then(ns=>ns.forEach(n=>caches.delete(n)));}catch{}
    setTimeout(()=>window.location.reload(true),800);
  }

  function toggleChk(id) {
    const n=new Set(chk); n.has(id)?n.delete(id):n.add(id);
    setChk(n); persist(plan,costs,sl,n,custom);
  }
  function addCustom() {
    if(!addTxt.trim()) return;
    const item={id:'c-'+Date.now(),text:addTxt.trim()};
    const nc=[...custom,item]; setCustom(nc); setAddTxt('');
    persist(plan,costs,sl,chk,nc);
  }
  function resetChk() { setChk(new Set()); persist(plan,costs,sl,new Set(),custom); pop('All items unmarked'); }
  function copyList() {
    if(!sl) return;
    const txt=sl.categories.map(c=>c.name+':\n'+c.items.map(i=>'• '+i).join('\n')).join('\n\n');
    const cu=custom.length?'\nMy additions:\n'+custom.map(c=>'• '+c.text).join('\n'):'';
    navigator.clipboard.writeText(txt+cu); pop('List copied to clipboard');
  }

  async function startCheckout() {
    try {
      const r=await fetch('/.netlify/functions/subscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:premium?.email||''})});
      const d=await r.json();
      if(d.url) window.location.href=d.url;
      else pop('Could not start checkout. Please try again.');
    } catch { pop('Could not start checkout. Please try again.'); }
  }

  function cancelPremium() {
    clearPremium(); setPremium(null);
    pop('Premium subscription removed from this device.');
  }

  async function roll() {
    // Gate check
    if(!canRoll){ setShowPaywall(true); return; }
    setStep('generating'); setErr('');
    let i=0; setLoadMsg(ROLL_MSGS[0]);
    const iv=setInterval(()=>{i=(i+1)%ROLL_MSGS.length;setLoadMsg(ROLL_MSGS[i]);},2500);
    try {
      const fh=[...prefs.favoriteMeals,...favs.slice(0,4)].filter(Boolean).join(', ');
      const bn=prefs.budgetEnabled&&bgt>0?'Budget:'+sym+bgt+'/week.':'';
      const cn=prefs.dishComplexity==='simple'?'Prefer quick easy dishes under 30 minutes.':prefs.dishComplexity==='elaborate'?'Include impressive multi-step recipes.':'';
      const kidsField = prefs.kids>0&&prefs.kidsDifferentFood?',"kidsAlt":{"name":"s","ingredients":["qty item"]}':'';
      const kn = prefs.kids>0&&prefs.kidsDifferentFood?`Each meal must include "kidsAlt":{"name":"simple child-friendly dish","ingredients":["qty unit item",...]} with ${prefs.kids} kid-sized portions, mild flavours.`:'';
      const dT='{"'+prefs.mealTypes.join('":M,"')+'":M}'.replace(/M(?=")/g,'{"name":"s","description":"8w","time":"Xm","estCost":0.00,"ingredients":["qty item"]'+kidsField+'}');
      const dJ=sdays.map(d=>'"'+d.toLowerCase()+'":'+dT).join(',');
      const raw=await callAI('Generate meal plan for these days only. Return ONLY compact JSON.\nMeal types:'+prefs.mealTypes.join(',')+'|Cuisines:'+(prefs.cuisines.length?prefs.cuisines.join(','):'varied')+'|Dietary:'+(prefs.dietary.length?prefs.dietary.join(','):'none')+'|Adventure:'+prefs.variability+'/100|Servings:'+tsrv+'|Favs:'+(fh||'none')+'|'+bn+' '+cn+' '+kn+'\nReturn:{'+dJ+'}',4000);
      const p2=JSON.parse(raw);
      const c2={};
      sdays.forEach(d=>prefs.mealTypes.forEach(t=>{const m=p2[d.toLowerCase()]?.[t];if(m&&m.estCost) c2[d.toLowerCase()+'-'+t]=m.estCost;}));
      clearInterval(iv); setPlan(p2); setCosts(c2);
      if(!isPro){ const u=incrementUsage(); setUsage(u); }
      persist(p2,c2,null,new Set(),[],new Set()); setStep('mealplan');
    } catch(e) { clearInterval(iv); setErr('Could not roll: '+e.message); setStep('servings'); }
  }

  async function openSwap(day,mt) {
    const cur=plan?.[day.toLowerCase()]?.[mt]; if(!cur) return;
    setSwap({day,mt}); setSwapLd(true); setSwapOpts([]);
    try {
      const raw=await callAI('3 alternative '+mt+' recipes replacing "'+cur.name+'". Cuisines:'+(prefs.cuisines.join(',')||'any')+'. Dietary:'+(prefs.dietary.join(',')||'none')+'. Complexity:'+prefs.dishComplexity+'. Servings:'+tsrv+'.\nReturn ONLY JSON array:[{"name":"...","description":"8w","time":"Xm","estCost":0.00,"ingredients":["qty item"]},...]',1200);
      setSwapOpts(JSON.parse(raw));
    } catch{setSwapOpts([]);}
    setSwapLd(false);
  }
  function applySwap(opt) {
    const k=swap.day.toLowerCase()+'-'+swap.mt;
    const nc={...costs,[k]:opt.estCost||0};
    const np={...plan,[swap.day.toLowerCase()]:{...plan[swap.day.toLowerCase()],[swap.mt]:opt}};
    setCosts(nc); setPlan(np); persist(np,nc,sl,chk,custom,kidsSel); setSwap(null); setSwapOpts([]);
  }

  const tgSel=k=>setSel(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});
  const tgKidsSel=k=>setKidsSel(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n;});
  const selAll=()=>{
    const s=new Set(); const ks=new Set();
    sdays.forEach(d=>prefs.mealTypes.forEach(t=>{
      const meal=plan?.[d.toLowerCase()]?.[t];
      if(meal) s.add(d.toLowerCase()+'-'+t);
      if(meal?.kidsAlt?.name && prefs.kidsDifferentFood) ks.add(d.toLowerCase()+'-'+t+'-kids');
    }));
    setSel(s); setKidsSel(ks);
  };

  async function buildList() {
    if(!sel.size && !kidsSel.size) return;
    setLoading(true); setLoadMsg('Building your shopping list…');
    try {
      const items=[];
      // Adult meals
      sdays.forEach(d=>prefs.mealTypes.forEach(t=>{
        if(sel.has(d.toLowerCase()+'-'+t)){
          const m=plan?.[d.toLowerCase()]?.[t];
          if(m) items.push({meal:m.name,servings:tsrv,ingredients:m.ingredients,label:'Adults'});
        }
      }));
      // Kids meals (separate ingredients, separate servings)
      sdays.forEach(d=>prefs.mealTypes.forEach(t=>{
        if(kidsSel.has(d.toLowerCase()+'-'+t+'-kids')){
          const ka=plan?.[d.toLowerCase()]?.[t]?.kidsAlt;
          if(ka?.ingredients?.length) items.push({meal:ka.name,servings:prefs.kids,ingredients:ka.ingredients,label:'Kids'});
        }
      }));
      const raw=await callAI(
        `Combine into one grocery list. Merge identical items, keep kids/adult portions separate where different.\nMeals:${JSON.stringify(items)}\nReturn ONLY JSON:{"categories":[{"name":"Produce","items":["2 large onions"]},{"name":"Proteins","items":["600g chicken thighs (adults)","300g chicken breast (kids)"]}]}\nCategories:Produce,Proteins,Dairy,Grains,Pantry,Condiments,Frozen,Bakery,Beverages,Other.`,2400);
      const list=JSON.parse(raw);
      setSl(list); setChk(new Set()); setCustom([]);
      persist(plan,costs,list,new Set(),[],kidsSel); setStep('list');
    } catch{setErr('Could not build shopping list.');}
    setLoading(false);
  }

  async function openRecipe(meal,mt,variant) {
    const isKids = variant==='kids';
    setRecipe({meal,mt,variant,steps:[],tip:'',photoUrl:null,photoLd:true,loading:true});
    fetchPhoto(meal.name).then(url=>setRecipe(p=>p?{...p,photoUrl:url,photoLd:false}:null));
    const srv = isKids ? prefs.kids : tsrv;
    const prompt = isKids
      ? `Write a simple, fun, child-friendly recipe for "${meal.name}" for ${srv} kids aged 4-12. Use mild flavours, simple techniques.
Return ONLY JSON:{"steps":["Step 1 with simple instructions...","Step 2...","Step 3...","Step 4...","Step 5..."],"prepTime":"X min","cookTime":"X min","difficulty":"Easy","tip":"fun tip for kids"}`
      : `Write a detailed, professional recipe for "${meal.name}" for ${srv} servings.
Be specific: include exact quantities in each step, cooking temperatures (°C/°F), timing, and key technique details.
Return ONLY JSON:{"steps":["Step 1 with exact timing, temp and technique...","Step 2...","Step 3...","Step 4...","Step 5...","Step 6...","Step 7..."],"prepTime":"X min","cookTime":"X min","difficulty":"Easy|Medium|Hard","tip":"Expert chef tip specific to this dish"}`;
    callAI(prompt, 1800)
      .then(raw=>{const d=JSON.parse(raw);setRecipe(p=>p?{...p,steps:d.steps||[],tip:d.tip||'',prepTime:d.prepTime,cookTime:d.cookTime,difficulty:d.difficulty,loading:false}:null);})
      .catch(()=>setRecipe(p=>p?{...p,steps:['Could not load recipe steps. Please try again.'],loading:false}:null));
  }

  // ── LANDING ──────────────────────────────────────────────────────────────────
  function Landing() {
    const ck=cwKey(); const cwd=loadWk(ck);
    const hasList=cwd?.shoppingList!=null;
    const li=hasList?(cwd.shoppingList.categories.flatMap(c=>c.items).length+(cwd.customItems?.length||0)):0;
    const ld=hasList?(cwd.checkedItems?.length||0):0;
    const calKeys=weeksAround(ck,6); const stored=allWkKeys();
    const [cdel,setCdel]=useState(null);
    function sample(d){if(!d?.mealPlan)return[];return DAYS.slice(0,3).map(day=>{const dy=d.mealPlan[day.toLowerCase()];return dy?Object.values(dy)[0]?.name:null;}).filter(Boolean);}
    function hdel(key){delWk(key);setCdel(null);pop('Week deleted');setStep(s=>s);}
    return (
      <div>
        <div className="lnd-h">
          <img src="/logo.png" alt="DishRoll" className="lnd-l"/>
          <div className="lnd-t">Your weekly<br/><span style={{color:'#f09200',fontStyle:'italic'}}>meal command centre</span></div>
          <p className="lnd-s">Plan every week, store every roll, and always know what's for dinner.</p>
        </div>
        <div className="fub">
          <div><div className="fuv">v{APP_VERSION}</div><div className="fuh">DishRoll · {new Date().getFullYear()}</div></div>
          <button className="fubtn" onClick={forceUpdate} disabled={upd}><span className={upd?'spin':''} style={{display:'inline-block'}}>↻</span>{upd?'Updating…':'Force update'}</button>
        </div>

        {/* Plan status card */}
        {isPro ? (
          <div style={{background:'linear-gradient(135deg,#1a5a1a,#2a7a2a)',borderRadius:14,padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:3}}>✨ DishRoll Pro</div>
              <div style={{fontSize:14,color:'#fff',fontWeight:500}}>Unlimited rolls · Active</div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:2}}>{premium?.email||''}</div>
            </div>
            <span style={{fontSize:12,color:'rgba(255,255,255,.5)',cursor:'pointer',textDecoration:'underline'}} onClick={cancelPremium}>Remove from device</span>
          </div>
        ) : (
          <div style={{background:'#fff',borderRadius:14,padding:'14px 20px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,border:'1.5px solid #c8e4e4'}}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#0a4848',marginBottom:2}}>Free plan — {rollsLeft} roll{rollsLeft!==1?'s':''} left this month</div>
              <div style={{fontSize:12,color:'#4a7070'}}>Upgrade for unlimited rolls at {PRICE_MONTHLY}/month</div>
            </div>
            <button onClick={()=>setShowPaywall(true)} style={{padding:'8px 18px',borderRadius:100,border:'none',background:'linear-gradient(135deg,#f09200,#c87800)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:'nowrap'}}>
              ✨ Go Pro
            </button>
          </div>
        )}
        <div className="cwc">
          <div><div className="cwt">📅 This week</div><div className="cww">{weekLabel(ck)}</div><div className="cws">{cwd?'✓ Already rolled — open or roll again':'🎲 Not rolled yet — start now!'}</div></div>
          <div className="cwa">
            {cwd&&<button className="bw2" onClick={()=>openPlan(ck)}>📖 Open plan</button>}
            <button className={cwd?'bow':'bw2'} onClick={()=>newRoll(ck)}>🎲 {cwd?'Re-roll':'Roll this week'}</button>
          </div>
        </div>
        {hasList&&(
          <div className="ltt" onClick={()=>openList(ck)}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="lti">🛒</div>
              <div><div className="lttl">My shopping list</div><div className="lts">{weekLabel(ck)}</div></div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              {li>0&&<div className="ltp">{ld}/{li} done</div>}
              <span style={{fontSize:13,color:'#0d7272',fontWeight:600}}>Open →</span>
            </div>
          </div>
        )}
        <div className="calt">🗓️ Week calendar</div>
        <div className="wg">
          {calKeys.map(key=>{
            const d=loadWk(key);const isC=isCW(key);const isF=isFW(key);const s=sample(d);
            return (
              <div key={key} className={'wc '+(isC?'cur ':'')+(d?'cl ':'')+(!d&&!isF?'emp':'')}>
                {isC&&<span className="wb now">This week</span>}
                {!isC&&d&&<span className="wb don">Saved</span>}
                <div className="wl">{isF?'Upcoming':isC?'Current':'Past'}</div>
                <div className="wr">{weekLabel(key)}</div>
                {d&&s.length>0&&<div className="wm">{s.map((n,i)=><span key={i} className="wch">{n}</span>)}{Object.keys(d.mealPlan||{}).length>3&&<span className="wch">+more</span>}</div>}
                {!d&&<div className="wet">{isF?'Plan ahead →':'No roll yet'}</div>}
                {d&&<div style={{fontSize:11,color:'#7a9898'}}>Saved {new Date(d.savedAt).toLocaleDateString('en-IE',{day:'numeric',month:'short'})}</div>}
                <div className="wa">
                  {d&&<button className="btn bp bsm" onClick={()=>openPlan(key)}>📖 Plan</button>}
                  {d&&d.shoppingList&&<button className="btn bg bsm" onClick={()=>openList(key)}>🛒 List</button>}
                  <button className="btn bg bsm" onClick={()=>newRoll(key)}>🎲 {d?'Re-roll':'Roll'}</button>
                  {d&&cdel!==key&&<button className="btn bd bsm" onClick={()=>setCdel(key)}>🗑️</button>}
                  {d&&cdel===key&&<><button className="btn bd bsm" onClick={()=>hdel(key)}>Confirm</button><button className="btn bg bsm" onClick={()=>setCdel(null)}>Cancel</button></>}
                </div>
              </div>
            );
          })}
        </div>
        {stored.filter(k=>!calKeys.includes(k)).length>0&&(
          <><div className="calt" style={{marginTop:6}}>📦 Older rolls</div><div className="wg">{stored.filter(k=>!calKeys.includes(k)).map(key=>{const d=loadWk(key);const s=sample(d);return(<div key={key} className="wc cl"><span className="wb don">Saved</span><div className="wl">Past</div><div className="wr">{weekLabel(key)}</div>{s.length>0&&<div className="wm">{s.map((n,i)=><span key={i} className="wch">{n}</span>)}</div>}<div className="wa"><button className="btn bp bsm" onClick={()=>openPlan(key)}>📖 Plan</button>{d?.shoppingList&&<button className="btn bg bsm" onClick={()=>openList(key)}>🛒 List</button>}<button className="btn bg bsm" onClick={()=>newRoll(key)}>🎲 Re-roll</button></div></div>);})}</div></>
        )}
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────────
  function ListView() {
    if(!sl) return null;
    const cats=[...sl.categories];
    if(custom.length>0) cats.push({name:'My additions',items:[],_custom:true});
    return (
      <div>
        <div className="lh">
          <div className="lh-top">
            <div><div className="lt">🛒 Shopping list</div><div className="ls">{awk?weekLabel(awk):''}</div></div>
            <button className="btn bg bsm" style={{color:'#c8e4e4',borderColor:'rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)'}} onClick={()=>setStep(plan?'mealplan':'landing')}>← {plan?'Plan':'Home'}</button>
          </div>
          <div className="lpw"><div className="lpf" style={{width:total>0?Math.round((done/total)*100)+'%':'0%'}}/></div>
          <div className="lpt"><span>{done} of {total} items</span><span>{total>0?Math.round((done/total)*100):0}% done</span></div>
          <div className="la">
            <button className="lab" onClick={resetChk}>↺ Reset ticks</button>
            <button className="lab" onClick={copyList}>📋 Copy list</button>
            <button className="lab" onClick={()=>setStep('landing')}>🏠 Home</button>
          </div>
        </div>
        {allDone&&<div className="ldb"><div className="ldi">🎉</div><div className="ldt">All done!</div><div className="lds">Everything is in your basket. Enjoy your meals this week!</div></div>}
        {cats.map(cat=>{
          const items=cat._custom?custom:cat.items.map(i=>({id:i,text:i}));
          if(items.length===0) return null;
          const cd=items.filter(i=>chk.has(i.id)).length;
          return (
            <div key={cat.name} className="cs">
              <div className="ch">
                <div className="chn">{CAT_ICONS[cat.name]||'🛒'} {cat.name}</div>
                <div className="chp">{cd}/{items.length}</div>
              </div>
              {items.map((item,i)=>(
                <Fragment key={item.id}>
                  <div className={'li '+(chk.has(item.id)?'di':'')} onClick={()=>toggleChk(item.id)}>
                    <div className="lcb"><div className={'circ '+(chk.has(item.id)?'ck':'')}>{chk.has(item.id)&&<span className="tick">✓</span>}</div></div>
                    <div className="lit">{item.text}</div>
                  </div>
                  {i<items.length-1&&<div className="ldiv"/>}
                </Fragment>
              ))}
            </div>
          );
        })}
        <div className="air">
          <input className="ai" placeholder="Add an item… (e.g. washing-up liquid)" value={addTxt} onChange={e=>setAddTxt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustom()}/>
          <button className="ab" onClick={addCustom}>+ Add</button>
        </div>
      </div>
    );
  }

  // ── RECIPE MODAL ─────────────────────────────────────────────────────────────
  // ── PAYWALL MODAL ─────────────────────────────────────────────────────────────
  function PaywallModal() {
    if(!showPaywall) return null;
    return (
      <div className="mo" onClick={()=>setShowPaywall(false)}>
        <div className="md2" onClick={e=>e.stopPropagation()} style={{maxWidth:420}}>
          {/* Header */}
          <div style={{textAlign:'center',marginBottom:22}}>
            <div style={{fontSize:44,marginBottom:8}}>🎲</div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:'#0a4848',marginBottom:6}}>
              You've used your free roll
            </div>
            <div style={{fontSize:14,color:'#4a7070',lineHeight:1.6}}>
              Free plan includes <strong>1 roll per month</strong>.<br/>
              Upgrade to Pro for unlimited rolls.
            </div>
          </div>

          {/* Plan comparison */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
            {/* Free */}
            <div style={{padding:'14px 16px',borderRadius:12,border:'1.5px solid #c8e4e4',background:'#f8fefe'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#7a9898',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>Free</div>
              <div style={{fontSize:11,color:'#4a7070',lineHeight:2}}>
                ✓ 1 roll/month<br/>
                ✓ Shopping list<br/>
                ✓ Week calendar<br/>
                ✓ Recipes
              </div>
              <div style={{fontSize:18,fontWeight:700,color:'#0a4848',marginTop:10}}>€0</div>
            </div>
            {/* Pro */}
            <div style={{padding:'14px 16px',borderRadius:12,border:'2px solid #f09200',background:'linear-gradient(135deg,#fffbf0,#fff)',position:'relative'}}>
              <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',background:'#f09200',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:100,whiteSpace:'nowrap',letterSpacing:'.5px'}}>BEST VALUE</div>
              <div style={{fontSize:12,fontWeight:700,color:'#c87800',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>Pro</div>
              <div style={{fontSize:11,color:'#4a7070',lineHeight:2}}>
                ✓ <strong>Unlimited</strong> rolls<br/>
                ✓ All Free features<br/>
                ✓ Kids meal rows<br/>
                ✓ Full history
              </div>
              <div style={{fontSize:18,fontWeight:700,color:'#c87800',marginTop:10}}>{PRICE_MONTHLY}<span style={{fontSize:12,color:'#7a9898',fontWeight:400}}>/mo</span></div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={startCheckout}
            style={{width:'100%',padding:'13px',borderRadius:100,border:'none',background:'linear-gradient(135deg,#f09200,#c87800)',color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:10}}
          >
            ✨ Upgrade to Pro — {PRICE_MONTHLY}/month
          </button>
          <button
            onClick={()=>setShowPaywall(false)}
            style={{width:'100%',padding:'10px',borderRadius:100,border:'1.5px solid #c8e4e4',background:'transparent',color:'#4a7070',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif"}}
          >
            Maybe later
          </button>

          {/* Restore */}
          <div style={{textAlign:'center',marginTop:14,fontSize:12,color:'#9abcbc'}}>
            Already subscribed on another device?{' '}
            <span style={{color:'#0d7272',cursor:'pointer',textDecoration:'underline'}} onClick={startCheckout}>Restore access</span>
          </div>
        </div>
      </div>
    );
  }

  function RecipeModal() {
    if(!recipe) return null;
    const {meal,mt,variant,steps,tip,prepTime,cookTime,difficulty,photoUrl,photoLd,loading:rl}=recipe;
    const ml2={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner'};
    const isKids=variant==='kids';
    const srv=isKids?prefs.kids:tsrv;
    const emoji=mealEmoji(meal.name,mt);
    return (
      <div className="ro" onClick={()=>setRecipe(null)}>
        <div className="rm" onClick={e=>e.stopPropagation()}>
          {photoLd
            ? <div className="rpl"><div className="rsp"/></div>
            : photoUrl
              ? <img src={photoUrl} alt={meal.name} className="rph" onError={()=>setRecipe(p=>p?{...p,photoUrl:null,photoLd:false}:null)}/>
              : <div className="rpf" style={{background:grad(meal.name),flexDirection:'column',gap:8}}>
                  <span style={{fontSize:72,lineHeight:1}}>{emoji}</span>
                  <span style={{fontSize:13,color:'rgba(255,255,255,.7)',maxWidth:260,textAlign:'center',lineHeight:1.3}}>{meal.name}</span>
                </div>
          }
          <div className="rph2">
            <div className="rht">
              <div>
                {isKids&&<div style={{fontSize:11,fontWeight:700,color:'#2a7a2a',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:3}}>👧 Kids recipe</div>}
                <div className="rn">{meal.name}</div>
              </div>
              <button className="rc" onClick={()=>setRecipe(null)}>×</button>
            </div>
            <div className="rps">
              {prepTime&&<span className="rp">🥄 Prep {prepTime}</span>}
              {cookTime&&<span className="rp">🔥 Cook {cookTime}</span>}
              {difficulty&&<span className="rp">{difficulty==='Easy'?'🟢':difficulty==='Medium'?'🟡':'🔴'} {difficulty}</span>}
              {meal.time&&!prepTime&&<span className="rp">⏱ {meal.time}</span>}
              <span className="rp">👥 {srv} serving{srv!==1?'s':''}</span>
              {mt&&!isKids&&<span className="rp">🍽️ {ml2[mt]||mt}</span>}
              {prefs.budgetEnabled&&meal.estCost&&<span className="rp">💰 {sym}{meal.estCost}</span>}
            </div>
          </div>
          <div className="rb2">
            {meal.ingredients&&meal.ingredients.length>0&&(
              <>
                <div className="rst">Ingredients — {srv} serving{srv!==1?'s':''}</div>
                {meal.ingredients.map((ing,i)=><div key={i} className="ri"><div className="rd"/>{ing}</div>)}
              </>
            )}
            {!isKids&&prefs.kids>0&&prefs.kidsDifferentFood&&meal.kidsAlt&&(
              <div style={{background:'#e8f5e8',border:'1px solid #b8d8b8',borderRadius:9,padding:'9px 13px',marginTop:10,cursor:'pointer'}} onClick={()=>openRecipe({name:meal.kidsAlt,ingredients:[],time:'~20 min'},mt,'kids')}>
                <div style={{fontSize:11,fontWeight:700,color:'#2a7a2a',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:2}}>👧 Kids alternative — tap for kids recipe</div>
                <div style={{fontSize:14,color:'#1a3a1a',fontWeight:500}}>{meal.kidsAlt} →</div>
              </div>
            )}
            <div className="rst">How to cook</div>
            {rl
              ? <div className="rld"><div className="rsp"/><span>Fetching recipe steps…</span></div>
              : <div>
                  {steps.map((s,i)=><div key={i} className="rstep"><div className="rsn">{i+1}</div><div className="rst2">{s}</div></div>)}
                  {tip&&<div className="rtip">💡 <strong>Chef's tip:</strong> {tip}</div>}
                </div>
            }
          </div>
        </div>
      </div>
    );
  }

  // ── SWAP MODAL ───────────────────────────────────────────────────────────────
  function SwapModal() {
    if(!swap) return null;
    const cur=plan?.[swap.day.toLowerCase()]?.[swap.mt];
    return (
      <div className="mo" onClick={()=>setSwap(null)}>
        <div className="md2" onClick={e=>e.stopPropagation()}>
          <div className="mtt">🎲 Re-roll {swap.mt}</div>
          <div className="ms">{swap.day} · <strong>{cur?.name}</strong></div>
          {swapLd?<div style={{textAlign:'center',padding:'24px 0'}}><div style={{fontSize:34,animation:'dr .6s ease-in-out infinite alternate',display:'inline-block'}}>🎲</div><div style={{fontSize:13,color:'#4a7070',marginTop:9}}>Rolling…</div></div>
           :swapOpts.length===0?<div style={{color:'#4a7070',fontSize:13,padding:'10px 0'}}>No alternatives found.</div>
           :swapOpts.map((o,i)=><div key={i} className="sc" onClick={()=>applySwap(o)}><div className="sn">{o.name}</div><div className="sd">{o.description}</div><div className="sf"><span>⏱ {o.time}</span>{prefs.budgetEnabled&&o.estCost!=null&&<span>💰 {sym}{o.estCost}</span>}</div></div>)}
          <button className="btn bg bsm" style={{marginTop:9}} onClick={()=>setSwap(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  const hasSl=sl!=null;

  return (
    <div>
      <style>{FONTS+CSS}</style>
      {/* Verifying overlay */}
      {verifying&&(
        <div style={{position:'fixed',inset:0,background:'rgba(10,40,40,.7)',zIndex:400,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,backdropFilter:'blur(6px)'}}>
          <div style={{width:40,height:40,border:'3px solid rgba(255,255,255,.3)',borderTopColor:'#f09200',borderRadius:'50%',animation:'rspin .8s linear infinite'}}/>
          <div style={{color:'#fff',fontSize:16,fontWeight:500}}>Verifying your subscription…</div>
        </div>
      )}

      <div className="app">
        <div className="hdr">
          <img src="/logo.png" alt="DishRoll" className="hdr-logo" onClick={()=>setStep('landing')}/>
          <div className="hdr-r">
            <span className="ver">v{APP_VERSION}</span>
            {/* Pro / Free badge */}
            {isPro
              ? <span style={{fontSize:11,fontWeight:700,background:'linear-gradient(135deg,#f09200,#c87800)',color:'#fff',padding:'3px 9px',borderRadius:100,letterSpacing:'.4px'}}>✨ PRO</span>
              : <span style={{fontSize:11,fontWeight:600,background:'rgba(255,255,255,.1)',color:'#9adada',padding:'3px 9px',borderRadius:100,cursor:'pointer',letterSpacing:'.4px'}} onClick={()=>setShowPaywall(true)} title="Upgrade to Pro">
                  FREE · {rollsLeft} roll{rollsLeft!==1?'s':''} left
                </span>
            }
            {hasSl&&step!=='list'&&<button className="btn bg bsm" onClick={()=>setStep('list')}>🛒 My list{done>0?' ('+done+'/'+total+')':''}</button>}
            {step!=='landing'&&step!=='generating'&&<button className="btn bg bsm" onClick={()=>setStep('landing')}>← Home</button>}
          </div>
        </div>

        {!['landing','generating','mealplan','list'].includes(step)&&<div className="pb"><div className="pf" style={{width:prog+'%'}}/></div>}

        <div className="main">
          {step==='landing'&&<Landing/>}
          {step==='list'&&<ListView/>}

          {awk&&step==='mealplan'&&<div className="wkc"><span>{isCW(awk)?'📅 This week':'📅 '+weekLabel(awk)} · Auto-saved</span><button className="btn bg bsm" onClick={()=>setStep('landing')}>← Calendar</button></div>}

          {/* WELCOME */}
          {step==='welcome'&&(
            <div>
              <div style={{textAlign:'center',paddingTop:10,marginBottom:22}}>
                <div className="title">Roll your week.<br/><span style={{color:'#f09200',fontStyle:'italic'}}>Eat well.</span></div>
                {awk&&<p style={{fontSize:13,color:'#4a7070',marginTop:5}}>📅 {weekLabel(awk)}</p>}
                <div className="rb" style={{margin:'10px auto 0'}}>🎲 AI-powered random meal generation</div>
              </div>
              <div className="card">
                <div className="lbl">What would you like to roll?</div>
                <div className="mtg">
                  {[{id:'dinner',icon:'🌙',label:'Dinner Only',sub:'Evening meals'},{id:'all',icon:'☀️',label:'All Meals',sub:'Breakfast, lunch & dinner'},{id:'custom',icon:'✏️',label:'Custom',sub:'Choose meal types'}].map(o=>(
                    <div key={o.id} className={'mtc '+(prefs.mealScope===o.id?'s':'')} onClick={()=>sc(o.id)}>
                      <div className="mtic">{o.icon}</div><div className="mtl">{o.label}</div><div className="mts">{o.sub}</div>
                    </div>
                  ))}
                </div>
                {prefs.mealScope==='custom'&&<div style={{marginTop:12}}><div className="lbl">Meal types</div><div className="chips">{['breakfast','lunch','dinner'].map(t=><div key={t} className={'chip '+(prefs.mealTypes.includes(t)?'s':'')} onClick={()=>tt(t)} style={{textTransform:'capitalize'}}>{ML[t]}</div>)}</div></div>}
              </div>
              {favs.length>0&&<div className="fn">⭐ {favs.length} saved favourite{favs.length>1?'s':''} — we'll roll them in where they fit.</div>}
              <div className="nr"><button className="btn bg" onClick={()=>setStep('landing')}>← Back</button><button className="btn bp" onClick={()=>setStep('days')}>Continue →</button></div>
            </div>
          )}

          {/* DAYS — inlined */}
          {step==='days'&&(
            <div>
              <div className="title">Which days<br/><span style={{color:'#f09200',fontStyle:'italic'}}>do you need meals?</span></div>
              <p className="sub">Select the days to plan for.</p>
              <div className="card">
                <div className="lbl">Select days — {sdays.length} of 7</div>
                <div className="dg">{DAYS.map(d=><div key={d} className={'dc '+(sdays.includes(d)?'s':'')} onClick={()=>td(d)}><div className="dl">{d.slice(0,1)}</div><div className="dn">{DAY_SHORT[d]}</div></div>)}</div>
                <div style={{display:'flex',gap:7,marginTop:11}}>
                  <button className="btn bg bsm" onClick={()=>sp('selectedDays',[...DAYS])}>All 7</button>
                  <button className="btn bg bsm" onClick={()=>sp('selectedDays',['Monday','Tuesday','Wednesday','Thursday','Friday'])}>Weekdays</button>
                  <button className="btn bg bsm" onClick={()=>sp('selectedDays',['Saturday','Sunday'])}>Weekend</button>
                </div>
              </div>
              <div className="nr"><button className="btn bg" onClick={()=>setStep('welcome')}>← Back</button><button className="btn bp" onClick={()=>setStep('cuisines')} disabled={sdays.length===0}>Continue →</button></div>
            </div>
          )}

          {/* CUISINES */}
          {step==='cuisines'&&(
            <div>
              <div className="title">Cuisine<br/><span style={{color:'#f09200',fontStyle:'italic'}}>preferences</span></div>
              <p className="sub">Choose cuisines to roll from. Leave blank for maximum variety.</p>
              <div className="card"><div className="lbl">Select your favourites</div><div className="chips">{CUISINE_OPTIONS.map(c=><div key={c} className={'chip '+(prefs.cuisines.includes(c)?'s':'')} onClick={()=>{const n=prefs.cuisines.includes(c)?prefs.cuisines.filter(x=>x!==c):[...prefs.cuisines,c];sp('cuisines',n);}}>{c}</div>)}</div></div>
              <div className="nr"><button className="btn bg" onClick={()=>setStep('days')}>← Back</button><button className="btn bp" onClick={()=>setStep('dietary')}>Continue →</button></div>
            </div>
          )}

          {/* DIETARY */}
          {step==='dietary'&&(
            <div>
              <div className="title">Dietary<br/><span style={{color:'#f09200',fontStyle:'italic'}}>requirements</span></div>
              <p className="sub">Any restrictions we should keep out of the roll?</p>
              <div className="card"><div className="lbl">Select all that apply</div><div className="chips">{DIETARY_OPTIONS.map(d=><div key={d} className={'chip '+(prefs.dietary.includes(d)?'a':'')} onClick={()=>{const n=prefs.dietary.includes(d)?prefs.dietary.filter(x=>x!==d):[...prefs.dietary,d];sp('dietary',n);}}>{d}</div>)}</div></div>
              <div className="nr"><button className="btn bg" onClick={()=>setStep('cuisines')}>← Back</button><button className="btn bp" onClick={()=>setStep('variability')}>Continue →</button></div>
            </div>
          )}

          {/* VARIABILITY — inlined */}
          {step==='variability'&&(
            <div>
              <div className="title">Your culinary<br/><span style={{color:'#f09200',fontStyle:'italic'}}>personality</span></div>
              <p className="sub">Set your adventure level, complexity, and any must-have meals.</p>
              <div className="card"><div className="lbl">Adventure level</div><input type="range" min={0} max={100} value={prefs.variability} onChange={e=>sp('variability',+e.target.value)} className="sl"/><div className="vl"><span>🏠 Classics</span><span style={{fontWeight:600,color:'#f09200'}}>{prefs.variability<33?'Safe & familiar':prefs.variability<66?'Balanced mix':'Wild & adventurous 🎲'}</span><span>🌏 Surprises</span></div></div>
              <div className="card"><div className="lbl">Dish complexity</div><div className="cxg">{COMPLEXITY_OPTS.map(o=><div key={o.id} className={'cxc '+(prefs.dishComplexity===o.id?'s':'')} onClick={()=>sp('dishComplexity',o.id)}><div className="cxl">{o.label}</div><div className="cxd">{o.desc}</div></div>)}</div></div>
              <div className="card">
                <div className="lbl">Lock in favourites (optional)</div>
                <p className="hint">Name dishes you love — we'll make sure they land in the roll.</p>
                <div style={{display:'flex',gap:8,marginBottom:9}}><input className="inp" placeholder="e.g. Chicken tikka, borscht…" value={prefs.favInput} onChange={e=>sp('favInput',e.target.value)} onKeyDown={e=>e.key==='Enter'&&afm()} style={{flex:1}}/><button className="btn bg bsm" onClick={afm}>Add</button></div>
                <div className="chips">{prefs.favoriteMeals.map((m,i)=><div key={i} className="tag">{m}<button onClick={()=>sp('favoriteMeals',prefs.favoriteMeals.filter((_,j)=>j!==i))}>×</button></div>)}</div>
              </div>
              <div className="nr"><button className="btn bg" onClick={()=>setStep('dietary')}>← Back</button><button className="btn bp" onClick={()=>setStep('budget')}>Continue →</button></div>
            </div>
          )}

          {/* BUDGET — inlined */}
          {step==='budget'&&(
            <div>
              <div className="title">Weekly<br/><span style={{color:'#f09200',fontStyle:'italic'}}>food budget</span></div>
              <p className="sub">Set a grocery budget and we'll keep meals within range. Optional.</p>
              <div className="card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:13}}>
                  <div className="lbl" style={{margin:0}}>Enable budget planning</div>
                  <div style={{display:'flex',gap:8}}>{[{v:true,l:'Yes'},{v:false,l:'Skip'}].map(o=><div key={String(o.v)} className={'chip '+(prefs.budgetEnabled===o.v?'s':'')} onClick={()=>sp('budgetEnabled',o.v)}>{o.l}</div>)}</div>
                </div>
                {prefs.budgetEnabled?(
                  <><div className="lbl">Currency</div><div className="crr">{Object.entries(CURRENCY_SYMBOLS).map(([c,s])=><div key={c} className={'cc '+(prefs.currency===c?'s':'')} onClick={()=>sp('currency',c)}>{s} {c}</div>)}</div><div className="lbl">Weekly grocery budget</div><div className="brow"><div className="bw"><span className="bpx">{sym}</span><input className="inp bi" type="number" min="0" placeholder="e.g. 120" value={prefs.weeklyBudget} onChange={e=>sp('weeklyBudget',e.target.value)}/></div><span className="pl2">per week · {tsrv} person{tsrv>1?'s':''}</span></div>{prefs.weeklyBudget&&<p style={{fontSize:12,color:'#4a8888',marginTop:6}}>≈ {sym}{(parseFloat(prefs.weeklyBudget)/(sdays.length*prefs.mealTypes.length)).toFixed(1)} per meal</p>}</>
                ):<p style={{fontSize:13,color:'#7a9898',fontStyle:'italic'}}>No budget — rolling purely on taste.</p>}
              </div>
              <div className="nr"><button className="btn bg" onClick={()=>setStep('variability')}>← Back</button><button className="btn bp" onClick={()=>setStep('servings')}>Continue →</button></div>
            </div>
          )}

          {/* SERVINGS — inlined */}
          {step==='servings'&&(
            <div>
              <div className="title">Who are you<br/><span style={{color:'#f09200',fontStyle:'italic'}}>rolling for?</span></div>
              <p className="sub">We'll scale ingredients and portions for your household.</p>
              <div className="card">
                <div className="pg2">
                  <div className="pc"><div className="pl">👨‍👩‍👧 Adults</div><div className="cr"><button className="cb" onClick={()=>prefs.adults>1&&sp('adults',prefs.adults-1)} disabled={prefs.adults<=1}>−</button><div className="cn">{prefs.adults}</div><button className="cb" onClick={()=>prefs.adults<10&&sp('adults',prefs.adults+1)}>+</button></div></div>
                  <div className="pc"><div className="pl">👧 Kids</div><div className="cr"><button className="cb" onClick={()=>prefs.kids>0&&sp('kids',prefs.kids-1)} disabled={prefs.kids<=0}>−</button><div className="cn">{prefs.kids}</div><button className="cb" onClick={()=>prefs.kids<8&&sp('kids',prefs.kids+1)}>+</button></div></div>
                </div>
                {prefs.kids>0&&<div className={'kt '+(prefs.kidsDifferentFood?'on':'')} onClick={()=>sp('kidsDifferentFood',!prefs.kidsDifferentFood)}><div className="kb">{prefs.kidsDifferentFood?'✓':''}</div><div><div className="kt-t">Kids get different, child-friendly meals</div><div className="kt-s">We'll suggest simpler alternatives alongside adult meals</div></div></div>}
                <div style={{marginTop:11,padding:'8px 12px',background:'#f8fefe',borderRadius:9,fontSize:13,color:'#4a7070'}}>Cooking for <strong style={{color:'#0a4848'}}>{tsrv} {tsrv===1?'person':'people'}</strong>{prefs.kids>0&&prefs.kidsDifferentFood?' + '+prefs.kids+' kids (separate dishes)':''}</div>
              </div>
              {err&&<div className="err">⚠️ {err}</div>}
              <div className="nr"><button className="btn bg" onClick={()=>setStep('budget')}>← Back</button><button className="broll" onClick={roll}>🎲 Roll my week</button></div>
            </div>
          )}

          {/* GENERATING */}
          {step==='generating'&&<div className="lsc"><div className="da"><img src="/logo.png" alt="DishRoll" style={{width:90,height:'auto'}}/></div><div className="lm">{loadMsg}</div><p className="lsb">Usually takes 5–10 seconds…</p></div>}

          {/* MEAL PLAN */}
          {step==='mealplan'&&plan&&(()=>{
            const gc='106px repeat('+sdays.length+',1fr)';
            const mw=Math.max(580,100+sdays.length*105);
            return (
              <div>
                <div className="sh">
                  <div><div className="title" style={{fontSize:26,marginBottom:3}}>Your roll<br/><span style={{color:'#f09200',fontStyle:'italic'}}>is in.</span></div><p style={{fontSize:12,color:'#4a7070',lineHeight:1.7}}>Click name or 📖 for recipe · ☆ favourite · 🎲 re-roll · click cell to add to list</p></div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    {hasSl&&<button className="btn bg bsm" onClick={()=>setStep('list')}>🛒 List</button>}
                    <button className="btn bg bsm" onClick={()=>newRoll(awk||cwKey())}>🎲 Re-roll</button>
                  </div>
                </div>
                {prefs.budgetEnabled&&Object.keys(costs).length>0&&<div className="bsum"><div><div className="bsl">Estimated weekly cost</div><div style={{fontSize:11,color:'#4a8080'}}>{sdays.length} days · {tsrv} servings</div></div><div><div className={'bsv '+(over?'bso':'')}>{sym}{tcost.toFixed(0)}</div>{bgt>0&&<div style={{fontSize:11,color:over?'#c93939':'#4a8888',textAlign:'right'}}>{over?sym+(tcost-bgt).toFixed(0)+' over':sym+(bgt-tcost).toFixed(0)+' under'}</div>}</div></div>}
                <div style={{overflowX:'auto',marginBottom:14}}>
                  <div className="mg" style={{gridTemplateColumns:gc,minWidth:mw}}>
                    <div/>{sdays.map(d=><div key={d} className="gh">{DAY_SHORT[d]}</div>)}
                    {prefs.mealTypes.map(mt=>(
                      <Fragment key={mt}>
                        {/* Adult row */}
                        <div className="gl">{ML[mt]}</div>
                        {sdays.map(day=>{
                          const m=plan?.[day.toLowerCase()]?.[mt];
                          const k=day.toLowerCase()+'-'+mt;
                          const s=sel.has(k),fv=m&&favs.includes(m.name),co=costs[k];
                          return (
                            <div key={day} className={'mc '+(s?'ss':'')} onClick={()=>m&&tgSel(k)}>
                              {m?(<>
                                {s&&<div className="cb2">✓</div>}
                                {fv&&<div className="fd">⭐</div>}
                                <div className="mn" onClick={e=>{e.stopPropagation();openRecipe(m,mt);}}>{m.name}</div>
                                <div className="md">{m.description}</div>
                                <div className="mm"><span className="mt">⏱ {m.time}</span>{prefs.budgetEnabled&&co!=null&&<span className="mco">{sym}{co}</span>}</div>
                                <div className="ma" onClick={e=>e.stopPropagation()}>
                                  <button className="ib" onClick={()=>tf(m.name)}>{fv?'⭐':'☆'}</button>
                                  <button className="ib" onClick={()=>openRecipe(m,mt)}>📖</button>
                                  <button className="ib" onClick={()=>openSwap(day,mt)}>🎲</button>
                                </div>
                              </>):<div style={{color:'#ddd',fontSize:10,textAlign:'center',margin:'auto'}}>—</div>}
                            </div>
                          );
                        })}
                        {/* Kids row — only when kidsDifferentFood is on */}
                        {prefs.kids>0&&prefs.kidsDifferentFood&&(
                          <>
                            <div className="gl" style={{color:'#2a7a2a',fontSize:11}}>👧 Kids</div>
                            {sdays.map(day=>{
                              const ka=plan?.[day.toLowerCase()]?.[mt]?.kidsAlt;
                              const kname = typeof ka==='object' ? ka?.name : ka;
                              const kIngs = typeof ka==='object' ? ka?.ingredients||[] : [];
                              const kk=day.toLowerCase()+'-'+mt+'-kids';
                              const ks=kidsSel.has(kk);
                              return (
                                <div key={day} className={'mc '+(ks?'ssk':'')} style={{borderColor:ks?'#2a7a2a':'#b8d8b8',background:ks?'#f0f8f0':'#fafffe'}} onClick={()=>kname&&tgKidsSel(kk)}>
                                  {kname?(<>
                                    {ks&&<div className="cb2" style={{background:'#2a7a2a'}}>✓</div>}
                                    <div className="mn" style={{color:'#2a7a2a'}} onClick={e=>{e.stopPropagation();openRecipe({name:kname,ingredients:kIngs,time:'~20 min'},mt,'kids');}}>{kname}</div>
                                    <div className="md" style={{fontSize:10,color:'#4a7a4a'}}>Kid-friendly · {prefs.kids} portion{prefs.kids>1?'s':''}</div>
                                    <div className="ma" onClick={e=>e.stopPropagation()}>
                                      <button className="ib" onClick={()=>openRecipe({name:kname,ingredients:kIngs,time:'~20 min'},mt,'kids')}>📖</button>
                                    </div>
                                  </>):<div style={{color:'#cdc',fontSize:10,textAlign:'center',margin:'auto'}}>—</div>}
                                </div>
                              );
                            })}
                          </>
                        )}
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:'#0a4848',marginBottom:2}}>🛒 Build shopping list</div>
                      <div style={{fontSize:12,color:'#4a7070'}}>
                        {sel.size} adult{sel.size!==1?'s':''} + {kidsSel.size} kids meal{kidsSel.size!==1?'s':''} selected
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn bg bsm" onClick={selAll}>Select all</button>
                      <button className="btn bg bsm" onClick={()=>{setSel(new Set());setKidsSel(new Set());}}>Clear</button>
                    </div>
                  </div>
                  {err&&<div className="err" style={{marginBottom:8}}>⚠️ {err}</div>}
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button className="btn bp" onClick={buildList} disabled={(!sel.size&&!kidsSel.size)||loading}>{loading?'⏳ Building…':'Build list ('+(sel.size+kidsSel.size)+' meal'+((sel.size+kidsSel.size)!==1?'s':'')+')'}</button>
                    {hasSl&&<button className="btn bg" onClick={()=>setStep('list')}>🛒 Open existing list</button>}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
        <RecipeModal/>
        <SwapModal/>
        <PaywallModal/>
        {showT&&<div className="tst">{toast}</div>}
      </div>
    </div>
  );
}
