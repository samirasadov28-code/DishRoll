import { useState, useEffect, Fragment, useRef } from "react";

const APP_VERSION = "0.1.0";

// Safe analytics wrapper — calls window.track if GA is loaded
const track = (name, params) => {
  try { if(typeof window.track==='function') window.track(name, params); } catch {}
};

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };
const CUISINE_OPTIONS = ['Italian','Asian','Mexican','Mediterranean','Indian','French','American','Middle Eastern','Japanese','Thai','Greek','Spanish','Moroccan','Lebanese','Vietnamese','Ukrainian','Azerbaijani'];
const DIETARY_OPTIONS = ['Vegetarian','Vegan','Gluten-Free','Dairy-Free','Keto','Paleo','Nut-Free','Low-Carb','High-Protein','Pescatarian'];
const CURRENCY_SYMBOLS = { EUR:'€', GBP:'£', USD:'$', CAD:'CA$', AUD:'A$' };
const ML = { breakfast:'🌅 Breakfast', lunch:'🕐 Lunch', dinner:'🌙 Dinner' };
const ROLL_MSGS = ['Planning your week…','Choosing your meals…','Crafting your menu…','Selecting fresh ideas…','Putting it all together…'];
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
const PRICE_MONTHLY = '€3.99';

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

function getMondayOf(d) {
  const r=new Date(d), day=r.getDay();
  r.setDate(r.getDate()+(day===0?-6:1-day));
  r.setHours(0,0,0,0);
  return r;
}
function weekKey(d) {
  const m=getMondayOf(d);
  // Use local date parts — toISOString() uses UTC and shifts midnight back in UTC+ timezones
  const y=m.getFullYear();
  const mo=String(m.getMonth()+1).padStart(2,'0');
  const dy=String(m.getDate()).padStart(2,'0');
  return `${y}-${mo}-${dy}`;
}
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
  let c=(d.text||'').replace(/```json|```/g,'').trim();
  // Attempt to repair truncated JSON by closing unclosed structures
  c = repairJSON(c);
  const m=c.match(/(\{[\s\S]*\}|\[[\s\S]*\])/); return m?m[1]:c;
}

// Repair JSON that was cut off mid-stream due to token limits
function repairJSON(str) {
  try { JSON.parse(str); return str; } catch {} // already valid
  // Count unclosed braces/brackets and close them
  let opens = 0, inStr = false, escaped = false;
  const opens2 = [];
  for(let i=0;i<str.length;i++){
    const ch=str[i];
    if(escaped){ escaped=false; continue; }
    if(ch==='\\'&&inStr){ escaped=true; continue; }
    if(ch==='"'){ inStr=!inStr; continue; }
    if(inStr) continue;
    if(ch==='{') opens2.push('}');
    else if(ch==='[') opens2.push(']');
    else if(ch==='}'||ch===']') opens2.pop();
  }
  // Close any open string first, then close structures in reverse
  let repaired = str.trimEnd();
  if(inStr) repaired += '"';
  // Remove trailing comma before closing
  repaired = repaired.replace(/,\s*$/, '');
  repaired += opens2.reverse().join('');
  try { JSON.parse(repaired); return repaired; } catch { return str; }
}
// Curated Unsplash food photos by category — permanent CDN URLs, always load
const FOOD_PHOTOS = {
  chicken:    'https://images.unsplash.com/photo-1598103442097-8b74394b95c1?w=640&q=80',
  beef:       'https://images.unsplash.com/photo-1558030006-450675393462?w=640&q=80',
  lamb:       'https://images.unsplash.com/photo-1574484284002-952d92456975?w=640&q=80',
  pork:       'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=640&q=80',
  fish:       'https://images.unsplash.com/photo-1519708227418-a2234ef1df7a?w=640&q=80',
  seafood:    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=640&q=80',
  pasta:      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=640&q=80',
  pizza:      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=640&q=80',
  soup:       'https://images.unsplash.com/photo-1547592180-85f173990554?w=640&q=80',
  salad:      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&q=80',
  curry:      'https://images.unsplash.com/photo-1455619452474-d2be8b1af5a7?w=640&q=80',
  rice:       'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=640&q=80',
  taco:       'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=640&q=80',
  burger:     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640&q=80',
  noodle:     'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=640&q=80',
  bread:      'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640&q=80',
  egg:        'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=640&q=80',
  breakfast:  'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=640&q=80',
  dessert:    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=640&q=80',
  vegetarian: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=640&q=80',
  stew:       'https://images.unsplash.com/photo-1547592180-85f173990554?w=640&q=80',
  default:    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&q=80',
};

function getUnsplashFallback(name='', mt='') {
  const n = name.toLowerCase();
  if(n.includes('chicken')||n.includes('turkey')||n.includes('duck')||n.includes('poultry')) return FOOD_PHOTOS.chicken;
  if(n.includes('beef')||n.includes('steak')||n.includes('meatball')||n.includes('burger')) return FOOD_PHOTOS.beef;
  if(n.includes('burger')) return FOOD_PHOTOS.burger;
  if(n.includes('lamb')||n.includes('mutton')) return FOOD_PHOTOS.lamb;
  if(n.includes('pork')||n.includes('bacon')||n.includes('ham')||n.includes('sausage')) return FOOD_PHOTOS.pork;
  if(n.includes('salmon')||n.includes('tuna')||n.includes('cod')||n.includes('fish')||n.includes('halibut')) return FOOD_PHOTOS.fish;
  if(n.includes('shrimp')||n.includes('prawn')||n.includes('lobster')||n.includes('crab')||n.includes('seafood')) return FOOD_PHOTOS.seafood;
  if(n.includes('pasta')||n.includes('spaghetti')||n.includes('penne')||n.includes('linguine')||n.includes('carbonara')||n.includes('fettuccine')||n.includes('bolognese')||n.includes('lasagne')) return FOOD_PHOTOS.pasta;
  if(n.includes('pizza')) return FOOD_PHOTOS.pizza;
  if(n.includes('soup')||n.includes('broth')||n.includes('bisque')||n.includes('chowder')) return FOOD_PHOTOS.soup;
  if(n.includes('stew')||n.includes('casserole')||n.includes('tagine')||n.includes('borscht')) return FOOD_PHOTOS.stew;
  if(n.includes('salad')) return FOOD_PHOTOS.salad;
  if(n.includes('curry')||n.includes('masala')||n.includes('tikka')||n.includes('korma')||n.includes('dal')) return FOOD_PHOTOS.curry;
  if(n.includes('rice')||n.includes('risotto')||n.includes('pilaf')||n.includes('biryani')||n.includes('paella')) return FOOD_PHOTOS.rice;
  if(n.includes('taco')||n.includes('burrito')||n.includes('enchilada')||n.includes('quesadilla')||n.includes('fajita')) return FOOD_PHOTOS.taco;
  if(n.includes('noodle')||n.includes('ramen')||n.includes('pho')||n.includes('udon')||n.includes('soba')) return FOOD_PHOTOS.noodle;
  if(n.includes('bread')||n.includes('toast')||n.includes('sandwich')||n.includes('wrap')) return FOOD_PHOTOS.bread;
  if(n.includes('egg')||n.includes('omelette')||n.includes('frittata')||n.includes('quiche')) return FOOD_PHOTOS.egg;
  if(n.includes('pancake')||n.includes('waffle')||n.includes('crepe')) return FOOD_PHOTOS.breakfast;
  if(n.includes('cake')||n.includes('dessert')||n.includes('pudding')||n.includes('tart')||n.includes('brownie')) return FOOD_PHOTOS.dessert;
  if(n.includes('vegetable')||n.includes('tofu')||n.includes('vegan')||n.includes('lentil')||n.includes('chickpea')) return FOOD_PHOTOS.vegetarian;
  if(mt==='breakfast') return FOOD_PHOTOS.breakfast;
  return FOOD_PHOTOS.default;
}

async function fetchPhoto(name, mt) {
  // Try TheMealDB proxy first (real dish photos when it matches)
  try {
    const q=encodeURIComponent(name.split(' ').slice(0,3).join(' '));
    const r=await fetch('/.netlify/functions/photo?q='+q);
    if(r.ok){
      const d=await r.json();
      if(d.photo) return d.photo;
    }
  } catch {}
  // Guaranteed fallback — curated Unsplash by category
  return getUnsplashFallback(name, mt);
}
function grad(name) {
  name=name||''; let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h);
  const g=['linear-gradient(135deg,#2a6a3a,#1a9a9a)','linear-gradient(135deg,#a04820,#c4622d)','linear-gradient(135deg,#2a7a4a,#3aaa6a)','linear-gradient(135deg,#6a3a8a,#9a5aba)','linear-gradient(135deg,#8a3030,#c04040)','linear-gradient(135deg,#1a5a8a,#2a7aba)'];
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
body{font-family:'Plus Jakarta Sans',sans-serif;background:#faf7f0;color:#2a2a1a}
.app{min-height:100vh;background:#faf7f0}
.hdr{background:#1a4a2a;padding:13px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.hdr-logo{height:40px;cursor:pointer;display:block}
.hdr-r{display:flex;align-items:center;gap:8px}
.ver{font-size:11px;color:#8abca0;font-weight:600;background:rgba(255,255,255,.1);padding:3px 9px;border-radius:100px}
.pb{height:3px;background:#c8d8b8}
.pf{height:100%;background:linear-gradient(90deg,#2a6a3a,#c4622d);transition:width .4s ease}
.main{max-width:900px;margin:0 auto;padding:36px 22px 100px}
.title{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:600;color:#1a3a1a;line-height:1.15;margin-bottom:8px}
.sub{font-size:14px;color:#5a6a4a;font-weight:300;margin-bottom:28px;line-height:1.7}
.card{background:#fff;border-radius:18px;padding:24px;margin-bottom:14px;box-shadow:0 2px 12px rgba(30,60,20,.06);border:1px solid #e0ddd0}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:8px 16px;border-radius:100px;border:1.5px solid #c8d4b0;background:#fff;font-size:13px;font-weight:500;cursor:pointer;transition:all .17s;color:#2a3a1a;font-family:'Plus Jakarta Sans',sans-serif;user-select:none}
.chip:hover{border-color:#2a6a3a;color:#2a6a3a}
.chip.s{background:#2a6a3a;border-color:#2a6a3a;color:#fff}
.chip.a{background:#c4622d;border-color:#c4622d;color:#fff}
.btn{display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:100px;border:none;cursor:pointer;font-size:14px;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.bp{background:#1a4a2a;color:#fff}
.bp:hover:not(:disabled){background:#0f3020;transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,74,42,.3)}
.bg{background:transparent;color:#2a6a3a;border:1.5px solid #a0c090}
.bg:hover:not(:disabled){border-color:#2a6a3a;background:#f0f5e8}
.bd{background:transparent;color:#b04020;border:1.5px solid #e0a898}
.bd:hover:not(:disabled){background:#fef3f0;border-color:#b04020}
.bsm{padding:6px 14px;font-size:12px}
.btn:disabled{opacity:.4;cursor:not-allowed}
.broll{background:linear-gradient(135deg,#c4622d,#a04820);color:#fff;font-size:15px;padding:13px 30px;border-radius:100px;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;transition:all .2s}
.broll:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 20px rgba(196,98,45,.38)}
.inp{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid #d0ccb8;background:#fff;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;color:#2a2a1a;outline:none;transition:border-color .2s}
.inp:focus{border-color:#2a6a3a}
.sl{width:100%;accent-color:#c4622d;cursor:pointer}
.tag{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#e8f0d8;border-radius:100px;font-size:12px;color:#1a3a1a;font-weight:500}
.tag button{background:none;border:none;cursor:pointer;color:#5a8a5a;font-size:14px;line-height:1;padding:0 1px}
.tag button:hover{color:#c4622d}
.lbl{font-size:11px;font-weight:600;color:#6a7a5a;text-transform:uppercase;letter-spacing:.8px;margin-bottom:9px}
.nr{display:flex;gap:9px;margin-top:24px;align-items:center;flex-wrap:wrap}
.err{background:#fdf5e8;border:1px solid #e8cc88;color:#7a5a10;padding:10px 14px;border-radius:10px;font-size:13px;margin-top:10px}
.fn{background:#f0f5e8;border-left:3px solid #5a9a5a;padding:9px 13px;border-radius:0 10px 10px 0;font-size:12px;color:#1a3a1a;margin-bottom:11px}
.hint{font-size:12px;color:#5a6a4a;margin-bottom:9px;line-height:1.5}
.rb{display:inline-flex;align-items:center;gap:6px;background:#faf0e8;border:1px solid #e8c8a8;border-radius:100px;padding:4px 12px;font-size:12px;font-weight:600;color:#8a4010}
.vl{display:flex;justify-content:space-between;font-size:11px;color:#8a9a7a;margin-top:4px}
.dg{display:grid;grid-template-columns:repeat(7,1fr);gap:7px}
.dc{padding:10px 3px;border-radius:12px;border:2px solid #d0ccb8;background:#fff;cursor:pointer;text-align:center;transition:all .18s;user-select:none}
.dc:hover{border-color:#2a6a3a}
.dc.s{background:#2a6a3a;border-color:#2a6a3a}
.dl{font-size:10px;color:#8a9a7a;margin-bottom:2px}
.dc.s .dl{color:rgba(255,255,255,.6)}
.dn{font-size:13px;font-weight:600;color:#1a3a1a}
.dc.s .dn{color:#fff}
.cxg{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.cxc{padding:14px 12px;border-radius:14px;border:2px solid #d0ccb8;background:#fff;cursor:pointer;text-align:center;transition:all .2s;user-select:none}
.cxc:hover{border-color:#2a6a3a}
.cxc.s{border-color:#2a6a3a;background:#f4f8ec}
.cxl{font-size:13px;font-weight:600;color:#1a3a1a;margin-bottom:3px}
.cxd{font-size:11px;color:#6a7a5a;line-height:1.4}
.pg2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pc{padding:16px 12px;border-radius:16px;border:1.5px solid #e0ddd0;background:#fff;text-align:center;overflow:hidden}
.pl{font-size:11px;font-weight:600;color:#6a7a5a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.cr{display:flex;align-items:center;gap:6px;justify-content:center}
.cb{width:32px;height:32px;border-radius:50%;border:2px solid #2a6a3a;background:#fff;font-size:16px;cursor:pointer;color:#2a6a3a;display:flex;align-items:center;justify-content:center;transition:all .14s;flex-shrink:0}
.cb:hover:not(:disabled){background:#2a6a3a;color:#fff}
.cb:disabled{opacity:.3;cursor:not-allowed}
.cn{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#1a3a1a;min-width:32px;text-align:center}
.kt{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;background:#f8f5ee;border-radius:12px;border:1.5px solid #e0ddd0;cursor:pointer;margin-top:12px;user-select:none;transition:all .18s}
.kt.on{background:#f0f5e8;border-color:#2a6a3a}
.kb{width:20px;height:20px;border-radius:6px;border:2px solid #b0c8a0;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .16s;margin-top:1px}
.kt.on .kb{background:#2a6a3a;border-color:#2a6a3a;color:#fff}
.kt-t{font-size:13px;color:#1a3a1a;font-weight:500}
.kt-s{font-size:11px;color:#6a7a5a;margin-top:2px}
.mg{display:grid;gap:6px}
.gh{font-size:10px;font-weight:600;color:#8a9a7a;text-align:center;padding:6px 2px;text-transform:uppercase;letter-spacing:.5px}
.gl{font-size:11px;font-weight:600;color:#1a3a1a;display:flex;align-items:center;padding:4px 5px;line-height:1.3}
.mc{background:#fff;border-radius:12px;padding:9px 8px;border:1.5px solid #e0ddd0;position:relative;min-height:108px;display:flex;flex-direction:column;transition:all .18s;cursor:pointer}
.mc:hover{border-color:#a0c090;box-shadow:0 2px 8px rgba(30,60,20,.08)}
.mc.ss{border-color:#2a6a3a;background:#f4f8ec}
.mc.ssk{border-color:#5a8a2a;background:#f0f7e4}
.mn{font-size:11px;font-weight:600;color:#1a3a1a;line-height:1.3;margin-bottom:2px}
.mn:hover{color:#2a6a3a;text-decoration:underline}
.md{font-size:10px;color:#6a7a5a;line-height:1.4;flex:1}
.mk{font-size:10px;color:#2a5a1a;background:#e4f0d4;padding:2px 5px;border-radius:4px;margin-top:3px;display:inline-block;cursor:pointer}
.mm{display:flex;align-items:center;justify-content:space-between;margin-top:4px}
.mt2{font-size:10px;color:#8a9a7a}
.mco{font-size:10px;font-weight:600;color:#5a6a2a;background:#eef5d8;padding:1px 5px;border-radius:4px}
.ma{display:flex;gap:2px;margin-top:4px}
.ib{background:none;border:none;cursor:pointer;padding:2px 4px;border-radius:5px;font-size:12px;transition:background .14s;line-height:1}
.ib:hover{background:#e8f0d8}
.cb2{position:absolute;top:5px;left:5px;width:14px;height:14px;background:#2a6a3a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:7px;color:#fff}
.fd{position:absolute;top:4px;right:4px;font-size:10px}
.lh{background:linear-gradient(135deg,#1a4a2a,#2a6a3a);border-radius:20px;padding:24px;margin-bottom:24px;color:#fff}
.lh-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
.lt{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;margin-bottom:3px}
.ls{font-size:12px;color:rgba(255,255,255,.65)}
.lpw{background:rgba(255,255,255,.2);border-radius:100px;height:7px;overflow:hidden;margin-bottom:5px}
.lpf{height:100%;background:#fff;border-radius:100px;transition:width .4s ease}
.lpt{font-size:11px;color:rgba(255,255,255,.7);display:flex;justify-content:space-between}
.la{display:flex;gap:7px;flex-wrap:wrap;margin-top:14px}
.lab{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:100px;padding:7px 15px;font-size:12px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s;display:inline-flex;align-items:center;gap:5px}
.lab:hover{background:rgba(255,255,255,.25)}
.ldb{background:linear-gradient(135deg,#2a6a2a,#3a8a3a);border-radius:16px;padding:22px;text-align:center;margin-bottom:18px;color:#fff}
.ldi{font-size:44px;margin-bottom:8px}
.ldt{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;margin-bottom:3px}
.lds{font-size:13px;color:rgba(255,255,255,.8)}
.cs{margin-bottom:20px}
.ch{display:flex;align-items:center;justify-content:space-between;padding:10px 0 8px;border-bottom:1px solid #e8e4d8;margin-bottom:4px}
.chn{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#1a3a1a;display:flex;align-items:center;gap:8px}
.chp{font-size:12px;color:#8a9a7a}
.li{display:flex;align-items:center;min-height:52px;cursor:pointer;border-radius:12px;transition:background .15s;user-select:none;padding:2px 6px}
.li:hover{background:#f4f0e8}
.li.di{opacity:.45}
.lcb{width:50px;height:52px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.circ{width:26px;height:26px;border-radius:50%;border:2px solid #c8d4b0;background:#fff;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.li:not(.di) .circ:hover{border-color:#2a6a3a}
.circ.ck{background:#2a6a3a;border-color:#2a6a3a}
.tick{color:#fff;font-size:13px;font-weight:700;line-height:1}
.lit{flex:1;font-size:15px;color:#2a2a1a;line-height:1.4;padding:4px 0}
.li.di .lit{text-decoration:line-through;color:#aaa898}
.ldiv{height:1px;background:#f0ece0;margin:0 54px}
.air{display:flex;gap:9px;align-items:center;margin-top:14px;padding:11px 14px;background:#fff;border-radius:14px;border:1.5px dashed #c8d4b0}
.air:focus-within{border-color:#2a6a3a;background:#f8faf4}
.ai{flex:1;border:none;background:transparent;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;color:#2a2a1a;outline:none;padding:2px 0}
.ai::placeholder{color:#b0b898}
.ab{background:#2a6a3a;color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0;transition:background .15s}
.ab:hover{background:#1a4a2a}
.bsum{background:#f4f8ec;border-radius:14px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border:1px solid #d8e4c0}
.bsl{font-size:12px;color:#3a5a2a;font-weight:500}
.bsv{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1a4a1a}
.bso{color:#b04020}
.crr{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.cc{padding:7px 14px;border-radius:10px;border:1.5px solid #d0ccb8;background:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all .16s;color:#2a2a1a}
.cc:hover{border-color:#2a6a3a}
.cc.s{background:#2a6a3a;border-color:#2a6a3a;color:#fff}
.brow{display:flex;align-items:center;gap:12px}
.bw{position:relative;flex:1}
.bpx{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-weight:600;font-size:14px;color:#6a7a5a;pointer-events:none}
.bi{padding-left:28px}
.pl2{font-size:12px;color:#6a7a5a;white-space:nowrap;font-weight:500}
.land-hero{text-align:center;padding:56px 16px 44px}
.land-logo{width:96px;margin:0 auto 20px;display:block}
.land-tagline{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8a9a7a;margin-bottom:12px}
.land-h1{font-family:'Cormorant Garamond',serif;font-size:52px;font-weight:600;color:#1a3a1a;line-height:1.05;margin-bottom:14px}
.land-h1 em{color:#c4622d;font-style:italic}
.land-sub{font-size:15px;color:#5a6a4a;max-width:380px;margin:0 auto;line-height:1.7;font-weight:300}
.land-cta{margin-top:28px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.btn-cta-p{background:#1a4a2a;color:#fff;border:none;padding:14px 28px;border-radius:100px;font-size:15px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.btn-cta-p:hover{background:#0f3020;transform:translateY(-1px);box-shadow:0 6px 20px rgba(26,74,42,.3)}
.btn-cta-s{background:transparent;color:#2a6a3a;border:1.5px solid #a0c090;padding:13px 24px;border-radius:100px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.btn-cta-s:hover{background:#f0f5e8}
.cw-hero{border-radius:22px;overflow:hidden;margin-bottom:28px}
.cw-bg{background:linear-gradient(145deg,#1a4a2a,#2a6a3a);padding:28px 28px 24px;color:#fff}
.cw-eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.5);margin-bottom:8px}
.cw-range{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;margin-bottom:6px}
.cw-status{font-size:13px;color:rgba(255,255,255,.65);margin-bottom:20px}
.cw-meals-preview{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px}
.cw-meal-pill{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:12px;font-weight:500;padding:5px 13px;border-radius:100px}
.cw-actions{display:flex;gap:9px;flex-wrap:wrap}
.cw-btn-p{background:#fff;color:#1a4a2a;border:none;padding:11px 22px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s}
.cw-btn-p:hover{background:#f0f5e8;transform:translateY(-1px)}
.cw-btn-s{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);padding:10px 18px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s}
.cw-btn-s:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.7)}
.list-strip{background:#fff;border-radius:16px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e0ddd0;cursor:pointer;transition:all .2s}
.list-strip:hover{border-color:#a0c090;transform:translateY(-1px);box-shadow:0 4px 12px rgba(30,60,20,.08)}
.ls-left{display:flex;align-items:center;gap:14px}
.ls-icon{width:44px;height:44px;background:#f0f5e8;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.ls-title{font-size:14px;font-weight:600;color:#1a3a1a;margin-bottom:2px}
.ls-sub{font-size:12px;color:#7a8a6a}
.ls-prog{font-size:13px;font-weight:600;color:#2a6a3a}
.wt-section{margin-bottom:32px}
.wt-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1a3a1a;margin-bottom:16px}
.wt-scroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}
.wt-scroll::-webkit-scrollbar{display:none}
.wt-card{flex-shrink:0;width:158px;background:#fff;border-radius:16px;padding:16px;border:1.5px solid #e0ddd0;cursor:pointer;transition:all .2s;position:relative}
.wt-card:hover{border-color:#a0c090;transform:translateY(-2px);box-shadow:0 4px 12px rgba(30,60,20,.1)}
.wt-card.cur{border-color:#c4622d}
.wt-card.emp{border-style:dashed;cursor:default}
.wt-card.emp:hover{transform:none;box-shadow:none}
.wt-dot{width:8px;height:8px;border-radius:50%;background:#e0ddd0;margin-bottom:10px}
.wt-card.cur .wt-dot{background:#c4622d}
.wt-card.has .wt-dot{background:#2a6a3a}
.wt-date-range{font-size:12px;font-weight:600;color:#1a3a1a;margin-bottom:4px;line-height:1.3}
.wt-lbl{font-size:10px;color:#8a9a7a;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}
.wt-meals{display:flex;flex-direction:column;gap:3px;margin-bottom:8px}
.wt-meal{font-size:11px;color:#3a5a3a;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wt-empty{font-size:11px;color:#b0b898;margin-bottom:8px}
.wt-acts{display:flex;gap:5px;flex-wrap:wrap}
.wt-btn{font-size:11px;padding:4px 10px;border-radius:100px;border:1.5px solid #d0ccb8;background:transparent;color:#4a6a4a;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s}
.wt-btn:hover{border-color:#2a6a3a;color:#2a6a3a}
.wt-btn.p{background:#1a4a2a;color:#fff;border-color:#1a4a2a}
.wt-badge{position:absolute;top:-7px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
.wt-badge.now{background:#c4622d;color:#fff}
.wt-badge.don{background:#e8f0d8;color:#3a5a2a}
.land-footer{text-align:center;padding:16px 0 8px;display:flex;align-items:center;justify-content:center;gap:16px;flex-wrap:wrap}
.land-footer-v{font-size:11px;color:#aaa898}
.btn-fu-sm{background:transparent;border:none;color:#8a9a7a;font-size:12px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;display:inline-flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;transition:background .15s}
.btn-fu-sm:hover{background:#f0ece0;color:#2a3a1a}
.plan-strip{border-radius:14px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.plan-strip.free{background:#fff;border:1px solid #e0ddd0}
.plan-strip.premium{background:linear-gradient(135deg,#1a4a2a,#2a6a3a);color:#fff}
.lsc{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:58vh;gap:22px;text-align:center}
.lsc-icon{font-size:64px;animation:lspulse 2.2s ease-in-out infinite}
@keyframes lspulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.lm{font-family:'Cormorant Garamond',serif;font-size:22px;color:#1a3a1a;font-style:italic;max-width:300px}
.lsb{font-size:13px;color:#8a9a7a}
.mo{position:fixed;inset:0;background:rgba(20,30,15,.65);z-index:200;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}
.md2{background:#fff;border-radius:22px;padding:24px;max-width:430px;width:100%}
.mtt{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1a3a1a;margin-bottom:3px}
.ms{font-size:13px;color:#6a7a5a;margin-bottom:16px}
.sc{padding:13px;border-radius:13px;border:1.5px solid #e0ddd0;margin-bottom:8px;cursor:pointer;transition:all .17s}
.sc:hover{border-color:#2a6a3a;background:#f4f8ec;transform:translateX(3px)}
.sn{font-weight:600;font-size:14px;color:#1a3a1a;margin-bottom:2px}
.sd{font-size:12px;color:#6a7a5a}
.sf{display:flex;gap:9px;margin-top:4px;font-size:11px;color:#8a9a7a}
.ro{position:fixed;inset:0;background:rgba(20,30,15,.65);z-index:300;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(7px)}
@media(min-width:600px){.ro{align-items:center;padding:22px}}
.rm{background:#fff;border-radius:24px 24px 0 0;max-width:540px;width:100%;max-height:92vh;min-height:300px;overflow:hidden;display:flex;flex-direction:column}
@media(min-width:600px){.rm{border-radius:24px;max-height:88vh}}
.rph{width:100%;height:220px;object-fit:cover;display:block;flex-shrink:0}
.rpf{width:100%;height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;flex-shrink:0}
.rpl{width:100%;height:220px;background:#e8e4d8;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.rph2{padding:18px 22px 14px;border-bottom:1px solid #f0ece0;flex-shrink:0}
.rht{display:flex;align-items:flex-start;justify-content:space-between;gap:9px;margin-bottom:10px}
.rc{background:#f4f0e8;border:none;color:#6a7a5a;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .14s}
.rc:hover{background:#e8e4d8;color:#1a3a1a}
.rn{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:600;color:#1a3a1a;line-height:1.2;flex:1}
.rps{display:flex;gap:6px;flex-wrap:wrap}
.rp{background:#f4f0e8;border:1px solid #e0ddd0;border-radius:100px;padding:4px 11px;font-size:11px;font-weight:500;color:#2a3a1a}
.rb2{overflow-y:auto;padding:16px 22px 28px;flex:1;min-height:0}
.rst{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a9a7a;margin:16px 0 9px}
.rst:first-child{margin-top:0}
.ri{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0ece0;font-size:14px;color:#2a2a1a}
.ri:last-child{border:none}
.rd{width:7px;height:7px;border-radius:50%;background:#2a6a3a;flex-shrink:0}
.rstep{display:flex;gap:12px;margin-bottom:13px;align-items:flex-start}
.rsn{min-width:27px;height:27px;border-radius:50%;background:#c4622d;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.rst2{font-size:14px;color:#2a2a1a;line-height:1.65;flex:1}
.rtip{background:#f4f8ec;border-left:3px solid #2a6a3a;padding:10px 14px;border-radius:0 10px 10px 0;font-size:13px;color:#1a3a1a;line-height:1.6;margin-top:6px}
.rld{display:flex;flex-direction:column;align-items:center;gap:12px;padding:28px 0;color:#6a7a5a;font-size:13px}
.rsp{width:30px;height:30px;border:3px solid #e0ddd0;border-top-color:#2a6a3a;border-radius:50%;animation:rsp .8s linear infinite}
@keyframes rsp{to{transform:rotate(360deg)}}
.mp{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
.mpl{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:#f4f8ec;border:1.5px solid #c8d4b0;border-radius:100px;font-size:12px;color:#2a6a3a;font-weight:500;cursor:pointer;transition:all .16s}
.mpl:hover{border-color:#2a6a3a;background:#e8f0d8}
.tst{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a3a1a;color:#fff;padding:10px 24px;border-radius:100px;font-size:13px;font-weight:500;z-index:500;animation:tst .3s ease;pointer-events:none;white-space:nowrap}
@keyframes tst{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.sh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
.wkc{background:#f0f5e8;border-radius:10px;padding:9px 14px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:9px;font-size:13px;color:#1a3a1a;font-weight:600;border:1px solid #d8e4c0}
.mtg{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mtc{padding:18px 12px;border-radius:16px;border:2px solid #d0ccb8;background:#fff;cursor:pointer;text-align:center;transition:all .2s;user-select:none}
.mtc:hover{border-color:#2a6a3a}
.mtc.s{border-color:#2a6a3a;background:#f4f8ec}
.mtic{font-size:24px;margin-bottom:6px}
.mtl{font-weight:600;font-size:14px;color:#1a3a1a}
.mts{font-size:11px;color:#6a7a5a;margin-top:2px}
.spin{animation:s360 .7s linear infinite}
@keyframes s360{to{transform:rotate(360deg)}}
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
    const act=params.get('activate');

    // Direct premium activation link (?activate=premium)
    // Share this URL with users you want to give free access
    if(act==='premium'){
      window.history.replaceState({},document.title,window.location.pathname);
      const pdata={email:'premium@dishroll.app',customerId:'manual',validUntil:Date.now()+365*24*60*60*1000};
      savePremium(pdata); setPremium(pdata);
      pop('✨ Premium activated! Enjoy unlimited rolls.');
    }
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
            track('premium_activated',{email:d.email});
            pop('🎉 Welcome to DishRoll Premium!');
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
  useEffect(()=>{ if(allDone&&total>0) track('list_completed',{items:total}); },[allDone]);

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
    track('upgrade_clicked',{from:step});
    window.location.href = 'https://buy.stripe.com/dRmfZidobbBQeWZaIx2Ry02';
  }

  function cancelPremium() {
    clearPremium(); setPremium(null);
    pop('Premium subscription removed from this device.');
  }

  async function roll() {
    // Gate check
    if(!canRoll){ setShowPaywall(true); track('paywall_shown',{trigger:'roll_limit'}); return; }
    track('roll_started',{days:sdays.length,meal_types:prefs.mealTypes.join(','),cuisines:prefs.cuisines.join(','),complexity:prefs.dishComplexity,is_pro:isPro});
    setStep('generating'); setErr('');
    let i=0; setLoadMsg(ROLL_MSGS[0]);
    const iv=setInterval(()=>{i=(i+1)%ROLL_MSGS.length;setLoadMsg(ROLL_MSGS[i]);},2500);
    try {
      const fh=[...prefs.favoriteMeals,...favs.slice(0,4)].filter(Boolean).join(', ');
      const bn=prefs.budgetEnabled&&bgt>0?'Budget:'+sym+bgt+'/week.':'';
      const cn=prefs.dishComplexity==='simple'?'Prefer quick easy dishes under 30 minutes.':prefs.dishComplexity==='elaborate'?'Include impressive multi-step recipes.':'';
      const kidsField = prefs.kids>0&&prefs.kidsDifferentFood?`,"kidsAlt":{"name":"kids dish","ingredients":["qty item"]}`:'';
      const kn = prefs.kids>0&&prefs.kidsDifferentFood?`Each meal must include "kidsAlt":{"name":"child-friendly dish","ingredients":["qty item"]} for ${prefs.kids} kids.`:'';
      // Build schema explicitly — the old regex only matched M followed by " which broke single-meal-type rolls
      const mealShape=`{"name":"meal name","description":"8 word description","time":"X min","estCost":0.00,"ingredients":["qty item"]${kidsField}}`;
      const dT='{'+prefs.mealTypes.map(t=>`"${t}":${mealShape}`).join(',')+'}';
      const dJ=sdays.map(d=>`"${d.toLowerCase()}":${dT}`).join(',');
      const raw=await callAI(
        `Meal plan. ONLY compact JSON, no whitespace.\n`+
        `Days:${sdays.map(d=>d.slice(0,3)).join(',')}|Types:${prefs.mealTypes.join(',')}|`+
        `Cuisines:${prefs.cuisines.length?prefs.cuisines.join(','):'varied'}|`+
        `Dietary:${prefs.dietary.length?prefs.dietary.join(','):'none'}|`+
        `Adventure:${prefs.variability}%|Servings:${tsrv}|Favs:${fh||'none'}|${bn}${cn}${kn}\n`+
        `Return:{${dJ}}`,
        4000
      );
      const p2=JSON.parse(raw);
      // Validate — needs at least one day with at least one meal name
      const anyMeal = sdays.some(d => {
        const day = p2[d.toLowerCase()];
        return day && prefs.mealTypes.some(t => day[t]?.name);
      });
      if(!anyMeal) {
        throw new Error('No meals were returned — please try rolling again.');
      }
      const c2={};
      sdays.forEach(d=>prefs.mealTypes.forEach(t=>{const m=p2[d.toLowerCase()]?.[t];if(m&&m.estCost) c2[d.toLowerCase()+'-'+t]=m.estCost;}));
      clearInterval(iv); setPlan(p2); setCosts(c2);
      if(!isPro){ const u=incrementUsage(); setUsage(u); }
      track('roll_completed',{days:sdays.length,meal_types:prefs.mealTypes.join(','),has_kids:prefs.kids>0&&prefs.kidsDifferentFood,is_pro:isPro});
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
    setCosts(nc); setPlan(np);
    track('meal_swapped',{day:swap.day,meal_type:swap.mt,new_meal:opt.name});
    persist(np,nc,sl,chk,custom,kidsSel); setSwap(null); setSwapOpts([]);
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
      track('list_built',{adult_meals:sel.size,kids_meals:kidsSel.size,total_items:list.categories.flatMap(c=>c.items).length});
      setSl(list); setChk(new Set()); setCustom([]);
      persist(plan,costs,list,new Set(),[],kidsSel); setStep('list');
    } catch{setErr('Could not build shopping list.');}
    setLoading(false);
  }

  async function openRecipe(meal,mt,variant) {
    const isKids = variant==='kids';
    track('recipe_opened',{meal:meal.name,type:isKids?'kids':'adult',meal_type:mt});
    setRecipe({meal,mt,variant,steps:[],tip:'',photoUrl:null,photoLd:true,loading:true});
    fetchPhoto(meal.name, mt).then(url=>setRecipe(p=>p?{...p,photoUrl:url,photoLd:false}:null));
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
    const cwSample=sample(cwd);

    return (
      <div>
        {/* Hero */}
        <div className="land-hero">
          <img src="/logo.png" alt="DishRoll" style={{width:130,height:'auto',margin:'0 auto 24px',display:'block'}}/>
          <div className="land-tagline">Weekly meal planning</div>
          <div className="land-h1">Know what's for<br/><em>dinner every night.</em></div>
          <p className="land-sub">Plan your week, generate a shopping list, and discover new recipes — all in one place.</p>
          {!cwd&&(
            <div className="land-cta">
              <button className="btn-cta-p" onClick={()=>newRoll(ck)}>Plan this week</button>
              {!isPro&&<button className="btn-cta-s" onClick={()=>setShowPaywall(true)}>✦ Go Premium</button>}
            </div>
          )}
        </div>

        {/* Plan status — minimal inline strip */}
        {isPro ? (
          <div className="plan-strip premium">
            <div>
              <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.6)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:2}}>✨ DishRoll Premium</div>
              <div style={{fontSize:13,color:'#fff',fontWeight:500}}>Unlimited rolls · {premium?.email||'Active'}</div>
            </div>
            <span style={{fontSize:12,color:'rgba(255,255,255,.5)',cursor:'pointer',textDecoration:'underline'}} onClick={cancelPremium}>Remove from device</span>
          </div>
        ) : (
          <div className="plan-strip free">
            <div style={{fontSize:13,color:'#5a6a4a'}}>
              Free — <strong style={{color:'#1a3a1a'}}>{rollsLeft} roll{rollsLeft!==1?'s':''}</strong> left this month
            </div>
            <button onClick={()=>setShowPaywall(true)} style={{padding:'7px 16px',borderRadius:100,border:'none',background:'#c4622d',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif",whiteSpace:'nowrap'}}>
              ✦ Go Premium — {PRICE_MONTHLY}/mo
            </button>
          </div>
        )}

        {/* Current week hero card */}
        <div className="cw-hero">
          <div className="cw-bg">
            <div className="cw-eyebrow">This week</div>
            <div className="cw-range">{weekLabel(ck)}</div>
            <div className="cw-status">{cwd?'Already planned — open or plan again':'Not planned yet'}</div>
            {cwSample.length>0&&(
              <div className="cw-meals-preview">
                {cwSample.map((n,i)=><span key={i} className="cw-meal-pill">{n}</span>)}
                {Object.keys(cwd?.mealPlan||{}).length>3&&<span className="cw-meal-pill">+ more meals</span>}
              </div>
            )}
            <div className="cw-actions">
              {cwd&&<button className="cw-btn-p" onClick={()=>openPlan(ck)}>Open plan</button>}
              <button className={cwd?'cw-btn-s':'cw-btn-p'} onClick={()=>newRoll(ck)}>{cwd?'Plan again':'Plan this week'}</button>
            </div>
          </div>
        </div>

        {/* Shopping list strip */}
        {hasList&&(
          <div className="list-strip" onClick={()=>openList(ck)}>
            <div className="ls-left">
              <div className="ls-icon">🛒</div>
              <div>
                <div className="ls-title">Shopping list</div>
                <div className="ls-sub">{weekLabel(ck)}</div>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {li>0&&<span className="ls-prog">{ld}/{li} done</span>}
              <span style={{fontSize:18,color:'#a0c090'}}>›</span>
            </div>
          </div>
        )}

        {/* Week timeline — horizontal scroll */}
        <div className="wt-section">
          <div className="wt-title">Your weeks</div>
          <div className="wt-scroll">
            {calKeys.map(key=>{
              const d=loadWk(key); const isC=isCW(key); const isF=isFW(key); const s=sample(d);
              const cls='wt-card '+(isC?'cur ':d?'has ':'')+(!d&&!isF?'emp':'')+(!d&&isF?'emp':'')+(!d&&!isC?'emp':d?'has':'cur');
              return (
                <div key={key} className={'wt-card'+(isC?' cur':d?' has':' emp')} onClick={()=>d&&openPlan(key)}>
                  {isC&&<span className="wt-badge now">This week</span>}
                  {!isC&&d&&<span className="wt-badge don">Saved</span>}
                  <div className="wt-dot"/>
                  <div className="wt-lbl">{isF?'Upcoming':isC?'Current':new Date(key+'T00:00:00').toLocaleDateString('en-IE',{month:'short'})}</div>
                  <div className="wt-date-range">
                    {new Date(key+'T00:00:00').toLocaleDateString('en-IE',{day:'numeric',month:'short'})}
                    {' –'}<br/>
                    {(()=>{const sun=new Date(key+'T00:00:00');sun.setDate(sun.getDate()+6);return sun.toLocaleDateString('en-IE',{day:'numeric',month:'short'});})()}
                  </div>
                  {d&&s.length>0&&<div className="wt-meals">{s.map((n,i)=><div key={i} className="wt-meal">{n}</div>)}</div>}
                  {!d&&<div className="wt-empty">{isF?'Plan ahead':'No plan yet'}</div>}
                  <div className="wt-acts">
                    {d&&<button className="wt-btn p" onClick={e=>{e.stopPropagation();openPlan(key);}}>Open</button>}
                    {d?.shoppingList&&<button className="wt-btn" onClick={e=>{e.stopPropagation();openList(key);}}>List</button>}
                    <button className="wt-btn" onClick={e=>{e.stopPropagation();newRoll(key);}}>{d?'Re-plan':'Plan'}</button>
                    {d&&cdel!==key&&<button className="wt-btn" style={{color:'#b04020',borderColor:'#e0a898'}} onClick={e=>{e.stopPropagation();setCdel(key);}}>✕</button>}
                    {d&&cdel===key&&<><button className="wt-btn" style={{color:'#b04020',borderColor:'#b04020'}} onClick={e=>{e.stopPropagation();hdel(key);}}>Confirm</button><button className="wt-btn" onClick={e=>{e.stopPropagation();setCdel(null);}}>Cancel</button></>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="land-footer">
          <span className="land-footer-v">DishRoll v{APP_VERSION}</span>
          <button className="btn-fu-sm" onClick={forceUpdate} disabled={upd}>
            <span className={upd?'spin':''} style={{display:'inline-block'}}>↻</span>{upd?'Updating…':'Force update'}
          </button>
        </div>
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
            <button className="btn bg bsm" style={{color:'#e0ddd0',borderColor:'rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)'}} onClick={()=>setStep(plan?'mealplan':'landing')}>← {plan?'Plan':'Home'}</button>
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
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:'#1a3a1a',marginBottom:6}}>
              You've used your free roll
            </div>
            <div style={{fontSize:14,color:'#5a6a4a',lineHeight:1.6}}>
              Free plan includes <strong>1 roll per month</strong>.<br/>
              Upgrade to Premium for unlimited rolls.
            </div>
          </div>

          {/* Plan comparison */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
            {/* Free */}
            <div style={{padding:'14px 16px',borderRadius:12,border:'1.5px solid #e0ddd0',background:'#f8f5ee'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#8a9a7a',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>Free</div>
              <div style={{fontSize:11,color:'#5a6a4a',lineHeight:2}}>
                ✓ 1 roll/month<br/>
                ✓ Shopping list<br/>
                ✓ Week calendar<br/>
                ✓ Recipes
              </div>
              <div style={{fontSize:18,fontWeight:700,color:'#1a3a1a',marginTop:10}}>€0</div>
            </div>
            {/* Premium */}
            <div style={{padding:'14px 16px',borderRadius:12,border:'2px solid #c4622d',background:'linear-gradient(135deg,#f8f5ee,#fff)',position:'relative'}}>
              <div style={{position:'absolute',top:-10,left:'50%',transform:'translateX(-50%)',background:'#c4622d',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:100,whiteSpace:'nowrap',letterSpacing:'.5px'}}>BEST VALUE</div>
              <div style={{fontSize:12,fontWeight:700,color:'#a04820',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8}}>Premium</div>
              <div style={{fontSize:11,color:'#5a6a4a',lineHeight:2}}>
                ✓ <strong>Unlimited</strong> rolls<br/>
                ✓ All Free features<br/>
                ✓ Kids meal rows<br/>
                ✓ Full history
              </div>
              <div style={{fontSize:18,fontWeight:700,color:'#a04820',marginTop:10}}>{PRICE_MONTHLY}<span style={{fontSize:12,color:'#8a9a7a',fontWeight:400}}>/mo</span></div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={startCheckout}
            style={{width:'100%',padding:'13px',borderRadius:100,border:'none',background:'linear-gradient(135deg,#c4622d,#a04820)',color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif",marginBottom:10}}
          >
            ✨ Upgrade to Premium — {PRICE_MONTHLY}/month
          </button>
          <button
            onClick={()=>setShowPaywall(false)}
            style={{width:'100%',padding:'10px',borderRadius:100,border:'1.5px solid #e0ddd0',background:'transparent',color:'#5a6a4a',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:"'Plus Jakarta Sans',sans-serif"}}
          >
            Maybe later
          </button>

          {/* Restore */}
          <div style={{textAlign:'center',marginTop:14,fontSize:12,color:'#a0c090'}}>
            Already subscribed on another device?{' '}
            <span style={{color:'#2a6a3a',cursor:'pointer',textDecoration:'underline'}} onClick={startCheckout}>Restore access</span>
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
          {swapLd?<div style={{textAlign:'center',padding:'24px 0'}}><div style={{fontSize:34,animation:'dr .6s ease-in-out infinite alternate',display:'inline-block'}}>🎲</div><div style={{fontSize:13,color:'#5a6a4a',marginTop:9}}>Rolling…</div></div>
           :swapOpts.length===0?<div style={{color:'#5a6a4a',fontSize:13,padding:'10px 0'}}>No alternatives found.</div>
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
          <div style={{width:40,height:40,border:'3px solid rgba(255,255,255,.3)',borderTopColor:'#c4622d',borderRadius:'50%',animation:'rspin .8s linear infinite'}}/>
          <div style={{color:'#fff',fontSize:16,fontWeight:500}}>Verifying your subscription…</div>
        </div>
      )}

      <div className="app">
        <div className="hdr">
          <div style={{cursor:'pointer',display:'flex',alignItems:'center'}} onClick={()=>setStep('landing')}>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:700,color:'#fff',letterSpacing:'-.3px',lineHeight:1}}>Dish</span>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:700,color:'#c4622d',letterSpacing:'-.3px',lineHeight:1}}>Roll</span>
          </div>
          <div className="hdr-r">
            <span className="ver">v{APP_VERSION}</span>
            {/* Premium / Free badge */}
            {isPro
              ? <span style={{fontSize:11,fontWeight:700,background:'linear-gradient(135deg,#c4622d,#a04820)',color:'#fff',padding:'3px 9px',borderRadius:100,letterSpacing:'.4px'}}>✨ PREMIUM</span>
              : <span style={{fontSize:11,fontWeight:600,background:'rgba(255,255,255,.1)',color:'#b0d0a0',padding:'3px 9px',borderRadius:100,cursor:'pointer',letterSpacing:'.4px'}} onClick={()=>setShowPaywall(true)} title="Upgrade to Premium">
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
                <div className="title">Roll your week.<br/><span style={{color:'#c4622d',fontStyle:'italic'}}>Eat well.</span></div>
                {awk&&<p style={{fontSize:13,color:'#5a6a4a',marginTop:5}}>📅 {weekLabel(awk)}</p>}
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
              <div className="title">Which days<br/><span style={{color:'#c4622d',fontStyle:'italic'}}>do you need meals?</span></div>
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
              <div className="title">Cuisine<br/><span style={{color:'#c4622d',fontStyle:'italic'}}>preferences</span></div>
              <p className="sub">Choose cuisines to roll from. Leave blank for maximum variety.</p>
              <div className="card"><div className="lbl">Select your favourites</div><div className="chips">{CUISINE_OPTIONS.map(c=><div key={c} className={'chip '+(prefs.cuisines.includes(c)?'s':'')} onClick={()=>{const n=prefs.cuisines.includes(c)?prefs.cuisines.filter(x=>x!==c):[...prefs.cuisines,c];sp('cuisines',n);}}>{c}</div>)}</div></div>
              <div className="nr"><button className="btn bg" onClick={()=>setStep('days')}>← Back</button><button className="btn bp" onClick={()=>setStep('dietary')}>Continue →</button></div>
            </div>
          )}

          {/* DIETARY */}
          {step==='dietary'&&(
            <div>
              <div className="title">Dietary<br/><span style={{color:'#c4622d',fontStyle:'italic'}}>requirements</span></div>
              <p className="sub">Any restrictions we should keep out of the roll?</p>
              <div className="card"><div className="lbl">Select all that apply</div><div className="chips">{DIETARY_OPTIONS.map(d=><div key={d} className={'chip '+(prefs.dietary.includes(d)?'a':'')} onClick={()=>{const n=prefs.dietary.includes(d)?prefs.dietary.filter(x=>x!==d):[...prefs.dietary,d];sp('dietary',n);}}>{d}</div>)}</div></div>
              <div className="nr"><button className="btn bg" onClick={()=>setStep('cuisines')}>← Back</button><button className="btn bp" onClick={()=>setStep('variability')}>Continue →</button></div>
            </div>
          )}

          {/* VARIABILITY — inlined */}
          {step==='variability'&&(
            <div>
              <div className="title">Your culinary<br/><span style={{color:'#c4622d',fontStyle:'italic'}}>personality</span></div>
              <p className="sub">Set your adventure level, complexity, and any must-have meals.</p>
              <div className="card"><div className="lbl">Adventure level</div><input type="range" min={0} max={100} value={prefs.variability} onChange={e=>sp('variability',+e.target.value)} className="sl"/><div className="vl"><span>🏠 Classics</span><span style={{fontWeight:600,color:'#c4622d'}}>{prefs.variability<33?'Safe & familiar':prefs.variability<66?'Balanced mix':'Wild & adventurous 🎲'}</span><span>🌏 Surprises</span></div></div>
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
              <div className="title">Weekly<br/><span style={{color:'#c4622d',fontStyle:'italic'}}>food budget</span></div>
              <p className="sub">Set a grocery budget and we'll keep meals within range. Optional.</p>
              <div className="card">
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:13}}>
                  <div className="lbl" style={{margin:0}}>Enable budget planning</div>
                  <div style={{display:'flex',gap:8}}>{[{v:true,l:'Yes'},{v:false,l:'Skip'}].map(o=><div key={String(o.v)} className={'chip '+(prefs.budgetEnabled===o.v?'s':'')} onClick={()=>sp('budgetEnabled',o.v)}>{o.l}</div>)}</div>
                </div>
                {prefs.budgetEnabled?(
                  <><div className="lbl">Currency</div><div className="crr">{Object.entries(CURRENCY_SYMBOLS).map(([c,s])=><div key={c} className={'cc '+(prefs.currency===c?'s':'')} onClick={()=>sp('currency',c)}>{s} {c}</div>)}</div><div className="lbl">Weekly grocery budget</div><div className="brow"><div className="bw"><span className="bpx">{sym}</span><input className="inp bi" type="number" min="0" placeholder="e.g. 120" value={prefs.weeklyBudget} onChange={e=>sp('weeklyBudget',e.target.value)}/></div><span className="pl2">per week · {tsrv} person{tsrv>1?'s':''}</span></div>{prefs.weeklyBudget&&<p style={{fontSize:12,color:'#4a8888',marginTop:6}}>≈ {sym}{(parseFloat(prefs.weeklyBudget)/(sdays.length*prefs.mealTypes.length)).toFixed(1)} per meal</p>}</>
                ):<p style={{fontSize:13,color:'#8a9a7a',fontStyle:'italic'}}>No budget — rolling purely on taste.</p>}
              </div>
              <div className="nr"><button className="btn bg" onClick={()=>setStep('variability')}>← Back</button><button className="btn bp" onClick={()=>setStep('servings')}>Continue →</button></div>
            </div>
          )}

          {/* SERVINGS — inlined */}
          {step==='servings'&&(
            <div>
              <div className="title">Who are you<br/><span style={{color:'#c4622d',fontStyle:'italic'}}>rolling for?</span></div>
              <p className="sub">We'll scale ingredients and portions for your household.</p>
              <div className="card">
                <div className="pg2">
                  <div className="pc"><div className="pl">👨‍👩‍👧 Adults</div><div className="cr"><button className="cb" onClick={()=>prefs.adults>1&&sp('adults',prefs.adults-1)} disabled={prefs.adults<=1}>−</button><div className="cn">{prefs.adults}</div><button className="cb" onClick={()=>prefs.adults<10&&sp('adults',prefs.adults+1)}>+</button></div></div>
                  <div className="pc"><div className="pl">👧 Kids</div><div className="cr"><button className="cb" onClick={()=>prefs.kids>0&&sp('kids',prefs.kids-1)} disabled={prefs.kids<=0}>−</button><div className="cn">{prefs.kids}</div><button className="cb" onClick={()=>prefs.kids<8&&sp('kids',prefs.kids+1)}>+</button></div></div>
                </div>
                {prefs.kids>0&&<div className={'kt '+(prefs.kidsDifferentFood?'on':'')} onClick={()=>sp('kidsDifferentFood',!prefs.kidsDifferentFood)}><div className="kb">{prefs.kidsDifferentFood?'✓':''}</div><div><div className="kt-t">Kids get different, child-friendly meals</div><div className="kt-s">We'll suggest simpler alternatives alongside adult meals</div></div></div>}
                <div style={{marginTop:11,padding:'8px 12px',background:'#f8f5ee',borderRadius:9,fontSize:13,color:'#5a6a4a'}}>Cooking for <strong style={{color:'#1a3a1a'}}>{tsrv} {tsrv===1?'person':'people'}</strong>{prefs.kids>0&&prefs.kidsDifferentFood?' + '+prefs.kids+' kids (separate dishes)':''}</div>
              </div>
              {err&&<div className="err">⚠️ {err}</div>}
              <div className="nr"><button className="btn bg" onClick={()=>setStep('budget')}>← Back</button><button className="broll" onClick={roll}>🎲 Roll my week</button></div>
            </div>
          )}

          {/* GENERATING */}
          {step==='generating'&&(
            <div className="lsc">
              <div style={{display:'flex',alignItems:'center',marginBottom:4}}>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:42,fontWeight:700,color:'#1a3a1a',lineHeight:1}}>Dish</span>
                <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:42,fontWeight:700,color:'#c4622d',lineHeight:1}}>Roll</span>
              </div>
              <div className="lm">{loadMsg}</div>
              <p className="lsb">Usually takes 5–10 seconds…</p>
            </div>
          )}

          {/* MEAL PLAN */}
          {step==='mealplan'&&plan&&(()=>{
            const gc='106px repeat('+sdays.length+',1fr)';
            const mw=Math.max(580,100+sdays.length*105);
            return (
              <div>
                <div className="sh">
                  <div><div className="title" style={{fontSize:26,marginBottom:3}}>Your roll<br/><span style={{color:'#c4622d',fontStyle:'italic'}}>is in.</span></div><p style={{fontSize:12,color:'#5a6a4a',lineHeight:1.7}}>Click name or 📖 for recipe · ☆ favourite · 🎲 re-roll · click cell to add to list</p></div>
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
                                <div className="mm"><span className="mt2">⏱ {m.time}</span>{prefs.budgetEnabled&&co!=null&&<span className="mco">{sym}{co}</span>}</div>
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
                      <div style={{fontWeight:600,fontSize:14,color:'#1a3a1a',marginBottom:2}}>🛒 Build shopping list</div>
                      <div style={{fontSize:12,color:'#5a6a4a'}}>
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
