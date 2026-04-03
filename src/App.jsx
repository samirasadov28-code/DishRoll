import { useState, useEffect, Fragment, useRef } from "react";

const APP_VERSION = "0.2.0";
const PRICE_MONTHLY = "€3.99";
const track = (n, p) => { try { if (typeof window.track === "function") window.track(n, p || {}); } catch {} };

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const DAY3 = { Monday:"Mon",Tuesday:"Tue",Wednesday:"Wed",Thursday:"Thu",Friday:"Fri",Saturday:"Sat",Sunday:"Sun" };

const CUISINE_FLAGS = {
  Italian:"🇮🇹", Asian:"🌏", Mexican:"🇲🇽", Mediterranean:"🇬🇷",
  Indian:"🇮🇳", French:"🇫🇷", American:"🇺🇸", "Middle Eastern":"🌙",
  Japanese:"🇯🇵", Thai:"🇹🇭", Greek:"🇬🇷", Spanish:"🇪🇸",
  Moroccan:"🇲🇦", Lebanese:"🇱🇧", Vietnamese:"🇻🇳",
  Ukrainian:"🇺🇦", Azerbaijani:"🇦🇿",
};

// Detect which cuisine a meal belongs to based on its name/description
function detectCuisine(name="", desc="") {
  const t = (name+" "+desc).toLowerCase();
  if(/pasta|pizza|risotto|carbonara|bolognese|lasagne|tiramisu|pesto|parmesan|gnocchi|fettuccine/.test(t)) return "Italian";
  if(/sushi|ramen|tempura|teriyaki|miso|udon|soba|katsu|yakitori|tonkatsu/.test(t)) return "Japanese";
  if(/curry|masala|tikka|korma|dal|biryani|naan|paneer|samosa|tandoori/.test(t)) return "Indian";
  if(/taco|burrito|enchilada|quesadilla|fajita|guacamole|salsa|tortilla|tamale/.test(t)) return "Mexican";
  if(/croissant|baguette|ratatouille|bouillabaisse|coq au vin|cassoulet|crêpe|soufflé/.test(t)) return "French";
  if(/pad thai|tom yum|green curry|massaman|som tam|larb|satay/.test(t)) return "Thai";
  if(/pho|banh mi|spring roll|lemongrass|vietnamese/.test(t)) return "Vietnamese";
  if(/tagine|couscous|harissa|ras el hanout|chermoula|moroccan/.test(t)) return "Moroccan";
  if(/hummus|falafel|shawarma|kibbeh|tabbouleh|baba ganoush/.test(t)) return "Lebanese";
  if(/paella|gazpacho|chorizo|manchego|patatas bravas|tortilla española/.test(t)) return "Spanish";
  if(/moussaka|souvlaki|gyros|tzatziki|spanakopita|dolmades|baklava/.test(t)) return "Greek";
  if(/borscht|pierogi|varenyky|holubtsi|kulesh|salo|borshch/.test(t)) return "Ukrainian";
  if(/dolma|plov|laghman|shashlik|kazan/.test(t)) return "Azerbaijani";
  if(/burger|bbq|mac and cheese|hot dog|buffalo|chowder/.test(t)) return "American";
  if(/falafel|shakshuka|kebab|za'atar|tahini/.test(t)) return "Middle Eastern";
  return null;
}

const CUISINES = ["Italian","Asian","Mexican","Mediterranean","Indian","French","American","Middle Eastern","Japanese","Thai","Greek","Spanish","Moroccan","Lebanese","Vietnamese","Ukrainian","Azerbaijani"];
const DIETARY = ["Vegetarian","Vegan","Gluten-Free","Dairy-Free","Keto","Paleo","Nut-Free","Low-Carb","High-Protein","Pescatarian"];
const CURRENCY = { EUR:"€", GBP:"£", USD:"$", CAD:"CA$", AUD:"A$" };
const ML = { breakfast:"🌅 Breakfast", lunch:"🕐 Lunch", dinner:"🌙 Dinner" };
const WAIT_MSGS = ["Planning your week…","Choosing your meals…","Crafting your menu…","Selecting fresh ideas…","Almost there…"];
const CAT_ICONS = { Produce:"🥬",Proteins:"🥩",Dairy:"🧀",Pantry:"🫙",Grains:"🌾",Spices:"🌿",Frozen:"🧊",Bakery:"🍞",Beverages:"🥛",Seafood:"🐟",Condiments:"🥫","My additions":"✏️",Other:"🛒" };
const COMPLEXITY = [
  { id:"simple",    label:"🥗 Simple",    sub:"Under 30 min, few ingredients" },
  { id:"any",       label:"⚖️ Any",        sub:"Mix of simple and elaborate" },
  { id:"elaborate", label:"👨‍🍳 Elaborate",  sub:"Impressive multi-step recipes" },
];

// ─── WEEK HELPERS ─────────────────────────────────────────────────────────────
function mondayOf(d) {
  const r = new Date(d), day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}
function wKey(d) {
  const m = mondayOf(d);
  return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,"0")}-${String(m.getDate()).padStart(2,"0")}`;
}
function cWK() { return wKey(new Date()); }
function wLabel(k) {
  const m = new Date(k + "T00:00:00"), s = new Date(m);
  s.setDate(m.getDate() + 6);
  const f = d => d.toLocaleDateString("en-IE", { weekday:"short", day:"numeric", month:"short" });
  return `${f(m)} – ${f(s)}`;
}
function isCW(k) { return k === cWK(); }
function isFW(k) { return k > cWK(); }
function calKeys(ck, past = 6) {
  const r = [], c = new Date(ck + "T00:00:00");
  for (let i = -past; i <= 2; i++) { const d = new Date(c); d.setDate(d.getDate() + i * 7); r.push(wKey(d)); }
  return [...new Set(r)].sort();
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const WP = "dr-week-", FK = "dr-favs", PK = "dr-premium", UK = "dr-usage";
const saveWk = (k, d) => { try { localStorage.setItem(WP+k, JSON.stringify({ ...d, at: Date.now() })); } catch {} };
const loadWk = k => { try { const s = localStorage.getItem(WP+k); return s ? JSON.parse(s) : null; } catch { return null; } };
const delWk  = k => { try { localStorage.removeItem(WP+k); } catch {} };
const allWks = () => { const r = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith(WP)) r.push(k.slice(WP.length)); } return r.sort().reverse(); };
const loadP  = () => { try { return JSON.parse(localStorage.getItem(PK) || "null"); } catch { return null; } };
const saveP  = d => { try { localStorage.setItem(PK, JSON.stringify(d)); } catch {} };
const clearP = () => { try { localStorage.removeItem(PK); } catch {} };
const isPActive = p => p && p.until > Date.now() - 2 * 864e5;
const loadU  = () => {
  try {
    const raw = localStorage.getItem(UK);
    const u   = raw ? JSON.parse(raw) : null;
    const mo  = new Date().toISOString().slice(0,7);
    // Migrate old format {mo,n} → new format {total,mo,monthN}
    if (u && u.n !== undefined && u.total === undefined) {
      return { total: u.n, mo, monthN: u.mo === mo ? u.n : 0 };
    }
    if (!u) return { total: 0, mo, monthN: 0 };
    // Reset monthly counter if new month
    if (u.mo !== mo) return { ...u, mo, monthN: 0 };
    return u;
  } catch { return { total: 0, mo: new Date().toISOString().slice(0,7), monthN: 0 }; }
};
const incU = () => {
  const u = loadU();
  const next = { ...u, total: (u.total||0) + 1, monthN: (u.monthN||0) + 1 };
  try { localStorage.setItem(UK, JSON.stringify(next)); } catch {}
  return next;
};

// ─── AI ───────────────────────────────────────────────────────────────────────
function repairJSON(s) {
  try { JSON.parse(s); return s; } catch {}
  const stack = []; let inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") stack.push("}");
    else if (c === "[") stack.push("]");
    else if (c === "}" || c === "]") stack.pop();
  }
  let out = s.trimEnd();
  if (inStr) out += '"';
  out = out.replace(/,\s*$/, "");
  out += stack.reverse().join("");
  try { JSON.parse(out); return out; } catch { return s; }
}
async function callAI(prompt, maxTokens = 4000) {
  const r = await fetch("/.netlify/functions/chat", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ prompt, maxTokens }) });
  if (!r.ok) throw new Error("API " + r.status);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  const c = repairJSON((d.text || "").replace(/```json|```/g, "").trim());
  const m = c.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return m ? m[1] : c;
}

// ─── PHOTOS ───────────────────────────────────────────────────────────────────
const PHOTO_MAP = {
  chicken:"https://images.unsplash.com/photo-1598103442097-8b74394b95c1?w=640&q=80",
  beef:"https://images.unsplash.com/photo-1558030006-450675393462?w=640&q=80",
  lamb:"https://images.unsplash.com/photo-1574484284002-952d92456975?w=640&q=80",
  pork:"https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=640&q=80",
  fish:"https://images.unsplash.com/photo-1519708227418-a2234ef1df7a?w=640&q=80",
  seafood:"https://images.unsplash.com/photo-1559339352-11d035aa65de?w=640&q=80",
  pasta:"https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=640&q=80",
  pizza:"https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=640&q=80",
  soup:"https://images.unsplash.com/photo-1547592180-85f173990554?w=640&q=80",
  salad:"https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&q=80",
  curry:"https://images.unsplash.com/photo-1455619452474-d2be8b1af5a7?w=640&q=80",
  rice:"https://images.unsplash.com/photo-1516684732162-798a0062be99?w=640&q=80",
  taco:"https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=640&q=80",
  burger:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640&q=80",
  noodle:"https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=640&q=80",
  bread:"https://images.unsplash.com/photo-1509440159596-0249088772ff?w=640&q=80",
  egg:"https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=640&q=80",
  breakfast:"https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=640&q=80",
  dessert:"https://images.unsplash.com/photo-1551024506-0bccd828d307?w=640&q=80",
  vegetarian:"https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=640&q=80",
  default:"https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&q=80",
};
function photoFallback(name = "", mt = "") {
  const n = name.toLowerCase();
  if (n.includes("chicken")||n.includes("turkey")||n.includes("duck")) return PHOTO_MAP.chicken;
  if (n.includes("beef")||n.includes("steak")||n.includes("meatball")) return PHOTO_MAP.beef;
  if (n.includes("burger")) return PHOTO_MAP.burger;
  if (n.includes("lamb")||n.includes("mutton")) return PHOTO_MAP.lamb;
  if (n.includes("pork")||n.includes("bacon")||n.includes("ham")||n.includes("sausage")) return PHOTO_MAP.pork;
  if (n.includes("salmon")||n.includes("tuna")||n.includes("cod")||n.includes("fish")) return PHOTO_MAP.fish;
  if (n.includes("shrimp")||n.includes("prawn")||n.includes("lobster")||n.includes("seafood")) return PHOTO_MAP.seafood;
  if (n.includes("pasta")||n.includes("spaghetti")||n.includes("penne")||n.includes("carbonara")||n.includes("lasagne")) return PHOTO_MAP.pasta;
  if (n.includes("pizza")) return PHOTO_MAP.pizza;
  if (n.includes("soup")||n.includes("broth")||n.includes("bisque")||n.includes("chowder")) return PHOTO_MAP.soup;
  if (n.includes("stew")||n.includes("casserole")||n.includes("tagine")||n.includes("borscht")) return PHOTO_MAP.soup;
  if (n.includes("salad")) return PHOTO_MAP.salad;
  if (n.includes("curry")||n.includes("masala")||n.includes("tikka")||n.includes("korma")||n.includes("dal")) return PHOTO_MAP.curry;
  if (n.includes("rice")||n.includes("risotto")||n.includes("pilaf")||n.includes("biryani")||n.includes("paella")) return PHOTO_MAP.rice;
  if (n.includes("taco")||n.includes("burrito")||n.includes("enchilada")||n.includes("quesadilla")) return PHOTO_MAP.taco;
  if (n.includes("noodle")||n.includes("ramen")||n.includes("pho")||n.includes("udon")) return PHOTO_MAP.noodle;
  if (n.includes("bread")||n.includes("sandwich")||n.includes("toast")||n.includes("wrap")) return PHOTO_MAP.bread;
  if (n.includes("egg")||n.includes("omelette")||n.includes("frittata")) return PHOTO_MAP.egg;
  if (n.includes("pancake")||n.includes("waffle")) return PHOTO_MAP.breakfast;
  if (n.includes("cake")||n.includes("dessert")||n.includes("pudding")||n.includes("tart")) return PHOTO_MAP.dessert;
  if (n.includes("vegetable")||n.includes("tofu")||n.includes("lentil")||n.includes("chickpea")) return PHOTO_MAP.vegetarian;
  if (mt === "breakfast") return PHOTO_MAP.breakfast;
  return PHOTO_MAP.default;
}
async function fetchPhoto(name, mt) {
  try {
    const q = encodeURIComponent(name.split(" ").slice(0, 3).join(" "));
    const r = await fetch("/.netlify/functions/photo?q=" + q);
    if (r.ok) { const d = await r.json(); if (d.photo) return d.photo; }
  } catch {}
  return photoFallback(name, mt);
}

// ─── COLOUR HELPER ────────────────────────────────────────────────────────────
function hashGrad(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const g = ["135deg,#2a6a3a,#3a8a4a","135deg,#c4622d,#a04820","135deg,#5a7a2a,#7a9a3a","135deg,#6a3a8a,#9a5aba","135deg,#8a3030,#c04040"];
  return `linear-gradient(${g[Math.abs(h) % g.length]})`;
}

// ─── DEFAULT PREFS ────────────────────────────────────────────────────────────
const DPREFS = {
  scope: "dinner", types: ["dinner"], days: [...DAYS],
  cuisines: [], dietary: [], adventure: 40, complexity: "any",
  favMeals: [], favInput: "", cusInput: "",
  adults: 2, kids: 0, kidsDiff: false,
  currency: "EUR", budget: "", budgetOn: false,
};

// ─── FONTS + CSS ──────────────────────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');`;

const CSS = `
/* reset */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#faf7f0;color:#2a2a1a;-webkit-font-smoothing:antialiased}

/* layout */
.app{min-height:100vh;background:#faf7f0}
.hdr{background:#1a4a2a;padding:12px 22px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.hdr-logo{cursor:pointer;display:flex;align-items:center;line-height:1}
.hdr-logo span:first-child{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#fff;letter-spacing:-.3px}
.hdr-logo span:last-child{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#c4622d;letter-spacing:-.3px}
.hdr-right{display:flex;align-items:center;gap:8px}
.ver-pill{font-size:11px;color:#8abca0;font-weight:600;background:rgba(255,255,255,.1);padding:3px 9px;border-radius:100px}
.pb{height:3px;background:#c8d8b8}
.pf{height:100%;background:linear-gradient(90deg,#2a6a3a,#c4622d);transition:width .4s}
.page{max-width:900px;margin:0 auto;padding:36px 20px 100px}

/* typography */
.serif{font-family:'Cormorant Garamond',serif}
.page-title{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;color:#1a3a1a;line-height:1.15;margin-bottom:8px}
.page-sub{font-size:14px;color:#5a6a4a;font-weight:300;margin-bottom:28px;line-height:1.7}
.label{font-size:11px;font-weight:600;color:#6a7a5a;text-transform:uppercase;letter-spacing:.8px;margin-bottom:9px}
.hint{font-size:12px;color:#5a6a4a;margin-bottom:9px;line-height:1.5}

/* cards */
.card{background:#fff;border-radius:18px;padding:22px;margin-bottom:14px;border:1px solid #e0ddd0;box-shadow:0 2px 12px rgba(30,60,20,.05)}

/* chips */
.chip-group{display:flex;flex-wrap:wrap;gap:8px}
.chip{padding:7px 15px;border-radius:100px;border:1.5px solid #c8d4b0;background:#fff;font-size:13px;font-weight:500;cursor:pointer;transition:all .17s;color:#2a3a1a;user-select:none;font-family:'Plus Jakarta Sans',sans-serif}
.chip:hover{border-color:#2a6a3a;color:#2a6a3a}
.chip.sel{background:#2a6a3a;border-color:#2a6a3a;color:#fff}
.chip.alt{background:#c4622d;border-color:#c4622d;color:#fff}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:7px;padding:10px 22px;border-radius:100px;border:none;cursor:pointer;font-size:14px;font-weight:500;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.btn-primary{background:#1a4a2a;color:#fff}
.btn-primary:hover:not(:disabled){background:#0f3020;transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,74,42,.3)}
.btn-ghost{background:transparent;color:#2a6a3a;border:1.5px solid #a0c090}
.btn-ghost:hover:not(:disabled){border-color:#2a6a3a;background:#f0f5e8}
.btn-danger{background:transparent;color:#b04020;border:1.5px solid #e0a898}
.btn-danger:hover:not(:disabled){background:#fef3f0;border-color:#b04020}
.btn-sm{padding:6px 14px;font-size:12px}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-roll{background:linear-gradient(135deg,#c4622d,#a04820);color:#fff;font-size:15px;padding:13px 30px;border-radius:100px;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-weight:600;transition:all .2s}
.btn-roll:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 20px rgba(196,98,45,.38)}
.nav-row{display:flex;gap:9px;margin-top:24px;align-items:center;flex-wrap:wrap}

/* inputs */
.inp{width:100%;padding:11px 14px;border-radius:12px;border:1.5px solid #d0ccb8;background:#fff;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;color:#2a2a1a;outline:none;transition:border-color .2s}
.inp:focus{border-color:#2a6a3a}
.slider{width:100%;accent-color:#c4622d;cursor:pointer}

/* tags */
.tag{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;background:#e8f0d8;border-radius:100px;font-size:12px;color:#1a3a1a;font-weight:500}
.tag button{background:none;border:none;cursor:pointer;color:#5a8a5a;font-size:14px;line-height:1}
.tag button:hover{color:#c4622d}

/* notice */
.notice{background:#f0f5e8;border-left:3px solid #5a9a5a;padding:9px 13px;border-radius:0 10px 10px 0;font-size:12px;color:#1a3a1a;margin-bottom:12px}
.err-box{background:#fdf5e8;border:1px solid #e8cc88;color:#7a5a10;padding:10px 14px;border-radius:10px;font-size:13px;margin-top:10px}
.var-ends{display:flex;justify-content:space-between;font-size:11px;color:#8a9a7a;margin-top:4px}

/* day selector */
.day-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.day-chip{padding:10px 3px;border-radius:12px;border:2px solid #d0ccb8;background:#fff;cursor:pointer;text-align:center;transition:all .18s;user-select:none}
.day-chip:hover{border-color:#2a6a3a}
.day-chip.sel{background:#2a6a3a;border-color:#2a6a3a}
.day-chip .dl{font-size:10px;color:#8a9a7a;margin-bottom:2px}
.day-chip.sel .dl{color:rgba(255,255,255,.6)}
.day-chip .dn{font-size:12px;font-weight:600;color:#1a3a1a}
.day-chip.sel .dn{color:#fff}

/* complexity */
.cx-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.cx-card{padding:13px 10px;border-radius:14px;border:2px solid #d0ccb8;background:#fff;cursor:pointer;text-align:center;transition:all .2s;user-select:none}
.cx-card:hover{border-color:#2a6a3a}
.cx-card.sel{border-color:#2a6a3a;background:#f4f8ec}
.cx-label{font-size:13px;font-weight:600;color:#1a3a1a;margin-bottom:3px}
.cx-sub{font-size:11px;color:#6a7a5a;line-height:1.4}

/* people counters */
.people-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.people-box{padding:16px 10px;border-radius:16px;border:1.5px solid #e0ddd0;background:#fff;text-align:center;overflow:hidden}
.people-lbl{font-size:11px;font-weight:600;color:#6a7a5a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
.ctr{display:flex;align-items:center;gap:6px;justify-content:center}
.ctr-btn{width:32px;height:32px;border-radius:50%;border:2px solid #2a6a3a;background:#fff;font-size:16px;cursor:pointer;color:#2a6a3a;display:flex;align-items:center;justify-content:center;transition:all .14s;flex-shrink:0}
.ctr-btn:hover:not(:disabled){background:#2a6a3a;color:#fff}
.ctr-btn:disabled{opacity:.3;cursor:not-allowed}
.ctr-num{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:#1a3a1a;min-width:32px;text-align:center}
.kids-toggle{display:flex;align-items:flex-start;gap:11px;padding:13px 14px;background:#f8f5ee;border-radius:12px;border:1.5px solid #e0ddd0;cursor:pointer;margin-top:11px;user-select:none;transition:all .18s}
.kids-toggle.on{background:#f0f5e8;border-color:#2a6a3a}
.toggle-box{width:20px;height:20px;border-radius:6px;border:2px solid #b0c8a0;background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;transition:all .16s;margin-top:1px}
.kids-toggle.on .toggle-box{background:#2a6a3a;border-color:#2a6a3a;color:#fff}
.toggle-txt{font-size:13px;color:#1a3a1a;font-weight:500}
.toggle-sub{font-size:11px;color:#6a7a5a;margin-top:2px}

/* meal type selector */
.mt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mt-card{padding:16px 10px;border-radius:16px;border:2px solid #d0ccb8;background:#fff;cursor:pointer;text-align:center;transition:all .2s;user-select:none}
.mt-card:hover{border-color:#2a6a3a}
.mt-card.sel{border-color:#2a6a3a;background:#f4f8ec}
.mt-icon{font-size:22px;margin-bottom:5px}
.mt-label{font-weight:600;font-size:13px;color:#1a3a1a}
.mt-sub{font-size:11px;color:#6a7a5a;margin-top:2px}

/* budget */
.budget-sum{background:#f4f8ec;border-radius:14px;padding:13px 16px;margin-bottom:13px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:7px;border:1px solid #d8e4c0}
.budget-lbl{font-size:12px;color:#3a5a2a;font-weight:500}
.budget-val{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1a4a1a}
.budget-over{color:#b04020}
.cur-row{display:flex;gap:7px;margin-bottom:12px;flex-wrap:wrap}
.cur-chip{padding:6px 13px;border-radius:10px;border:1.5px solid #d0ccb8;background:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all .16s;color:#2a2a1a}
.cur-chip:hover{border-color:#2a6a3a}
.cur-chip.sel{background:#2a6a3a;border-color:#2a6a3a;color:#fff}
.brow{display:flex;align-items:center;gap:12px}
.bwrap{position:relative;flex:1}
.bpfx{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-weight:600;font-size:14px;color:#6a7a5a;pointer-events:none}
.b-inp{padding-left:28px}

/* ── GENERATING ── */
.gen-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:20px;text-align:center}
.gen-logo{display:flex;align-items:center;line-height:1;animation:pulse 2s ease-in-out infinite}
.gen-logo span:first-child{font-family:'Cormorant Garamond',serif;font-size:48px;font-weight:700;color:#1a3a1a}
.gen-logo span:last-child{font-family:'Cormorant Garamond',serif;font-size:48px;font-weight:700;color:#c4622d}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.gen-msg{font-family:'Cormorant Garamond',serif;font-size:20px;color:#1a3a1a;font-style:italic;max-width:280px}
.gen-sub{font-size:13px;color:#8a9a7a}

/* ── MEAL PLAN GRID ── */
/* ── MEAL PLAN CARD GRID ─────────────────────────────────────────── */
.day-section{margin-bottom:32px}
.day-section-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1a3a1a;margin-bottom:12px;display:flex;align-items:center;gap:10px}
.day-section-date{font-size:13px;color:#8a9a7a;font-family:'Plus Jakarta Sans',sans-serif;font-weight:400}
.mt-section{margin-bottom:10px}
.mt-label{font-size:11px;font-weight:700;color:#8a9a7a;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px;padding-left:2px}
.meal-card{background:#fff;border-radius:18px;padding:18px;border:1.5px solid #e0ddd0;position:relative;display:flex;flex-direction:column;gap:10px;transition:all .2s;cursor:pointer;overflow:hidden}
.meal-card:hover{border-color:#a0c090;box-shadow:0 4px 16px rgba(26,60,20,.1);transform:translateY(-1px)}
.meal-card.picked{border-color:#2a6a3a;background:linear-gradient(135deg,#f4f8ec,#fff)}
.meal-card.kids-card{background:#fafff6;border-color:#c8e0b8}
.meal-card.kids-card.picked{border-color:#5a8a2a;background:linear-gradient(135deg,#eef7e4,#fafff6)}
.meal-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.meal-card-flag{font-size:24px;line-height:1;flex-shrink:0;margin-top:2px}
.meal-card-title-wrap{flex:1;min-width:0}
.meal-card-name{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#1a3a1a;line-height:1.2;margin-bottom:4px}
.meal-card-name:hover{color:#2a6a3a}
.meal-card-cuisine{font-size:11px;color:#8a9a7a;font-weight:500;text-transform:uppercase;letter-spacing:.6px}
.meal-card-desc{font-size:14px;color:#4a5a3a;line-height:1.6;font-weight:300}
.meal-card-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.meal-card-pills{display:flex;gap:6px;flex-wrap:wrap}
.meal-pill-item{display:inline-flex;align-items:center;gap:4px;background:#f4f0e8;border:1px solid #e0ddd0;border-radius:100px;padding:3px 10px;font-size:12px;color:#5a5a3a;font-weight:500}
.meal-pill-item.green{background:#f0f7e4;border-color:#c8d8b8;color:#3a5a2a}
.meal-card-actions{display:flex;gap:4px}
.meal-action-btn{background:#f4f0e8;border:none;cursor:pointer;padding:6px 10px;border-radius:100px;font-size:13px;transition:all .16s;line-height:1;color:#5a6a4a}
.meal-action-btn:hover{background:#e8f0d8;color:#1a3a1a}
.card-sel-badge{position:absolute;top:14px;right:14px;width:22px;height:22px;background:#2a6a3a;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;font-weight:700}
.card-sel-badge.kids{background:#5a8a2a}
.card-fav-dot{font-size:14px}
.kids-badge{display:inline-flex;align-items:center;gap:4px;background:#e4f0d4;border:1px solid #c0d8a0;border-radius:100px;padding:2px 9px;font-size:11px;color:#3a5a1a;font-weight:600;margin-bottom:2px}

/* ── FIXED BASKET BAR ─────────────────────────────────────────────── */
.basket-bar{position:fixed;bottom:0;left:0;right:0;z-index:90;background:#fff;border-top:1px solid #e0ddd0;box-shadow:0 -4px 24px rgba(26,60,20,.12)}
.basket-bar-inner{max-width:900px;margin:0 auto;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
.basket-bar-left{display:flex;align-items:center;gap:12px}
.basket-icon-wrap{width:42px;height:42px;background:#f0f5e8;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.basket-count{font-size:14px;font-weight:600;color:#1a3a1a;margin-bottom:1px}
.basket-sub{font-size:12px;color:#7a8a6a}
.basket-bar-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.basket-build-btn{background:#1a4a2a;color:#fff;border:none;padding:11px 22px;border-radius:100px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s;white-space:nowrap}
.basket-build-btn:hover:not(:disabled){background:#0f3018;transform:translateY(-1px);box-shadow:0 4px 14px rgba(26,74,42,.3)}
.basket-build-btn:disabled{opacity:.4;cursor:not-allowed}
.basket-sel-all{background:transparent;color:#2a6a3a;border:1.5px solid #a0c090;padding:10px 16px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .16s;white-space:nowrap}
.basket-sel-all:hover{background:#f0f5e8}
.icon-btn{background:none;border:none;cursor:pointer;padding:2px 4px;border-radius:5px;font-size:12px;transition:background .14s;line-height:1}
.icon-btn:hover{background:#e8f0d8}
.kids-alt-tag{font-size:10px;color:#2a5a1a;background:#e4f0d4;padding:2px 5px;border-radius:4px;margin-top:3px;display:inline-block;cursor:pointer}

/* ── SHOPPING LIST ── */
.list-hero{background:linear-gradient(145deg,#1a4a2a,#2a6a3a);border-radius:20px;padding:24px;margin-bottom:22px;color:#fff}
.list-hero-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px}
.list-title{font-family:'Cormorant Garamond',serif;font-size:26px;font-weight:600;margin-bottom:3px}
.list-range{font-size:12px;color:rgba(255,255,255,.6)}
.list-prog-track{background:rgba(255,255,255,.2);border-radius:100px;height:7px;overflow:hidden;margin-bottom:5px}
.list-prog-fill{height:100%;background:#fff;border-radius:100px;transition:width .4s}
.list-prog-txt{font-size:11px;color:rgba(255,255,255,.7);display:flex;justify-content:space-between}
.list-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}
.list-act-btn{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:100px;padding:6px 14px;font-size:12px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s;display:inline-flex;align-items:center;gap:5px}
.list-act-btn:hover{background:rgba(255,255,255,.25)}
.all-done{background:linear-gradient(135deg,#2a6a2a,#3a8a3a);border-radius:16px;padding:22px;text-align:center;margin-bottom:18px;color:#fff}
.all-done-icon{font-size:44px;margin-bottom:8px}
.all-done-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;margin-bottom:3px}
.all-done-sub{font-size:13px;color:rgba(255,255,255,.8)}
.cat-section{margin-bottom:18px}
.cat-header{display:flex;align-items:center;justify-content:space-between;padding:9px 0 7px;border-bottom:1px solid #e8e4d8;margin-bottom:4px}
.cat-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#1a3a1a;display:flex;align-items:center;gap:7px}
.cat-count{font-size:12px;color:#8a9a7a}
.list-item{display:flex;align-items:center;min-height:52px;cursor:pointer;border-radius:12px;transition:background .15s;user-select:none;padding:2px 6px}
.list-item:hover{background:#f4f0e8}
.list-item.checked{opacity:.45}
.check-wrap{width:50px;height:52px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.check-circle{width:26px;height:26px;border-radius:50%;border:2px solid #c8d4b0;background:#fff;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
.list-item:not(.checked) .check-circle:hover{border-color:#2a6a3a}
.check-circle.on{background:#2a6a3a;border-color:#2a6a3a}
.check-tick{color:#fff;font-size:13px;font-weight:700;line-height:1}
.item-text{flex:1;font-size:15px;color:#2a2a1a;line-height:1.4;padding:4px 0}
.list-item.checked .item-text{text-decoration:line-through;color:#aaa898}
.item-divider{height:1px;background:#f0ece0;margin:0 54px}
.add-row{display:flex;gap:9px;align-items:center;margin-top:14px;padding:11px 14px;background:#fff;border-radius:14px;border:1.5px dashed #c8d4b0}
.add-row:focus-within{border-color:#2a6a3a;background:#f8faf4}
.add-inp{flex:1;border:none;background:transparent;font-size:14px;font-family:'Plus Jakarta Sans',sans-serif;color:#2a2a1a;outline:none;padding:2px 0}
.add-inp::placeholder{color:#b0b898}
.add-btn{background:#2a6a3a;color:#fff;border:none;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;flex-shrink:0}
.add-btn:hover{background:#1a4a2a}

/* ── RECIPE MODAL — explicit height so flex:1 body works ── */
.recipe-overlay{position:fixed;inset:0;background:rgba(20,30,15,.7);z-index:300;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(8px)}
@media(min-width:600px){.recipe-overlay{align-items:center;padding:24px}}
.recipe-sheet{background:#fff;border-radius:24px 24px 0 0;max-width:540px;width:100%;height:88vh;display:flex;flex-direction:column;overflow:hidden}
@media(min-width:600px){.recipe-sheet{border-radius:24px;height:min(88vh,720px)}}
.recipe-photo{width:100%;height:200px;object-fit:cover;display:block;flex-shrink:0}
.recipe-photo-loading{width:100%;height:200px;background:#e8e4d8;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.recipe-photo-fallback{width:100%;height:200px;display:flex;align-items:center;justify-content:center;font-size:64px;flex-shrink:0}
.recipe-header{padding:16px 20px 12px;border-bottom:1px solid #f0ece0;flex-shrink:0}
.recipe-header-top{display:flex;align-items:flex-start;justify-content:space-between;gap:9px;margin-bottom:9px}
.recipe-name{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1a3a1a;line-height:1.2;flex:1}
.recipe-close{background:#f4f0e8;border:none;color:#6a7a5a;width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .14s}
.recipe-close:hover{background:#e8e4d8;color:#1a3a1a}
.recipe-pills{display:flex;gap:6px;flex-wrap:wrap}
.recipe-pill{background:#f4f0e8;border:1px solid #e0ddd0;border-radius:100px;padding:3px 10px;font-size:11px;font-weight:500;color:#2a3a1a}
.recipe-body{overflow-y:auto;flex:1;padding:16px 20px 28px;min-height:0}
.recipe-section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#8a9a7a;margin:16px 0 9px}
.recipe-section:first-child{margin-top:0}
.recipe-ing{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #f0ece0;font-size:14px;color:#2a2a1a}
.recipe-ing:last-child{border:none}
.recipe-dot{width:7px;height:7px;border-radius:50%;background:#2a6a3a;flex-shrink:0}
.recipe-step{display:flex;gap:11px;margin-bottom:12px;align-items:flex-start}
.recipe-step-n{min-width:26px;height:26px;border-radius:50%;background:#c4622d;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
.recipe-step-txt{font-size:14px;color:#2a2a1a;line-height:1.6;flex:1}
.recipe-tip{background:#f4f8ec;border-left:3px solid #2a6a3a;padding:10px 13px;border-radius:0 10px 10px 0;font-size:13px;color:#1a3a1a;line-height:1.6;margin-top:6px}
.recipe-loading{display:flex;flex-direction:column;align-items:center;gap:12px;padding:28px 0;color:#6a7a5a;font-size:13px}
.spin-ring{width:30px;height:30px;border:3px solid #e0ddd0;border-top-color:#2a6a3a;border-radius:50%;animation:spin .8s linear infinite}
.spin-small{width:22px;height:22px;border:2px solid #e0ddd0;border-top-color:#2a6a3a;border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.kids-alt-box{background:#e8f5e8;border:1px solid #b8d8b8;border-radius:9px;padding:10px 13px;margin-top:10px;cursor:pointer}
.kids-alt-label{font-size:11px;font-weight:700;color:#2a7a2a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
.kids-alt-name{font-size:14px;color:#1a3a1a;font-weight:500}

/* ── SWAP MODAL ── */
.modal-overlay{position:fixed;inset:0;background:rgba(20,30,15,.65);z-index:200;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}
.modal-box{background:#fff;border-radius:22px;padding:22px;max-width:420px;width:100%}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:21px;font-weight:600;color:#1a3a1a;margin-bottom:3px}
.modal-sub{font-size:13px;color:#6a7a5a;margin-bottom:14px}
.swap-opt{padding:12px;border-radius:13px;border:1.5px solid #e0ddd0;margin-bottom:8px;cursor:pointer;transition:all .17s}
.swap-opt:hover{border-color:#2a6a3a;background:#f4f8ec;transform:translateX(3px)}
.swap-name{font-weight:600;font-size:14px;color:#1a3a1a;margin-bottom:2px}
.swap-desc{font-size:12px;color:#6a7a5a}
.swap-meta{display:flex;gap:9px;margin-top:4px;font-size:11px;color:#8a9a7a}
.swap-loading{text-align:center;padding:22px 0}
.swap-loading-icon{font-size:32px;animation:pulse 1.5s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}

/* ── PAYWALL MODAL ── */
.paywall-plans{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
.plan-card{padding:14px;border-radius:12px;border:1.5px solid #e0ddd0;background:#f8f5ee}
.plan-card.featured{border:2px solid #c4622d;background:linear-gradient(135deg,#fdf5ee,#fff);position:relative}
.plan-badge{position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:#c4622d;color:#fff;font-size:9px;font-weight:700;padding:2px 9px;border-radius:100px;white-space:nowrap;letter-spacing:.5px}
.plan-name{font-size:12px;font-weight:700;color:#6a7a5a;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}
.plan-name.featured{color:#a04820}
.plan-features{font-size:11px;color:#5a6a4a;line-height:2.1}
.plan-price{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#1a3a1a;margin-top:9px}
.plan-price.featured{color:#a04820}
.paywall-cta{width:100%;padding:12px;border-radius:100px;border:none;background:linear-gradient(135deg,#c4622d,#a04820);color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;margin-bottom:9px}
.paywall-skip{width:100%;padding:9px;border-radius:100px;border:1.5px solid #e0ddd0;background:transparent;color:#6a7a5a;font-size:13px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif}
.paywall-restore{text-align:center;margin-top:12px;font-size:12px;color:#8a9a7a}
.paywall-restore span{color:#2a6a3a;cursor:pointer;text-decoration:underline}

/* ── LANDING ── */
.land-hero{text-align:center;padding:52px 16px 36px}
.land-logo{width:130px;height:auto;margin:0 auto 20px;display:block}
.land-tagline{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#8a9a7a;margin-bottom:12px}
.land-h1{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;color:#1a3a1a;line-height:1.08;margin-bottom:12px}
.land-h1 em{color:#c4622d;font-style:italic}
.land-sub{font-size:15px;color:#5a6a4a;max-width:360px;margin:0 auto;line-height:1.7;font-weight:300}
.land-cta{margin-top:24px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.land-cta-p{background:#1a4a2a;color:#fff;border:none;padding:13px 26px;border-radius:100px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.land-cta-p:hover{background:#0f3020;transform:translateY(-1px);box-shadow:0 5px 18px rgba(26,74,42,.3)}
.land-cta-s{background:transparent;color:#2a6a3a;border:1.5px solid #a0c090;padding:12px 22px;border-radius:100px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.land-cta-s:hover{background:#f0f5e8}

/* plan strip */
.plan-strip{border-radius:14px;padding:13px 16px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
.plan-strip.free{background:#fff;border:1px solid #e0ddd0}
.plan-strip.premium{background:linear-gradient(135deg,#1a4a2a,#2a6a3a);color:#fff}
.strip-upgrade{padding:7px 16px;border-radius:100px;border:none;background:#c4622d;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;white-space:nowrap}

/* current week card */
.cw-card{background:linear-gradient(145deg,#1a4a2a,#2a6a3a);border-radius:20px;padding:20px;color:#fff;margin-bottom:20px;overflow:hidden}
.cw-eyebrow{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.5);margin-bottom:7px}
.cw-range{font-family:'Cormorant Garamond',serif;font-size:clamp(15px,4.5vw,24px);font-weight:600;margin-bottom:5px;line-height:1.25;word-break:break-word}
.cw-status{font-size:13px;color:rgba(255,255,255,.65);margin-bottom:16px}
.cw-meal-pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.cw-pill{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2);color:#fff;font-size:12px;font-weight:500;padding:4px 12px;border-radius:100px}
.cw-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}
.cw-btn-p{background:#fff;color:#1a4a2a;border:none;padding:9px 16px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s;white-space:nowrap}
.cw-btn-p:hover{background:#f0f5e8;transform:translateY(-1px)}
.cw-btn-s{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);padding:8px 14px;border-radius:100px;font-size:13px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .18s;white-space:nowrap}
.cw-btn-s:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.7)}

/* list strip */
.list-strip{background:#fff;border-radius:16px;padding:15px 18px;margin-bottom:22px;display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid #e0ddd0;cursor:pointer;transition:all .2s}
.list-strip:hover{border-color:#a0c090;transform:translateY(-1px);box-shadow:0 4px 12px rgba(30,60,20,.08)}
.ls-left{display:flex;align-items:center;gap:13px}
.ls-icon{width:42px;height:42px;background:#f0f5e8;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
.ls-title{font-size:14px;font-weight:600;color:#1a3a1a;margin-bottom:1px}
.ls-sub{font-size:12px;color:#7a8a6a}
.ls-prog{font-size:13px;font-weight:600;color:#2a6a3a}

/* week timeline */
.wt-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#1a3a1a;margin-bottom:14px}
.wt-scroll{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}
.wt-scroll::-webkit-scrollbar{display:none}
.wk{flex-shrink:0;width:155px;background:#fff;border-radius:16px;padding:15px;border:1.5px solid #e0ddd0;cursor:pointer;transition:all .2s;position:relative}
.wk:hover{border-color:#a0c090;transform:translateY(-2px);box-shadow:0 4px 12px rgba(30,60,20,.1)}
.wk.cur{border-color:#c4622d}
.wk.has{border-color:#c8d8a8}
.wk.empty{border-style:dashed;cursor:default}
.wk.empty:hover{transform:none;box-shadow:none}
.wk-dot{width:8px;height:8px;border-radius:50%;background:#e0ddd0;margin-bottom:9px}
.wk.cur .wk-dot{background:#c4622d}
.wk.has .wk-dot{background:#2a6a3a}
.wk-lbl{font-size:10px;color:#8a9a7a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.wk-dates{font-size:11px;font-weight:600;color:#1a3a1a;line-height:1.4;margin-bottom:7px}
.wk-meals{display:flex;flex-direction:column;gap:3px;margin-bottom:7px}
.wk-meal{font-size:10px;color:#3a5a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wk-empty-txt{font-size:11px;color:#b0b898;margin-bottom:7px}
.wk-acts{display:flex;gap:5px;flex-wrap:wrap}
.wk-btn{font-size:11px;padding:4px 9px;border-radius:100px;border:1.5px solid #d0ccb8;background:transparent;color:#4a6a4a;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s}
.wk-btn:hover{border-color:#2a6a3a;color:#2a6a3a}
.wk-btn.pri{background:#1a4a2a;color:#fff;border-color:#1a4a2a}
.wk-badge{position:absolute;top:-7px;left:50%;transform:translateX(-50%);font-size:9px;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
.wk-badge.now{background:#c4622d;color:#fff}
.wk-badge.saved{background:#e8f0d8;color:#3a5a2a}

/* footer */
.land-footer{text-align:center;padding:14px 0 6px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
.land-footer-v{font-size:11px;color:#aaa898}
.btn-update{background:transparent;border:none;color:#8a9a7a;font-size:12px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border-radius:8px}
.btn-update:hover{background:#f0ece0;color:#2a3a1a}

/* week context bar */
.wk-ctx{background:#f0f5e8;border-radius:10px;padding:9px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:9px;font-size:13px;color:#1a3a1a;font-weight:600;border:1px solid #d8e4c0}

/* shop select panel */
.shop-panel{background:#fff;border-radius:18px;padding:22px;border:1px solid #e0ddd0}
.shop-panel-hdr{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:9px;margin-bottom:11px}
/* padding so content isn't hidden behind fixed basket bar */
.mealplan-page{padding-bottom:90px}
.meal-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}
.meal-pill{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;background:#f4f8ec;border:1.5px solid #c8d4b0;border-radius:100px;font-size:12px;color:#2a6a3a;font-weight:500;cursor:pointer;transition:all .16s}
.meal-pill:hover{border-color:#2a6a3a;background:#e8f0d8}

/* toast */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a3a1a;color:#fff;padding:10px 22px;border-radius:100px;font-size:13px;font-weight:500;z-index:500;animation:toastin .3s ease;pointer-events:none;white-space:nowrap}
@keyframes toastin{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}

/* verifying */
.verifying-overlay{position:fixed;inset:0;background:rgba(20,30,15,.7);z-index:400;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;backdrop-filter:blur(6px)}
.verifying-overlay p{color:#fff;font-size:16px;font-weight:500}

/* section header */
.sec-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}

/* spin util */
.spinning{animation:spin .7s linear infinite}
`;

// ─── DEFAULT PREFS ─────────────────────────────────────────────────────────────
const STEPS = { welcome:1, days:2, cuisines:3, dietary:4, vibe:5, budget:6, servings:7, generating:8, mealplan:9, list:10 };

export default function App() {
  // navigation
  const [step, setStep]     = useState("landing");
  const [awk, setAwkS]      = useState(null);
  const awkR                = useRef(null);
  const setAwk = k => { setAwkS(k); awkR.current = k; };

  // prefs
  const [prefs, setPrefs]   = useState({ ...DPREFS });

  // plan data
  const [plan, setPlan]     = useState(null);
  const [costs, setCosts]   = useState({});
  const [sl, setSl]         = useState(null);        // shopping list
  const [ticked, setTicked] = useState(new Set());   // checked items
  const [custom, setCustom] = useState([]);          // custom list items
  const [addTxt, setAddTxt] = useState("");

  // selections (for building list)
  const [picked, setPicked]     = useState(new Set());
  const [kPicked, setKPicked]   = useState(new Set());

  // ui
  const [favs, setFavs]         = useState([]);
  const [recipe, setRecipe]     = useState(null);
  const [swap, setSwap]         = useState(null);
  const [swapOpts, setSwapOpts] = useState([]);
  const [swapLd, setSwapLd]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [waitMsg, setWaitMsg]   = useState("");
  const [err, setErr]           = useState("");
  const [toast, setToast]       = useState("");
  const [showToast, setShowToast] = useState(false);
  const [updating, setUpdating]   = useState(false);

  // premium
  const [premium, setPremium]   = useState(null);
  const [usage, setUsage]       = useState({ n: 0 });
  const [showPaywall, setShowPaywall] = useState(false);
  const [verifying, setVerifying]     = useState(false);

  const sym    = CURRENCY[prefs.currency] || "€";
  const tsrv   = prefs.adults + (prefs.kidsDiff ? 0 : prefs.kids);
  const budget = parseFloat(prefs.budget) || 0;
  const totalCost = Object.values(costs).reduce((s, v) => s + (v || 0), 0);
  const isPro  = isPActive(premium);
  const FREE_TOTAL = 5;   // lifetime free rolls before monthly cap kicks in
  const FREE_MONTHLY = 1; // rolls per month once lifetime free exhausted
  const totalUsed   = usage.total  || 0;
  const monthUsed   = usage.monthN || 0;
  const inFreeTier  = totalUsed < FREE_TOTAL;  // still within initial free allowance
  const rleft = isPro ? Infinity
    : inFreeTier ? (FREE_TOTAL - totalUsed)
    : Math.max(0, FREE_MONTHLY - monthUsed);
  const canRoll = isPro || rleft > 0;
  const selDays = (prefs.days || DAYS).filter(d => DAYS.includes(d));
  const sp = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  const pop = msg => { setToast(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2800); };

  // boot
  useEffect(() => {
    try { const s = localStorage.getItem(FK); if (s) setFavs(JSON.parse(s)); } catch {}
    const p = loadP(); setPremium(p);
    setUsage(loadU());
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const act = params.get("activate");
    if (act === "premium") {
      window.history.replaceState({}, document.title, window.location.pathname);
      const pd = { email: "premium@dishroll.app", id: "manual", until: Date.now() + 365 * 864e5 };
      saveP(pd); setPremium(pd); pop("✨ Premium activated! Enjoy unlimited rolls.");
    } else if (sid) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setVerifying(true);
      fetch("/.netlify/functions/verify", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sessionId: sid }) })
        .then(r => r.json())
        .then(d => {
          if (d.premium) { const pd = { email: d.email, id: d.customerId, until: d.validUntil }; saveP(pd); setPremium(pd); pop("🎉 Welcome to DishRoll Premium!"); }
          else pop("Could not verify payment — contact support.");
        })
        .catch(() => pop("Could not verify. Try refreshing."))
        .finally(() => setVerifying(false));
    }
  }, []);

  // helpers
  const saveFavs = f => { try { localStorage.setItem(FK, JSON.stringify(f)); } catch {} };
  const toggleFav = n => { const v = favs.includes(n) ? favs.filter(x => x !== n) : [...favs, n]; setFavs(v); saveFavs(v); };
  const addFavMeal = () => { if (!prefs.favInput.trim()) return; sp("favMeals", [...prefs.favMeals, prefs.favInput.trim()]); sp("favInput", ""); };
  const setScope = s => { const t = s === "dinner" ? ["dinner"] : s === "all" ? ["breakfast","lunch","dinner"] : prefs.types; setPrefs(p => ({ ...p, scope: s, types: t })); };
  const toggleType = t => { const n = prefs.types.includes(t) ? prefs.types.filter(x => x !== t) : [...prefs.types, t]; if (n.length) sp("types", n); };
  const toggleDay = d => { const c = prefs.days; const n = c.includes(d) ? c.filter(x => x !== d) : [...c, d]; if (n.length) sp("days", n); };
  const togglePick = k => setPicked(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleKPick = k => setKPicked(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const prog = Math.round(((STEPS[step] || 1) / 10) * 100);

  // alloc items for list
  function allItems() {
    if (!sl) return [];
    const base = sl.categories.flatMap(c => c.items.map(i => ({ id: i, text: i, cat: c.name })));
    const cu = custom.map(c => ({ id: c.id, text: c.text, cat: "My additions" }));
    return [...base, ...cu];
  }
  const totalItems = allItems().length;
  const doneCount  = allItems().filter(i => ticked.has(i.id)).length;
  const allDone    = totalItems > 0 && doneCount === totalItems;

  useEffect(() => { if (allDone && totalItems > 0) track("list_completed", { items: totalItems }); }, [allDone]);

  // persist
  function persist(p2, c2, l2, tk2, cu2, kp2) {
    const key = awkR.current;
    if (!key || !p2) return;
    saveWk(key, {
      plan: p2,
      costs: c2 ?? costs,
      prefs,
      sl: l2 ?? sl,
      ticked: [...(tk2 ?? ticked)],
      custom: cu2 ?? custom,
      kPicked: [...(kp2 ?? kPicked)],
    });
  }

  function openPlan(key) {
    const d = loadWk(key); if (!d) return;
    setAwk(key); setPlan(d.plan); setCosts(d.costs || {});
    if (d.prefs) setPrefs({ ...DPREFS, ...d.prefs });
    setSl(d.sl || null); setTicked(new Set(d.ticked || [])); setCustom(d.custom || []);
    setPicked(new Set()); setKPicked(new Set(d.kPicked || [])); setErr("");
    setStep("mealplan");
  }
  function openList(key) {
    const d = loadWk(key); if (!d?.sl) return;
    setAwk(key); setPlan(d.plan || null); setCosts(d.costs || {});
    if (d.prefs) setPrefs({ ...DPREFS, ...d.prefs });
    setSl(d.sl); setTicked(new Set(d.ticked || [])); setCustom(d.custom || []);
    setPicked(new Set()); setKPicked(new Set(d.kPicked || [])); setErr("");
    setStep("list");
  }
  function newRoll(key) {
    setAwk(key); setPlan(null); setCosts({}); setSl(null);
    setTicked(new Set()); setCustom([]); setPicked(new Set()); setKPicked(new Set()); setErr("");
    setStep("welcome");
  }
  function forceUpdate() {
    setUpdating(true);
    try { if ("caches" in window) caches.keys().then(ns => ns.forEach(n => caches.delete(n))); } catch {}
    setTimeout(() => window.location.reload(true), 800);
  }

  // roll
  async function roll() {
    if (!canRoll) { setShowPaywall(true); track("paywall_shown", { trigger: "roll" }); return; }
    track("roll_started", { days: selDays.length, types: prefs.types.join(","), is_pro: isPro });
    setStep("generating"); setErr("");
    let i = 0; setWaitMsg(WAIT_MSGS[0]);
    const iv = setInterval(() => { i = (i + 1) % WAIT_MSGS.length; setWaitMsg(WAIT_MSGS[i]); }, 2500);
    try {
      const fh = [...prefs.favMeals, ...favs.slice(0, 4)].filter(Boolean).join(", ");
      const bn = prefs.budgetOn && budget > 0 ? `Budget:${sym}${budget}/week.` : "";
      const cn = prefs.complexity === "simple" ? "Prefer quick easy dishes under 30 minutes." : prefs.complexity === "elaborate" ? "Include impressive multi-step recipes." : "";
      const kf = prefs.kids > 0 && prefs.kidsDiff ? `,"kidsAlt":{"name":"kids dish name","ingredients":["qty item"]}` : "";
      const kn = prefs.kids > 0 && prefs.kidsDiff ? `Each meal must include "kidsAlt":{"name":"child-friendly dish","ingredients":["qty item"]} for ${prefs.kids} kids, mild and simple.` : "";
      const mealShape = `{"name":"meal name","description":"8 word description","time":"X min","estCost":0.00,"ingredients":["qty item"]${kf}}`;
      const daySchema = `{${prefs.types.map(t => `"${t}":${mealShape}`).join(",")}}`;
      const dJ = selDays.map(d => `"${d.toLowerCase()}":${daySchema}`).join(",");
      const raw = await callAI(
        `Generate a meal plan. Return ONLY valid compact JSON, no whitespace.\n` +
        `Days:${selDays.map(d => d.slice(0,3)).join(",")}|Types:${prefs.types.join(",")}|` +
        `Cuisines:${prefs.cuisines.length ? prefs.cuisines.join(",") : "varied"}|` +
        `Dietary:${prefs.dietary.length ? prefs.dietary.join(",") : "none"}|` +
        `Adventure:${prefs.adventure}%|Servings:${tsrv}|Favs:${fh || "none"}|${bn}${cn}${kn}\n` +
        `Return:{${dJ}}`,
        4000
      );
      const p2 = JSON.parse(raw);
      const anyMeal = selDays.some(d => { const day = p2[d.toLowerCase()]; return day && prefs.types.some(t => day[t]?.name); });
      if (!anyMeal) throw new Error("No meals returned — please try again.");
      const c2 = {};
      selDays.forEach(d => prefs.types.forEach(t => { const m = p2[d.toLowerCase()]?.[t]; if (m?.estCost) c2[`${d.toLowerCase()}-${t}`] = m.estCost; }));
      clearInterval(iv); setPlan(p2); setCosts(c2);
      if (!isPro) setUsage(incU());
      track("roll_completed", { days: selDays.length, types: prefs.types.join(","), is_pro: isPro });
      persist(p2, c2, null, new Set(), [], new Set()); setStep("mealplan");
    } catch (e) { clearInterval(iv); setErr("Could not roll: " + e.message); setStep("servings"); }
  }

  // swap
  async function openSwap(day, mt) {
    const cur = plan?.[day.toLowerCase()]?.[mt]; if (!cur) return;
    setSwap({ day, mt }); setSwapLd(true); setSwapOpts([]);
    try {
      const raw = await callAI(
        `3 alternative ${mt} recipes to replace "${cur.name}". Cuisines:${prefs.cuisines.join(",") || "any"}. Dietary:${prefs.dietary.join(",") || "none"}. Complexity:${prefs.complexity}. Servings:${tsrv}.\n` +
        `Return ONLY JSON array:[{"name":"...","description":"8w","time":"X min","estCost":0.00,"ingredients":["qty item"]},...]`,
        1200
      );
      setSwapOpts(JSON.parse(raw));
    } catch { setSwapOpts([]); }
    setSwapLd(false);
  }
  function applySwap(opt) {
    const k = `${swap.day.toLowerCase()}-${swap.mt}`;
    const nc = { ...costs, [k]: opt.estCost || 0 };
    const np = { ...plan, [swap.day.toLowerCase()]: { ...plan[swap.day.toLowerCase()], [swap.mt]: opt } };
    setCosts(nc); setPlan(np);
    track("meal_swapped", { day: swap.day, type: swap.mt, meal: opt.name });
    persist(np, nc, sl, ticked, custom, kPicked); setSwap(null); setSwapOpts([]);
  }

  // select all for list
  function selectAll() {
    const s = new Set(), ks = new Set();
    selDays.forEach(d => prefs.types.forEach(t => {
      const m = plan?.[d.toLowerCase()]?.[t];
      if (m) s.add(`${d.toLowerCase()}-${t}`);
      if (m?.kidsAlt?.name && prefs.kidsDiff) ks.add(`${d.toLowerCase()}-${t}-k`);
    }));
    setPicked(s); setKPicked(ks);
  }

  // build list
  async function buildList() {
    if (!picked.size && !kPicked.size) return;
    setLoading(true); setWaitMsg("Building your shopping list…");
    try {
      const items = [];
      selDays.forEach(d => prefs.types.forEach(t => {
        if (picked.has(`${d.toLowerCase()}-${t}`)) {
          const m = plan?.[d.toLowerCase()]?.[t]; if (m) items.push({ meal: m.name, servings: tsrv, ingredients: m.ingredients, label: "Adults" });
        }
        if (kPicked.has(`${d.toLowerCase()}-${t}-k`)) {
          const ka = plan?.[d.toLowerCase()]?.[t]?.kidsAlt;
          if (ka?.ingredients?.length) items.push({ meal: ka.name, servings: prefs.kids, ingredients: ka.ingredients, label: "Kids" });
        }
      }));
      const raw = await callAI(
        `Combine into grocery list. Merge identical items. Group by supermarket aisle.\nMeals:${JSON.stringify(items)}\n` +
        `Return ONLY JSON:{"categories":[{"name":"Produce","items":["2 onions"]},{"name":"Proteins","items":["600g chicken"]}]}\n` +
        `Categories:Produce,Proteins,Dairy,Grains,Pantry,Condiments,Frozen,Bakery,Beverages,Other.`,
        2400
      );
      const list = JSON.parse(raw);
      track("list_built", { adult_meals: picked.size, kids_meals: kPicked.size, items: list.categories.flatMap(c => c.items).length });
      setSl(list); setTicked(new Set()); setCustom([]);
      persist(plan, costs, list, new Set(), [], kPicked); setStep("list");
    } catch { setErr("Could not build shopping list."); }
    setLoading(false);
  }

  // recipe
  async function openRecipe(meal, mt, variant) {
    const isKids = variant === "kids";
    track("recipe_opened", { meal: meal.name, type: isKids ? "kids" : "adult", mt });
    setRecipe({ meal, mt, variant, steps: [], tip: "", prepTime: "", cookTime: "", difficulty: "", photoUrl: null, photoLd: true, stepsLd: true });
    // Photo: always resolves to something (guaranteed fallback in fetchPhoto)
    fetchPhoto(meal.name, mt).then(url => setRecipe(p => p ? { ...p, photoUrl: url || getPhotoByName(meal.name, mt), photoLd: false } : null));
    // Recipe: detailed prompt with retry on failure
    const srv = isKids ? prefs.kids : tsrv;
    const prompt = isKids
      ? `Write a simple, fun child-friendly recipe for "${meal.name}" for ${srv} kids (ages 4–12). Use mild flavours and simple techniques a child can help with.
Return ONLY JSON:{"steps":["Step 1 with detail...","Step 2...","Step 3...","Step 4...","Step 5..."],"tip":"a fun tip for cooking with kids","prepTime":"X min","cookTime":"X min","difficulty":"Easy"}`
      : `Write a detailed, professional home cook recipe for "${meal.name}" for ${srv} servings.
Rules: each step must include exact ingredient quantities, specific cooking temperatures in °C, and precise timing. Minimum 7 steps. Be thorough — a beginner should be able to follow this exactly.
Return ONLY JSON:{"steps":["Step 1: [action] — [exact qty, temp °C if applicable, time]. [tip]","Step 2:...","Step 3:...","Step 4:...","Step 5:...","Step 6:...","Step 7:..."],"tip":"One expert chef insight specific to this dish","prepTime":"X min","cookTime":"X min","difficulty":"Easy|Medium|Hard"}`;
    const tryLoad = async (attempt) => {
      try {
        const raw = await callAI(prompt, 2200);
        const d = JSON.parse(raw);
        if (!d.steps || d.steps.length === 0) throw new Error("empty");
        setRecipe(p => p ? { ...p, steps: d.steps, tip: d.tip || "", prepTime: d.prepTime || "", cookTime: d.cookTime || "", difficulty: d.difficulty || "", stepsLd: false } : null);
      } catch (e) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000));
          return tryLoad(attempt + 1);
        }
        // Always show something — use ingredients list as fallback
        const fallback = meal.ingredients && meal.ingredients.length > 0
          ? [`Prepare all ingredients: ${meal.ingredients.slice(0,5).join(", ")}${meal.ingredients.length > 5 ? " and more" : ""}. Cook according to standard method for ${meal.name}. Season to taste and serve hot.`]
          : [`Cook ${meal.name} according to your preferred method. Season well and serve.`];
        setRecipe(p => p ? { ...p, steps: fallback, tip: "Recipe details unavailable — tap ↻ on the meal card to swap for a different dish.", stepsLd: false } : null);
      }
    };
    tryLoad(0);
  }

  // checkout
  function startCheckout() {
    track("upgrade_clicked", { from: step });
    window.location.href = "https://buy.stripe.com/dRmfZidobbBQeWZaIx2Ry02";
  }

  // ─── LANDING ────────────────────────────────────────────────────────────────
  function Landing() {
    const ck = cWK(); const cwd = loadWk(ck);
    const hasList = !!cwd?.sl;
    const li = hasList ? (cwd.sl.categories.flatMap(c => c.items).length + (cwd.custom?.length || 0)) : 0;
    const ld = hasList ? (cwd.ticked?.length || 0) : 0;
    const ckKeys = calKeys(ck, 6); const stored = allWks();
    const [cdel, setCdel] = useState(null);
    const sample = d => {
      if (!d?.plan) return [];
      return DAYS.slice(0, 3).map(day => { const dy = d.plan[day.toLowerCase()]; return dy ? Object.values(dy)[0]?.name : null; }).filter(Boolean);
    };
    const cwSample = sample(cwd);

    return (
      <div>
        {/* Hero */}
        <div className="land-hero">
          <img src="/logo.png" alt="DishRoll" className="land-logo" />
          <div className="land-tagline">Weekly meal planning</div>
          <div className="land-h1">Know what's for<br /><em>dinner every night.</em></div>
          <p className="land-sub">Plan your week, generate a shopping list, and discover new recipes.</p>
          {!cwd && (
            <div className="land-cta">
              <button className="land-cta-p" onClick={() => newRoll(ck)}>Plan this week</button>
              {!isPro && <button className="land-cta-s" onClick={() => setShowPaywall(true)}>✦ Go Premium</button>}
            </div>
          )}
        </div>

        {/* Plan status strip */}
        {isPro ? (
          <div className="plan-strip premium">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>✨ DishRoll Premium</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>Unlimited rolls · {premium?.email || "Active"}</div>
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", cursor: "pointer", textDecoration: "underline" }} onClick={() => { clearP(); setPremium(null); pop("Premium removed from device."); }}>Remove</span>
          </div>
        ) : (
          <div className="plan-strip free">
            <div style={{ fontSize: 13, color: "#5a6a4a" }}>
              Free — <strong style={{ color: "#1a3a1a" }}>{rleft} roll{rleft !== 1 ? "s" : ""}</strong>{" "}
              {inFreeTier ? `left to try (${totalUsed}/${FREE_TOTAL} used)` : "left this month"}
            </div>
            <button className="strip-upgrade" onClick={() => setShowPaywall(true)}>✦ Go Premium — {PRICE_MONTHLY}/mo</button>
          </div>
        )}

        {/* Current week */}
        <div className="cw-card">
          <div className="cw-eyebrow">This week</div>
          <div className="cw-range">{wLabel(ck)}</div>
          <div className="cw-status">{cwd ? "Already planned — open or plan again" : "Not planned yet"}</div>
          {cwSample.length > 0 && (
            <div className="cw-meal-pills">
              {cwSample.map((n, i) => <span key={i} className="cw-pill">{n}</span>)}
              {Object.keys(cwd?.plan || {}).length > 3 && <span className="cw-pill">+ more</span>}
            </div>
          )}
          <div className="cw-actions">
            {cwd && <button className="cw-btn-p" onClick={() => openPlan(ck)}>Open plan</button>}
            <button className={cwd ? "cw-btn-s" : "cw-btn-p"} onClick={() => newRoll(ck)}>{cwd ? "Plan again" : "Plan this week"}</button>
          </div>
        </div>

        {/* List strip */}
        {hasList && (
          <div className="list-strip" onClick={() => openList(ck)}>
            <div className="ls-left">
              <div className="ls-icon">🛒</div>
              <div><div className="ls-title">Shopping list</div><div className="ls-sub">{wLabel(ck)}</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {li > 0 && <span className="ls-prog">{ld}/{li} done</span>}
              <span style={{ fontSize: 18, color: "#a0c090" }}>›</span>
            </div>
          </div>
        )}

        {/* Week timeline */}
        <div className="wt-title">Your weeks</div>
        <div className="wt-scroll" style={{ marginBottom: 28 }}>
          {ckKeys.map(key => {
            const d = loadWk(key); const isC = isCW(key); const isF = isFW(key); const s = sample(d);
            const cls = ["wk", isC ? "cur" : d ? "has" : "empty"].join(" ");
            return (
              <div key={key} className={cls} onClick={() => d && !isF && openPlan(key)}>
                {isC && <span className="wk-badge now">This week</span>}
                {!isC && d && <span className="wk-badge saved">Saved</span>}
                <div className="wk-dot" />
                <div className="wk-lbl">{isF ? "Upcoming" : isC ? "Current" : new Date(key + "T00:00:00").toLocaleDateString("en-IE", { month: "short", year: "numeric" })}</div>
                <div className="wk-dates">
                  {(() => { const m = new Date(key + "T00:00:00"); const s2 = new Date(m); s2.setDate(m.getDate() + 6); const f = d2 => d2.toLocaleDateString("en-IE", { day: "numeric", month: "short" }); return `${f(m)} – ${f(s2)}`; })()}
                </div>
                {d && s.length > 0 && <div className="wk-meals">{s.map((n, i) => <div key={i} className="wk-meal">{n}</div>)}</div>}
                {!d && <div className="wk-empty-txt">{isF ? "Plan ahead" : "No plan yet"}</div>}
                <div className="wk-acts" onClick={e => e.stopPropagation()}>
                  {d && <button className="wk-btn pri" onClick={() => openPlan(key)}>Open</button>}
                  {d?.sl && <button className="wk-btn" onClick={() => openList(key)}>List</button>}
                  <button className="wk-btn" onClick={() => newRoll(key)}>{d ? "Re-plan" : "Plan"}</button>
                  {d && cdel !== key && <button className="wk-btn" style={{ color: "#b04020", borderColor: "#e0a898" }} onClick={() => setCdel(key)}>✕</button>}
                  {d && cdel === key && <><button className="wk-btn" style={{ color: "#b04020", borderColor: "#b04020" }} onClick={() => { delWk(key); setCdel(null); pop("Week deleted"); setStep(s => s); }}>Confirm</button><button className="wk-btn" onClick={() => setCdel(null)}>Cancel</button></>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="land-footer">
          <span className="land-footer-v">DishRoll v{APP_VERSION}</span>
          <button className="btn-update" onClick={forceUpdate} disabled={updating}>
            <span className={updating ? "spinning" : ""} style={{ display: "inline-block" }}>↻</span>
            {updating ? "Updating…" : "Force update"}
          </button>
        </div>
      </div>
    );
  }

  // ─── RECIPE MODAL ───────────────────────────────────────────────────────────
  function RecipeModal() {
    if (!recipe) return null;
    const { meal, mt, variant, steps, tip, prepTime, cookTime, difficulty, photoUrl, photoLd, stepsLd } = recipe;
    const isKids = variant === "kids";
    const srv = isKids ? prefs.kids : tsrv;
    return (
      <div className="recipe-overlay" onClick={() => setRecipe(null)}>
        <div className="recipe-sheet" onClick={e => e.stopPropagation()}>
          {/* Photo */}
          {photoLd
            ? <div className="recipe-photo-loading"><div className="spin-ring" /></div>
            : photoUrl
              ? <img src={photoUrl} alt={meal.name} className="recipe-photo" onError={() => setRecipe(p => p ? { ...p, photoUrl: null, photoLd: false } : null)} />
              : <div className="recipe-photo-fallback" style={{ background: hashGrad(meal.name) }}>
                  <span style={{ fontSize: 72, lineHeight: 1 }}>{meal.name}</span>
                </div>
          }
          {/* Header */}
          <div className="recipe-header">
            <div className="recipe-header-top">
              <div>
                {isKids && <div style={{ fontSize: 11, fontWeight: 700, color: "#2a7a2a", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>👧 Kids recipe</div>}
                <div className="recipe-name">{meal.name}</div>
              </div>
              <button className="recipe-close" onClick={() => setRecipe(null)}>×</button>
            </div>
            <div className="recipe-pills">
              {prepTime && <span className="recipe-pill">🥄 Prep {prepTime}</span>}
              {cookTime && <span className="recipe-pill">🔥 Cook {cookTime}</span>}
              {difficulty && <span className="recipe-pill">{difficulty === "Easy" ? "🟢" : difficulty === "Medium" ? "🟡" : "🔴"} {difficulty}</span>}
              {meal.time && !prepTime && <span className="recipe-pill">⏱ {meal.time}</span>}
              <span className="recipe-pill">👥 {srv} serving{srv !== 1 ? "s" : ""}</span>
              {mt && !isKids && <span className="recipe-pill">🍽️ {ML[mt] || mt}</span>}
              {prefs.budgetOn && meal.estCost && <span className="recipe-pill">💰 {sym}{meal.estCost}</span>}
            </div>
          </div>
          {/* Scrollable body */}
          <div className="recipe-body">
            {meal.ingredients && meal.ingredients.length > 0 && (
              <>
                <div className="recipe-section">Ingredients — {srv} serving{srv !== 1 ? "s" : ""}</div>
                {meal.ingredients.map((ing, i) => (
                  <div key={i} className="recipe-ing"><div className="recipe-dot" />{ing}</div>
                ))}
              </>
            )}
            {!isKids && prefs.kids > 0 && prefs.kidsDiff && meal.kidsAlt && (
              <div className="kids-alt-box" onClick={() => openRecipe({ name: typeof meal.kidsAlt === "object" ? meal.kidsAlt.name : meal.kidsAlt, ingredients: typeof meal.kidsAlt === "object" ? meal.kidsAlt.ingredients || [] : [], time: "~20 min" }, mt, "kids")}>
                <div className="kids-alt-label">👧 Kids alternative — tap for recipe</div>
                <div className="kids-alt-name">{typeof meal.kidsAlt === "object" ? meal.kidsAlt.name : meal.kidsAlt} →</div>
              </div>
            )}
            <div className="recipe-section">How to cook</div>
            {stepsLd
              ? <div className="recipe-loading"><div className="spin-ring" /><span>Fetching recipe…</span></div>
              : <div>
                  {steps.map((s, i) => (
                    <div key={i} className="recipe-step">
                      <div className="recipe-step-n">{i + 1}</div>
                      <div className="recipe-step-txt">{s}</div>
                    </div>
                  ))}
                  {tip && <div className="recipe-tip">💡 <strong>Chef's tip:</strong> {tip}</div>}
                </div>
            }
          </div>
        </div>
      </div>
    );
  }

  // ─── SWAP MODAL ─────────────────────────────────────────────────────────────
  function SwapModal() {
    if (!swap) return null;
    const cur = plan?.[swap.day.toLowerCase()]?.[swap.mt];
    return (
      <div className="modal-overlay" onClick={() => setSwap(null)}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-title">Replace {swap.mt}</div>
          <div className="modal-sub">{swap.day} · <strong>{cur?.name}</strong></div>
          {swapLd
            ? <div className="swap-loading"><div className="swap-loading-icon">🍽️</div><div style={{ fontSize: 13, color: "#6a7a5a", marginTop: 9 }}>Finding alternatives…</div></div>
            : swapOpts.length === 0
              ? <div style={{ color: "#6a7a5a", fontSize: 13, padding: "10px 0" }}>No alternatives found.</div>
              : swapOpts.map((o, i) => (
                  <div key={i} className="swap-opt" onClick={() => applySwap(o)}>
                    <div className="swap-name">{o.name}</div>
                    <div className="swap-desc">{o.description}</div>
                    <div className="swap-meta"><span>⏱ {o.time}</span>{prefs.budgetOn && o.estCost != null && <span>💰 {sym}{o.estCost}</span>}</div>
                  </div>
                ))
          }
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setSwap(null)}>Cancel</button>
        </div>
      </div>
    );
  }

  // ─── PAYWALL MODAL ──────────────────────────────────────────────────────────
  function PaywallModal() {
    if (!showPaywall) return null;
    return (
      <div className="modal-overlay" onClick={() => setShowPaywall(false)}>
        <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, color: "#1a3a1a", marginBottom: 6 }}>
              {inFreeTier ? "Trial rolls used up" : "Monthly roll used"}
            </div>
            <div style={{ fontSize: 14, color: "#5a6a4a", lineHeight: 1.6 }}>
              {inFreeTier
                ? <>Free plan includes <strong>5 trial rolls</strong> to get started, then <strong>1 roll/month</strong>.<br/>Upgrade for unlimited rolls.</>
                : <>You've used your <strong>1 free roll</strong> this month.<br/>Upgrade for unlimited rolls.</>}
            </div>
          </div>
          <div className="paywall-plans">
            <div className="plan-card">
              <div className="plan-name">Free</div>
              <div className="plan-features">✓ 5 trial rolls<br />✓ Then 1 roll/month<br />✓ Shopping list<br />✓ Recipes</div>
              <div className="plan-price">€0</div>
            </div>
            <div className="plan-card featured">
              <div className="plan-badge">BEST VALUE</div>
              <div className="plan-name featured">Premium</div>
              <div className="plan-features">✓ <strong>Unlimited</strong> rolls<br />✓ All free features<br />✓ Kids meal rows<br />✓ Full history</div>
              <div className="plan-price featured">{PRICE_MONTHLY}<span style={{ fontSize: 12, color: "#8a9a7a", fontWeight: 400 }}>/mo</span></div>
            </div>
          </div>
          <button className="paywall-cta" onClick={startCheckout}>✨ Upgrade to Premium — {PRICE_MONTHLY}/month</button>
          <button className="paywall-skip" onClick={() => setShowPaywall(false)}>Maybe later</button>
          <div className="paywall-restore">Already subscribed? <span onClick={startCheckout}>Restore access</span></div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ──────────────────────────────────────────────────────────────
  function ListView() {
    if (!sl) return null;
    const cats = [...sl.categories];
    if (custom.length > 0) cats.push({ name: "My additions", items: [], _custom: true });
    return (
      <div>
        <div className="list-hero">
          <div className="list-hero-top">
            <div><div className="list-title">🛒 Shopping list</div><div className="list-range">{awk ? wLabel(awk) : ""}</div></div>
            <button className="btn btn-ghost btn-sm" style={{ color: "rgba(255,255,255,.8)", borderColor: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.1)" }} onClick={() => setStep(plan ? "mealplan" : "landing")}>← {plan ? "Plan" : "Home"}</button>
          </div>
          <div className="list-prog-track"><div className="list-prog-fill" style={{ width: totalItems > 0 ? `${Math.round((doneCount / totalItems) * 100)}%` : "0%" }} /></div>
          <div className="list-prog-txt"><span>{doneCount} of {totalItems} items</span><span>{totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0}% done</span></div>
          <div className="list-actions">
            <button className="list-act-btn" onClick={() => { setTicked(new Set()); persist(plan, costs, sl, new Set(), custom, kPicked); pop("All items unmarked"); }}>↺ Reset</button>
            <button className="list-act-btn" onClick={() => { const txt = sl.categories.map(c => `${c.name}:\n${c.items.map(i => "• " + i).join("\n")}`).join("\n\n") + (custom.length ? "\nMy additions:\n" + custom.map(c => "• " + c.text).join("\n") : ""); navigator.clipboard.writeText(txt); pop("List copied"); }}>📋 Copy list</button>
            <button className="list-act-btn" onClick={() => setStep("landing")}>🏠 Home</button>
          </div>
        </div>
        {allDone && <div className="all-done"><div className="all-done-icon">🎉</div><div className="all-done-title">All done!</div><div className="all-done-sub">Everything is in your basket. Enjoy your meals!</div></div>}
        {cats.map(cat => {
          const items = cat._custom ? custom : cat.items.map(i => ({ id: i, text: i }));
          if (items.length === 0) return null;
          const cd = items.filter(i => ticked.has(i.id)).length;
          return (
            <div key={cat.name} className="cat-section">
              <div className="cat-header">
                <div className="cat-name">{CAT_ICONS[cat.name] || "🛒"} {cat.name}</div>
                <div className="cat-count">{cd}/{items.length}</div>
              </div>
              {items.map((item, i) => (
                <Fragment key={item.id}>
                  <div className={`list-item${ticked.has(item.id) ? " checked" : ""}`} onClick={() => { const n = new Set(ticked); n.has(item.id) ? n.delete(item.id) : n.add(item.id); setTicked(n); persist(plan, costs, sl, n, custom, kPicked); }}>
                    <div className="check-wrap"><div className={`check-circle${ticked.has(item.id) ? " on" : ""}`}>{ticked.has(item.id) && <span className="check-tick">✓</span>}</div></div>
                    <div className="item-text">{item.text}</div>
                  </div>
                  {i < items.length - 1 && <div className="item-divider" />}
                </Fragment>
              ))}
            </div>
          );
        })}
        <div className="add-row">
          <input className="add-inp" placeholder="Add an item…" value={addTxt} onChange={e => setAddTxt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && addTxt.trim()) { const nc = [...custom, { id: "c-" + Date.now(), text: addTxt.trim() }]; setCustom(nc); setAddTxt(""); persist(plan, costs, sl, ticked, nc, kPicked); } }} />
          <button className="add-btn" onClick={() => { if (addTxt.trim()) { const nc = [...custom, { id: "c-" + Date.now(), text: addTxt.trim() }]; setCustom(nc); setAddTxt(""); persist(plan, costs, sl, ticked, nc, kPicked); } }}>+ Add</button>
        </div>
      </div>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  const overBudget = prefs.budgetOn && budget > 0 && totalCost > budget;

  return (
    <div>
      <style>{FONTS + CSS}</style>
      <div className="app">
        {/* Verifying overlay */}
        {verifying && (
          <div className="verifying-overlay">
            <div className="spin-ring" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <p>Verifying your subscription…</p>
          </div>
        )}

        {/* Header */}
        <div className="hdr">
          <div className="hdr-logo" onClick={() => setStep("landing")}>
            <span>Dish</span><span>Roll</span>
          </div>
          <div className="hdr-right">
            <span className="ver-pill">v{APP_VERSION}</span>
            {isPro
              ? <span style={{ fontSize: 11, fontWeight: 700, background: "linear-gradient(135deg,#c4622d,#a04820)", color: "#fff", padding: "3px 9px", borderRadius: 100 }}>✨ PREMIUM</span>
              : <span style={{ fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,.1)", color: "#b0d0a0", padding: "3px 9px", borderRadius: 100, cursor: "pointer" }} onClick={() => setShowPaywall(true)}>FREE · {rleft} {inFreeTier ? "trial" : "monthly"} left</span>
            }
            {sl && step !== "list" && <button className="btn btn-ghost btn-sm" onClick={() => setStep("list")}>🛒 List{doneCount > 0 ? ` (${doneCount}/${totalItems})` : ""}</button>}
            {step !== "landing" && step !== "generating" && <button className="btn btn-ghost btn-sm" onClick={() => setStep("landing")}>← Home</button>}
          </div>
        </div>

        {/* Progress */}
        {!["landing","generating","mealplan","list"].includes(step) && <div className="pb"><div className="pf" style={{ width: prog + "%" }} /></div>}

        <div className="page">

          {/* LANDING */}
          {step === "landing" && <Landing />}

          {/* LIST */}
          {step === "list" && <ListView />}

          {/* Week context */}
          {awk && step === "mealplan" && (
            <div className="wk-ctx">
              <span>{isCW(awk) ? "📅 This week" : "📅 " + wLabel(awk)} · Auto-saved</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep("landing")}>← Calendar</button>
            </div>
          )}

          {/* WELCOME */}
          {step === "welcome" && (
            <div>
              <div style={{ textAlign: "center", paddingTop: 10, marginBottom: 24 }}>
                <div className="page-title">Plan your week.<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>Eat well.</span></div>
                {awk && <p style={{ fontSize: 13, color: "#5a6a4a", marginTop: 6 }}>📅 {wLabel(awk)}</p>}
              </div>
              <div className="card">
                <div className="label">What would you like to plan?</div>
                <div className="mt-grid">
                  {[{ id:"dinner", icon:"🌙", label:"Dinner Only", sub:"Evening meals" }, { id:"all", icon:"☀️", label:"All Meals", sub:"Breakfast, lunch & dinner" }, { id:"custom", icon:"✏️", label:"Custom", sub:"Choose meal types" }].map(o => (
                    <div key={o.id} className={`mt-card${prefs.scope === o.id ? " sel" : ""}`} onClick={() => setScope(o.id)}>
                      <div className="mt-icon">{o.icon}</div><div className="mt-label">{o.label}</div><div className="mt-sub">{o.sub}</div>
                    </div>
                  ))}
                </div>
                {prefs.scope === "custom" && (
                  <div style={{ marginTop: 13 }}>
                    <div className="label">Meal types</div>
                    <div className="chip-group">{["breakfast","lunch","dinner"].map(t => <div key={t} className={`chip${prefs.types.includes(t) ? " sel" : ""}`} onClick={() => toggleType(t)} style={{ textTransform: "capitalize" }}>{ML[t]}</div>)}</div>
                  </div>
                )}
              </div>
              {favs.length > 0 && <div className="notice">⭐ {favs.length} saved favourite{favs.length > 1 ? "s" : ""} — we'll roll them in where they fit.</div>}
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("landing")}>← Back</button><button className="btn btn-primary" onClick={() => setStep("days")}>Continue →</button></div>
            </div>
          )}

          {/* DAYS */}
          {step === "days" && (
            <div>
              <div className="page-title">Which days<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>do you need meals?</span></div>
              <p className="page-sub">Tap to toggle. We'll only plan the days you select.</p>
              <div className="card">
                <div className="label">Select days — {selDays.length} of 7</div>
                <div className="day-grid">
                  {DAYS.map(d => (
                    <div key={d} className={`day-chip${selDays.includes(d) ? " sel" : ""}`} onClick={() => toggleDay(d)}>
                      <div className="dl">{d.slice(0, 1)}</div>
                      <div className="dn">{DAY3[d]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => sp("days", [...DAYS])}>All 7</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => sp("days", ["Monday","Tuesday","Wednesday","Thursday","Friday"])}>Weekdays</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => sp("days", ["Saturday","Sunday"])}>Weekend</button>
                </div>
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("welcome")}>← Back</button><button className="btn btn-primary" onClick={() => setStep("cuisines")} disabled={selDays.length === 0}>Continue →</button></div>
            </div>
          )}

          {/* CUISINES */}
          {step === "cuisines" && (
            <div>
              <div className="page-title">Cuisine<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>preferences</span></div>
              <p className="page-sub">Choose cuisines to plan from. Leave blank for maximum variety.</p>
              <div className="card">
                <div className="label">Select your favourites</div>
                <div className="chip-group">{CUISINES.map(c => <div key={c} className={`chip${prefs.cuisines.includes(c) ? " sel" : ""}`} onClick={() => { const n = prefs.cuisines.includes(c) ? prefs.cuisines.filter(x => x !== c) : [...prefs.cuisines, c]; sp("cuisines", n); }}>{c}</div>)}</div>
                {prefs.cuisines.filter(c => !CUISINES.includes(c)).map(c => (
                  <div key={c} className="chip sel" style={{display:"inline-flex",alignItems:"center",gap:6}}>
                    {c}
                    <button onClick={() => sp("cuisines", prefs.cuisines.filter(x => x !== c))} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)",fontSize:14,lineHeight:1,padding:"0 1px"}}>×</button>
                  </div>
                ))}
              </div>
              <div className="card" style={{marginTop:0}}>
                <div className="label">Add a custom cuisine</div>
                <div style={{display:"flex",gap:9,alignItems:"center"}}>
                  <input
                    className="inp"
                    placeholder="e.g. Georgian, Peruvian, Korean…"
                    value={prefs.cusInput||""}
                    onChange={e => sp("cusInput", e.target.value)}
                    onKeyDown={e => {
                      if(e.key==="Enter" && prefs.cusInput?.trim()) {
                        const val = prefs.cusInput.trim();
                        if(!prefs.cuisines.includes(val)) sp("cuisines", [...prefs.cuisines, val]);
                        sp("cusInput","");
                      }
                    }}
                    style={{flex:1}}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={() => {
                    const val = (prefs.cusInput||"").trim();
                    if(val && !prefs.cuisines.includes(val)) sp("cuisines", [...prefs.cuisines, val]);
                    sp("cusInput","");
                  }}>Add</button>
                </div>
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("days")}>← Back</button><button className="btn btn-primary" onClick={() => setStep("dietary")}>Continue →</button></div>
            </div>
          )}

          {/* DIETARY */}
          {step === "dietary" && (
            <div>
              <div className="page-title">Dietary<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>requirements</span></div>
              <p className="page-sub">Any restrictions we should keep out of the plan?</p>
              <div className="card">
                <div className="label">Select all that apply</div>
                <div className="chip-group">{DIETARY.map(d => <div key={d} className={`chip${prefs.dietary.includes(d) ? " alt" : ""}`} onClick={() => { const n = prefs.dietary.includes(d) ? prefs.dietary.filter(x => x !== d) : [...prefs.dietary, d]; sp("dietary", n); }}>{d}</div>)}</div>
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("cuisines")}>← Back</button><button className="btn btn-primary" onClick={() => setStep("vibe")}>Continue →</button></div>
            </div>
          )}

          {/* VIBE — inlined (has range input) */}
          {step === "vibe" && (
            <div>
              <div className="page-title">Your culinary<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>personality</span></div>
              <p className="page-sub">Set your adventure level, complexity, and any must-have meals.</p>
              <div className="card">
                <div className="label">Adventure level</div>
                <input type="range" min={0} max={100} value={prefs.adventure} onChange={e => sp("adventure", +e.target.value)} className="slider" />
                <div className="var-ends"><span>🏠 Classics</span><span style={{ fontWeight: 600, color: "#c4622d" }}>{prefs.adventure < 33 ? "Safe & familiar" : prefs.adventure < 66 ? "Balanced mix" : "Wild & adventurous"}</span><span>🌏 Surprises</span></div>
              </div>
              <div className="card">
                <div className="label">Dish complexity</div>
                <div className="cx-grid">{COMPLEXITY.map(o => <div key={o.id} className={`cx-card${prefs.complexity === o.id ? " sel" : ""}`} onClick={() => sp("complexity", o.id)}><div className="cx-label">{o.label}</div><div className="cx-sub">{o.sub}</div></div>)}</div>
              </div>
              <div className="card">
                <div className="label">Lock in favourites (optional)</div>
                <p className="hint">Name dishes you love — we'll make sure they land in the plan.</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input className="inp" placeholder="e.g. Chicken tikka, borscht…" value={prefs.favInput} onChange={e => sp("favInput", e.target.value)} onKeyDown={e => e.key === "Enter" && addFavMeal()} style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-sm" onClick={addFavMeal}>Add</button>
                </div>
                <div className="chip-group">{prefs.favMeals.map((m, i) => <div key={i} className="tag">{m}<button onClick={() => sp("favMeals", prefs.favMeals.filter((_, j) => j !== i))}>×</button></div>)}</div>
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("dietary")}>← Back</button><button className="btn btn-primary" onClick={() => setStep("budget")}>Continue →</button></div>
            </div>
          )}

          {/* BUDGET — inlined (has number input) */}
          {step === "budget" && (
            <div>
              <div className="page-title">Weekly<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>food budget</span></div>
              <p className="page-sub">Set a grocery budget and we'll keep meals within range. Optional.</p>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="label" style={{ margin: 0 }}>Enable budget planning</div>
                  <div style={{ display: "flex", gap: 8 }}>{[{ v: true, l: "Yes" }, { v: false, l: "Skip" }].map(o => <div key={String(o.v)} className={`chip${prefs.budgetOn === o.v ? " sel" : ""}`} onClick={() => sp("budgetOn", o.v)}>{o.l}</div>)}</div>
                </div>
                {prefs.budgetOn ? (
                  <>
                    <div className="label">Currency</div>
                    <div className="cur-row">{Object.entries(CURRENCY).map(([c, s]) => <div key={c} className={`cur-chip${prefs.currency === c ? " sel" : ""}`} onClick={() => sp("currency", c)}>{s} {c}</div>)}</div>
                    <div className="label">Weekly grocery budget</div>
                    <div className="brow"><div className="bwrap"><span className="bpfx">{sym}</span><input className="inp b-inp" type="number" min="0" placeholder="e.g. 120" value={prefs.budget} onChange={e => sp("budget", e.target.value)} /></div><span style={{ fontSize: 12, color: "#6a7a5a", whiteSpace: "nowrap" }}>per week · {tsrv} person{tsrv > 1 ? "s" : ""}</span></div>
                    {prefs.budget && <p style={{ fontSize: 12, color: "#4a8868", marginTop: 7 }}>≈ {sym}{(parseFloat(prefs.budget) / (selDays.length * prefs.types.length)).toFixed(1)} per meal</p>}
                  </>
                ) : <p style={{ fontSize: 13, color: "#7a8a6a", fontStyle: "italic" }}>No budget — planning purely on taste.</p>}
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("vibe")}>← Back</button><button className="btn btn-primary" onClick={() => setStep("servings")}>Continue →</button></div>
            </div>
          )}

          {/* SERVINGS — inlined (has counters) */}
          {step === "servings" && (
            <div>
              <div className="page-title">Who are you<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>planning for?</span></div>
              <p className="page-sub">We'll scale ingredients and portions for your household.</p>
              <div className="card">
                <div className="people-row">
                  <div className="people-box">
                    <div className="people-lbl">👨‍👩‍👧 Adults</div>
                    <div className="ctr">
                      <button className="ctr-btn" onClick={() => prefs.adults > 1 && sp("adults", prefs.adults - 1)} disabled={prefs.adults <= 1}>−</button>
                      <div className="ctr-num">{prefs.adults}</div>
                      <button className="ctr-btn" onClick={() => prefs.adults < 10 && sp("adults", prefs.adults + 1)}>+</button>
                    </div>
                  </div>
                  <div className="people-box">
                    <div className="people-lbl">👧 Kids</div>
                    <div className="ctr">
                      <button className="ctr-btn" onClick={() => prefs.kids > 0 && sp("kids", prefs.kids - 1)} disabled={prefs.kids <= 0}>−</button>
                      <div className="ctr-num">{prefs.kids}</div>
                      <button className="ctr-btn" onClick={() => prefs.kids < 8 && sp("kids", prefs.kids + 1)}>+</button>
                    </div>
                  </div>
                </div>
                {prefs.kids > 0 && (
                  <div className={`kids-toggle${prefs.kidsDiff ? " on" : ""}`} onClick={() => sp("kidsDiff", !prefs.kidsDiff)}>
                    <div className="toggle-box">{prefs.kidsDiff ? "✓" : ""}</div>
                    <div><div className="toggle-txt">Kids get different, child-friendly meals</div><div className="toggle-sub">We'll suggest simpler alternatives alongside adult meals</div></div>
                  </div>
                )}
                <div style={{ marginTop: 11, padding: "8px 12px", background: "#f8f5ee", borderRadius: 9, fontSize: 13, color: "#5a6a4a" }}>
                  Planning for <strong style={{ color: "#1a3a1a" }}>{tsrv} {tsrv === 1 ? "person" : "people"}</strong>{prefs.kids > 0 && prefs.kidsDiff ? ` + ${prefs.kids} kids (separate dishes)` : ""}
                </div>
              </div>
              {err && <div className="err-box">⚠️ {err}</div>}
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("budget")}>← Back</button><button className="btn-roll" onClick={roll}>Plan my week</button></div>
            </div>
          )}

          {/* GENERATING */}
          {step === "generating" && (
            <div className="gen-screen">
              <div className="gen-logo"><span>Dish</span><span>Roll</span></div>
              <div className="gen-msg">{waitMsg}</div>
              <p className="gen-sub">Usually takes 5–10 seconds…</p>
            </div>
          )}

          {/* MEAL PLAN */}
          {step === "mealplan" && plan && (() => {
            const totalSelected = picked.size + kPicked.size;
            return (
              <div className="mealplan-page">
                {/* Page header */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:24 }}>
                  <div>
                    <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:600, color:"#1a3a1a", lineHeight:1.1, marginBottom:6 }}>
                      Your plan<br/><span style={{ color:"#c4622d", fontStyle:"italic" }}>is ready.</span>
                    </div>
                    <p style={{ fontSize:13, color:"#7a8a6a", lineHeight:1.6 }}>Tap a card to add to basket · 📖 for recipe · ☆ to favourite · ↻ to swap</p>
                  </div>
                  <div style={{ display:"flex", gap:7, flexShrink:0 }}>
                    {sl && <button className="btn btn-ghost btn-sm" onClick={() => setStep("list")}>🛒 List</button>}
                    <button className="btn btn-ghost btn-sm" onClick={() => newRoll(awk || cWK())}>↻ Re-plan</button>
                  </div>
                </div>

                {/* Budget summary */}
                {prefs.budgetOn && Object.keys(costs).length > 0 && (
                  <div className="budget-sum">
                    <div><div className="budget-lbl">Estimated weekly cost</div><div style={{ fontSize:11, color:"#5a7a5a" }}>{selDays.length} days · {tsrv} servings</div></div>
                    <div>
                      <div className={`budget-val${overBudget?" budget-over":""}`}>{sym}{totalCost.toFixed(0)}</div>
                      {budget>0&&<div style={{ fontSize:11, color:overBudget?"#b04020":"#4a8868", textAlign:"right" }}>{overBudget?`${sym}${(totalCost-budget).toFixed(0)} over`:`${sym}${(budget-totalCost).toFixed(0)} under`}</div>}
                    </div>
                  </div>
                )}

                {/* Day-by-day card layout */}
                {selDays.map(day => {
                  const dayData = plan?.[day.toLowerCase()];
                  if(!dayData) return null;
                  const dayDate = (() => {
                    if(!awk) return "";
                    const mon = new Date(awk+"T00:00:00");
                    const idx = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"].indexOf(day.toLowerCase());
                    const d = new Date(mon); d.setDate(mon.getDate()+idx);
                    return d.toLocaleDateString("en-IE",{day:"numeric",month:"long"});
                  })();
                  return (
                    <div key={day} className="day-section">
                      <div className="day-section-title">
                        {day}
                        {dayDate && <span className="day-section-date">{dayDate}</span>}
                      </div>
                      {prefs.types.map(mt => {
                        const m = dayData[mt];
                        if(!m) return null;
                        const k = `${day.toLowerCase()}-${mt}`;
                        const isSel = picked.has(k), isFav = favs.includes(m.name);
                        const cuisine = detectCuisine(m.name, m.description||"");
                        const cFlag = cuisine ? (CUISINE_FLAGS[cuisine]||"🍽️") : "🍽️";
                        // Kids alt
                        const ka = m.kidsAlt;
                        const kname = ka && typeof ka==="object" ? ka.name : ka;
                        const kings = ka && typeof ka==="object" ? ka.ingredients||[] : [];
                        const kk = `${day.toLowerCase()}-${mt}-k`;
                        const kSel = kPicked.has(kk);
                        return (
                          <Fragment key={mt}>
                            {/* Meal type label */}
                            <div className="mt-section">
                              <div className="mt-label">{ML[mt]}</div>
                              {/* Adult card */}
                              <div className={`meal-card${isSel?" picked":""}`} onClick={() => togglePick(k)}>
                                {isSel && <div className="card-sel-badge">✓</div>}
                                <div className="meal-card-top">
                                  <div className="meal-card-flag">{cFlag}</div>
                                  <div className="meal-card-title-wrap">
                                    {cuisine && <div className="meal-card-cuisine">{cuisine}</div>}
                                    <div className="meal-card-name" onClick={e=>{ e.stopPropagation(); openRecipe(m,mt); }}>{m.name}</div>
                                  </div>
                                  {isFav && <div className="card-fav-dot">⭐</div>}
                                </div>
                                {m.description && <div className="meal-card-desc">{m.description}</div>}
                                <div className="meal-card-footer">
                                  <div className="meal-card-pills">
                                    {m.time && <span className="meal-pill-item">⏱ {m.time}</span>}
                                    {tsrv>1 && <span className="meal-pill-item">👥 {tsrv} servings</span>}
                                    {prefs.budgetOn && costs[k]!=null && <span className="meal-pill-item green">💰 {sym}{costs[k]}</span>}
                                    {isSel && <span className="meal-pill-item green">✓ In basket</span>}
                                  </div>
                                  <div className="meal-card-actions" onClick={e=>e.stopPropagation()}>
                                    <button className="meal-action-btn" title={isFav?"Remove favourite":"Add favourite"} onClick={()=>toggleFav(m.name)}>{isFav?"⭐":"☆"}</button>
                                    <button className="meal-action-btn" title="View recipe" onClick={()=>openRecipe(m,mt)}>📖</button>
                                    <button className="meal-action-btn" title="Swap meal" onClick={()=>openSwap(day,mt)}>↻</button>
                                  </div>
                                </div>
                              </div>

                              {/* Kids card */}
                              {prefs.kids>0 && prefs.kidsDiff && kname && (
                                <div className={`meal-card kids-card${kSel?" picked":""}`} style={{ marginTop:8 }} onClick={()=>toggleKPick(kk)}>
                                  {kSel && <div className="card-sel-badge kids">✓</div>}
                                  <div className="meal-card-top">
                                    <div className="meal-card-flag">👧</div>
                                    <div className="meal-card-title-wrap">
                                      <div className="kids-badge">Kids · {prefs.kids} portion{prefs.kids>1?"s":""}</div>
                                      <div className="meal-card-name" style={{ color:"#2a5a1a" }} onClick={e=>{ e.stopPropagation(); openRecipe({name:kname,ingredients:kings,time:"~20 min"},mt,"kids"); }}>{kname}</div>
                                    </div>
                                  </div>
                                  <div className="meal-card-footer">
                                    <div className="meal-card-pills">
                                      <span className="meal-pill-item">🥗 Child-friendly</span>
                                      {kSel && <span className="meal-pill-item green">✓ In basket</span>}
                                    </div>
                                    <div className="meal-card-actions" onClick={e=>e.stopPropagation()}>
                                      <button className="meal-action-btn" onClick={()=>openRecipe({name:kname,ingredients:kings,time:"~20 min"},mt,"kids")}>📖</button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Fragment>
                        );
                      })}
                    </div>
                  );
                })}

                {/* FIXED BASKET BAR */}
                <div className="basket-bar">
                  <div className="basket-bar-inner">
                    <div className="basket-bar-left">
                      <div className="basket-icon-wrap">🛒</div>
                      <div>
                        <div className="basket-count">{totalSelected} meal{totalSelected!==1?"s":""} selected</div>
                        <div className="basket-sub">{picked.size} adult{picked.size!==1?"s":""}{kPicked.size>0?` · ${kPicked.size} kids`:""}</div>
                      </div>
                    </div>
                    <div className="basket-bar-right">
                      {err && <div style={{ fontSize:12, color:"#b04020" }}>⚠️ {err}</div>}
                      <button className="basket-sel-all" onClick={selectAll}>Select all</button>
                      {sl && <button className="btn btn-ghost btn-sm" onClick={()=>setStep("list")}>View list</button>}
                      <button className="basket-build-btn" onClick={buildList} disabled={totalSelected===0||loading}>
                        {loading?"⏳ Building…":"Build shopping list"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        <RecipeModal />
        <SwapModal />
        <PaywallModal />
        {showToast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}
