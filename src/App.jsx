import { useState, useEffect, Fragment } from "react";

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const CUISINE_OPTIONS = ['Italian','Asian','Mexican','Mediterranean','Indian','French','American','Middle Eastern','Japanese','Thai','Greek','Spanish','Moroccan','Lebanese','Vietnamese'];
const DIETARY_OPTIONS = ['Vegetarian','Vegan','Gluten-Free','Dairy-Free','Keto','Paleo','Nut-Free','Low-Carb','High-Protein','Pescatarian'];
const CURRENCY_SYMBOLS = { EUR:'€', GBP:'£', USD:'$', CAD:'CA$', AUD:'A$' };
const ML = { breakfast:'🌅 Breakfast', lunch:'🕐 Lunch', dinner:'🌙 Dinner' };
const STEPS_IDX = { welcome:1, cuisines:2, dietary:3, variability:4, budget:5, servings:6, generating:7, mealplan:8, shopping:9 };
const ROLL_MSGS = ['Rolling your week…','The dice are in the air…','Spinning up your menu…','Shuffling the deck…','Fate is choosing your meals…'];
const CAT_ICONS = {Produce:'🥬',Proteins:'🥩',Dairy:'🧀',Pantry:'🫙',Grains:'🌾',Spices:'🌿',Frozen:'🧊',Other:'🛒',Bakery:'🍞',Beverages:'🥛',Seafood:'🐟',Condiments:'🥫',Canned:'🥫',Meat:'🥩',Vegetables:'🥦',Fruit:'🍎'};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');`;

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
.m-cell{background:#fff;border-radius:10px;padding:9px 8px;border:1.5px solid #c8e4e4;position:relative;min-height:108px;display:flex;flex-direction:column;transition:border-color .18s}
.m-cell.sshop{border-color:#0d7272;background:#f0fafa}
.m-name{font-size:12px;font-weight:600;color:#0d7272;line-height:1.3;margin-bottom:3px;cursor:pointer;text-decoration:underline;text-decoration-color:#a0d8d8;text-underline-offset:2px}
.m-name:hover{color:#0a5858}
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
.toast{position:fixed;bottom:26px;left:50%;transform:translateX(-50%);background:#0a4848;color:#fff;padding:10px 24px;border-radius:100px;font-size:14px;font-weight:500;z-index:400;animation:fiu .3s ease;pointer-events:none;white-space:nowrap}
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
.curr-chip{padding:7px 14px;border-radius:8px;border:1.5px solid #b8d8d8;background:#fff;font-size:13px;font-weight:600;cursor:pointer;color:#1a3a3a;transition:all .16s}
.curr-chip:hover{border-color:#0d7272}
.curr-chip.sel{background:#0d7272;border-color:#0d7272;color:#fff}
.budget-row{display:flex;align-items:center;gap:12px}
.budget-wrap{position:relative;flex:1}
.budget-sym{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-weight:600;font-size:15px;color:#4a7070;pointer-events:none}
.budget-field{padding-left:28px}
.per-lbl{font-size:13px;color:#4a7070;white-space:nowrap;font-weight:500}
.roll-badge{display:inline-flex;align-items:center;gap:6px;background:#fff8e8;border:1px solid #f0cc80;border-radius:100px;padding:5px 12px;font-size:12px;font-weight:600;color:#a06000}
.recipe-ov{position:fixed;inset:0;background:rgba(10,40,40,.6);z-index:300;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(6px)}
@media(min-width:600px){.recipe-ov{align-items:center;padding:24px}}
.recipe-modal{background:#fff;border-radius:24px 24px 0 0;max-width:560px;width:100%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column}
@media(min-width:600px){.recipe-modal{border-radius:24px;max-height:88vh}}
.recipe-photo{width:100%;height:220px;object-fit:cover;display:block}
.recipe-photo-fb{width:100%;height:220px;background:linear-gradient(135deg,#0a4848,#0d7272 55%,#2aaa82);display:flex;align-items:center;justify-content:center;font-size:72px}
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
`;

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
  const text = data.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  const m = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  return m ? m[1] : clean;
}

// BudgetInput defined OUTSIDE App — prevents remount on every parent render
function BudgetInput({ value, onChange, sym }) {
  return (
    <div className="budget-wrap">
      <span className="budget-sym">{sym}</span>
      <input
        className="inp budget-field"
        type="text"
        inputMode="decimal"
        placeholder="e.g. 120"
        value={value}
        onChange={function(e) { onChange(e.target.value.replace(/[^\d.]/g, '')); }}
      />
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState('welcome');
  const [prefs, setPrefs] = useState({
    mealScope:'dinner', mealTypes:['dinner'], cuisines:[], dietary:[],
    variability:40, favoriteMeals:[], favInput:'', servings:2,
    currency:'EUR', weeklyBudget:'', budgetEnabled:false,
  });
  const [mealPlan, setMealPlan]   = useState(null);
  const [planCosts, setPlanCosts] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [shopSel, setShopSel]     = useState(new Set());
  const [shopMeals, setShopMeals] = useState({});
  const [shoppingList, setShoppingList] = useState(null);
  const [checked, setChecked]     = useState(new Set());
  const [loading, setLoading]     = useState(false);
  const [loadMsg, setLoadMsg]     = useState('');
  const [swapping, setSwapping]   = useState(null);
  const [swapOpts, setSwapOpts]   = useState([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [recipe, setRecipe]       = useState(null);
  const [copied, setCopied]       = useState(false);
  const [toastMsg, setToastMsg]   = useState('');
  const [err, setErr]             = useState('');

  useEffect(function() {
    try { var s=localStorage.getItem('dishroll-favs'); if(s) setFavorites(JSON.parse(s)); } catch(e) {}
  }, []);

  function saveFavs(f) { try { localStorage.setItem('dishroll-favs', JSON.stringify(f)); } catch(e) {} }
  function toggleFav(name) { var n=favorites.includes(name)?favorites.filter(function(x){return x!==name;}):favorites.concat([name]); setFavorites(n); saveFavs(n); }
  function sp(k,v) { setPrefs(function(p){ var r=Object.assign({},p); r[k]=v; return r; }); }
  var sym = CURRENCY_SYMBOLS[prefs.currency]||'€';
  function showToast(msg) { setToastMsg(msg); setCopied(true); setTimeout(function(){setCopied(false);},3000); }
  var prog = Math.round(((STEPS_IDX[step]||1)/9)*100);
  function setScope(s) { var t=s==='dinner'?['dinner']:s==='all'?['breakfast','lunch','dinner']:prefs.mealTypes; setPrefs(function(p){return Object.assign({},p,{mealScope:s,mealTypes:t});}); }
  function toggleType(t) { var n=prefs.mealTypes.includes(t)?prefs.mealTypes.filter(function(x){return x!==t;}):prefs.mealTypes.concat([t]); if(n.length) sp('mealTypes',n); }
  function addFavMeal() { if(!prefs.favInput.trim()) return; sp('favoriteMeals',prefs.favoriteMeals.concat([prefs.favInput.trim()])); sp('favInput',''); }
  var budget = parseFloat(prefs.weeklyBudget)||0;
  var totalCost = Object.values(planCosts).reduce(function(s,v){return s+(v||0);},0);
  var overBudget = prefs.budgetEnabled&&budget>0&&totalCost>budget;

  async function openRecipe(meal, mealType) {
    setRecipe({ meal:meal, mealType:mealType, steps:[], tip:'', imgOk:true, loading:true });
    try {
      var prompt = 'Write a step-by-step recipe for "'+meal.name+'" for '+prefs.servings+' people.\nIngredients: '+(meal.ingredients||[]).join(', ')+'.\nReturn ONLY valid JSON: {"steps":["Step 1 text","Step 2 text"],"tip":"One short pro tip"}\nProvide 4-7 clear actionable steps of 1-2 sentences each.';
      var raw = await callDishRoll(prompt, 800);
      var data = JSON.parse(raw);
      setRecipe(function(prev){ return prev ? Object.assign({},prev,{steps:data.steps||[],tip:data.tip||'',loading:false}) : null; });
    } catch(e) {
      setRecipe(function(prev){ return prev ? Object.assign({},prev,{steps:['Could not load recipe steps. Please try again.'],loading:false}) : null; });
    }
  }

  async function roll() {
    setStep('generating'); setErr('');
    var i=0; setLoadMsg(ROLL_MSGS[0]);
    var iv = setInterval(function(){i=(i+1)%ROLL_MSGS.length;setLoadMsg(ROLL_MSGS[i]);},2500);
    try {
      var favHint=prefs.favoriteMeals.concat(favorites.slice(0,4)).filter(Boolean).join(', ');
      var budgetNote=prefs.budgetEnabled&&budget>0?'Weekly grocery budget: '+sym+budget+'. Target ~'+sym+(budget/(7*prefs.mealTypes.length)).toFixed(1)+' per meal.':'';
      var mealTpl='{"name":"str","description":"8-word max","time":"X min","estCost":0.00,"ingredients":["qty unit item","qty unit item"]}';
      var dayTpl='{'+prefs.mealTypes.map(function(t){return '"'+t+'":'+mealTpl;}).join(',')+'}';
      var prompt='Generate a 7-day meal plan. Return ONLY compact JSON.\nMeal types: '+prefs.mealTypes.join(', ')+'\nCuisines: '+(prefs.cuisines.length?prefs.cuisines.join(', '):'varied')+'\nDietary: '+(prefs.dietary.length?prefs.dietary.join(', '):'none')+'\nAdventure: '+prefs.variability+'/100\nServings: '+prefs.servings+'\nFavourites: '+(favHint||'none')+'\n'+budgetNote+'\nReturn: {"monday":'+dayTpl+',"tuesday":'+dayTpl+',"wednesday":'+dayTpl+',"thursday":'+dayTpl+',"friday":'+dayTpl+',"saturday":'+dayTpl+',"sunday":'+dayTpl+'}';
      var raw=await callDishRoll(prompt,4000);
      var plan=JSON.parse(raw);
      var costs={};
      DAYS.forEach(function(d){prefs.mealTypes.forEach(function(t){var m=plan[d.toLowerCase()]&&plan[d.toLowerCase()][t];if(m&&m.estCost) costs[d.toLowerCase()+'-'+t]=m.estCost;});});
      setPlanCosts(costs); setMealPlan(plan); clearInterval(iv); setStep('mealplan');
    } catch(e) {
      clearInterval(iv);
      setErr('Could not roll your plan: '+e.message+'. Please try again.');
      setStep('servings');
    }
  }

  async function openSwap(day, mealType) {
    var cur=mealPlan&&mealPlan[day.toLowerCase()]&&mealPlan[day.toLowerCase()][mealType]; if(!cur) return;
    setSwapping({day:day,mealType:mealType}); setSwapLoading(true); setSwapOpts([]);
    try {
      var bn=prefs.budgetEnabled&&budget>0?' Keep cost under '+sym+(budget/7/prefs.mealTypes.length).toFixed(0)+'.':'';
      var prompt='Suggest 3 alternative '+mealType+' recipes to replace "'+cur.name+'". Cuisines: '+(prefs.cuisines.join(',')||'any')+'. Dietary: '+(prefs.dietary.join(',')||'none')+'. Adventure: '+prefs.variability+'/100. Servings: '+prefs.servings+'.'+bn+'\nReturn ONLY JSON array: [{"name":"...","description":"8-word max","time":"X min","estCost":0.00,"ingredients":["qty unit item"]},...]';
      var raw=await callDishRoll(prompt,1200);
      setSwapOpts(JSON.parse(raw));
    } catch(e) { setSwapOpts([]); }
    setSwapLoading(false);
  }
  function applySwap(opt) {
    setPlanCosts(function(p){var r=Object.assign({},p);r[swapping.day.toLowerCase()+'-'+swapping.mealType]=opt.estCost||0;return r;});
    setMealPlan(function(p){var d=swapping.day.toLowerCase();var r=Object.assign({},p);r[d]=Object.assign({},r[d]);r[d][swapping.mealType]=opt;return r;});
    setSwapping(null); setSwapOpts([]);
  }

  function toggleShop(key) { setShopSel(function(p){var n=new Set(p);n.has(key)?n.delete(key):n.add(key);return n;}); }
  function selectAll() { var s=new Set(); DAYS.forEach(function(d){prefs.mealTypes.forEach(function(t){if(mealPlan&&mealPlan[d.toLowerCase()]&&mealPlan[d.toLowerCase()][t]) s.add(d.toLowerCase()+'-'+t);});}); setShopSel(s); }

  async function buildList() {
    if(!shopSel.size) return;
    setLoading(true); setLoadMsg('Assembling your shopping list…');
    try {
      var sel=[]; var meals={};
      DAYS.forEach(function(d){prefs.mealTypes.forEach(function(t){
        var key=d.toLowerCase()+'-'+t;
        if(shopSel.has(key)){var m=mealPlan&&mealPlan[d.toLowerCase()]&&mealPlan[d.toLowerCase()][t];if(m){sel.push({meal:m.name,servings:prefs.servings,ingredients:m.ingredients});meals[key]={meal:m,mealType:t};}}
      });});
      var prompt='Combine into a grocery shopping list for '+prefs.servings+' people. Merge duplicates. Group by aisle.\nMeals: '+JSON.stringify(sel)+'\nReturn ONLY JSON: {"categories":[{"name":"Produce","items":["..."]},{"name":"Proteins","items":["..."]}]}\nUse: Produce,Proteins,Dairy,Grains,Pantry,Condiments,Frozen,Bakery,Beverages,Other.';
      var raw=await callDishRoll(prompt,2000);
      setShoppingList(JSON.parse(raw)); setShopMeals(meals); setStep('shopping');
    } catch(e) { setErr('Could not build shopping list. Please try again.'); }
    setLoading(false);
  }
  function copyAlexa() { navigator.clipboard.writeText(shoppingList.categories.flatMap(function(c){return c.items;}).join('\n')); showToast('✓ Copied — paste into your Alexa app'); }
  function copyAll() { navigator.clipboard.writeText(shoppingList.categories.map(function(c){return c.name+':\n'+c.items.map(function(i){return '• '+i;}).join('\n');}).join('\n\n')); showToast('✓ Shopping list copied'); }

  function screenWelcome() {
    return (
      <div>
        <div className="w-hero">
          <img src="/logo.png" alt="DishRoll" className="w-logo" />
          <div className="scr-title">Roll your week.<br /><span style={{color:'#f09200',fontStyle:'italic'}}>Eat well.</span></div>
          <p className="scr-sub" style={{maxWidth:440,margin:'12px auto 8px'}}>Tell DishRoll your tastes, budget, and how adventurous you are feeling — and we will roll a perfect week of meals with a smart shopping list.</p>
          <div className="roll-badge" style={{margin:'0 auto 32px'}}>🎲 AI-powered random meal generation</div>
        </div>
        <div className="card">
          <div className="lbl">What would you like to roll?</div>
          <div className="mt-grid">
            {[{id:'dinner',icon:'🌙',label:'Dinner Only',sub:'Evening meals for the week'},{id:'all',icon:'☀️',label:'All Meals',sub:'Breakfast, lunch & dinner'},{id:'custom',icon:'✏️',label:'Custom',sub:'Choose what you need'}].map(function(o){
              return <div key={o.id} className={'mt-card '+(prefs.mealScope===o.id?'sel':'')} onClick={function(){setScope(o.id);}}><div className="mt-icon">{o.icon}</div><div className="mt-lbl">{o.label}</div><div className="mt-sub">{o.sub}</div></div>;
            })}
          </div>
          {prefs.mealScope==='custom'&&(<div style={{marginTop:16}}><div className="lbl">Choose meal types</div><div className="chip-grid">{['breakfast','lunch','dinner'].map(function(t){return <div key={t} className={'chip '+(prefs.mealTypes.includes(t)?'sel':'')} onClick={function(){toggleType(t);}} style={{textTransform:'capitalize'}}>{ML[t]}</div>;})}</div></div>)}
        </div>
        {favorites.length>0&&<div className="fav-notice">⭐ {favorites.length} saved favourite{favorites.length>1?'s':''} — we will roll them in where they fit.</div>}
        <div className="nav-row"><button className="btn btn-p" onClick={function(){setStep('cuisines');}}>Lets roll →</button></div>
      </div>
    );
  }

  function screenCuisines() {
    return (
      <div>
        <div className="scr-title">Cuisine<br /><span style={{color:'#f09200',fontStyle:'italic'}}>preferences</span></div>
        <p className="scr-sub">Choose cuisines to roll from. Leave blank for maximum variety.</p>
        <div className="card"><div className="lbl">Select your favourites</div><div className="chip-grid">{CUISINE_OPTIONS.map(function(c){return <div key={c} className={'chip '+(prefs.cuisines.includes(c)?'sel':'')} onClick={function(){var n=prefs.cuisines.includes(c)?prefs.cuisines.filter(function(x){return x!==c;}):prefs.cuisines.concat([c]);sp('cuisines',n);}}>{c}</div>;})}</div></div>
        <div className="nav-row"><button className="btn btn-g" onClick={function(){setStep('welcome');}}>← Back</button><button className="btn btn-p" onClick={function(){setStep('dietary');}}>Continue →</button></div>
      </div>
    );
  }

  function screenDietary() {
    return (
      <div>
        <div className="scr-title">Dietary<br /><span style={{color:'#f09200',fontStyle:'italic'}}>requirements</span></div>
        <p className="scr-sub">Any restrictions we should keep out of the roll?</p>
        <div className="card"><div className="lbl">Select all that apply</div><div className="chip-grid">{DIETARY_OPTIONS.map(function(d){return <div key={d} className={'chip '+(prefs.dietary.includes(d)?'asel':'')} onClick={function(){var n=prefs.dietary.includes(d)?prefs.dietary.filter(function(x){return x!==d;}):prefs.dietary.concat([d]);sp('dietary',n);}}>{d}</div>;})}</div></div>
        <div className="nav-row"><button className="btn btn-g" onClick={function(){setStep('cuisines');}}>← Back</button><button className="btn btn-p" onClick={function(){setStep('variability');}}>Continue →</button></div>
      </div>
    );
  }

  function screenVariability() {
    return (
      <div>
        <div className="scr-title">How wild<br /><span style={{color:'#f09200',fontStyle:'italic'}}>should we roll?</span></div>
        <p className="scr-sub">Set your adventure level — from safe classics to bold surprises.</p>
        <div className="card">
          <div className="lbl">Adventure level</div>
          <input type="range" min={0} max={100} value={prefs.variability} onChange={function(e){sp('variability',+e.target.value);}} className="slider" />
          <div className="var-lbls"><span>🏠 Comforting classics</span><span style={{fontWeight:600,color:'#f09200'}}>{prefs.variability<33?'Safe & familiar':prefs.variability<66?'Balanced mix':'Wild & adventurous 🎲'}</span><span>🌏 Bold surprises</span></div>
        </div>
        <div className="card">
          <div className="lbl">Lock in some favourites (optional)</div>
          <p className="hint">Name dishes you love — we will make sure they land in the roll.</p>
          <div style={{display:'flex',gap:9,marginBottom:11}}>
            <input className="inp" placeholder="e.g. Chicken tikka masala, carbonara…" value={prefs.favInput} onChange={function(e){sp('favInput',e.target.value);}} onKeyDown={function(e){if(e.key==='Enter')addFavMeal();}} style={{flex:1}} />
            <button className="btn btn-g btn-sm" onClick={addFavMeal}>Add</button>
          </div>
          <div className="chip-grid">{prefs.favoriteMeals.map(function(m,i){return <div key={i} className="tag">{m}<button onClick={function(){sp('favoriteMeals',prefs.favoriteMeals.filter(function(_,j){return j!==i;}));}}>×</button></div>;})}</div>
        </div>
        <div className="nav-row"><button className="btn btn-g" onClick={function(){setStep('dietary');}}>← Back</button><button className="btn btn-p" onClick={function(){setStep('budget');}}>Continue →</button></div>
      </div>
    );
  }

  function screenBudget() {
    return (
      <div>
        <div className="scr-title">Weekly<br /><span style={{color:'#f09200',fontStyle:'italic'}}>food budget</span></div>
        <p className="scr-sub">Set a grocery budget and we will roll meals within range. Optional but useful.</p>
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div className="lbl" style={{margin:0}}>Enable budget planning</div>
            <div style={{display:'flex',gap:10}}>
              {[{v:true,l:'Yes'},{v:false,l:'Skip'}].map(function(o){return <div key={String(o.v)} className={'chip '+(prefs.budgetEnabled===o.v?'sel':'')} onClick={function(){sp('budgetEnabled',o.v);}}>{o.l}</div>;})}
            </div>
          </div>
          {prefs.budgetEnabled ? (
            <div>
              <div className="lbl">Currency</div>
              <div className="currency-row">{Object.entries(CURRENCY_SYMBOLS).map(function(e){var code=e[0],s=e[1];return <div key={code} className={'curr-chip '+(prefs.currency===code?'sel':'')} onClick={function(){sp('currency',code);}}>{s} {code}</div>;})}</div>
              <div className="lbl">Weekly grocery budget</div>
              <div className="budget-row">
                <BudgetInput value={prefs.weeklyBudget} onChange={function(v){sp('weeklyBudget',v);}} sym={sym} />
                <span className="per-lbl">/ week · {prefs.servings} person{prefs.servings>1?'s':''}</span>
              </div>
              {prefs.weeklyBudget&&<p style={{fontSize:12,color:'#3a8080',marginTop:8}}>≈ {sym}{(parseFloat(prefs.weeklyBudget)/(7*prefs.mealTypes.length)).toFixed(1)} per meal · {sym}{(parseFloat(prefs.weeklyBudget)/(7*prefs.mealTypes.length*prefs.servings)).toFixed(1)} per person</p>}
            </div>
          ) : (
            <p style={{fontSize:13,color:'#9a9898',fontStyle:'italic'}}>No budget set — we will roll purely on taste.</p>
          )}
        </div>
        <div className="nav-row"><button className="btn btn-g" onClick={function(){setStep('variability');}}>← Back</button><button className="btn btn-p" onClick={function(){setStep('servings');}}>Continue →</button></div>
      </div>
    );
  }

  function screenServings() {
    return (
      <div>
        <div className="scr-title">How many are<br /><span style={{color:'#f09200',fontStyle:'italic'}}>you rolling for?</span></div>
        <p className="scr-sub">We will scale all ingredients and portions accordingly.</p>
        <div className="card" style={{textAlign:'center',padding:'44px 28px'}}>
          <div className="srv-row" style={{marginBottom:10}}>
            <button className="srv-btn" onClick={function(){if(prefs.servings>1)sp('servings',prefs.servings-1);}}>−</button>
            <div className="srv-num">{prefs.servings}</div>
            <button className="srv-btn" onClick={function(){if(prefs.servings<10)sp('servings',prefs.servings+1);}}>+</button>
          </div>
          <div style={{fontSize:14,color:'#4a7070'}}>{prefs.servings===1?'Just me':prefs.servings<=2?'A couple':prefs.servings<=4?'Small family':'Larger group'}</div>
        </div>
        {err&&<div className="err">⚠️ {err}</div>}
        <div className="nav-row"><button className="btn btn-g" onClick={function(){setStep('budget');}}>← Back</button><button className="btn btn-roll" onClick={roll}>🎲 Roll my week</button></div>
      </div>
    );
  }

  function screenGenerating() {
    return (
      <div className="load-scr">
        <div className="dice-anim"><img src="/logo.png" alt="DishRoll" style={{width:100,height:'auto'}} /></div>
        <div className="load-msg">{loadMsg}</div>
        <p className="load-sub">Usually takes around 10–15 seconds…</p>
      </div>
    );
  }

  function screenMealPlan() {
    if (!mealPlan) return null;
    return (
      <div>
        <div className="sec-hdr">
          <div>
            <div className="scr-title" style={{fontSize:28,marginBottom:4}}>Your roll<br /><span style={{color:'#f09200',fontStyle:'italic'}}>is in.</span></div>
            <p style={{fontSize:12,color:'#4a7070',lineHeight:1.7}}>Click meal name for full recipe · ☆ star · 🎲 re-roll · click cell to add to shopping</p>
          </div>
          <button className="btn btn-g btn-sm" onClick={function(){setStep('welcome');setMealPlan(null);setShoppingList(null);setShopSel(new Set());setPlanCosts({});}}>🎲 Re-roll</button>
        </div>

        {prefs.budgetEnabled&&Object.keys(planCosts).length>0&&(
          <div className="budget-summary">
            <div><div className="bsum-label">Estimated weekly cost</div><div style={{fontSize:12,color:'#3a8080'}}>{prefs.servings} serving{prefs.servings>1?'s':''}</div></div>
            <div>
              <div className={'bsum-val '+(overBudget?'bsum-over':'')}>{sym}{totalCost.toFixed(0)}</div>
              {budget>0&&<div style={{fontSize:12,color:overBudget?'#c93939':'#3a8080',textAlign:'right'}}>{overBudget?sym+(totalCost-budget).toFixed(0)+' over':sym+(budget-totalCost).toFixed(0)+' under'}</div>}
            </div>
          </div>
        )}

        <div style={{overflowX:'auto',marginBottom:18}}>
          <div className="meal-grid" style={{minWidth:840}}>
            <div/>
            {DAYS.map(function(d){return <div key={d} className="g-hdr">{d.slice(0,3)}</div>;})}
            {prefs.mealTypes.map(function(mt){
              return (
                <Fragment key={mt}>
                  <div className="g-lbl">{ML[mt]}</div>
                  {DAYS.map(function(day){
                    var m=mealPlan&&mealPlan[day.toLowerCase()]&&mealPlan[day.toLowerCase()][mt];
                    var key=day.toLowerCase()+'-'+mt;
                    var sel=shopSel.has(key); var fav=m&&favorites.includes(m.name);
                    return (
                      <div key={day} className={'m-cell '+(sel?'sshop':'')} onClick={function(){if(m)toggleShop(key);}}>
                        {m ? (
                          <div>
                            {sel&&<div className="chk-badge">✓</div>}
                            {fav&&<div className="fav-dot">⭐</div>}
                            <div className="m-name" onClick={function(e){e.stopPropagation();openRecipe(m,mt);}}>{m.name}</div>
                            <div className="m-desc">{m.description}</div>
                            <div className="m-meta">
                              <span className="m-time">⏱ {m.time}</span>
                              {prefs.budgetEnabled&&planCosts[key]!=null&&<span className="m-cost">{sym}{planCosts[key]}</span>}
                            </div>
                            <div className="m-actions" onClick={function(e){e.stopPropagation();}}>
                              <button className="ibtn" onClick={function(){toggleFav(m.name);}}>{fav?'⭐':'☆'}</button>
                              <button className="ibtn" onClick={function(){openRecipe(m,mt);}}>📖</button>
                              <button className="ibtn" onClick={function(){openSwap(day,mt);}}>🎲</button>
                            </div>
                          </div>
                        ):<div style={{color:'#ccc',fontSize:11,textAlign:'center',margin:'auto'}}>—</div>}
                      </div>
                    );
                  })}
                </Fragment>
              );
            })}
          </div>
        </div>

        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:12}}>
            <div><div style={{fontWeight:600,fontSize:15,color:'#0a4848',marginBottom:2}}>🛒 Build your shopping list</div><div style={{fontSize:13,color:'#4a7070'}}>{shopSel.size} of {DAYS.length*prefs.mealTypes.length} meals selected</div></div>
            <div style={{display:'flex',gap:8}}><button className="btn btn-g btn-sm" onClick={selectAll}>Select all</button><button className="btn btn-g btn-sm" onClick={function(){setShopSel(new Set());}}>Clear</button></div>
          </div>
          {err&&<div className="err" style={{marginBottom:10}}>⚠️ {err}</div>}
          <button className="btn btn-p" onClick={buildList} disabled={!shopSel.size||loading}>{loading?'⏳ Building…':'Build shopping list ('+shopSel.size+' meal'+(shopSel.size!==1?'s':'')+')'}</button>
        </div>
      </div>
    );
  }

  function screenShopping() {
    if (!shoppingList) return null;
    var all=shoppingList.categories.flatMap(function(c){return c.items;});
    var done=all.filter(function(i){return checked.has(i);}).length;
    var selCost=Array.from(shopSel).reduce(function(s,k){return s+(planCosts[k]||0);},0);
    var seen={}; var mealList=Object.values(shopMeals).filter(function(v){if(seen[v.meal.name]) return false; seen[v.meal.name]=true; return true;});
    return (
      <div>
        <div className="sec-hdr">
          <div>
            <div className="scr-title" style={{fontSize:28,marginBottom:4}}>Shopping<br /><span style={{color:'#f09200',fontStyle:'italic'}}>list</span></div>
            <p style={{fontSize:13,color:'#4a7070'}}>{done} of {all.length} items ticked</p>
          </div>
          <button className="btn btn-g btn-sm" onClick={function(){setStep('mealplan');}}>← Back to roll</button>
        </div>

        {prefs.budgetEnabled&&selCost>0&&(
          <div className="budget-summary" style={{marginBottom:16}}>
            <div className="bsum-label">Estimated cost for selected meals</div>
            <div className={'bsum-val '+(prefs.weeklyBudget&&selCost>budget?'bsum-over':'')}>{sym}{selCost.toFixed(0)}</div>
          </div>
        )}

        {mealList.length>0&&(
          <div className="card" style={{padding:'16px 20px',marginBottom:14}}>
            <div className="lbl" style={{marginBottom:10}}>Tap a meal to view its full recipe</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {mealList.map(function(v,i){return <button key={i} className="btn btn-g btn-sm" style={{borderRadius:100,fontSize:12}} onClick={function(){openRecipe(v.meal,v.mealType);}}>📖 {v.meal.name}</button>;})}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:9,marginBottom:20,flexWrap:'wrap'}}>
          <button className="alexa-btn" onClick={copyAlexa}><span>🔵</span> Copy for Alexa</button>
          <button className="btn btn-g btn-sm" onClick={copyAll}>📋 Copy all</button>
          <button className="btn btn-g btn-sm" onClick={function(){setChecked(new Set());}}>↺ Reset ticks</button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:13}}>
          {shoppingList.categories.map(function(cat){return (
            <div key={cat.name} className="card" style={{padding:17}}>
              <div className="cat-title">{CAT_ICONS[cat.name]||'🛒'} {cat.name}</div>
              {cat.items.map(function(item,i){return (
                <div key={i} className="shop-row">
                  <input type="checkbox" className="shop-chk" checked={checked.has(item)} onChange={function(){setChecked(function(p){var n=new Set(p);n.has(item)?n.delete(item):n.add(item);return n;});}} />
                  <span className={'shop-item '+(checked.has(item)?'done':'')}>{item}</span>
                </div>
              );})}
            </div>
          );})}
        </div>

        <div style={{marginTop:18,padding:16,background:'#f0fafa',borderRadius:13,border:'1px solid #c8e4e4'}}>
          <div style={{fontSize:13,fontWeight:600,color:'#0a4848',marginBottom:4}}>📱 How to add to Alexa</div>
          <div style={{fontSize:13,color:'#4a7070',lineHeight:1.7}}>Tap <strong>Copy for Alexa</strong> → open the <strong>Alexa app</strong> → <strong>Lists</strong> → <strong>Shopping List</strong> → paste.</div>
        </div>
      </div>
    );
  }

  function RecipeModal() {
    if (!recipe) return null;
    var meal=recipe.meal, mealType=recipe.mealType, steps=recipe.steps, tip=recipe.tip, imgOk=recipe.imgOk, rLoading=recipe.loading;
    var photoUrl='https://source.unsplash.com/640x360/?'+encodeURIComponent(meal.name.split(' ').slice(0,3).join(',')+',food,cooking');
    var mlLabel={breakfast:'Breakfast',lunch:'Lunch',dinner:'Dinner'};
    return (
      <div className="recipe-ov" onClick={function(){setRecipe(null);}}>
        <div className="recipe-modal" onClick={function(e){e.stopPropagation();}}>
          {imgOk
            ? <img src={photoUrl} alt={meal.name} className="recipe-photo" onError={function(){setRecipe(function(p){return p?Object.assign({},p,{imgOk:false}):null;});}} />
            : <div className="recipe-photo-fb">🍽️</div>
          }
          <div className="recipe-hdr">
            <div className="recipe-hdr-top">
              <div className="recipe-rname">{meal.name}</div>
              <button className="recipe-close" onClick={function(){setRecipe(null);}}>×</button>
            </div>
            <div className="recipe-pills">
              <span className="recipe-pill">⏱ {meal.time}</span>
              <span className="recipe-pill">👥 {prefs.servings} serving{prefs.servings>1?'s':''}</span>
              <span className="recipe-pill">🍽️ {mlLabel[mealType]||mealType}</span>
              {prefs.budgetEnabled&&meal.estCost&&<span className="recipe-pill">💰 {sym}{meal.estCost}</span>}
            </div>
          </div>
          <div className="recipe-body">
            <div className="recipe-stitle">Ingredients — {prefs.servings} serving{prefs.servings>1?'s':''}</div>
            {(meal.ingredients||[]).map(function(ing,i){return <div key={i} className="recipe-ing"><div className="recipe-ing-dot"/>{ing}</div>;})}
            <div className="recipe-stitle">How to cook</div>
            {rLoading ? (
              <div className="recipe-loading"><div className="recipe-spin"/><span>Fetching recipe steps…</span></div>
            ) : (
              <div>
                {steps.map(function(s,i){return <div key={i} className="recipe-step"><div className="recipe-step-n">{i+1}</div><div className="recipe-step-t">{s}</div></div>;})}
                {tip&&<div className="recipe-tip">💡 {tip}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function SwapModal() {
    if (!swapping) return null;
    var cur=mealPlan&&mealPlan[swapping.day.toLowerCase()]&&mealPlan[swapping.day.toLowerCase()][swapping.mealType];
    return (
      <div className="modal-ov" onClick={function(){setSwapping(null);}}>
        <div className="modal" onClick={function(e){e.stopPropagation();}}>
          <div className="modal-title">🎲 Re-roll {swapping.mealType}</div>
          <div className="modal-sub">{swapping.day} · Currently: <strong>{cur&&cur.name}</strong></div>
          {swapLoading ? (
            <div style={{textAlign:'center',padding:'28px 0'}}>
              <div style={{fontSize:40,animation:'diceRoll .6s ease-in-out infinite alternate',display:'inline-block'}}>🎲</div>
              <div style={{fontSize:13,color:'#4a7070',marginTop:12}}>Rolling alternatives…</div>
            </div>
          ) : swapOpts.length===0 ? (
            <div style={{color:'#4a7070',fontSize:14,padding:'14px 0'}}>No alternatives found — try again.</div>
          ) : swapOpts.map(function(o,i){return (
            <div key={i} className="swap-card" onClick={function(){applySwap(o);}}>
              <div className="swap-name">{o.name}</div>
              <div className="swap-desc">{o.description}</div>
              <div className="swap-foot"><span>⏱ {o.time}</span>{prefs.budgetEnabled&&o.estCost!=null&&<span>💰 {sym}{o.estCost}</span>}</div>
            </div>
          );})}
          <button className="btn btn-g btn-sm" style={{marginTop:10}} onClick={function(){setSwapping(null);}}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{FONTS+CSS}</style>
      <div className="app">
        <div className="header">
          <div className="logo"><img src="/logo.png" alt="DishRoll" /></div>
          {step!=='welcome'&&step!=='generating'&&<div style={{fontSize:12,color:'#6abcbc',fontWeight:500}}>Step {STEPS_IDX[step]||1} of 9</div>}
        </div>
        {step!=='generating'&&step!=='mealplan'&&step!=='shopping'&&(
          <div className="prog-bar"><div className="prog-fill" style={{width:prog+'%'}}/></div>
        )}
        <div className="main">
          {step==='welcome'     && screenWelcome()}
          {step==='cuisines'    && screenCuisines()}
          {step==='dietary'     && screenDietary()}
          {step==='variability' && screenVariability()}
          {step==='budget'      && screenBudget()}
          {step==='servings'    && screenServings()}
          {step==='generating'  && screenGenerating()}
          {step==='mealplan'    && screenMealPlan()}
          {step==='shopping'    && screenShopping()}
        </div>
        {SwapModal()}
        {RecipeModal()}
        {copied&&<div className="toast">{toastMsg||'✓ Done'}</div>}
      </div>
    </div>
  );
}
