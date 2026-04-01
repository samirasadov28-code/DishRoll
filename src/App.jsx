import { useState, useEffect, Fragment } from "react";

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const CUISINE_OPTIONS = ['Italian','Asian','Mexican','Mediterranean','Indian','French','American','Middle Eastern','Japanese','Thai','Greek','Spanish','Moroccan','Lebanese','Vietnamese'];
const DIETARY_OPTIONS = ['Vegetarian','Vegan','Gluten-Free','Dairy-Free','Keto','Paleo','Nut-Free','Low-Carb','High-Protein','Pescatarian'];
const CURRENCY_SYMBOLS = { EUR: '€', GBP: '£', USD: '$', CAD: 'CA$', AUD: 'A$' };

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');`;

/* Colour palette derived from the DishRoll logo:
   Primary teal  : #0d7272  ("DISH" text colour)
   Accent orange : #f09200  ("ROLL" text colour)
   Dark header   : #0a4848
   Background    : #f4fafa
*/
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#f4fafa;color:#1a2f2f}
.app{min-height:100vh;background:#f4fafa}
.header{background:#0a4848;padding:12px 28px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.logo img{height:44px;width:auto;display:block}
.prog-bar{height:3px;background:#c8e4e4}
.prog-fill{height:100%;background:linear-gradient(90deg,#0d7272,#f09200);transition:width .4s ease}
.main{max-width:880px;margin:0 auto;padding:36px 22px 80px}
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
.btn-sm{padding:7px 15px;font-size:13px}
.btn:disabled{opacity:.42;cursor:not-allowed}
.btn-roll{background:linear-gradient(135deg,#f09200,#c87800);color:#fff;font-size:16px;padding:14px 32px;letter-spacing:0.3px}
.btn-roll:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 20px rgba(240,146,0,.42)}
.btn-roll:active:not(:disabled){transform:translateY(0)}
.inp{width:100%;padding:12px 15px;border-radius:10px;border:1.5px solid #b8d8d8;background:#f8fefe;font-size:15px;font-family:'Plus Jakarta Sans',sans-serif;color:#1a2f2f;outline:none;transition:border-color .2s}
.inp:focus{border-color:#0d7272}
.slider{width:100%;accent-color:#f09200;cursor:pointer}
.tag{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;background:#e0f4f4;border-radius:100px;font-size:13px;color:#0a4848;font-weight:500}
.tag button{background:none;border:none;cursor:pointer;color:#3a9898;font-size:15px;line-height:1;padding:0 2px}
.tag button:hover{color:#f09200}
.lbl{font-size:11px;font-weight:600;color:#4a7070;text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px}
.meal-grid{display:grid;grid-template-columns:106px repeat(7,1fr);gap:5px}
.g-hdr{font-size:11px;font-weight:600;color:#4a7070;text-align:center;padding:6px 2px;text-transform:uppercase;letter-spacing:.5px}
.g-lbl{font-size:12px;font-weight:600;color:#0a4848;display:flex;align-items:center;padding:4px 5px;line-height:1.3}
.m-cell{background:#fff;border-radius:10px;padding:9px 8px;border:1.5px solid #c8e4e4;position:relative;min-height:108px;display:flex;flex-direction:column;transition:border-color .18s;cursor:pointer}
.m-cell:hover{border-color:#6abcbc}
.m-cell.sshop{border-color:#0d7272;background:#f0fafa}
.m-name{font-size:12px;font-weight:600;color:#0a4848;line-height:1.3;margin-bottom:3px}
.m-desc{font-size:11px;color:#4a7070;line-height:1.4;flex:1}
.m-meta{display:flex;align-items:center;justify-content:space-between;margin-top:5px}
.m-time{font-size:10px;color:#7a9898}
.m-cost{font-size:10px;font-weight:600;color:#0a7070;background:#e8f8f8;padding:2px 6px;border-radius:4px}
.m-actions{display:flex;gap:2px;margin-top:5px}
.ibtn{background:none;border:none;cursor:pointer;padding:3px 4px;border-radius:5px;font-size:13px;transition:background .14s;line-height:1}
.ibtn:hover{background:#e0f4f4}
.chk-badge{position:absolute;top:6px;left:6px;width:15px;height:15px;background:#0d7272;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff}
.fav-dot{position:absolute;top:5px;right:5px;font-size:10px}
.shop-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #e0f0f0}
.shop-row:last-child{border:none}
.shop-chk{width:16px;height:16px;accent-color:#0d7272;cursor:pointer;flex-shrink:0}
.shop-item{font-size:14px;color:#1a3a3a}
.shop-item.done{text-decoration:line-through;color:#bbb}
.cat-title{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#0a4848;margin-bottom:9px}
.load-scr{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:58vh;gap:24px;text-align:center}
.dice-anim{animation:diceRoll 0.7s ease-in-out infinite alternate;display:inline-block}
@keyframes diceRoll{from{transform:rotate(-12deg) scale(0.95)}to{transform:rotate(12deg) scale(1.05)}}
.load-msg{font-family:'Cormorant Garamond',serif;font-size:22px;color:#0a4848;font-style:italic;max-width:320px}
.load-sub{font-size:13px;color:#7a9898}
.modal-ov{position:fixed;inset:0;background:rgba(10,40,40,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:22px;backdrop-filter:blur(4px)}
.modal{background:#fff;border-radius:20px;padding:26px;max-width:450px;width:100%}
.modal-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#0a4848;margin-bottom:3px}
.modal-sub{font-size:13px;color:#4a7070;margin-bottom:18px}
.swap-card{padding:13px;border-radius:11px;border:1.5px solid #c8e4e4;margin-bottom:8px;cursor:pointer;transition:all .17s}
.swap-card:hover{border-color:#0d7272;background:#f0fafa;transform:translateX(3px)}
.swap-name{font-weight:600;font-size:14px;color:#0a4848;margin-bottom:2px}
.swap-desc{font-size:12px;color:#4a7070}
.swap-foot{display:flex;gap:10px;margin-top:5px;font-size:11px;color:#7a9898}
.w-hero{text-align:center;padding:46px 0 32px}
.w-logo{width:140px;height:auto;margin:0 auto 20px;display:block}
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
.alexa-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;background:#1a73e8;color:#fff;border-radius:100px;font-size:14px;font-weight:500;cursor:pointer;border:none;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.alexa-btn:hover{background:#1557b0}
.toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:#0a4848;color:#fff;padding:10px 24px;border-radius:100px;font-size:14px;font-weight:500;z-index:300;animation:fiu .3s ease;pointer-events:none;white-space:nowrap}
@keyframes fiu{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.sec-hdr{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}
.var-lbls{display:flex;justify-content:space-between;font-size:11px;color:#7a9898;margin-top:5px}
.err{background:#fff8e0;border:1px solid #f0cc70;color:#7a5200;padding:11px 14px;border-radius:10px;font-size:13px;margin-top:12px}
.fav-notice{background:#f0fafa;border-left:3px solid #3a9898;padding:10px 14px;border-radius:0 10px 10px 0;font-size:13px;color:#0a4848;margin-bottom:13px}
.hint{font-size:12px;color:#4a7070;margin-bottom:10px;line-height:1.6}
.budget-summary{background:#f0fafa;border-radius:12px;padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border:1px solid #c8e4e4}
.bsum-label{font-size:13px;color:#2a6060;font-weight:500}
.bsum-val{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:#0a5858}
.bsum-over{color:#c93939}
.currency-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.curr-chip{padding:7px 14px;border-radius:8px;border:1.5px solid #b8d8d8;background:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all .16s;color:#1a3a3a}
.curr-chip:hover{border-color:#0d7272}
.curr-chip.sel{background:#0d7272;border-color:#0d7272;color:#fff}
.budget-input-wrap{position:relative;flex:1}
.budget-prefix{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-weight:600;font-size:15px;color:#4a7070;pointer-events:none}
.budget-inp{padding-left:30px}
.per-lbl{font-size:13px;color:#4a7070;white-space:nowrap;font-weight:500}
.roll-badge{display:inline-flex;align-items:center;gap:6px;background:#fff8e8;border:1px solid #f0cc80;border-radius:100px;padding:5px 12px;font-size:12px;font-weight:600;color:#a06000}
`;

const CAT_ICONS = {Produce:'🥬',Proteins:'🥩',Dairy:'🧀',Pantry:'🫙',Grains:'🌾',Spices:'🌿',Frozen:'🧊',Other:'🛒',Bakery:'🍞',Beverages:'🥛',Seafood:'🐟',Condiments:'🥫',Canned:'🥫',Meat:'🥩',Vegetables:'🥦',Fruit:'🍎'};

async function callDishRoll(prompt, maxTokens = 4000) {
  const res = await fetch('/.netlify/functions/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, maxTokens })
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  const text = data.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  const m = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return m ? m[1] : clean;
}

const ML = { breakfast:'🌅 Breakfast', lunch:'🕐 Lunch', dinner:'🌙 Dinner' };
const STEPS_IDX = { welcome:1, cuisines:2, dietary:3, variability:4, budget:5, servings:6, generating:7, mealplan:8, shopping:9 };

const ROLL_MSGS = [
  'Rolling your week…',
  'The dice are in the air…',
  'Spinning up your menu…',
  'Shuffling the deck…',
  'Fate is choosing your meals…',
];

export default function App() {
  const [step, setStep] = useState('welcome');
  const [prefs, setPrefs] = useState({
    mealScope:'dinner', mealTypes:['dinner'],
    cuisines:[], dietary:[],
    variability:40, favoriteMeals:[], favInput:'', servings:2,
    currency:'EUR', weeklyBudget:'', budgetEnabled:false,
  });
  const [mealPlan, setMealPlan] = useState(null);
  const [planCosts, setPlanCosts] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [shopSel, setShopSel] = useState(new Set());
  const [shoppingList, setShoppingList] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState('');
  const [swapping, setSwapping] = useState(null);
  const [swapOpts, setSwapOpts] = useState([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dishroll-favs');
      if (stored) setFavorites(JSON.parse(stored));
    } catch {}
  }, []);

  const saveFavs = f => { try { localStorage.setItem('dishroll-favs', JSON.stringify(f)); } catch {} };
  const toggleFav = name => { const n = favorites.includes(name) ? favorites.filter(x=>x!==name) : [...favorites,name]; setFavorites(n); saveFavs(n); };
  const sp = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  const sym = CURRENCY_SYMBOLS[prefs.currency] || '€';
  const showToast = msg => { setToastMsg(msg); setCopied(true); setTimeout(()=>setCopied(false), 3000); };

  const prog = Math.round(((STEPS_IDX[step]||1) / 9) * 100);

  const setScope = s => {
    const t = s==='dinner' ? ['dinner'] : s==='all' ? ['breakfast','lunch','dinner'] : prefs.mealTypes;
    setPrefs(p => ({ ...p, mealScope:s, mealTypes:t }));
  };
  const toggleType = t => { const n = prefs.mealTypes.includes(t) ? prefs.mealTypes.filter(x=>x!==t) : [...prefs.mealTypes,t]; if(n.length) sp('mealTypes',n); };
  const addFavMeal = () => { if(!prefs.favInput.trim()) return; sp('favoriteMeals',[...prefs.favoriteMeals,prefs.favInput.trim()]); sp('favInput',''); };

  const totalCost = Object.values(planCosts).reduce((s,v)=>s+(v||0),0);
  const budget = parseFloat(prefs.weeklyBudget) || 0;
  const overBudget = prefs.budgetEnabled && budget > 0 && totalCost > budget;

  const roll = async () => {
    setStep('generating'); setErr('');
    let i=0; setLoadMsg(ROLL_MSGS[0]);
    const iv = setInterval(() => { i=(i+1)%ROLL_MSGS.length; setLoadMsg(ROLL_MSGS[i]); }, 2500);
    try {
      const favHint = [...prefs.favoriteMeals, ...favorites.slice(0,4)].filter(Boolean).join(', ');
      const budgetNote = prefs.budgetEnabled && budget > 0
        ? `Weekly grocery budget: ${sym}${budget}. Target ≈${sym}${(budget/(7*prefs.mealTypes.length)).toFixed(1)} per meal.` : '';

      const dayTemplate = `{"${prefs.mealTypes.join('":MEAL,"')}":MEAL}`.replace(/MEAL/g,`{"name":"string","description":"brief 8-word description","time":"X min","estCost":0.00,"ingredients":["qty unit item"]}`);

      const prompt = `Generate a 7-day meal plan. Return ONLY compact JSON. Preferences:
- Meal types per day: ${prefs.mealTypes.join(', ')}
- Cuisines: ${prefs.cuisines.length?prefs.cuisines.join(', '):'varied international'}
- Dietary: ${prefs.dietary.length?prefs.dietary.join(', '):'none'}
- Adventure level: ${prefs.variability}/100 (0=classics, 100=adventurous)
- Servings: ${prefs.servings}
- Favourite dishes to include where suitable: ${favHint||'none'}
${budgetNote}
estCost = realistic grocery cost in ${prefs.currency} for ${prefs.servings} servings of that one meal.
Return ONLY: {"monday":${dayTemplate},"tuesday":${dayTemplate},"wednesday":${dayTemplate},"thursday":${dayTemplate},"friday":${dayTemplate},"saturday":${dayTemplate},"sunday":${dayTemplate}}`;

      const raw = await callDishRoll(prompt, 4000);
      const plan = JSON.parse(raw);
      const costs = {};
      DAYS.forEach(d => prefs.mealTypes.forEach(t => { const m=plan[d.toLowerCase()]?.[t]; if(m?.estCost) costs[`${d.toLowerCase()}-${t}`]=m.estCost; }));
      setPlanCosts(costs);
      setMealPlan(plan);
      clearInterval(iv);
      setStep('mealplan');
    } catch(e) {
      clearInterval(iv);
      setErr(`Could not roll your plan: ${e.message}. Please try again.`);
      setStep('servings');
    }
  };

  const openSwap = async (day, mealType) => {
    const cur = mealPlan?.[day.toLowerCase()]?.[mealType];
    if (!cur) return;
    setSwapping({day,mealType}); setSwapLoading(true); setSwapOpts([]);
    try {
      const budgetNote = prefs.budgetEnabled && budget > 0 ? ` Keep cost under ${sym}${(budget/7/prefs.mealTypes.length).toFixed(0)}.` : '';
      const prompt = `Suggest 3 alternative ${mealType} recipes to replace "${cur.name}". Cuisines: ${prefs.cuisines.join(',')||'any'}. Dietary: ${prefs.dietary.join(',')||'none'}. Adventure: ${prefs.variability}/100. Servings: ${prefs.servings}.${budgetNote}
Return ONLY JSON array: [{"name":"...","description":"8-word max","time":"X min","estCost":0.00,"ingredients":["qty unit item"]},...]`;
      const raw = await callDishRoll(prompt, 1200);
      setSwapOpts(JSON.parse(raw));
    } catch { setSwapOpts([]); }
    setSwapLoading(false);
  };

  const applySwap = opt => {
    const key = `${swapping.day.toLowerCase()}-${swapping.mealType}`;
    setPlanCosts(p => ({ ...p, [key]: opt.estCost||0 }));
    setMealPlan(p => ({ ...p, [swapping.day.toLowerCase()]: { ...p[swapping.day.toLowerCase()], [swapping.mealType]: opt } }));
    setSwapping(null); setSwapOpts([]);
  };

  const toggleShop = key => setShopSel(p => { const n=new Set(p); n.has(key)?n.delete(key):n.add(key); return n; });
  const selectAll = () => { const s=new Set(); DAYS.forEach(d=>prefs.mealTypes.forEach(t=>{if(mealPlan?.[d.toLowerCase()]?.[t]) s.add(`${d.toLowerCase()}-${t}`);})); setShopSel(s); };

  const buildList = async () => {
    if (!shopSel.size) return;
    setLoading(true); setLoadMsg('Assembling your shopping list…');
    try {
      const sel = [];
      DAYS.forEach(d => prefs.mealTypes.forEach(t => { if(shopSel.has(`${d.toLowerCase()}-${t}`)) { const m=mealPlan?.[d.toLowerCase()]?.[t]; if(m) sel.push({meal:m.name,servings:prefs.servings,ingredients:m.ingredients}); } }));
      const prompt = `Combine into an organised grocery shopping list for ${prefs.servings} people. Merge and aggregate similar ingredients. Group by supermarket aisle.
Meals: ${JSON.stringify(sel)}
Return ONLY JSON: {"categories":[{"name":"Produce","items":["2 large onions","4 cloves garlic"]},{"name":"Proteins","items":["600g chicken breast"]},{"name":"Pantry","items":["400g canned tomatoes"]}]}
Use categories: Produce, Proteins, Dairy, Grains, Pantry, Condiments, Frozen, Bakery, Beverages, Other.`;
      const raw = await callDishRoll(prompt, 2000);
      setShoppingList(JSON.parse(raw));
      setStep('shopping');
    } catch { setErr('Could not build shopping list. Please try again.'); }
    setLoading(false);
  };

  const copyAlexa = () => { const list=shoppingList.categories.flatMap(c=>c.items).join('\n'); navigator.clipboard.writeText(list); showToast('✓ Copied — paste into your Alexa app'); };
  const copyAll = () => { const text=shoppingList.categories.map(c=>`${c.name}:\n${c.items.map(i=>`• ${i}`).join('\n')}`).join('\n\n'); navigator.clipboard.writeText(text); showToast('✓ Shopping list copied'); };

  // ─── SCREENS ──────────────────────────────────────────────────

  const Welcome = () => (
    <div>
      <div className="w-hero">
        <img src="/logo.png" alt="DishRoll" className="w-logo" />
        <div className="scr-title">Roll your week.<br /><span style={{color:'#f09200',fontStyle:'italic'}}>Eat well.</span></div>
        <p className="scr-sub" style={{maxWidth:440,margin:'12px auto 8px'}}>
          Tell DishRoll your tastes, budget, and how adventurous you're feeling — and we'll roll you a perfect week of meals, with a smart shopping list to match.
        </p>
        <div className="roll-badge" style={{margin:'0 auto 32px'}}>🎲 AI-powered random meal generation</div>
      </div>
      <div className="card">
        <div className="lbl">What would you like to roll?</div>
        <div className="mt-grid">
          {[{id:'dinner',icon:'🌙',label:'Dinner Only',sub:'Evening meals for the week'},
            {id:'all',icon:'☀️',label:'All Meals',sub:'Breakfast, lunch & dinner'},
            {id:'custom',icon:'✏️',label:'Custom',sub:'Choose what you need'}
          ].map(o=>(
            <div key={o.id} className={`mt-card ${prefs.mealScope===o.id?'sel':''}`} onClick={()=>setScope(o.id)}>
              <div className="mt-icon">{o.icon}</div>
              <div className="mt-lbl">{o.label}</div>
              <div className="mt-sub">{o.sub}</div>
            </div>
          ))}
        </div>
        {prefs.mealScope==='custom' && (
          <div style={{marginTop:16}}>
            <div className="lbl">Choose meal types</div>
            <div className="chip-grid">
              {['breakfast','lunch','dinner'].map(t=>(
                <div key={t} className={`chip ${prefs.mealTypes.includes(t)?'sel':''}`} onClick={()=>toggleType(t)} style={{textTransform:'capitalize'}}>{ML[t]}</div>
              ))}
            </div>
          </div>
        )}
      </div>
      {favorites.length>0 && <div className="fav-notice">⭐ {favorites.length} saved favourite{favorites.length>1?'s':''} — we'll roll them in where they fit.</div>}
      <div className="nav-row">
        <button className="btn btn-p" onClick={()=>setStep('cuisines')}>Let's roll →</button>
      </div>
    </div>
  );

  const Cuisines = () => (
    <div>
      <div className="scr-title">Cuisine<br /><span style={{color:'#f09200',fontStyle:'italic'}}>preferences</span></div>
      <p className="scr-sub">Choose cuisines to roll from. Leave blank for maximum variety.</p>
      <div className="card">
        <div className="lbl">Select your favourites</div>
        <div className="chip-grid">
          {CUISINE_OPTIONS.map(c=>(
            <div key={c} className={`chip ${prefs.cuisines.includes(c)?'sel':''}`} onClick={()=>{const n=prefs.cuisines.includes(c)?prefs.cuisines.filter(x=>x!==c):[...prefs.cuisines,c];sp('cuisines',n);}}>{c}</div>
          ))}
        </div>
      </div>
      <div className="nav-row">
        <button className="btn btn-g" onClick={()=>setStep('welcome')}>← Back</button>
        <button className="btn btn-p" onClick={()=>setStep('dietary')}>Continue →</button>
      </div>
    </div>
  );

  const Dietary = () => (
    <div>
      <div className="scr-title">Dietary<br /><span style={{color:'#f09200',fontStyle:'italic'}}>requirements</span></div>
      <p className="scr-sub">Any restrictions we should keep out of the roll?</p>
      <div className="card">
        <div className="lbl">Select all that apply</div>
        <div className="chip-grid">
          {DIETARY_OPTIONS.map(d=>(
            <div key={d} className={`chip ${prefs.dietary.includes(d)?'asel':''}`} onClick={()=>{const n=prefs.dietary.includes(d)?prefs.dietary.filter(x=>x!==d):[...prefs.dietary,d];sp('dietary',n);}}>{d}</div>
          ))}
        </div>
      </div>
      <div className="nav-row">
        <button className="btn btn-g" onClick={()=>setStep('cuisines')}>← Back</button>
        <button className="btn btn-p" onClick={()=>setStep('variability')}>Continue →</button>
      </div>
    </div>
  );

  const Variability = () => (
    <div>
      <div className="scr-title">How wild<br /><span style={{color:'#f09200',fontStyle:'italic'}}>should we roll?</span></div>
      <p className="scr-sub">Set your adventure level — from safe classics to bold surprises.</p>
      <div className="card">
        <div className="lbl">Adventure level</div>
        <input type="range" min={0} max={100} value={prefs.variability} onChange={e=>sp('variability',+e.target.value)} className="slider" />
        <div className="var-lbls">
          <span>🏠 Comforting classics</span>
          <span style={{fontWeight:600,color:'#f09200'}}>
            {prefs.variability<33?'Safe & familiar':prefs.variability<66?'Balanced mix':'Wild & adventurous 🎲'}
          </span>
          <span>🌏 Bold surprises</span>
        </div>
      </div>
      <div className="card">
        <div className="lbl">Lock in some favourites (optional)</div>
        <p className="hint">Name dishes you love — we'll make sure they land in the roll.</p>
        <div style={{display:'flex',gap:9,marginBottom:11}}>
          <input className="inp" placeholder="e.g. Chicken tikka masala, carbonara…" value={prefs.favInput}
            onChange={e=>sp('favInput',e.target.value)} onKeyDown={e=>e.key==='Enter'&&addFavMeal()} style={{flex:1}} />
          <button className="btn btn-g btn-sm" onClick={addFavMeal}>Add</button>
        </div>
        <div className="chip-grid">
          {prefs.favoriteMeals.map((m,i)=>(
            <div key={i} className="tag">{m}<button onClick={()=>sp('favoriteMeals',prefs.favoriteMeals.filter((_,j)=>j!==i))}>×</button></div>
          ))}
        </div>
      </div>
      <div className="nav-row">
        <button className="btn btn-g" onClick={()=>setStep('dietary')}>← Back</button>
        <button className="btn btn-p" onClick={()=>setStep('budget')}>Continue →</button>
      </div>
    </div>
  );

  const Budget = () => (
    <div>
      <div className="scr-title">Weekly<br /><span style={{color:'#f09200',fontStyle:'italic'}}>food budget</span></div>
      <p className="scr-sub">Set a grocery budget and we'll roll meals within range. Optional but useful.</p>
      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div className="lbl" style={{margin:0}}>Enable budget planning</div>
          <div style={{display:'flex',gap:10}}>
            {[{v:true,l:'Yes'},{v:false,l:'Skip'}].map(o=>(
              <div key={String(o.v)} className={`chip ${prefs.budgetEnabled===o.v?'sel':''}`} onClick={()=>sp('budgetEnabled',o.v)}>{o.l}</div>
            ))}
          </div>
        </div>
        {prefs.budgetEnabled ? (
          <>
            <div className="lbl">Currency</div>
            <div className="currency-row">
              {Object.entries(CURRENCY_SYMBOLS).map(([code,s])=>(
                <div key={code} className={`curr-chip ${prefs.currency===code?'sel':''}`} onClick={()=>sp('currency',code)}>{s} {code}</div>
              ))}
            </div>
            <div className="lbl">Weekly grocery budget</div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div className="budget-input-wrap">
                <span className="budget-prefix">{sym}</span>
                <input className="inp budget-inp" type="number" min="0" placeholder="e.g. 120" value={prefs.weeklyBudget} onChange={e=>sp('weeklyBudget',e.target.value)} />
              </div>
              <span className="per-lbl">per week · {prefs.servings} person{prefs.servings>1?'s':''}</span>
            </div>
            {prefs.weeklyBudget && (
              <p style={{fontSize:12,color:'#6a8f6a',marginTop:8}}>
                ≈ {sym}{(parseFloat(prefs.weeklyBudget)/(7*prefs.mealTypes.length)).toFixed(1)} per meal · {sym}{(parseFloat(prefs.weeklyBudget)/(7*prefs.mealTypes.length*prefs.servings)).toFixed(1)} per person per meal
              </p>
            )}
          </>
        ) : (
          <p style={{fontSize:13,color:'#9a9288',fontStyle:'italic'}}>No budget set — we'll roll purely on taste.</p>
        )}
      </div>
      <div className="nav-row">
        <button className="btn btn-g" onClick={()=>setStep('variability')}>← Back</button>
        <button className="btn btn-p" onClick={()=>setStep('servings')}>Continue →</button>
      </div>
    </div>
  );

  const Servings = () => (
    <div>
      <div className="scr-title">How many are<br /><span style={{color:'#f09200',fontStyle:'italic'}}>you rolling for?</span></div>
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
      <div className="nav-row">
        <button className="btn btn-g" onClick={()=>setStep('budget')}>← Back</button>
        <button className="btn btn-roll" onClick={roll}>🎲 Roll my week</button>
      </div>
    </div>
  );

  const Generating = () => (
    <div className="load-scr">
      <div className="dice-anim"><img src="/logo.png" alt="DishRoll" style={{width:100,height:'auto'}} /></div>
      <div className="load-msg">{loadMsg}</div>
      <p className="load-sub">Usually takes around 10–15 seconds…</p>
    </div>
  );

  const MealPlan = () => {
    if (!mealPlan) return null;
    const showCosts = Object.keys(planCosts).length > 0;
    return (
      <div>
        <div className="sec-hdr">
          <div>
            <div className="scr-title" style={{fontSize:28,marginBottom:4}}>Your roll<br /><span style={{color:'#f09200',fontStyle:'italic'}}>is in.</span></div>
            <p style={{fontSize:12,color:'#4a7070',lineHeight:1.7}}>
              ☆ Star to favourite · 🎲 Re-roll a meal · Click to add to shopping list
            </p>
          </div>
          <div style={{display:'flex',gap:8,flexShrink:0}}>
            <button className="btn btn-g btn-sm" onClick={()=>{setStep('welcome');setMealPlan(null);setShoppingList(null);setShopSel(new Set());setPlanCosts({});}}>🎲 Re-roll</button>
          </div>
        </div>

        {prefs.budgetEnabled && showCosts && (
          <div className="budget-summary">
            <div>
              <div className="bsum-label">Estimated weekly grocery cost</div>
              <div style={{fontSize:12,color:'#6a8f6a'}}>{prefs.servings} serving{prefs.servings>1?'s':''} · all meals</div>
            </div>
            <div>
              <div className={`bsum-val ${overBudget?'bsum-over':''}`}>{sym}{totalCost.toFixed(0)}</div>
              {budget > 0 && <div style={{fontSize:12,color:overBudget?'#c93939':'#6a8f6a',textAlign:'right'}}>{overBudget?`${sym}${(totalCost-budget).toFixed(0)} over budget`:`${sym}${(budget-totalCost).toFixed(0)} under budget`}</div>}
            </div>
          </div>
        )}

        <div style={{overflowX:'auto',marginBottom:18}}>
          <div className="meal-grid" style={{minWidth:840}}>
            <div/>
            {DAYS.map(d=><div key={d} className="g-hdr">{d.slice(0,3)}</div>)}
            {prefs.mealTypes.map(mt=>(
              <Fragment key={mt}>
                <div className="g-lbl">{ML[mt]}</div>
                {DAYS.map(day=>{
                  const m=mealPlan?.[day.toLowerCase()]?.[mt];
                  const key=`${day.toLowerCase()}-${mt}`;
                  const sel=shopSel.has(key);
                  const fav=m&&favorites.includes(m.name);
                  const cost=planCosts[key];
                  return (
                    <div key={day} className={`m-cell ${sel?'sshop':''}`} onClick={()=>m&&toggleShop(key)}>
                      {m ? (
                        <>
                          {sel&&<div className="chk-badge">✓</div>}
                          {fav&&<div className="fav-dot">⭐</div>}
                          <div className="m-name">{m.name}</div>
                          <div className="m-desc">{m.description}</div>
                          <div className="m-meta">
                            <span className="m-time">⏱ {m.time}</span>
                            {prefs.budgetEnabled&&cost!=null&&<span className="m-cost">{sym}{cost}</span>}
                          </div>
                          <div className="m-actions" onClick={e=>e.stopPropagation()}>
                            <button className="ibtn" title={fav?'Remove favourite':'Save as favourite'} onClick={()=>toggleFav(m.name)}>{fav?'⭐':'☆'}</button>
                            <button className="ibtn" title="Re-roll this meal" onClick={()=>openSwap(day,mt)}>🎲</button>
                          </div>
                        </>
                      ):<div style={{color:'#ddd',fontSize:11,textAlign:'center',margin:'auto'}}>—</div>}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:12}}>
            <div>
              <div style={{fontWeight:600,fontSize:15,color:'#0a4848',marginBottom:2}}>🛒 Build your shopping list</div>
              <div style={{fontSize:13,color:'#4a7070'}}>{shopSel.size} of {DAYS.length*prefs.mealTypes.length} meals selected</div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-g btn-sm" onClick={selectAll}>Select all</button>
              <button className="btn btn-g btn-sm" onClick={()=>setShopSel(new Set())}>Clear</button>
            </div>
          </div>
          {err&&<div className="err" style={{marginBottom:10}}>⚠️ {err}</div>}
          <button className="btn btn-p" onClick={buildList} disabled={!shopSel.size||loading}>
            {loading?'⏳ Building…':`Build shopping list (${shopSel.size} meal${shopSel.size!==1?'s':''})`}
          </button>
        </div>
      </div>
    );
  };

  const Shopping = () => {
    if (!shoppingList) return null;
    const all=shoppingList.categories.flatMap(c=>c.items);
    const done=all.filter(i=>checked.has(i)).length;
    const selectedCost=Array.from(shopSel).reduce((s,k)=>(s+(planCosts[k]||0)),0);
    return (
      <div>
        <div className="sec-hdr">
          <div>
            <div className="scr-title" style={{fontSize:28,marginBottom:4}}>Shopping<br /><span style={{color:'#f09200',fontStyle:'italic'}}>list</span></div>
            <p style={{fontSize:13,color:'#4a7070'}}>{done} of {all.length} items ticked</p>
          </div>
          <button className="btn btn-g btn-sm" onClick={()=>setStep('mealplan')}>← Back to roll</button>
        </div>

        {prefs.budgetEnabled&&selectedCost>0&&(
          <div className="budget-summary" style={{marginBottom:16}}>
            <div className="bsum-label">Estimated cost for selected meals</div>
            <div className={`bsum-val ${prefs.weeklyBudget&&selectedCost>budget?'bsum-over':''}`}>{sym}{selectedCost.toFixed(0)}</div>
          </div>
        )}

        <div style={{display:'flex',gap:9,marginBottom:20,flexWrap:'wrap'}}>
          <button className="alexa-btn" onClick={copyAlexa}><span>🔵</span> Copy for Alexa</button>
          <button className="btn btn-g btn-sm" onClick={copyAll}>📋 Copy all</button>
          <button className="btn btn-g btn-sm" onClick={()=>setChecked(new Set())}>↺ Reset ticks</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:13}}>
          {shoppingList.categories.map(cat=>(
            <div key={cat.name} className="card" style={{padding:17}}>
              <div className="cat-title">{CAT_ICONS[cat.name]||'🛒'} {cat.name}</div>
              {cat.items.map((item,i)=>(
                <div key={i} className="shop-row">
                  <input type="checkbox" className="shop-chk" checked={checked.has(item)} onChange={()=>setChecked(p=>{const n=new Set(p);n.has(item)?n.delete(item):n.add(item);return n;})} />
                  <span className={`shop-item ${checked.has(item)?'done':''}`}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{marginTop:18,padding:16,background:'#f0f5f1',borderRadius:13,border:'1px solid #c4d9cc'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#0a4848',marginBottom:4}}>📱 How to add to Alexa</div>
          <div style={{fontSize:13,color:'#5a7060',lineHeight:1.7}}>
            Tap <strong>"Copy for Alexa"</strong> → open the <strong>Alexa app</strong> → <strong>Lists</strong> → <strong>Shopping List</strong> → paste. Or say: <em>"Alexa, add [item] to my shopping list."</em>
          </div>
        </div>
      </div>
    );
  };

  const SwapModal = () => {
    if (!swapping) return null;
    const cur=mealPlan?.[swapping.day.toLowerCase()]?.[swapping.mealType];
    return (
      <div className="modal-ov" onClick={()=>setSwapping(null)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-title">🎲 Re-roll {swapping.mealType}</div>
          <div className="modal-sub">{swapping.day} · Currently: <strong>{cur?.name}</strong></div>
          {swapLoading ? (
            <div style={{textAlign:'center',padding:'28px 0'}}>
              <div style={{fontSize:40,animation:'diceRoll .6s ease-in-out infinite alternate',display:'inline-block'}}>🎲</div>
              <div style={{fontSize:13,color:'#4a7070',marginTop:12}}>Rolling alternatives…</div>
            </div>
          ) : swapOpts.length===0 ? (
            <div style={{color:'#4a7070',fontSize:14,padding:'14px 0'}}>No alternatives found — try again.</div>
          ) : (
            swapOpts.map((o,i)=>(
              <div key={i} className="swap-card" onClick={()=>applySwap(o)}>
                <div className="swap-name">{o.name}</div>
                <div className="swap-desc">{o.description}</div>
                <div className="swap-foot">
                  <span>⏱ {o.time}</span>
                  {prefs.budgetEnabled&&o.estCost!=null&&<span>💰 {sym}{o.estCost}</span>}
                </div>
              </div>
            ))
          )}
          <button className="btn btn-g btn-sm" style={{marginTop:10}} onClick={()=>setSwapping(null)}>Cancel</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{FONTS+CSS}</style>
      <div className="app">
        <div className="header">
          <div className="logo">
            <img src="/logo.png" alt="DishRoll" />
          </div>
          {step!=='welcome'&&step!=='generating'&&(
            <div style={{fontSize:12,color:'#6a9a7a',fontWeight:500}}>Step {STEPS_IDX[step]||1} of 9</div>
          )}
        </div>
        {step!=='generating'&&step!=='mealplan'&&step!=='shopping'&&(
          <div className="prog-bar"><div className="prog-fill" style={{width:`${prog}%`}}/></div>
        )}
        <div className="main">
          {step==='welcome'&&<Welcome/>}
          {step==='cuisines'&&<Cuisines/>}
          {step==='dietary'&&<Dietary/>}
          {step==='variability'&&<Variability/>}
          {step==='budget'&&<Budget/>}
          {step==='servings'&&<Servings/>}
          {step==='generating'&&<Generating/>}
          {step==='mealplan'&&<MealPlan/>}
          {step==='shopping'&&<Shopping/>}
        </div>
        <SwapModal/>
        {copied&&<div className="toast">{toastMsg||'✓ Done'}</div>}
      </div>
    </>
  );
}
