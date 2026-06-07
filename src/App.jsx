import { useState, useEffect, Fragment, useRef } from "react";

const APP_VERSION = "0.6.4";
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

// Fallback globe badge when cuisine is unknown — a styled SVG that matches the brand palette,
// rendered sharper and more premium than the default 🌍 emoji.
const GlobeBadge = () => (
  <svg viewBox="0 0 20 20" width="16" height="16" style={{ display: "block" }} aria-label="Varied cuisine" role="img">
    <defs>
      <radialGradient id="drGlobeG" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#9dc7d9" />
        <stop offset="60%" stopColor="#4e88a3" />
        <stop offset="100%" stopColor="#224a60" />
      </radialGradient>
    </defs>
    <circle cx="10" cy="10" r="9" fill="url(#drGlobeG)" />
    <path d="M1 10 H19 M10 1 V19 M3 5 Q10 7 17 5 M3 15 Q10 13 17 15" stroke="#ffffff" strokeWidth="0.6" fill="none" opacity="0.55" />
    <ellipse cx="10" cy="10" rx="4.2" ry="9" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.55" />
    <path d="M6 7 q1.5 -1 3 -0.3 t2.5 0.5 q1 0.6 1.5 1.8 M4.5 11 q1.8 0.4 3.3 1.2 t3.2 0.4 q1.2 -0.3 2.5 -1.2" fill="#2a6a3a" stroke="#1a4a2a" strokeWidth="0.3" opacity="0.9" />
    <circle cx="6.5" cy="6.5" r="1.8" fill="#3a7a3a" opacity="0.85" />
    <circle cx="13" cy="12" r="1.4" fill="#3a7a3a" opacity="0.85" />
  </svg>
);

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
const LANGUAGES = [
  { code:"en", label:"English",     flag:"🇬🇧" },
  { code:"uk", label:"Українська",  flag:"🇺🇦" },
  { code:"fr", label:"Français",    flag:"🇫🇷" },
  { code:"es", label:"Español",     flag:"🇪🇸" },
  { code:"de", label:"Deutsch",     flag:"🇩🇪" },
  { code:"pt", label:"Português",   flag:"🇵🇹" },
  { code:"it", label:"Italiano",    flag:"🇮🇹" },
  { code:"nl", label:"Nederlands",  flag:"🇳🇱" },
  { code:"tr", label:"Türkçe",      flag:"🇹🇷" },
  { code:"zh", label:"中文",         flag:"🇨🇳" },
  { code:"ar", label:"العربية",     flag:"🇸🇦" },
  { code:"hi", label:"हिन्दी",       flag:"🇮🇳" },
  { code:"ru", label:"Русский",     flag:""    },
  { code:"bn", label:"বাংলা",            flag:"🇧🇩" },
  { code:"ja", label:"日本語",            flag:"🇯🇵" },
  { code:"id", label:"Bahasa Indonesia", flag:"🇮🇩" },
];
const LANG_EN = {
  en:"English", uk:"Ukrainian", fr:"French", es:"Spanish", de:"German",
  pt:"Portuguese", it:"Italian", nl:"Dutch", tr:"Turkish",
  zh:"Chinese", ar:"Arabic", hi:"Hindi", ru:"Russian",
  bn:"Bengali", ja:"Japanese", id:"Indonesian",
};
// ─── UI TRANSLATIONS ──────────────────────────────────────────────────────────
const UI = {
  en: {
    hero1:"AI-Powered Meal Planning", hero2:"Know what's for", hero2em:"dinner every night.",
    hero3:"Describe your tastes, household & budget — your AI chef builds a personalised week of meals, recipes & a shopping list in seconds.",
    planThisWeek:"Plan this week", goPremium:"✦ Go Premium",
    home:"← Home", back:"← Back", continue:"Continue →", planMyWeek:"Plan my week",
    calendar:"← Calendar", autoSaved:"Auto-saved",
    thisWeek:"This week", yourWeeks:"Your weeks", saved:"Saved", upcoming:"Upcoming",
    tapToPlan:"Tap to plan", planAhead:"Plan ahead · skip impulse buys",
    openPlan:"Open plan", planAgain:"Plan again", open:"Open", list:"List", replan:"Re-plan", plan:"Plan",
    confirm:"Confirm", cancel:"Cancel", weekDeleted:"Week deleted",
    alreadyPlanned:"Already planned — open or plan again", notPlanned:"Not planned yet",
    shoppingList:"Shopping list",
    yourPlanReady:"Your plan", yourPlanReadyEm:"is ready.",
    replanBtn:"↻ Re-plan",
    planHint:"Tap a card to add to basket · 📖 for recipe · ☆ to favourite · ↻ to swap",
    estimatedCost:"Estimated weekly cost",
    buildList:"Build shopping list", buildingList:"⏳ Building…", viewList:"View list", selectAll:"Select all",
    mealsSelected:"meal selected", mealsSelectedP:"meals selected",
    step1title:"Plan your week.", step1em:"Eat well.",
    step1q:"What would you like to plan?",
    dinnerOnly:"Dinner Only", dinnerOnlySub:"Evening meals",
    allMeals:"All Meals", allMealsSub:"Breakfast, lunch & dinner",
    custom:"Custom", customSub:"Choose meal types",
    mealTypes:"Meal types",
    step2title:"Which days", step2em:"do you need meals?",
    step2hint:"Tap to toggle. We'll only plan the days you select.",
    selectDays:"Select days", all7:"All 7", weekdays:"Weekdays", weekend:"Weekend",
    step3title:"Cuisine", step3em:"preferences",
    step3hint:"Choose cuisines to plan from. Leave blank for maximum variety.",
    selectFavourites:"Select your favourites", addCustomCuisine:"Add a custom cuisine",
    cuisinePlaceholder:"e.g. Georgian, Peruvian, Korean…", add:"Add",
    step4title:"Dietary", step4em:"requirements",
    step4hint:"Any restrictions we should keep out of the plan?",
    selectAllThat:"Select all that apply",
    step5title:"Your culinary", step5em:"personality",
    step5hint:"Set your adventure level, complexity, and any must-have meals.",
    adventureLevel:"Adventure level", classics:"🏠 Classics", surprises:"🌏 Surprises",
    safe:"Safe & familiar", balanced:"Balanced mix", wild:"Wild & adventurous",
    dishComplexity:"Dish complexity",
    lockFavourites:"Lock in favourites (optional)",
    lockFavHint:"Name dishes you love — we'll make sure they land in the plan.",
    favPlaceholder:"e.g. Chicken tikka, borscht…",
    step6title:"Weekly", step6em:"food budget",
    step6hint:"Set a grocery budget and we'll keep meals within range. Optional.",
    enableBudget:"Enable budget planning", yes:"Yes", skip:"Skip",
    currency:"Currency", weeklyBudget:"Weekly grocery budget",
    budgetPlaceholder:"e.g. 120", perWeek:"per week", noBudget:"No budget — planning purely on taste.",
    perMeal:"per meal",
    step7title:"Who are you", step7em:"planning for?",
    step7hint:"We'll scale ingredients and portions for your household.",
    adults:"👨‍👩‍👧 Adults", kids:"👧 Kids",
    kidsDiff:"Kids get different, child-friendly meals", kidsDiffSub:"We'll suggest simpler alternatives alongside adult meals",
    planningFor:"Planning for", person:"person", people:"people",
    generating:"Planning your week…", generatingSub:"Usually takes 5–10 seconds…",
    ingredients:"Ingredients", howToCook:"How to cook", chefsTip:"💡 Chef's tip:",
    fetchingRecipe:"Fetching recipe…", prep:"🥄 Prep", cook:"🔥 Cook", servings:"serving", servingsP:"servings",
    replaceWith:"Replace", findingAlts:"Finding alternatives…", noAlts:"No alternatives found.",
    shoppingListTitle:"🛒 Shopping list", done:"done",
    allDone:"🎉 All done!", allDoneSub:"Everything is in your basket. Enjoy your meals!",
    reset:"↺ Reset", copyList:"📋 Copy list", addItem:"Add an item…", addItemBtn:"+ Add",
    feedback:"✏️ Feedback", sendFeedback:"Send feedback",
    favSaved:"saved favourite", favSavedP:"saved favourites", favRollIn:"— we'll roll them in where they fit.",
    ob1title:"Roll a full week in seconds", ob1sub:"Pick your days and cuisines — your AI chef plans meals with variety built in.",
    ob2title:"One-tap shopping list", ob2sub:"Every meal turns into a categorised list. Tick items off as you shop.",
    ob3title:"Recipes when you need them", ob3sub:"Tap any meal card for step-by-step cooking instructions — plus kids alternatives.",
    ob4title:"Chat with your AI chef", ob4sub:"Ask for swaps, get cooking tips, or plan around what's in your fridge.",
    letsRoll:"Let's roll",
    installApp:"⬇ Install App",
    listTipText:"Tap items to tick them off as you shop · Add extras at the bottom · Copy or Reset from the top bar",
    gotIt:"Got it",
    premiumWelcomeTitle:"You're Premium!", premiumWelcomeSub:"Here's what's now unlocked:",
    premiumF1:"Unlimited weekly meal plans", premiumF2:"All your weeks saved forever",
    premiumF3:"Kids meal alternatives", premiumF4:"AI chef chat — ask anything",
    premiumStartPlanning:"Start planning",
  },
  es: {
    hero1:"Planificación de comidas con IA", hero2:"Sabe lo que cenar", hero2em:"cada noche.",
    hero3:"Describe tus gustos, hogar y presupuesto — tu chef IA crea un plan semanal personalizado con recetas y lista de compra en segundos.",
    planThisWeek:"Planificar esta semana", goPremium:"✦ Premium",
    home:"← Inicio", back:"← Atrás", continue:"Continuar →", planMyWeek:"Planificar mi semana",
    calendar:"← Calendario", autoSaved:"Guardado automáticamente",
    thisWeek:"Esta semana", yourWeeks:"Tus semanas", saved:"Guardado", upcoming:"Próximo",
    tapToPlan:"Toca para planificar", planAhead:"Planifica antes · evita compras impulsivas",
    openPlan:"Abrir plan", planAgain:"Planificar de nuevo", open:"Abrir", list:"Lista", replan:"Replanificar", plan:"Planificar",
    confirm:"Confirmar", cancel:"Cancelar", weekDeleted:"Semana eliminada",
    alreadyPlanned:"Ya planificado — abrir o planificar de nuevo", notPlanned:"Aún no planificado",
    shoppingList:"Lista de la compra",
    yourPlanReady:"Tu plan", yourPlanReadyEm:"está listo.",
    replanBtn:"↻ Replanificar",
    planHint:"Toca una tarjeta para añadir · 📖 receta · ☆ favorito · ↻ cambiar",
    estimatedCost:"Coste semanal estimado",
    buildList:"Crear lista de la compra", buildingList:"⏳ Creando…", viewList:"Ver lista", selectAll:"Seleccionar todo",
    mealsSelected:"comida seleccionada", mealsSelectedP:"comidas seleccionadas",
    step1title:"Planifica tu semana.", step1em:"Come bien.",
    step1q:"¿Qué quieres planificar?",
    dinnerOnly:"Solo cena", dinnerOnlySub:"Comidas vespertinas",
    allMeals:"Todas las comidas", allMealsSub:"Desayuno, almuerzo y cena",
    custom:"Personalizar", customSub:"Elige los tipos de comida",
    mealTypes:"Tipos de comida",
    step2title:"¿Qué días", step2em:"necesitas comidas?",
    step2hint:"Toca para alternar. Solo planificaremos los días que selecciones.",
    selectDays:"Seleccionar días", all7:"Los 7", weekdays:"Días laborables", weekend:"Fin de semana",
    step3title:"Preferencias", step3em:"de cocina",
    step3hint:"Elige cocinas para planificar. Déjalo vacío para máxima variedad.",
    selectFavourites:"Selecciona tus favoritas", addCustomCuisine:"Añadir cocina personalizada",
    cuisinePlaceholder:"p.ej. Georgiana, Peruana, Coreana…", add:"Añadir",
    step4title:"Requisitos", step4em:"dietéticos",
    step4hint:"¿Hay restricciones que debamos excluir del plan?",
    selectAllThat:"Selecciona todas las que apliquen",
    step5title:"Tu personalidad", step5em:"culinaria",
    step5hint:"Establece tu nivel de aventura, complejidad y platos favoritos.",
    adventureLevel:"Nivel de aventura", classics:"🏠 Clásicos", surprises:"🌏 Sorpresas",
    safe:"Seguro y familiar", balanced:"Mezcla equilibrada", wild:"Salvaje y aventurero",
    dishComplexity:"Complejidad del plato",
    lockFavourites:"Fijar favoritos (opcional)",
    lockFavHint:"Nombra los platos que te encantan — nos aseguraremos de incluirlos.",
    favPlaceholder:"p.ej. Tikka de pollo, borsch…",
    step6title:"Presupuesto", step6em:"semanal de comida",
    step6hint:"Establece un presupuesto y mantendremos las comidas dentro del rango.",
    enableBudget:"Activar planificación de presupuesto", yes:"Sí", skip:"Omitir",
    currency:"Moneda", weeklyBudget:"Presupuesto semanal de compras",
    budgetPlaceholder:"p.ej. 120", perWeek:"por semana", noBudget:"Sin presupuesto — planificando solo por sabor.",
    perMeal:"por comida",
    step7title:"¿Para quién", step7em:"estás planificando?",
    step7hint:"Ajustaremos los ingredientes y porciones para tu hogar.",
    adults:"👨‍👩‍👧 Adultos", kids:"👧 Niños",
    kidsDiff:"Los niños reciben comidas diferentes adaptadas", kidsDiffSub:"Sugeriremos alternativas más sencillas junto a las comidas de adultos",
    planningFor:"Planificando para", person:"persona", people:"personas",
    generating:"Planificando tu semana…", generatingSub:"Suele tardar entre 5 y 10 segundos…",
    ingredients:"Ingredientes", howToCook:"Cómo cocinar", chefsTip:"💡 Consejo del chef:",
    fetchingRecipe:"Cargando receta…", prep:"🥄 Prep", cook:"🔥 Cocción", servings:"porción", servingsP:"porciones",
    replaceWith:"Reemplazar", findingAlts:"Buscando alternativas…", noAlts:"No se encontraron alternativas.",
    shoppingListTitle:"🛒 Lista de la compra", done:"hecho",
    allDone:"🎉 ¡Todo listo!", allDoneSub:"Todo en la cesta. ¡Que aproveche!",
    reset:"↺ Restablecer", copyList:"📋 Copiar lista", addItem:"Añadir un artículo…", addItemBtn:"+ Añadir",
    feedback:"✏️ Comentarios", sendFeedback:"Enviar comentarios",
    favSaved:"favorito guardado", favSavedP:"favoritos guardados", favRollIn:"— los incluiremos donde encajen.",
  },
  uk: {
    hero1:"Планування харчування зі ШІ", hero2:"Знайте, що їсти", hero2em:"кожного вечора.",
    hero3:"Опишіть смаки, домогосподарство й бюджет — ваш ШІ-шеф створить персональний тижневий план, рецепти й список покупок за секунди.",
    planThisWeek:"Спланувати цей тиждень", goPremium:"✦ Преміум",
    home:"← Головна", back:"← Назад", continue:"Далі →", planMyWeek:"Спланувати мій тиждень",
    calendar:"← Календар", autoSaved:"Автозбережено",
    thisWeek:"Цей тиждень", yourWeeks:"Ваші тижні", saved:"Збережено", upcoming:"Майбутній",
    tapToPlan:"Натисніть для планування", planAhead:"Плануйте заздалегідь · уникайте імпульсних покупок",
    openPlan:"Відкрити план", planAgain:"Спланувати знову", open:"Відкрити", list:"Список", replan:"Переплануати", plan:"Планувати",
    confirm:"Підтвердити", cancel:"Скасувати", weekDeleted:"Тиждень видалено",
    alreadyPlanned:"Вже заплановано — відкрити або спланувати знову", notPlanned:"Ще не заплановано",
    shoppingList:"Список покупок",
    yourPlanReady:"Ваш план", yourPlanReadyEm:"готовий.",
    replanBtn:"↻ Перепланувати",
    planHint:"Натисніть карту щоб додати · 📖 рецепт · ☆ улюблене · ↻ замінити",
    estimatedCost:"Орієнтовна вартість на тиждень",
    buildList:"Скласти список покупок", buildingList:"⏳ Складаємо…", viewList:"Переглянути список", selectAll:"Вибрати все",
    mealsSelected:"страва вибрана", mealsSelectedP:"страви вибрані",
    step1title:"Плануйте тиждень.", step1em:"Харчуйтесь добре.",
    step1q:"Що ви хочете спланувати?",
    dinnerOnly:"Тільки вечеря", dinnerOnlySub:"Вечірні страви",
    allMeals:"Усі прийоми їжі", allMealsSub:"Сніданок, обід і вечеря",
    custom:"Власний вибір", customSub:"Оберіть типи прийомів їжі",
    mealTypes:"Типи прийомів їжі",
    step2title:"Які дні", step2em:"вам потрібне харчування?",
    step2hint:"Натисніть для вибору. Ми плануємо лише обрані дні.",
    selectDays:"Обрати дні", all7:"Всі 7", weekdays:"Будні", weekend:"Вихідні",
    step3title:"Кулінарні", step3em:"вподобання",
    step3hint:"Оберіть кухні. Залиште порожнім для максимального різноманіття.",
    selectFavourites:"Оберіть улюблені", addCustomCuisine:"Додати власну кухню",
    cuisinePlaceholder:"напр. Грузинська, Перуанська, Корейська…", add:"Додати",
    step4title:"Дієтичні", step4em:"вимоги",
    step4hint:"Є обмеження, які треба виключити з плану?",
    selectAllThat:"Оберіть усі відповідні",
    step5title:"Ваша кулінарна", step5em:"особистість",
    step5hint:"Налаштуйте рівень пригод, складність та улюблені страви.",
    adventureLevel:"Рівень пригод", classics:"🏠 Класика", surprises:"🌏 Сюрпризи",
    safe:"Безпечно і знайомо", balanced:"Збалансована суміш", wild:"Дико і пригодницько",
    dishComplexity:"Складність страви",
    lockFavourites:"Зафіксувати улюблені (необов'язково)",
    lockFavHint:"Назвіть страви, які ви любите — ми обов'язково включимо їх у план.",
    favPlaceholder:"напр. Курка тікка, борщ…",
    step6title:"Тижневий", step6em:"продуктовий бюджет",
    step6hint:"Встановіть бюджет і ми підберемо страви в межах суми. Необов'язково.",
    enableBudget:"Увімкнути планування бюджету", yes:"Так", skip:"Пропустити",
    currency:"Валюта", weeklyBudget:"Тижневий бюджет на продукти",
    budgetPlaceholder:"напр. 120", perWeek:"на тиждень", noBudget:"Без бюджету — планування суто за смаком.",
    perMeal:"за страву",
    step7title:"Для кого", step7em:"ви плануєте?",
    step7hint:"Ми підберемо інгредієнти та порції для вашої родини.",
    adults:"👨‍👩‍👧 Дорослі", kids:"👧 Діти",
    kidsDiff:"Діти отримують окремі, дитячі страви", kidsDiffSub:"Ми запропонуємо простіші альтернативи поряд з дорослими стравами",
    planningFor:"Планування для", person:"особи", people:"осіб",
    generating:"Планування вашого тижня…", generatingSub:"Зазвичай займає 5–10 секунд…",
    ingredients:"Інгредієнти", howToCook:"Як приготувати", chefsTip:"💡 Порада шефа:",
    fetchingRecipe:"Завантаження рецепту…", prep:"🥄 Підготовка", cook:"🔥 Приготування", servings:"порція", servingsP:"порції",
    replaceWith:"Замінити", findingAlts:"Пошук альтернатив…", noAlts:"Альтернативи не знайдено.",
    shoppingListTitle:"🛒 Список покупок", done:"виконано",
    allDone:"🎉 Все готово!", allDoneSub:"Все у кошику. Смачного!",
    reset:"↺ Скинути", copyList:"📋 Копіювати список", addItem:"Додати товар…", addItemBtn:"+ Додати",
    feedback:"✏️ Зворотний зв'язок", sendFeedback:"Надіслати відгук",
    favSaved:"збережений улюблений", favSavedP:"збережені улюблені", favRollIn:"— ми включимо їх де підійдуть.",
  },
  fr: {
    hero1:"Planification de repas par IA", hero2:"Sachez quoi manger", hero2em:"chaque soir.",
    hero3:"Décrivez vos goûts, votre foyer et votre budget — votre chef IA crée un plan de repas personnalisé avec recettes et liste de courses en quelques secondes.",
    planThisWeek:"Planifier cette semaine", goPremium:"✦ Premium",
    home:"← Accueil", back:"← Retour", continue:"Continuer →", planMyWeek:"Planifier ma semaine",
    calendar:"← Calendrier", autoSaved:"Sauvegarde auto",
    thisWeek:"Cette semaine", yourWeeks:"Vos semaines", saved:"Enregistré", upcoming:"À venir",
    tapToPlan:"Appuyez pour planifier", planAhead:"Planifiez à l'avance · évitez les achats impulsifs",
    openPlan:"Ouvrir le plan", planAgain:"Replanifier", open:"Ouvrir", list:"Liste", replan:"Replanifier", plan:"Planifier",
    confirm:"Confirmer", cancel:"Annuler", weekDeleted:"Semaine supprimée",
    alreadyPlanned:"Déjà planifié — ouvrir ou replanifier", notPlanned:"Pas encore planifié",
    shoppingList:"Liste de courses",
    yourPlanReady:"Votre plan", yourPlanReadyEm:"est prêt.",
    replanBtn:"↻ Replanifier",
    planHint:"Appuyez sur une carte pour ajouter · 📖 recette · ☆ favori · ↻ changer",
    estimatedCost:"Coût hebdomadaire estimé",
    buildList:"Créer la liste de courses", buildingList:"⏳ Création…", viewList:"Voir la liste", selectAll:"Tout sélectionner",
    mealsSelected:"repas sélectionné", mealsSelectedP:"repas sélectionnés",
    step1title:"Planifiez votre semaine.", step1em:"Mangez bien.",
    step1q:"Que souhaitez-vous planifier ?",
    dinnerOnly:"Dîner seulement", dinnerOnlySub:"Repas du soir",
    allMeals:"Tous les repas", allMealsSub:"Petit-déjeuner, déjeuner et dîner",
    custom:"Personnaliser", customSub:"Choisissez les types de repas",
    mealTypes:"Types de repas",
    step2title:"Quels jours", step2em:"avez-vous besoin de repas ?",
    step2hint:"Appuyez pour basculer. Nous planifierons uniquement les jours sélectionnés.",
    selectDays:"Sélectionner les jours", all7:"Les 7", weekdays:"Jours de semaine", weekend:"Week-end",
    step3title:"Préférences", step3em:"culinaires",
    step3hint:"Choisissez des cuisines. Laissez vide pour un maximum de variété.",
    selectFavourites:"Sélectionnez vos favoris", addCustomCuisine:"Ajouter une cuisine personnalisée",
    cuisinePlaceholder:"ex. Géorgienne, Péruvienne, Coréenne…", add:"Ajouter",
    step4title:"Exigences", step4em:"alimentaires",
    step4hint:"Des restrictions à exclure du plan ?",
    selectAllThat:"Sélectionnez tout ce qui s'applique",
    step5title:"Votre personnalité", step5em:"culinaire",
    step5hint:"Définissez votre niveau d'aventure, la complexité et vos plats préférés.",
    adventureLevel:"Niveau d'aventure", classics:"🏠 Classiques", surprises:"🌏 Surprises",
    safe:"Sûr et familier", balanced:"Mélange équilibré", wild:"Sauvage et aventureux",
    dishComplexity:"Complexité du plat",
    lockFavourites:"Fixer les favoris (optionnel)",
    lockFavHint:"Nommez les plats que vous aimez — nous les intégrerons dans le plan.",
    favPlaceholder:"ex. Poulet tikka, bortsch…",
    step6title:"Budget", step6em:"alimentaire hebdomadaire",
    step6hint:"Fixez un budget et nous garderons les repas dans la fourchette. Optionnel.",
    enableBudget:"Activer la planification budgétaire", yes:"Oui", skip:"Ignorer",
    currency:"Devise", weeklyBudget:"Budget courses hebdomadaire",
    budgetPlaceholder:"ex. 120", perWeek:"par semaine", noBudget:"Sans budget — planification uniquement par goût.",
    perMeal:"par repas",
    step7title:"Pour qui", step7em:"planifiez-vous ?",
    step7hint:"Nous adapterons les ingrédients et portions à votre foyer.",
    adults:"👨‍👩‍👧 Adultes", kids:"👧 Enfants",
    kidsDiff:"Les enfants reçoivent des repas différents adaptés", kidsDiffSub:"Nous suggérerons des alternatives plus simples en parallèle",
    planningFor:"Planification pour", person:"personne", people:"personnes",
    generating:"Planification de votre semaine…", generatingSub:"Cela prend généralement 5 à 10 secondes…",
    ingredients:"Ingrédients", howToCook:"Comment cuisiner", chefsTip:"💡 Conseil du chef :",
    fetchingRecipe:"Chargement de la recette…", prep:"🥄 Prép", cook:"🔥 Cuisson", servings:"portion", servingsP:"portions",
    replaceWith:"Remplacer", findingAlts:"Recherche d'alternatives…", noAlts:"Aucune alternative trouvée.",
    shoppingListTitle:"🛒 Liste de courses", done:"fait",
    allDone:"🎉 Tout est fait !", allDoneSub:"Tout est dans votre panier. Bon appétit !",
    reset:"↺ Réinitialiser", copyList:"📋 Copier la liste", addItem:"Ajouter un article…", addItemBtn:"+ Ajouter",
    feedback:"✏️ Commentaires", sendFeedback:"Envoyer des commentaires",
    favSaved:"favori enregistré", favSavedP:"favoris enregistrés", favRollIn:"— nous les intégrerons là où ils conviennent.",
  },
  de: {
    hero1:"KI-gestützte Mahlzeitenplanung", hero2:"Wisse jeden Abend,", hero2em:"was es zu essen gibt.",
    hero3:"Beschreibe deinen Geschmack, Haushalt und Budget — dein KI-Koch erstellt in Sekunden einen personalisierten Wochenplan mit Rezepten und Einkaufsliste.",
    planThisWeek:"Diese Woche planen", goPremium:"✦ Premium",
    home:"← Start", back:"← Zurück", continue:"Weiter →", planMyWeek:"Meine Woche planen",
    calendar:"← Kalender", autoSaved:"Automatisch gespeichert",
    thisWeek:"Diese Woche", yourWeeks:"Deine Wochen", saved:"Gespeichert", upcoming:"Kommend",
    tapToPlan:"Zum Planen tippen", planAhead:"Vorausplanen · Spontankäufe vermeiden",
    openPlan:"Plan öffnen", planAgain:"Neu planen", open:"Öffnen", list:"Liste", replan:"Neu planen", plan:"Planen",
    confirm:"Bestätigen", cancel:"Abbrechen", weekDeleted:"Woche gelöscht",
    alreadyPlanned:"Bereits geplant — öffnen oder neu planen", notPlanned:"Noch nicht geplant",
    shoppingList:"Einkaufsliste",
    yourPlanReady:"Dein Plan", yourPlanReadyEm:"ist fertig.",
    replanBtn:"↻ Neu planen",
    planHint:"Tippe eine Karte zum Hinzufügen · 📖 Rezept · ☆ Favorit · ↻ Tauschen",
    estimatedCost:"Geschätzte Wochenkosten",
    buildList:"Einkaufsliste erstellen", buildingList:"⏳ Erstelle…", viewList:"Liste anzeigen", selectAll:"Alle auswählen",
    mealsSelected:"Mahlzeit ausgewählt", mealsSelectedP:"Mahlzeiten ausgewählt",
    step1title:"Plane deine Woche.", step1em:"Iss gut.",
    step1q:"Was möchtest du planen?",
    dinnerOnly:"Nur Abendessen", dinnerOnlySub:"Abendmahlzeiten",
    allMeals:"Alle Mahlzeiten", allMealsSub:"Frühstück, Mittagessen & Abendessen",
    custom:"Eigene Auswahl", customSub:"Mahlzeitentypen wählen",
    mealTypes:"Mahlzeitentypen",
    step2title:"An welchen Tagen", step2em:"brauchst du Mahlzeiten?",
    step2hint:"Tippe zum Umschalten. Wir planen nur die ausgewählten Tage.",
    selectDays:"Tage auswählen", all7:"Alle 7", weekdays:"Werktage", weekend:"Wochenende",
    step3title:"Küchen-", step3em:"präferenzen",
    step3hint:"Wähle Küchen. Leer lassen für maximale Vielfalt.",
    selectFavourites:"Wähle deine Favoriten", addCustomCuisine:"Eigene Küche hinzufügen",
    cuisinePlaceholder:"z.B. Georgisch, Peruanisch, Koreanisch…", add:"Hinzufügen",
    step4title:"Ernährungs-", step4em:"anforderungen",
    step4hint:"Gibt es Einschränkungen, die aus dem Plan ausgeschlossen werden sollen?",
    selectAllThat:"Alle zutreffenden auswählen",
    step5title:"Deine kulinarische", step5em:"Persönlichkeit",
    step5hint:"Stelle Abenteuerlevel, Komplexität und Lieblingsgerichte ein.",
    adventureLevel:"Abenteuerlevel", classics:"🏠 Klassiker", surprises:"🌏 Überraschungen",
    safe:"Sicher & vertraut", balanced:"Ausgewogene Mischung", wild:"Wild & abenteuerlich",
    dishComplexity:"Gerichtskomplexität",
    lockFavourites:"Favoriten festlegen (optional)",
    lockFavHint:"Nenne Gerichte, die du liebst — wir sorgen dafür, dass sie im Plan landen.",
    favPlaceholder:"z.B. Chicken Tikka, Borschtsch…",
    step6title:"Wöchentliches", step6em:"Lebensmittelbudget",
    step6hint:"Lege ein Budget fest und wir halten die Mahlzeiten im Rahmen. Optional.",
    enableBudget:"Budgetplanung aktivieren", yes:"Ja", skip:"Überspringen",
    currency:"Währung", weeklyBudget:"Wöchentliches Einkaufsbudget",
    budgetPlaceholder:"z.B. 120", perWeek:"pro Woche", noBudget:"Kein Budget — reine Geschmacksplanung.",
    perMeal:"pro Mahlzeit",
    step7title:"Für wen", step7em:"planst du?",
    step7hint:"Wir passen Zutaten und Portionen für deinen Haushalt an.",
    adults:"👨‍👩‍👧 Erwachsene", kids:"👧 Kinder",
    kidsDiff:"Kinder bekommen andere, kindgerechte Mahlzeiten", kidsDiffSub:"Wir schlagen einfachere Alternativen neben den Erwachsenengerichten vor",
    planningFor:"Planung für", person:"Person", people:"Personen",
    generating:"Deine Woche wird geplant…", generatingSub:"Dauert normalerweise 5–10 Sekunden…",
    ingredients:"Zutaten", howToCook:"Zubereitung", chefsTip:"💡 Küchentipp:",
    fetchingRecipe:"Rezept wird geladen…", prep:"🥄 Vorb.", cook:"🔥 Koch", servings:"Portion", servingsP:"Portionen",
    replaceWith:"Ersetzen", findingAlts:"Alternativen suchen…", noAlts:"Keine Alternativen gefunden.",
    shoppingListTitle:"🛒 Einkaufsliste", done:"erledigt",
    allDone:"🎉 Alles erledigt!", allDoneSub:"Alles im Korb. Guten Appetit!",
    reset:"↺ Zurücksetzen", copyList:"📋 Liste kopieren", addItem:"Artikel hinzufügen…", addItemBtn:"+ Hinzufügen",
    feedback:"✏️ Feedback", sendFeedback:"Feedback senden",
    favSaved:"gespeicherter Favorit", favSavedP:"gespeicherte Favoriten", favRollIn:"— wir fügen sie ein, wo sie passen.",
  },
  pt: {
    hero1:"Planeamento de refeições com IA", hero2:"Sabe o que comer", hero2em:"cada noite.",
    hero3:"Descreve os teus gostos, agregado e orçamento — o teu chef IA cria um plano semanal personalizado com receitas e lista de compras em segundos.",
    planThisWeek:"Planear esta semana", goPremium:"✦ Premium",
    home:"← Início", back:"← Voltar", continue:"Continuar →", planMyWeek:"Planear a minha semana",
    calendar:"← Calendário", autoSaved:"Guardado automaticamente",
    thisWeek:"Esta semana", yourWeeks:"As tuas semanas", saved:"Guardado", upcoming:"Próximo",
    tapToPlan:"Toca para planificar", planAhead:"Planeia antecipadamente · evita compras impulsivas",
    openPlan:"Abrir plano", planAgain:"Planear de novo", open:"Abrir", list:"Lista", replan:"Replanear", plan:"Planear",
    confirm:"Confirmar", cancel:"Cancelar", weekDeleted:"Semana eliminada",
    alreadyPlanned:"Já planeado — abrir ou planear de novo", notPlanned:"Ainda não planeado",
    shoppingList:"Lista de compras",
    yourPlanReady:"O teu plano", yourPlanReadyEm:"está pronto.",
    replanBtn:"↻ Replanear",
    planHint:"Toca num cartão para adicionar · 📖 receita · ☆ favorito · ↻ trocar",
    estimatedCost:"Custo semanal estimado",
    buildList:"Criar lista de compras", buildingList:"⏳ A criar…", viewList:"Ver lista", selectAll:"Selecionar tudo",
    mealsSelected:"refeição selecionada", mealsSelectedP:"refeições selecionadas",
    step1title:"Planeia a tua semana.", step1em:"Come bem.",
    step1q:"O que queres planear?",
    dinnerOnly:"Só jantar", dinnerOnlySub:"Refeições da noite",
    allMeals:"Todas as refeições", allMealsSub:"Pequeno-almoço, almoço e jantar",
    custom:"Personalizar", customSub:"Escolher tipos de refeição",
    mealTypes:"Tipos de refeição",
    step2title:"Que dias", step2em:"precisas de refeições?",
    step2hint:"Toca para alternar. Só planeamos os dias selecionados.",
    selectDays:"Selecionar dias", all7:"Os 7", weekdays:"Dias úteis", weekend:"Fim de semana",
    step3title:"Preferências", step3em:"culinárias",
    step3hint:"Escolhe cozinhas. Deixa em branco para máxima variedade.",
    selectFavourites:"Seleciona as tuas favoritas", addCustomCuisine:"Adicionar cozinha personalizada",
    cuisinePlaceholder:"ex. Georgiana, Peruana, Coreana…", add:"Adicionar",
    step4title:"Requisitos", step4em:"alimentares",
    step4hint:"Há restrições a excluir do plano?",
    selectAllThat:"Seleciona todas as que se aplicam",
    step5title:"A tua personalidade", step5em:"culinária",
    step5hint:"Define o teu nível de aventura, complexidade e pratos favoritos.",
    adventureLevel:"Nível de aventura", classics:"🏠 Clássicos", surprises:"🌏 Surpresas",
    safe:"Seguro e familiar", balanced:"Mistura equilibrada", wild:"Selvagem e aventureiro",
    dishComplexity:"Complexidade do prato",
    lockFavourites:"Fixar favoritos (opcional)",
    lockFavHint:"Nomeia os pratos que adoras — garantimos que entram no plano.",
    favPlaceholder:"ex. Frango tikka, borscht…",
    step6title:"Orçamento", step6em:"semanal de alimentação",
    step6hint:"Define um orçamento e manteremos as refeições dentro do limite. Opcional.",
    enableBudget:"Ativar planeamento de orçamento", yes:"Sim", skip:"Ignorar",
    currency:"Moeda", weeklyBudget:"Orçamento semanal de compras",
    budgetPlaceholder:"ex. 120", perWeek:"por semana", noBudget:"Sem orçamento — planeamento só por sabor.",
    perMeal:"por refeição",
    step7title:"Para quem", step7em:"estás a planear?",
    step7hint:"Adaptaremos os ingredientes e porções para o teu agregado.",
    adults:"👨‍👩‍👧 Adultos", kids:"👧 Crianças",
    kidsDiff:"As crianças recebem refeições diferentes e adaptadas", kidsDiffSub:"Sugeriremos alternativas mais simples a par das refeições de adultos",
    planningFor:"A planear para", person:"pessoa", people:"pessoas",
    generating:"A planear a tua semana…", generatingSub:"Demora normalmente 5 a 10 segundos…",
    ingredients:"Ingredientes", howToCook:"Como cozinhar", chefsTip:"💡 Dica do chef:",
    fetchingRecipe:"A carregar receita…", prep:"🥄 Prep", cook:"🔥 Cozedura", servings:"porção", servingsP:"porções",
    replaceWith:"Substituir", findingAlts:"A encontrar alternativas…", noAlts:"Nenhuma alternativa encontrada.",
    shoppingListTitle:"🛒 Lista de compras", done:"feito",
    allDone:"🎉 Tudo pronto!", allDoneSub:"Tudo no cesto. Bom apetite!",
    reset:"↺ Repor", copyList:"📋 Copiar lista", addItem:"Adicionar um artigo…", addItemBtn:"+ Adicionar",
    feedback:"✏️ Comentários", sendFeedback:"Enviar comentários",
    favSaved:"favorito guardado", favSavedP:"favoritos guardados", favRollIn:"— incluímo-los onde se encaixam.",
  },
  it: {
    hero1:"Pianificazione pasti con IA", hero2:"Sai sempre cosa mangiare", hero2em:"ogni sera.",
    hero3:"Descrivi i tuoi gusti, il nucleo familiare e il budget — il tuo chef IA crea in secondi un piano settimanale personalizzato con ricette e lista della spesa.",
    planThisWeek:"Pianifica questa settimana", goPremium:"✦ Premium",
    home:"← Home", back:"← Indietro", continue:"Continua →", planMyWeek:"Pianifica la mia settimana",
    calendar:"← Calendario", autoSaved:"Salvato automaticamente",
    thisWeek:"Questa settimana", yourWeeks:"Le tue settimane", saved:"Salvato", upcoming:"Prossimo",
    tapToPlan:"Tocca per pianificare", planAhead:"Pianifica in anticipo · evita acquisti impulsivi",
    openPlan:"Apri piano", planAgain:"Ripianifica", open:"Apri", list:"Lista", replan:"Ripianifica", plan:"Pianifica",
    confirm:"Conferma", cancel:"Annulla", weekDeleted:"Settimana eliminata",
    alreadyPlanned:"Già pianificato — apri o ripianifica", notPlanned:"Non ancora pianificato",
    shoppingList:"Lista della spesa",
    yourPlanReady:"Il tuo piano", yourPlanReadyEm:"è pronto.",
    replanBtn:"↻ Ripianifica",
    planHint:"Tocca una carta per aggiungere · 📖 ricetta · ☆ preferito · ↻ cambia",
    estimatedCost:"Costo settimanale stimato",
    buildList:"Crea lista della spesa", buildingList:"⏳ Creazione…", viewList:"Vedi lista", selectAll:"Seleziona tutto",
    mealsSelected:"pasto selezionato", mealsSelectedP:"pasti selezionati",
    step1title:"Pianifica la tua settimana.", step1em:"Mangia bene.",
    step1q:"Cosa vuoi pianificare?",
    dinnerOnly:"Solo cena", dinnerOnlySub:"Pasti serali",
    allMeals:"Tutti i pasti", allMealsSub:"Colazione, pranzo e cena",
    custom:"Personalizzato", customSub:"Scegli i tipi di pasto",
    mealTypes:"Tipi di pasto",
    step2title:"Quali giorni", step2em:"hai bisogno di pasti?",
    step2hint:"Tocca per attivare/disattivare. Pianificheremo solo i giorni selezionati.",
    selectDays:"Seleziona giorni", all7:"Tutti e 7", weekdays:"Giorni feriali", weekend:"Fine settimana",
    step3title:"Preferenze", step3em:"culinarie",
    step3hint:"Scegli le cucine. Lascia vuoto per la massima varietà.",
    selectFavourites:"Seleziona le tue preferite", addCustomCuisine:"Aggiungi una cucina personalizzata",
    cuisinePlaceholder:"es. Georgiana, Peruviana, Coreana…", add:"Aggiungi",
    step4title:"Requisiti", step4em:"alimentari",
    step4hint:"Ci sono restrizioni da escludere dal piano?",
    selectAllThat:"Seleziona tutto ciò che si applica",
    step5title:"La tua personalità", step5em:"culinaria",
    step5hint:"Imposta il livello di avventura, complessità e piatti preferiti.",
    adventureLevel:"Livello di avventura", classics:"🏠 Classici", surprises:"🌏 Sorprese",
    safe:"Sicuro e familiare", balanced:"Mix equilibrato", wild:"Selvaggio e avventuroso",
    dishComplexity:"Complessità del piatto",
    lockFavourites:"Fissa i preferiti (opzionale)",
    lockFavHint:"Nomina i piatti che ami — ci assicuriamo che siano nel piano.",
    favPlaceholder:"es. Pollo tikka, borscht…",
    step6title:"Budget", step6em:"alimentare settimanale",
    step6hint:"Imposta un budget e manterremo i pasti nel limite. Opzionale.",
    enableBudget:"Attiva pianificazione budget", yes:"Sì", skip:"Salta",
    currency:"Valuta", weeklyBudget:"Budget spesa settimanale",
    budgetPlaceholder:"es. 120", perWeek:"a settimana", noBudget:"Senza budget — pianificazione solo per gusto.",
    perMeal:"per pasto",
    step7title:"Per chi", step7em:"stai pianificando?",
    step7hint:"Adatteremo gli ingredienti e le porzioni al tuo nucleo familiare.",
    adults:"👨‍👩‍👧 Adulti", kids:"👧 Bambini",
    kidsDiff:"I bambini ricevono pasti diversi e adatti a loro", kidsDiffSub:"Suggeriremo alternative più semplici accanto ai pasti degli adulti",
    planningFor:"Pianificazione per", person:"persona", people:"persone",
    generating:"Pianificazione della tua settimana…", generatingSub:"Di solito richiede 5–10 secondi…",
    ingredients:"Ingredienti", howToCook:"Come cucinare", chefsTip:"💡 Consiglio dello chef:",
    fetchingRecipe:"Caricamento ricetta…", prep:"🥄 Prep", cook:"🔥 Cottura", servings:"porzione", servingsP:"porzioni",
    replaceWith:"Sostituisci", findingAlts:"Ricerca alternative…", noAlts:"Nessuna alternativa trovata.",
    shoppingListTitle:"🛒 Lista della spesa", done:"fatto",
    allDone:"🎉 Tutto fatto!", allDoneSub:"Tutto nel carrello. Buon appetito!",
    reset:"↺ Reimposta", copyList:"📋 Copia lista", addItem:"Aggiungi un articolo…", addItemBtn:"+ Aggiungi",
    feedback:"✏️ Feedback", sendFeedback:"Invia feedback",
    favSaved:"preferito salvato", favSavedP:"preferiti salvati", favRollIn:"— li includeremo dove si adattano.",
  },
  nl: {
    hero1:"AI-gestuurde maaltijdplanning", hero2:"Weet elke avond", hero2em:"wat je eet.",
    hero3:"Beschrijf jouw smaak, huishouden en budget — jouw AI-kok maakt in seconden een gepersonaliseerd weekplan met recepten en boodschappenlijst.",
    planThisWeek:"Deze week plannen", goPremium:"✦ Premium",
    home:"← Home", back:"← Terug", continue:"Doorgaan →", planMyWeek:"Mijn week plannen",
    calendar:"← Kalender", autoSaved:"Automatisch opgeslagen",
    thisWeek:"Deze week", yourWeeks:"Jouw weken", saved:"Opgeslagen", upcoming:"Aankomend",
    tapToPlan:"Tik om te plannen", planAhead:"Plan vooruit · vermijd impulsaankopen",
    openPlan:"Plan openen", planAgain:"Opnieuw plannen", open:"Openen", list:"Lijst", replan:"Opnieuw plannen", plan:"Plannen",
    confirm:"Bevestigen", cancel:"Annuleren", weekDeleted:"Week verwijderd",
    alreadyPlanned:"Al gepland — openen of opnieuw plannen", notPlanned:"Nog niet gepland",
    shoppingList:"Boodschappenlijst",
    yourPlanReady:"Jouw plan", yourPlanReadyEm:"is klaar.",
    replanBtn:"↻ Opnieuw plannen",
    planHint:"Tik een kaart om toe te voegen · 📖 recept · ☆ favoriet · ↻ wisselen",
    estimatedCost:"Geschatte weekkosten",
    buildList:"Boodschappenlijst maken", buildingList:"⏳ Aanmaken…", viewList:"Lijst bekijken", selectAll:"Alles selecteren",
    mealsSelected:"maaltijd geselecteerd", mealsSelectedP:"maaltijden geselecteerd",
    step1title:"Plan je week.", step1em:"Eet goed.",
    step1q:"Wat wil je plannen?",
    dinnerOnly:"Alleen diner", dinnerOnlySub:"Avondmaaltijden",
    allMeals:"Alle maaltijden", allMealsSub:"Ontbijt, lunch & diner",
    custom:"Aangepast", customSub:"Kies maaltijdtypen",
    mealTypes:"Maaltijdtypen",
    step2title:"Welke dagen", step2em:"heb je maaltijden nodig?",
    step2hint:"Tik om te wisselen. We plannen alleen de geselecteerde dagen.",
    selectDays:"Dagen selecteren", all7:"Alle 7", weekdays:"Weekdagen", weekend:"Weekend",
    step3title:"Keuken-", step3em:"voorkeuren",
    step3hint:"Kies keukens. Leeg laten voor maximale variatie.",
    selectFavourites:"Selecteer jouw favorieten", addCustomCuisine:"Eigen keuken toevoegen",
    cuisinePlaceholder:"bijv. Georgisch, Peruaans, Koreaans…", add:"Toevoegen",
    step4title:"Dieet-", step4em:"vereisten",
    step4hint:"Zijn er beperkingen die uit het plan moeten worden gehouden?",
    selectAllThat:"Selecteer alles wat van toepassing is",
    step5title:"Jouw culinaire", step5em:"persoonlijkheid",
    step5hint:"Stel je avontuursniveau, complexiteit en favoriete gerechten in.",
    adventureLevel:"Avontuursniveau", classics:"🏠 Klassiekers", surprises:"🌏 Verrassingen",
    safe:"Veilig & vertrouwd", balanced:"Uitgebalanceerde mix", wild:"Wild & avontuurlijk",
    dishComplexity:"Gerechtkomplexiteit",
    lockFavourites:"Favorieten vastzetten (optioneel)",
    lockFavHint:"Noem gerechten die je lekker vindt — we zorgen dat ze in het plan zitten.",
    favPlaceholder:"bijv. Kip tikka, borscht…",
    step6title:"Wekelijks", step6em:"voedselbudget",
    step6hint:"Stel een budget in en we houden maaltijden binnen het bereik. Optioneel.",
    enableBudget:"Budgetplanning inschakelen", yes:"Ja", skip:"Overslaan",
    currency:"Valuta", weeklyBudget:"Wekelijks boodschappenbudget",
    budgetPlaceholder:"bijv. 120", perWeek:"per week", noBudget:"Geen budget — puur op smaak plannen.",
    perMeal:"per maaltijd",
    step7title:"Voor wie", step7em:"plan je?",
    step7hint:"We passen ingrediënten en porties aan voor jouw huishouden.",
    adults:"👨‍👩‍👧 Volwassenen", kids:"👧 Kinderen",
    kidsDiff:"Kinderen krijgen andere, kindvriendelijke maaltijden", kidsDiffSub:"We stellen eenvoudigere alternatieven voor naast de volwassen maaltijden",
    planningFor:"Plannen voor", person:"persoon", people:"personen",
    generating:"Jouw week wordt gepland…", generatingSub:"Duurt meestal 5–10 seconden…",
    ingredients:"Ingrediënten", howToCook:"Hoe te koken", chefsTip:"💡 Kookadvies:",
    fetchingRecipe:"Recept laden…", prep:"🥄 Voorbereiding", cook:"🔥 Koken", servings:"portie", servingsP:"porties",
    replaceWith:"Vervangen", findingAlts:"Alternatieven zoeken…", noAlts:"Geen alternatieven gevonden.",
    shoppingListTitle:"🛒 Boodschappenlijst", done:"klaar",
    allDone:"🎉 Alles klaar!", allDoneSub:"Alles in het mandje. Eet smakelijk!",
    reset:"↺ Opnieuw instellen", copyList:"📋 Lijst kopiëren", addItem:"Item toevoegen…", addItemBtn:"+ Toevoegen",
    feedback:"✏️ Feedback", sendFeedback:"Feedback sturen",
    favSaved:"opgeslagen favoriet", favSavedP:"opgeslagen favorieten", favRollIn:"— we voegen ze toe waar ze passen.",
  },
  tr: {
    hero1:"Yapay Zeka Destekli Yemek Planlaması", hero2:"Her akşam ne yiyeceğinizi", hero2em:"bilin.",
    hero3:"Zevklerinizi, hanenizi ve bütçenizi tarif edin — yapay zeka şefiniz saniyeler içinde kişisel haftalık plan, tarifler ve alışveriş listesi oluşturur.",
    planThisWeek:"Bu haftayı planla", goPremium:"✦ Premium",
    home:"← Ana Sayfa", back:"← Geri", continue:"Devam →", planMyWeek:"Haftamı planla",
    calendar:"← Takvim", autoSaved:"Otomatik kaydedildi",
    thisWeek:"Bu hafta", yourWeeks:"Haftalarınız", saved:"Kaydedildi", upcoming:"Yaklaşan",
    tapToPlan:"Planlamak için dokun", planAhead:"Önceden planla · anlık alımlardan kaçın",
    openPlan:"Planı aç", planAgain:"Yeniden planla", open:"Aç", list:"Liste", replan:"Yeniden planla", plan:"Planla",
    confirm:"Onayla", cancel:"İptal", weekDeleted:"Hafta silindi",
    alreadyPlanned:"Zaten planlandı — aç veya yeniden planla", notPlanned:"Henüz planlanmadı",
    shoppingList:"Alışveriş listesi",
    yourPlanReady:"Planınız", yourPlanReadyEm:"hazır.",
    replanBtn:"↻ Yeniden planla",
    planHint:"Eklemek için karta dokun · 📖 tarif · ☆ favori · ↻ değiştir",
    estimatedCost:"Tahmini haftalık maliyet",
    buildList:"Alışveriş listesi oluştur", buildingList:"⏳ Oluşturuluyor…", viewList:"Listeyi görüntüle", selectAll:"Tümünü seç",
    mealsSelected:"öğün seçildi", mealsSelectedP:"öğün seçildi",
    step1title:"Haftanızı planlayın.", step1em:"İyi beslenin.",
    step1q:"Ne planlamak istiyorsunuz?",
    dinnerOnly:"Sadece akşam yemeği", dinnerOnlySub:"Akşam öğünleri",
    allMeals:"Tüm öğünler", allMealsSub:"Kahvaltı, öğle ve akşam yemeği",
    custom:"Özel", customSub:"Öğün türlerini seçin",
    mealTypes:"Öğün türleri",
    step2title:"Hangi günler", step2em:"öğün ihtiyacınız var?",
    step2hint:"Değiştirmek için dokunun. Yalnızca seçili günleri planlıyoruz.",
    selectDays:"Günleri seç", all7:"Tüm 7", weekdays:"Hafta içi", weekend:"Hafta sonu",
    step3title:"Mutfak", step3em:"tercihleri",
    step3hint:"Mutfakları seçin. En fazla çeşitlilik için boş bırakın.",
    selectFavourites:"Favorilerinizi seçin", addCustomCuisine:"Özel mutfak ekle",
    cuisinePlaceholder:"örn. Gürcü, Peru, Kore…", add:"Ekle",
    step4title:"Diyet", step4em:"gereksinimleri",
    step4hint:"Plandan çıkarılması gereken kısıtlamalar var mı?",
    selectAllThat:"Geçerli olanları seçin",
    step5title:"Mutfak", step5em:"kişiliğiniz",
    step5hint:"Macera seviyenizi, karmaşıklığı ve favori yemeklerinizi belirleyin.",
    adventureLevel:"Macera seviyesi", classics:"🏠 Klasikler", surprises:"🌏 Sürprizler",
    safe:"Güvenli ve tanıdık", balanced:"Dengeli karışım", wild:"Vahşi ve maceralı",
    dishComplexity:"Yemek karmaşıklığı",
    lockFavourites:"Favorileri kilitle (isteğe bağlı)",
    lockFavHint:"Sevdiğiniz yemekleri yazın — plana dahil ettiğimizden emin olacağız.",
    favPlaceholder:"örn. Tavuk tikka, borç…",
    step6title:"Haftalık", step6em:"gıda bütçesi",
    step6hint:"Bir bütçe belirleyin ve öğünleri bu aralıkta tutacağız. İsteğe bağlı.",
    enableBudget:"Bütçe planlamayı etkinleştir", yes:"Evet", skip:"Atla",
    currency:"Para birimi", weeklyBudget:"Haftalık alışveriş bütçesi",
    budgetPlaceholder:"örn. 120", perWeek:"haftada", noBudget:"Bütçe yok — sadece lezzete göre planlama.",
    perMeal:"öğün başına",
    step7title:"Kim için", step7em:"planlıyorsunuz?",
    step7hint:"Malzemeleri ve porsiyonları hanenize göre ayarlayacağız.",
    adults:"👨‍👩‍👧 Yetişkinler", kids:"👧 Çocuklar",
    kidsDiff:"Çocuklar farklı, çocuk dostu yemekler alır", kidsDiffSub:"Yetişkin yemeklerinin yanında daha basit alternatifler önereceğiz",
    planningFor:"Planlanan kişi sayısı:", person:"kişi", people:"kişi",
    generating:"Haftanız planlanıyor…", generatingSub:"Genellikle 5–10 saniye sürer…",
    ingredients:"Malzemeler", howToCook:"Nasıl pişirilir", chefsTip:"💡 Şef ipucu:",
    fetchingRecipe:"Tarif yükleniyor…", prep:"🥄 Hazırlık", cook:"🔥 Pişirme", servings:"porsiyon", servingsP:"porsiyon",
    replaceWith:"Değiştir", findingAlts:"Alternatifler aranıyor…", noAlts:"Alternatif bulunamadı.",
    shoppingListTitle:"🛒 Alışveriş listesi", done:"tamamlandı",
    allDone:"🎉 Her şey tamam!", allDoneSub:"Her şey sepette. Afiyet olsun!",
    reset:"↺ Sıfırla", copyList:"📋 Listeyi kopyala", addItem:"Ürün ekle…", addItemBtn:"+ Ekle",
    feedback:"✏️ Geri bildirim", sendFeedback:"Geri bildirim gönder",
    favSaved:"kayıtlı favori", favSavedP:"kayıtlı favori", favRollIn:"— uygun oldukları yere ekleyeceğiz.",
  },
  zh: {
    hero1:"AI智能餐饮计划", hero2:"每晚都知道", hero2em:"吃什么。",
    hero3:"描述您的口味、家庭和预算 — 您的AI厨师将在几秒内生成个性化的周计划、食谱和购物清单。",
    planThisWeek:"规划本周", goPremium:"✦ 升级会员",
    home:"← 主页", back:"← 返回", continue:"继续 →", planMyWeek:"规划我的一周",
    calendar:"← 日历", autoSaved:"已自动保存",
    thisWeek:"本周", yourWeeks:"您的各周", saved:"已保存", upcoming:"即将到来",
    tapToPlan:"点击规划", planAhead:"提前规划 · 避免冲动消费",
    openPlan:"打开计划", planAgain:"重新规划", open:"打开", list:"清单", replan:"重新规划", plan:"规划",
    confirm:"确认", cancel:"取消", weekDeleted:"已删除该周",
    alreadyPlanned:"已规划 — 打开或重新规划", notPlanned:"尚未规划",
    shoppingList:"购物清单",
    yourPlanReady:"您的计划", yourPlanReadyEm:"已就绪。",
    replanBtn:"↻ 重新规划",
    planHint:"点击卡片添加 · 📖 食谱 · ☆ 收藏 · ↻ 更换",
    estimatedCost:"预计每周费用",
    buildList:"生成购物清单", buildingList:"⏳ 生成中…", viewList:"查看清单", selectAll:"全选",
    mealsSelected:"道餐食已选", mealsSelectedP:"道餐食已选",
    step1title:"规划您的一周。", step1em:"健康饮食。",
    step1q:"您想规划什么？",
    dinnerOnly:"仅晚餐", dinnerOnlySub:"晚间餐食",
    allMeals:"全部餐食", allMealsSub:"早餐、午餐和晚餐",
    custom:"自定义", customSub:"选择餐食类型",
    mealTypes:"餐食类型",
    step2title:"哪几天", step2em:"需要规划餐食？",
    step2hint:"点击切换。我们只规划您选择的天数。",
    selectDays:"选择天数", all7:"全部7天", weekdays:"工作日", weekend:"周末",
    step3title:"饮食", step3em:"偏好",
    step3hint:"选择菜系。留空以获得最大多样性。",
    selectFavourites:"选择您的偏好", addCustomCuisine:"添加自定义菜系",
    cuisinePlaceholder:"例如 格鲁吉亚、秘鲁、韩国…", add:"添加",
    step4title:"饮食", step4em:"要求",
    step4hint:"有需要从计划中排除的饮食限制吗？",
    selectAllThat:"选择所有适用项",
    step5title:"您的烹饪", step5em:"风格",
    step5hint:"设置您的探索水平、复杂程度和必备餐食。",
    adventureLevel:"探索水平", classics:"🏠 经典", surprises:"🌏 惊喜",
    safe:"安全熟悉", balanced:"均衡搭配", wild:"大胆冒险",
    dishComplexity:"菜肴复杂度",
    lockFavourites:"锁定收藏（可选）",
    lockFavHint:"写下您喜欢的菜肴 — 我们会确保它们出现在计划中。",
    favPlaceholder:"例如 鸡肉提卡、罗宋汤…",
    step6title:"每周", step6em:"食物预算",
    step6hint:"设置购物预算，我们将把餐食控制在范围内。可选。",
    enableBudget:"启用预算规划", yes:"是", skip:"跳过",
    currency:"货币", weeklyBudget:"每周购物预算",
    budgetPlaceholder:"例如 120", perWeek:"每周", noBudget:"无预算 — 纯按口味规划。",
    perMeal:"每餐",
    step7title:"为谁", step7em:"规划？",
    step7hint:"我们将根据您的家庭情况调整食材和份量。",
    adults:"👨‍👩‍👧 成人", kids:"👧 儿童",
    kidsDiff:"儿童享有不同的儿童友好餐食", kidsDiffSub:"我们将在成人餐旁提供更简单的替代选项",
    planningFor:"规划对象：", person:"人", people:"人",
    generating:"正在规划您的一周…", generatingSub:"通常需要5–10秒…",
    ingredients:"食材", howToCook:"烹饪方法", chefsTip:"💡 厨师建议：",
    fetchingRecipe:"正在加载食谱…", prep:"🥄 准备", cook:"🔥 烹饪", servings:"份", servingsP:"份",
    replaceWith:"替换", findingAlts:"正在寻找替代方案…", noAlts:"未找到替代方案。",
    shoppingListTitle:"🛒 购物清单", done:"完成",
    allDone:"🎉 全部完成！", allDoneSub:"所有商品已放入购物车。用餐愉快！",
    reset:"↺ 重置", copyList:"📋 复制清单", addItem:"添加商品…", addItemBtn:"+ 添加",
    feedback:"✏️ 反馈", sendFeedback:"发送反馈",
    favSaved:"个已收藏", favSavedP:"个已收藏", favRollIn:"— 我们会在合适的地方加入它们。",
  },
  ar: {
    hero1:"تخطيط الوجبات بالذكاء الاصطناعي", hero2:"اعرف ما ستتناوله", hero2em:"كل مساء.",
    hero3:"صف أذواقك وأسرتك وميزانيتك — سيقوم طاهيك الذكي بإنشاء خطة أسبوعية مخصصة مع وصفات وقائمة تسوق في ثوانٍ.",
    planThisWeek:"خطط لهذا الأسبوع", goPremium:"✦ الباقة المميزة",
    home:"الرئيسية ←", back:"رجوع ←", continue:"→ متابعة", planMyWeek:"خطط لأسبوعي",
    calendar:"التقويم ←", autoSaved:"حُفظ تلقائيًا",
    thisWeek:"هذا الأسبوع", yourWeeks:"أسابيعك", saved:"محفوظ", upcoming:"القادم",
    tapToPlan:"انقر للتخطيط", planAhead:"خطط مسبقًا · تجنب الشراء العشوائي",
    openPlan:"فتح الخطة", planAgain:"التخطيط مجددًا", open:"فتح", list:"القائمة", replan:"إعادة التخطيط", plan:"تخطيط",
    confirm:"تأكيد", cancel:"إلغاء", weekDeleted:"تم حذف الأسبوع",
    alreadyPlanned:"تم التخطيط — فتح أو إعادة التخطيط", notPlanned:"لم يتم التخطيط بعد",
    shoppingList:"قائمة التسوق",
    yourPlanReady:"خطتك", yourPlanReadyEm:"جاهزة.",
    replanBtn:"↻ إعادة التخطيط",
    planHint:"انقر على بطاقة للإضافة · 📖 وصفة · ☆ مفضلة · ↻ تبديل",
    estimatedCost:"التكلفة الأسبوعية التقديرية",
    buildList:"إنشاء قائمة التسوق", buildingList:"⏳ جارٍ الإنشاء…", viewList:"عرض القائمة", selectAll:"تحديد الكل",
    mealsSelected:"وجبة محددة", mealsSelectedP:"وجبات محددة",
    step1title:"خطط لأسبوعك.", step1em:"كل جيدًا.",
    step1q:"ماذا تريد أن تخطط؟",
    dinnerOnly:"العشاء فقط", dinnerOnlySub:"وجبات المساء",
    allMeals:"جميع الوجبات", allMealsSub:"الإفطار والغداء والعشاء",
    custom:"مخصص", customSub:"اختر أنواع الوجبات",
    mealTypes:"أنواع الوجبات",
    step2title:"أي أيام", step2em:"تحتاج فيها وجبات؟",
    step2hint:"انقر للتبديل. سنخطط فقط للأيام التي تختارها.",
    selectDays:"اختر الأيام", all7:"جميع الـ 7", weekdays:"أيام الأسبوع", weekend:"عطلة نهاية الأسبوع",
    step3title:"تفضيلات", step3em:"المطبخ",
    step3hint:"اختر أنواع المطابخ. اتركه فارغًا لأقصى تنوع.",
    selectFavourites:"اختر المفضلة لديك", addCustomCuisine:"إضافة مطبخ مخصص",
    cuisinePlaceholder:"مثل: جورجي، بيروفي، كوري…", add:"إضافة",
    step4title:"المتطلبات", step4em:"الغذائية",
    step4hint:"هل هناك قيود يجب استبعادها من الخطة؟",
    selectAllThat:"حدد كل ما ينطبق",
    step5title:"شخصيتك", step5em:"الطهوية",
    step5hint:"حدد مستوى المغامرة والتعقيد والأطباق المفضلة.",
    adventureLevel:"مستوى المغامرة", classics:"🏠 الكلاسيكي", surprises:"🌏 المفاجآت",
    safe:"آمن ومألوف", balanced:"مزيج متوازن", wild:"جريء ومغامر",
    dishComplexity:"تعقيد الطبق",
    lockFavourites:"تثبيت المفضلة (اختياري)",
    lockFavHint:"اكتب الأطباق التي تحبها — سنحرص على إدراجها في الخطة.",
    favPlaceholder:"مثل: دجاج تيكا، شوربة البرشت…",
    step6title:"الميزانية", step6em:"الغذائية الأسبوعية",
    step6hint:"حدد ميزانية وسنبقي الوجبات ضمن الحدود. اختياري.",
    enableBudget:"تفعيل تخطيط الميزانية", yes:"نعم", skip:"تخطي",
    currency:"العملة", weeklyBudget:"ميزانية التسوق الأسبوعية",
    budgetPlaceholder:"مثل: 120", perWeek:"في الأسبوع", noBudget:"بدون ميزانية — تخطيط بناءً على الذوق فقط.",
    perMeal:"لكل وجبة",
    step7title:"لمن", step7em:"تخطط؟",
    step7hint:"سنضبط المكونات والحصص لمنزلك.",
    adults:"👨‍👩‍👧 البالغون", kids:"👧 الأطفال",
    kidsDiff:"يحصل الأطفال على وجبات مختلفة مناسبة لهم", kidsDiffSub:"سنقترح بدائل أبسط بجانب وجبات البالغين",
    planningFor:"التخطيط لـ", person:"شخص", people:"أشخاص",
    generating:"جارٍ التخطيط لأسبوعك…", generatingSub:"يستغرق عادةً 5–10 ثوانٍ…",
    ingredients:"المكونات", howToCook:"طريقة الطهي", chefsTip:"💡 نصيحة الشيف:",
    fetchingRecipe:"جارٍ تحميل الوصفة…", prep:"🥄 التحضير", cook:"🔥 الطهي", servings:"حصة", servingsP:"حصص",
    replaceWith:"استبدال", findingAlts:"البحث عن بدائل…", noAlts:"لم يتم العثور على بدائل.",
    shoppingListTitle:"🛒 قائمة التسوق", done:"تم",
    allDone:"🎉 تم الكل!", allDoneSub:"كل شيء في سلة التسوق. بالهناء والشفاء!",
    reset:"↺ إعادة تعيين", copyList:"📋 نسخ القائمة", addItem:"إضافة عنصر…", addItemBtn:"+ إضافة",
    feedback:"✏️ ملاحظات", sendFeedback:"إرسال ملاحظات",
    favSaved:"مفضلة محفوظة", favSavedP:"مفضلات محفوظة", favRollIn:"— سندرجها حيث تناسب.",
  },
  hi: {
    hero1:"AI-संचालित भोजन योजना", hero2:"हर शाम जानें", hero2em:"क्या खाना है।",
    hero3:"अपनी पसंद, परिवार और बजट बताएं — आपका AI शेफ सेकंड में व्यक्तिगत साप्ताहिक योजना, रेसिपी और खरीदारी सूची तैयार करेगा।",
    planThisWeek:"इस सप्ताह की योजना बनाएं", goPremium:"✦ प्रीमियम",
    home:"← होम", back:"← वापस", continue:"जारी रखें →", planMyWeek:"मेरे सप्ताह की योजना बनाएं",
    calendar:"← कैलेंडर", autoSaved:"स्वतः सहेजा गया",
    thisWeek:"इस सप्ताह", yourWeeks:"आपके सप्ताह", saved:"सहेजा गया", upcoming:"आगामी",
    tapToPlan:"योजना बनाने के लिए टैप करें", planAhead:"पहले से योजना बनाएं · आवेगी खरीदारी से बचें",
    openPlan:"योजना खोलें", planAgain:"पुनः योजना बनाएं", open:"खोलें", list:"सूची", replan:"पुनः योजना", plan:"योजना",
    confirm:"पुष्टि करें", cancel:"रद्द करें", weekDeleted:"सप्ताह हटाया गया",
    alreadyPlanned:"पहले से योजना बनी है — खोलें या दोबारा बनाएं", notPlanned:"अभी तक योजना नहीं बनी",
    shoppingList:"खरीदारी सूची",
    yourPlanReady:"आपकी योजना", yourPlanReadyEm:"तैयार है।",
    replanBtn:"↻ पुनः योजना बनाएं",
    planHint:"जोड़ने के लिए कार्ड टैप करें · 📖 रेसिपी · ☆ पसंदीदा · ↻ बदलें",
    estimatedCost:"अनुमानित साप्ताहिक लागत",
    buildList:"खरीदारी सूची बनाएं", buildingList:"⏳ बन रही है…", viewList:"सूची देखें", selectAll:"सभी चुनें",
    mealsSelected:"भोजन चुना गया", mealsSelectedP:"भोजन चुने गए",
    step1title:"अपना सप्ताह योजना बनाएं।", step1em:"अच्छा खाएं।",
    step1q:"आप क्या योजना बनाना चाहते हैं?",
    dinnerOnly:"केवल रात का खाना", dinnerOnlySub:"शाम के भोजन",
    allMeals:"सभी भोजन", allMealsSub:"नाश्ता, दोपहर और रात का खाना",
    custom:"कस्टम", customSub:"भोजन के प्रकार चुनें",
    mealTypes:"भोजन के प्रकार",
    step2title:"किन दिनों", step2em:"को भोजन चाहिए?",
    step2hint:"बदलने के लिए टैप करें। हम केवल चुने गए दिनों की योजना बनाएंगे।",
    selectDays:"दिन चुनें", all7:"सभी 7", weekdays:"कार्यदिवस", weekend:"सप्ताहांत",
    step3title:"व्यंजन", step3em:"प्राथमिकताएं",
    step3hint:"व्यंजन चुनें। अधिकतम विविधता के लिए खाली छोड़ें।",
    selectFavourites:"अपने पसंदीदा चुनें", addCustomCuisine:"कस्टम व्यंजन जोड़ें",
    cuisinePlaceholder:"जैसे जॉर्जियाई, पेरूवियन, कोरियाई…", add:"जोड़ें",
    step4title:"आहार", step4em:"आवश्यकताएं",
    step4hint:"कोई प्रतिबंध जो योजना से बाहर रखना है?",
    selectAllThat:"सभी लागू विकल्प चुनें",
    step5title:"आपकी पाक", step5em:"व्यक्तित्व",
    step5hint:"अपना साहस स्तर, जटिलता और पसंदीदा व्यंजन निर्धारित करें।",
    adventureLevel:"साहस स्तर", classics:"🏠 क्लासिक", surprises:"🌏 सरप्राइज़",
    safe:"सुरक्षित और परिचित", balanced:"संतुलित मिश्रण", wild:"साहसी और रोमांचक",
    dishComplexity:"व्यंजन जटिलता",
    lockFavourites:"पसंदीदा लॉक करें (वैकल्पिक)",
    lockFavHint:"वे व्यंजन लिखें जो आपको पसंद हैं — हम उन्हें योजना में शामिल करेंगे।",
    favPlaceholder:"जैसे चिकन टिक्का, बोर्श…",
    step6title:"साप्ताहिक", step6em:"खाद्य बजट",
    step6hint:"बजट निर्धारित करें और हम भोजन उस सीमा में रखेंगे। वैकल्पिक।",
    enableBudget:"बजट योजना सक्षम करें", yes:"हां", skip:"छोड़ें",
    currency:"मुद्रा", weeklyBudget:"साप्ताहिक खरीदारी बजट",
    budgetPlaceholder:"जैसे 120", perWeek:"प्रति सप्ताह", noBudget:"कोई बजट नहीं — केवल स्वाद के अनुसार योजना।",
    perMeal:"प्रति भोजन",
    step7title:"किसके लिए", step7em:"योजना बना रहे हैं?",
    step7hint:"हम आपके परिवार के लिए सामग्री और मात्रा समायोजित करेंगे।",
    adults:"👨‍👩‍👧 वयस्क", kids:"👧 बच्चे",
    kidsDiff:"बच्चों को अलग, बच्चों के अनुकूल भोजन मिलता है", kidsDiffSub:"हम वयस्क भोजन के साथ सरल विकल्प सुझाएंगे",
    planningFor:"के लिए योजना", person:"व्यक्ति", people:"लोग",
    generating:"आपके सप्ताह की योजना बन रही है…", generatingSub:"आमतौर पर 5–10 सेकंड लगते हैं…",
    ingredients:"सामग्री", howToCook:"कैसे पकाएं", chefsTip:"💡 शेफ की सलाह:",
    fetchingRecipe:"रेसिपी लोड हो रही है…", prep:"🥄 तैयारी", cook:"🔥 पकाना", servings:"सर्विंग", servingsP:"सर्विंग",
    replaceWith:"बदलें", findingAlts:"विकल्प खोज रहे हैं…", noAlts:"कोई विकल्प नहीं मिला।",
    shoppingListTitle:"🛒 खरीदारी सूची", done:"पूर्ण",
    allDone:"🎉 सब हो गया!", allDoneSub:"सब कुछ टोकरी में है। खाना अच्छा लगे!",
    reset:"↺ रीसेट", copyList:"📋 सूची कॉपी करें", addItem:"कोई आइटम जोड़ें…", addItemBtn:"+ जोड़ें",
    feedback:"✏️ प्रतिक्रिया", sendFeedback:"प्रतिक्रिया भेजें",
    favSaved:"सहेजा पसंदीदा", favSavedP:"सहेजे पसंदीदा", favRollIn:"— हम उन्हें जहाँ फिट हों शामिल करेंगे।",
  },
  ru: {
    hero1:"Планирование питания с ИИ", hero2:"Знайте, что есть", hero2em:"каждый вечер.",
    hero3:"Опишите вкусы, домохозяйство и бюджет — ваш ИИ-шеф создаст персональный недельный план, рецепты и список покупок за секунды.",
    planThisWeek:"Спланировать эту неделю", goPremium:"✦ Премиум",
    home:"← Главная", back:"← Назад", continue:"Далее →", planMyWeek:"Спланировать мою неделю",
    calendar:"← Календарь", autoSaved:"Автосохранено",
    thisWeek:"На этой неделе", yourWeeks:"Ваши недели", saved:"Сохранено", upcoming:"Предстоящая",
    tapToPlan:"Нажмите для планирования", planAhead:"Планируйте заранее · избегайте спонтанных покупок",
    openPlan:"Открыть план", planAgain:"Спланировать снова", open:"Открыть", list:"Список", replan:"Перепланировать", plan:"Планировать",
    confirm:"Подтвердить", cancel:"Отмена", weekDeleted:"Неделя удалена",
    alreadyPlanned:"Уже спланировано — открыть или спланировать снова", notPlanned:"Ещё не спланировано",
    shoppingList:"Список покупок",
    yourPlanReady:"Ваш план", yourPlanReadyEm:"готов.",
    replanBtn:"↻ Перепланировать",
    planHint:"Нажмите карточку для добавления · 📖 рецепт · ☆ избранное · ↻ заменить",
    estimatedCost:"Ориентировочные расходы за неделю",
    buildList:"Составить список покупок", buildingList:"⏳ Составляем…", viewList:"Просмотреть список", selectAll:"Выбрать всё",
    mealsSelected:"блюдо выбрано", mealsSelectedP:"блюда выбраны",
    step1title:"Планируйте неделю.", step1em:"Питайтесь хорошо.",
    step1q:"Что вы хотите спланировать?",
    dinnerOnly:"Только ужин", dinnerOnlySub:"Вечерние блюда",
    allMeals:"Все приёмы пищи", allMealsSub:"Завтрак, обед и ужин",
    custom:"Свой выбор", customSub:"Выбрать типы приёмов пищи",
    mealTypes:"Типы приёмов пищи",
    step2title:"Какие дни", step2em:"вам нужно питание?",
    step2hint:"Нажмите для переключения. Планируем только выбранные дни.",
    selectDays:"Выбрать дни", all7:"Все 7", weekdays:"Будние дни", weekend:"Выходные",
    step3title:"Предпочтения", step3em:"кухни",
    step3hint:"Выберите кухни. Оставьте пустым для максимального разнообразия.",
    selectFavourites:"Выберите любимые", addCustomCuisine:"Добавить свою кухню",
    cuisinePlaceholder:"напр. Грузинская, Перуанская, Корейская…", add:"Добавить",
    step4title:"Диетические", step4em:"требования",
    step4hint:"Есть ограничения, которые нужно исключить из плана?",
    selectAllThat:"Выберите всё подходящее",
    step5title:"Ваша кулинарная", step5em:"личность",
    step5hint:"Установите уровень приключений, сложность и любимые блюда.",
    adventureLevel:"Уровень приключений", classics:"🏠 Классика", surprises:"🌏 Сюрпризы",
    safe:"Безопасно и знакомо", balanced:"Сбалансированная смесь", wild:"Дерзко и авантюрно",
    dishComplexity:"Сложность блюда",
    lockFavourites:"Зафиксировать избранные (необязательно)",
    lockFavHint:"Назовите любимые блюда — мы обязательно включим их в план.",
    favPlaceholder:"напр. Курица тикка, борщ…",
    step6title:"Еженедельный", step6em:"продуктовый бюджет",
    step6hint:"Задайте бюджет, и мы подберём блюда в его рамках. Необязательно.",
    enableBudget:"Включить планирование бюджета", yes:"Да", skip:"Пропустить",
    currency:"Валюта", weeklyBudget:"Еженедельный бюджет на продукты",
    budgetPlaceholder:"напр. 120", perWeek:"в неделю", noBudget:"Без бюджета — планирование только по вкусу.",
    perMeal:"за блюдо",
    step7title:"Для кого", step7em:"вы планируете?",
    step7hint:"Подберём ингредиенты и порции для вашей семьи.",
    adults:"👨‍👩‍👧 Взрослые", kids:"👧 Дети",
    kidsDiff:"Дети получают отдельные, детские блюда", kidsDiffSub:"Предложим более простые альтернативы рядом с взрослыми блюдами",
    planningFor:"Планирование для", person:"человека", people:"человек",
    generating:"Планирование вашей недели…", generatingSub:"Обычно занимает 5–10 секунд…",
    ingredients:"Ингредиенты", howToCook:"Как приготовить", chefsTip:"💡 Совет шефа:",
    fetchingRecipe:"Загрузка рецепта…", prep:"🥄 Подготовка", cook:"🔥 Готовка", servings:"порция", servingsP:"порции",
    replaceWith:"Заменить", findingAlts:"Поиск альтернатив…", noAlts:"Альтернативы не найдены.",
    shoppingListTitle:"🛒 Список покупок", done:"готово",
    allDone:"🎉 Всё готово!", allDoneSub:"Всё в корзине. Приятного аппетита!",
    reset:"↺ Сбросить", copyList:"📋 Скопировать список", addItem:"Добавить товар…", addItemBtn:"+ Добавить",
    feedback:"✏️ Обратная связь", sendFeedback:"Отправить отзыв",
    favSaved:"сохранённое избранное", favSavedP:"сохранённых избранных", favRollIn:"— добавим их туда, где подойдут.",
  },
  bn: {
    hero1:"AI-চালিত মিল পরিকল্পনা", hero2:"প্রতি রাতে জানুন", hero2em:"কী রান্না করবেন।",
    hero3:"আপনার পছন্দ, পরিবার ও বাজেট বলুন — AI শেফ সেকেন্ডে ব্যক্তিগত সাপ্তাহিক পরিকল্পনা, রেসিপি ও শপিং লিস্ট তৈরি করবে।",
    planThisWeek:"এই সপ্তাহ পরিকল্পনা করুন", goPremium:"✦ প্রিমিয়াম",
    home:"← হোম", back:"← পেছনে", continue:"চালিয়ে যান →", planMyWeek:"আমার সপ্তাহ পরিকল্পনা করুন",
    calendar:"← ক্যালেন্ডার", autoSaved:"স্বয়ংক্রিয় সংরক্ষিত",
    thisWeek:"এই সপ্তাহ", yourWeeks:"আপনার সপ্তাহগুলি", saved:"সংরক্ষিত", upcoming:"আসন্ন",
    tapToPlan:"পরিকল্পনা করতে চাপুন", planAhead:"আগে থেকে পরিকল্পনা করুন · আবেগী কেনাকাটা এড়ান",
    openPlan:"পরিকল্পনা খুলুন", planAgain:"আবার পরিকল্পনা করুন", open:"খুলুন", list:"তালিকা", replan:"পুনরায় পরিকল্পনা", plan:"পরিকল্পনা",
    confirm:"নিশ্চিত করুন", cancel:"বাতিল", weekDeleted:"সপ্তাহ মুছে ফেলা হয়েছে",
    alreadyPlanned:"ইতিমধ্যে পরিকল্পিত — খুলুন বা আবার পরিকল্পনা করুন", notPlanned:"এখনো পরিকল্পনা করা হয়নি",
    shoppingList:"শপিং লিস্ট",
    yourPlanReady:"আপনার পরিকল্পনা", yourPlanReadyEm:"প্রস্তুত।",
    replanBtn:"↻ পুনরায় পরিকল্পনা",
    planHint:"কার্ডে চাপুন ঝুড়িতে যোগ করতে · 📖 রেসিপি · ☆ পছন্দ · ↻ বদলান",
    estimatedCost:"আনুমানিক সাপ্তাহিক খরচ",
    buildList:"শপিং লিস্ট তৈরি করুন", buildingList:"⏳ তৈরি হচ্ছে…", viewList:"তালিকা দেখুন", selectAll:"সব বেছে নিন",
    mealsSelected:"মিল বেছে নেওয়া হয়েছে", mealsSelectedP:"মিল বেছে নেওয়া হয়েছে",
    step1title:"আপনার সপ্তাহ পরিকল্পনা করুন।", step1em:"ভালো খান।",
    step1q:"আপনি কী পরিকল্পনা করতে চান?",
    dinnerOnly:"শুধু রাতের খাবার", dinnerOnlySub:"সন্ধ্যার খাবার",
    allMeals:"সব খাবার", allMealsSub:"সকাল, দুপুর ও রাতের খাবার",
    custom:"কাস্টম", customSub:"খাবারের ধরন বেছে নিন",
    mealTypes:"খাবারের ধরন",
    step2title:"কোন দিনগুলিতে", step2em:"খাবার দরকার?",
    step2hint:"টগল করতে চাপুন। আপনি যে দিনগুলি বেছে নেবেন সেগুলিই পরিকল্পনা করা হবে।",
    selectDays:"দিন বেছে নিন", all7:"সব ৭", weekdays:"সপ্তাহের দিন", weekend:"সাপ্তাহান্ত",
    step3title:"রন্ধনশৈলীর", step3em:"পছন্দ",
    step3hint:"পরিকল্পনার জন্য রন্ধনশৈলী বেছে নিন। সর্বাধিক বৈচিত্র্যের জন্য ফাঁকা রাখুন।",
    selectFavourites:"আপনার পছন্দগুলি বেছে নিন", addCustomCuisine:"কাস্টম রন্ধনশৈলী যোগ করুন",
    cuisinePlaceholder:"যেমন জর্জিয়ান, পেরুভিয়ান, কোরিয়ান…", add:"যোগ করুন",
    step4title:"খাদ্যতালিকাগত", step4em:"প্রয়োজনীয়তা",
    step4hint:"কোনো নিষেধাজ্ঞা যা পরিকল্পনায় রাখা উচিত নয়?",
    selectAllThat:"প্রযোজ্য সব বেছে নিন",
    step5title:"আপনার রন্ধনসম্পর্কীয়", step5em:"ব্যক্তিত্ব",
    step5hint:"আপনার অ্যাডভেঞ্চার স্তর, জটিলতা এবং পছন্দের খাবার সেট করুন।",
    adventureLevel:"অ্যাডভেঞ্চার স্তর", classics:"🏠 ক্লাসিক", surprises:"🌏 বিস্ময়",
    safe:"নিরাপদ ও পরিচিত", balanced:"সুষম মিশ্রণ", wild:"বন্য ও দুঃসাহসিক",
    dishComplexity:"রান্নার জটিলতা",
    lockFavourites:"পছন্দের খাবার লক করুন (ঐচ্ছিক)",
    lockFavHint:"আপনার পছন্দের খাবারের নাম দিন — আমরা নিশ্চিত করব সেগুলো পরিকল্পনায় আসে।",
    favPlaceholder:"যেমন চিকেন টিক্কা, বোর্শট…",
    step6title:"সাপ্তাহিক", step6em:"খাদ্য বাজেট",
    step6hint:"একটি মুদি বাজেট সেট করুন এবং আমরা সীমার মধ্যে খাবার রাখব। ঐচ্ছিক।",
    enableBudget:"বাজেট পরিকল্পনা সক্রিয় করুন", yes:"হ্যাঁ", skip:"এড়িয়ে যান",
    currency:"মুদ্রা", weeklyBudget:"সাপ্তাহিক মুদি বাজেট",
    budgetPlaceholder:"যেমন ১২০", perWeek:"প্রতি সপ্তাহ", noBudget:"কোনো বাজেট নেই — শুধুমাত্র স্বাদ অনুযায়ী পরিকল্পনা।",
    perMeal:"প্রতি খাবারে",
    step7title:"আপনি কার জন্য", step7em:"পরিকল্পনা করছেন?",
    step7hint:"আমরা আপনার পরিবারের জন্য উপাদান ও পরিবেশন স্কেল করব।",
    adults:"👨‍👩‍👧 প্রাপ্তবয়স্ক", kids:"👧 শিশু",
    kidsDiff:"শিশুরা আলাদা, শিশু-বান্ধব খাবার পাবে", kidsDiffSub:"আমরা প্রাপ্তবয়স্কদের খাবারের পাশাপাশি সহজ বিকল্প প্রস্তাব করব",
    planningFor:"পরিকল্পনা করা হচ্ছে", person:"জন", people:"জন",
    generating:"আপনার সপ্তাহ পরিকল্পনা করা হচ্ছে…", generatingSub:"সাধারণত ৫–১০ সেকেন্ড সময় লাগে…",
    ingredients:"উপকরণ", howToCook:"কীভাবে রান্না করবেন", chefsTip:"💡 শেফের পরামর্শ:",
    fetchingRecipe:"রেসিপি আনা হচ্ছে…", prep:"🥄 প্রস্তুতি", cook:"🔥 রান্না", servings:"পরিবেশন", servingsP:"পরিবেশন",
    replaceWith:"প্রতিস্থাপন করুন", findingAlts:"বিকল্প খোঁজা হচ্ছে…", noAlts:"কোনো বিকল্প পাওয়া যায়নি।",
    shoppingListTitle:"🛒 শপিং লিস্ট", done:"সম্পন্ন",
    allDone:"🎉 সব সম্পন্ন!", allDoneSub:"সব আপনার ঝুড়িতে আছে। খাবার উপভোগ করুন!",
    reset:"↺ রিসেট", copyList:"📋 তালিকা কপি করুন", addItem:"একটি আইটেম যোগ করুন…", addItemBtn:"+ যোগ করুন",
    feedback:"✏️ মতামত", sendFeedback:"মতামত পাঠান",
    favSaved:"সংরক্ষিত পছন্দ", favSavedP:"সংরক্ষিত পছন্দ", favRollIn:"— আমরা সেগুলো উপযুক্ত জায়গায় রাখব।",
  },
  ja: {
    hero1:"AI食事プランナー", hero2:"毎晩の夕食を", hero2em:"迷わない。",
    hero3:"好み・家族・予算を教えるだけ — AIシェフが数秒でパーソナライズされた1週間の食事プラン、レシピ、買い物リストを作成します。",
    planThisWeek:"今週のプランを立てる", goPremium:"✦ プレミアム",
    home:"← ホーム", back:"← 戻る", continue:"続ける →", planMyWeek:"週の食事を計画する",
    calendar:"← カレンダー", autoSaved:"自動保存",
    thisWeek:"今週", yourWeeks:"あなたの週", saved:"保存済み", upcoming:"予定",
    tapToPlan:"タップして計画", planAhead:"先に計画を · 衝動買いを防ぐ",
    openPlan:"プランを開く", planAgain:"再計画", open:"開く", list:"リスト", replan:"再計画", plan:"計画",
    confirm:"確認", cancel:"キャンセル", weekDeleted:"週が削除されました",
    alreadyPlanned:"計画済み — 開くか再計画する", notPlanned:"未計画",
    shoppingList:"買い物リスト",
    yourPlanReady:"プランが", yourPlanReadyEm:"完成しました。",
    replanBtn:"↻ 再計画",
    planHint:"カードをタップしてカートに追加 · 📖 レシピ · ☆ お気に入り · ↻ 入れ替え",
    estimatedCost:"週の概算費用",
    buildList:"買い物リストを作成", buildingList:"⏳ 作成中…", viewList:"リストを見る", selectAll:"すべて選択",
    mealsSelected:"食事を選択済み", mealsSelectedP:"食事を選択済み",
    step1title:"週の食事を計画しましょう。", step1em:"おいしく食べよう。",
    step1q:"何を計画しますか？",
    dinnerOnly:"夕食のみ", dinnerOnlySub:"夜の食事",
    allMeals:"全食事", allMealsSub:"朝食・昼食・夕食",
    custom:"カスタム", customSub:"食事の種類を選択",
    mealTypes:"食事の種類",
    step2title:"どの日に", step2em:"食事が必要ですか？",
    step2hint:"タップして切り替え。選択した日のみ計画します。",
    selectDays:"日を選択", all7:"全7日", weekdays:"平日", weekend:"週末",
    step3title:"料理の", step3em:"好み",
    step3hint:"計画する料理スタイルを選択。空白で最大の多様性。",
    selectFavourites:"お気に入りを選択", addCustomCuisine:"カスタム料理を追加",
    cuisinePlaceholder:"例：ジョージア料理、ペルー料理、韓国料理…", add:"追加",
    step4title:"食事制限", step4em:"について",
    step4hint:"プランから除外すべき制限はありますか？",
    selectAllThat:"該当するものをすべて選択",
    step5title:"あなたの料理の", step5em:"スタイル",
    step5hint:"冒険度、複雑さ、お気に入りの料理を設定してください。",
    adventureLevel:"冒険レベル", classics:"🏠 定番", surprises:"🌏 サプライズ",
    safe:"安心・おなじみ", balanced:"バランス良く", wild:"冒険的・新しい",
    dishComplexity:"料理の難易度",
    lockFavourites:"お気に入りを固定（任意）",
    lockFavHint:"好きな料理名を入力 — プランに必ず入れます。",
    favPlaceholder:"例：チキンティッカ、ボルシチ…",
    step6title:"週の", step6em:"食費予算",
    step6hint:"食費予算を設定すると範囲内で計画します。任意。",
    enableBudget:"予算計画を有効にする", yes:"はい", skip:"スキップ",
    currency:"通貨", weeklyBudget:"週の食費予算",
    budgetPlaceholder:"例：120", perWeek:"週あたり", noBudget:"予算なし — 好みだけで計画。",
    perMeal:"食事あたり",
    step7title:"誰のために", step7em:"計画しますか？",
    step7hint:"世帯に合わせて食材と量を調整します。",
    adults:"👨‍👩‍👧 大人", kids:"👧 子供",
    kidsDiff:"子供には別の子供向け料理を用意", kidsDiffSub:"大人のメニューの隣に、よりシンプルな代替案を提案します",
    planningFor:"計画対象：", person:"人", people:"人",
    generating:"週の食事プランを作成中…", generatingSub:"通常5〜10秒かかります…",
    ingredients:"材料", howToCook:"作り方", chefsTip:"💡 シェフのコツ：",
    fetchingRecipe:"レシピを取得中…", prep:"🥄 準備", cook:"🔥 調理", servings:"人分", servingsP:"人分",
    replaceWith:"入れ替え", findingAlts:"代替案を検索中…", noAlts:"代替案が見つかりません。",
    shoppingListTitle:"🛒 買い物リスト", done:"完了",
    allDone:"🎉 すべて完了！", allDoneSub:"すべてカートに入っています。食事を楽しんでください！",
    reset:"↺ リセット", copyList:"📋 リストをコピー", addItem:"アイテムを追加…", addItemBtn:"+ 追加",
    feedback:"✏️ フィードバック", sendFeedback:"フィードバックを送る",
    favSaved:"お気に入りに保存", favSavedP:"お気に入りに保存", favRollIn:"— 適切な場所に組み込みます。",
  },
  id: {
    hero1:"Perencanaan Makan Bertenaga AI", hero2:"Tahu apa yang dimakan", hero2em:"setiap malam.",
    hero3:"Ceritakan selera, keluarga & anggaran Anda — koki AI Anda membangun rencana makan mingguan yang dipersonalisasi, resep & daftar belanja dalam hitungan detik.",
    planThisWeek:"Rencanakan minggu ini", goPremium:"✦ Premium",
    home:"← Beranda", back:"← Kembali", continue:"Lanjutkan →", planMyWeek:"Rencanakan minggu saya",
    calendar:"← Kalender", autoSaved:"Disimpan otomatis",
    thisWeek:"Minggu ini", yourWeeks:"Minggu Anda", saved:"Tersimpan", upcoming:"Mendatang",
    tapToPlan:"Ketuk untuk merencanakan", planAhead:"Rencanakan lebih awal · hindari pembelian impulsif",
    openPlan:"Buka rencana", planAgain:"Rencanakan lagi", open:"Buka", list:"Daftar", replan:"Rencanakan ulang", plan:"Rencanakan",
    confirm:"Konfirmasi", cancel:"Batal", weekDeleted:"Minggu dihapus",
    alreadyPlanned:"Sudah direncanakan — buka atau rencanakan lagi", notPlanned:"Belum direncanakan",
    shoppingList:"Daftar belanja",
    yourPlanReady:"Rencana Anda", yourPlanReadyEm:"siap.",
    replanBtn:"↻ Rencanakan ulang",
    planHint:"Ketuk kartu untuk ditambahkan ke keranjang · 📖 resep · ☆ favorit · ↻ ganti",
    estimatedCost:"Perkiraan biaya mingguan",
    buildList:"Buat daftar belanja", buildingList:"⏳ Membuat…", viewList:"Lihat daftar", selectAll:"Pilih semua",
    mealsSelected:"makanan dipilih", mealsSelectedP:"makanan dipilih",
    step1title:"Rencanakan minggu Anda.", step1em:"Makan dengan baik.",
    step1q:"Apa yang ingin Anda rencanakan?",
    dinnerOnly:"Hanya Makan Malam", dinnerOnlySub:"Makanan sore",
    allMeals:"Semua Makanan", allMealsSub:"Sarapan, makan siang & malam",
    custom:"Kustom", customSub:"Pilih jenis makanan",
    mealTypes:"Jenis makanan",
    step2title:"Hari apa saja", step2em:"Anda butuh makanan?",
    step2hint:"Ketuk untuk beralih. Kami hanya merencanakan hari yang Anda pilih.",
    selectDays:"Pilih hari", all7:"Semua 7", weekdays:"Hari kerja", weekend:"Akhir pekan",
    step3title:"Preferensi", step3em:"masakan",
    step3hint:"Pilih masakan untuk direncanakan. Biarkan kosong untuk variasi maksimal.",
    selectFavourites:"Pilih favorit Anda", addCustomCuisine:"Tambah masakan kustom",
    cuisinePlaceholder:"mis. Georgia, Peru, Korea…", add:"Tambah",
    step4title:"Persyaratan", step4em:"diet",
    step4hint:"Ada pantangan yang harus dihindari dalam rencana?",
    selectAllThat:"Pilih semua yang sesuai",
    step5title:"Kepribadian", step5em:"kuliner Anda",
    step5hint:"Atur tingkat petualangan, kompleksitas, dan makanan favorit Anda.",
    adventureLevel:"Tingkat petualangan", classics:"🏠 Klasik", surprises:"🌏 Kejutan",
    safe:"Aman & familiar", balanced:"Campuran seimbang", wild:"Liar & petualang",
    dishComplexity:"Kompleksitas masakan",
    lockFavourites:"Kunci favorit (opsional)",
    lockFavHint:"Sebutkan masakan favorit Anda — kami akan memastikannya masuk dalam rencana.",
    favPlaceholder:"mis. Ayam tikka, borscht…",
    step6title:"Anggaran", step6em:"makanan mingguan",
    step6hint:"Tetapkan anggaran belanja dan kami akan menjaga makanan dalam kisaran itu. Opsional.",
    enableBudget:"Aktifkan perencanaan anggaran", yes:"Ya", skip:"Lewati",
    currency:"Mata uang", weeklyBudget:"Anggaran belanja mingguan",
    budgetPlaceholder:"mis. 120", perWeek:"per minggu", noBudget:"Tanpa anggaran — perencanaan murni berdasarkan selera.",
    perMeal:"per makanan",
    step7title:"Untuk siapa", step7em:"Anda merencanakan?",
    step7hint:"Kami akan menyesuaikan bahan dan porsi untuk rumah tangga Anda.",
    adults:"👨‍👩‍👧 Dewasa", kids:"👧 Anak-anak",
    kidsDiff:"Anak-anak mendapat makanan berbeda yang ramah anak", kidsDiffSub:"Kami akan menyarankan alternatif yang lebih sederhana di samping makanan dewasa",
    planningFor:"Merencanakan untuk", person:"orang", people:"orang",
    generating:"Merencanakan minggu Anda…", generatingSub:"Biasanya membutuhkan 5–10 detik…",
    ingredients:"Bahan", howToCook:"Cara memasak", chefsTip:"💡 Tips koki:",
    fetchingRecipe:"Mengambil resep…", prep:"🥄 Persiapan", cook:"🔥 Memasak", servings:"porsi", servingsP:"porsi",
    replaceWith:"Ganti", findingAlts:"Mencari alternatif…", noAlts:"Tidak ada alternatif ditemukan.",
    shoppingListTitle:"🛒 Daftar belanja", done:"selesai",
    allDone:"🎉 Semua selesai!", allDoneSub:"Semuanya ada di keranjang Anda. Nikmati makanan Anda!",
    reset:"↺ Reset", copyList:"📋 Salin daftar", addItem:"Tambahkan item…", addItemBtn:"+ Tambah",
    feedback:"✏️ Umpan balik", sendFeedback:"Kirim umpan balik",
    favSaved:"favorit tersimpan", favSavedP:"favorit tersimpan", favRollIn:"— kami akan memasukkannya di tempat yang sesuai.",
  },
};
function langPrefix(lang) {
  if (!lang || lang === "en") return "";
  return `Translate to ${LANG_EN[lang] || lang}: the "name" field, "description" field, and all strings in "ingredients" arrays. Keep JSON keys and "mainIngredient" values in English.\n`;
}
async function translateMealPlan(plan, lang, selDays, types) {
  const langName = LANG_EN[lang];
  if (!langName) return plan;
  const refs = [];
  selDays.forEach(d => types.forEach(t => {
    const m = plan[d.toLowerCase()]?.[t];
    if (m) refs.push({ d: d.toLowerCase(), t, n: m.name, desc: m.description || "", g: m.ingredients || [] });
  }));
  if (!refs.length) return plan;
  const result = JSON.parse(JSON.stringify(plan));
  // Translate in batches of 3 meals so each call stays well under the token cap
  for (let start = 0; start < refs.length; start += 3) {
    const chunk = refs.slice(start, start + 3);
    const batchData = {};
    chunk.forEach((r, i) => { batchData[i] = { n: r.n, d: r.desc, g: r.g }; });
    try {
      const raw = await callAI(
        `Translate every string value to ${langName}. Return ONLY JSON with identical numeric keys and structure:\n${JSON.stringify(batchData)}`,
        2500
      );
      const tr = JSON.parse(raw);
      chunk.forEach(({ d, t }, i) => {
        const meal = result[d]?.[t];
        const v = tr[i];
        if (meal && v) {
          if (v.n) meal.name = v.n;
          if (v.d) meal.description = v.d;
          if (Array.isArray(v.g) && v.g.length) meal.ingredients = v.g;
        }
      });
    } catch {}
  }
  return result;
}

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
const WP = "dr-week-", FK = "dr-favs", PK = "dr-premium", UK = "dr-usage", OK = "dr-onboarded", LK = "dr-lang", SK = "dr-sl-tip", PW = "dr-pw-seen";
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
async function callAI(prompt, maxTokens = 4000, lang = "en") {
  const r = await fetch("/.netlify/functions/chat", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ prompt, maxTokens, lang }) });
  if (!r.ok) {
    let msg = "API " + r.status;
    try { const d = await r.json(); if (d.error) msg = d.error; } catch {}
    throw new Error(msg);
  }
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
// Map a single-word main-ingredient token (e.g. from AI mainIngredient field) → photo key
const MAIN_ING_MAP = {
  chicken:"chicken", poultry:"chicken", turkey:"chicken", duck:"chicken",
  beef:"beef", steak:"beef", veal:"beef", mince:"beef",
  lamb:"lamb", mutton:"lamb",
  pork:"pork", bacon:"pork", ham:"pork", sausage:"pork",
  salmon:"fish", tuna:"fish", cod:"fish", haddock:"fish", mackerel:"fish", trout:"fish", fish:"fish",
  shrimp:"seafood", prawn:"seafood", prawns:"seafood", lobster:"seafood", crab:"seafood", scallop:"seafood", seafood:"seafood", mussels:"seafood",
  pasta:"pasta", spaghetti:"pasta", penne:"pasta", linguine:"pasta", noodles:"noodle", ramen:"noodle", udon:"noodle", soba:"noodle",
  rice:"rice", risotto:"rice", biryani:"rice", paella:"rice", quinoa:"rice",
  bread:"bread", sandwich:"bread", wrap:"bread", tortilla:"bread",
  egg:"egg", eggs:"egg",
  tofu:"vegetarian", tempeh:"vegetarian", seitan:"vegetarian",
  lentils:"vegetarian", lentil:"vegetarian", chickpeas:"vegetarian", chickpea:"vegetarian", beans:"vegetarian", bean:"vegetarian",
  potato:"vegetarian", potatoes:"vegetarian", sweetpotato:"vegetarian",
  vegetables:"vegetarian", vegetable:"vegetarian", veggie:"vegetarian", mushroom:"vegetarian", mushrooms:"vegetarian", cauliflower:"vegetarian", broccoli:"vegetarian", aubergine:"vegetarian", courgette:"vegetarian", squash:"vegetarian",
};
function photoFallback(name = "", mt = "", mainIngredient = "") {
  // If AI gave us a main ingredient, trust it first — this is the most reliable signal.
  if (mainIngredient) {
    const key = MAIN_ING_MAP[String(mainIngredient).toLowerCase().replace(/[^a-z]/g, "")];
    if (key && PHOTO_MAP[key]) return PHOTO_MAP[key];
  }
  const n = name.toLowerCase();
  // Proteins first — these are always the right visual anchor
  if (n.includes("chicken")||n.includes("turkey")||n.includes("duck")||n.includes("parmesan")||n.includes("parmigiana")) return PHOTO_MAP.chicken;
  if (n.includes("beef")||n.includes("steak")||n.includes("meatball")) return PHOTO_MAP.beef;
  if (n.includes("burger")) return PHOTO_MAP.burger;
  if (n.includes("lamb")||n.includes("mutton")) return PHOTO_MAP.lamb;
  if (n.includes("pork")||n.includes("bacon")||n.includes("ham")||n.includes("sausage")) return PHOTO_MAP.pork;
  if (n.includes("salmon")||n.includes("tuna")||n.includes("cod")||n.includes("fish")) return PHOTO_MAP.fish;
  if (n.includes("shrimp")||n.includes("prawn")||n.includes("scampi")||n.includes("lobster")||n.includes("crab")||n.includes("seafood")) return PHOTO_MAP.seafood;
  if (n.includes("pasta")||n.includes("spaghetti")||n.includes("penne")||n.includes("carbonara")||n.includes("lasagne")||n.includes("fettuccine")||n.includes("linguine")) return PHOTO_MAP.pasta;
  if (n.includes("pizza")) return PHOTO_MAP.pizza;
  // Curry/stew — check BEFORE vegetable so "Vegetable Curry" hits curry not vegetarian
  if (n.includes("curry")||n.includes("masala")||n.includes("tikka")||n.includes("korma")||n.includes("dal")||n.includes("dhal")) return PHOTO_MAP.curry;
  if (n.includes("soup")||n.includes("broth")||n.includes("bisque")||n.includes("chowder")) return PHOTO_MAP.soup;
  if (n.includes("stew")||n.includes("casserole")||n.includes("tagine")||n.includes("borscht")||n.includes("hotpot")) return PHOTO_MAP.soup;
  if (n.includes("salad")) return PHOTO_MAP.salad;
  if (n.includes("rice")||n.includes("risotto")||n.includes("pilaf")||n.includes("biryani")||n.includes("paella")) return PHOTO_MAP.rice;
  if (n.includes("taco")||n.includes("burrito")||n.includes("enchilada")||n.includes("quesadilla")) return PHOTO_MAP.taco;
  if (n.includes("noodle")||n.includes("ramen")||n.includes("pho")||n.includes("udon")||n.includes("soba")) return PHOTO_MAP.noodle;
  if (n.includes("bread")||n.includes("sandwich")||n.includes("toast")||n.includes("wrap")||n.includes("flatbread")) return PHOTO_MAP.bread;
  if (n.includes("egg")||n.includes("omelette")||n.includes("frittata")||n.includes("quiche")) return PHOTO_MAP.egg;
  if (n.includes("pancake")||n.includes("waffle")||n.includes("crepe")) return PHOTO_MAP.breakfast;
  if (n.includes("cake")||n.includes("dessert")||n.includes("pudding")||n.includes("tart")||n.includes("brownie")) return PHOTO_MAP.dessert;
  if (n.includes("vegetable")||n.includes("veggie")||n.includes("tofu")||n.includes("lentil")||n.includes("chickpea")||n.includes("aubergine")||n.includes("courgette")) return PHOTO_MAP.vegetarian;
  if (mt === "breakfast") return PHOTO_MAP.breakfast;
  return PHOTO_MAP.default;
}
// 4-tier photo strategy:
// 1. TheMealDB — full dish name
// 2. TheMealDB — each meaningful word in dish name (ingredient-level)
// 3. TheMealDB — first ingredient from meal
// 4. Guaranteed Unsplash curated fallback
async function fetchPhoto(name, mt, ingredients, mainIngredient) {
  const tryProxy = async (q) => {
    try {
      const r = await fetch("/.netlify/functions/photo?q=" + encodeURIComponent(q));
      if (r.ok) { const d = await r.json(); if (d.photo) return d.photo; }
    } catch {}
    return null;
  };

  // Pre-check: does our local keyword map (or AI mainIngredient) give a SPECIFIC result?
  // If yes, this is our confident fallback — better than a random wrong API result.
  const localMatch = photoFallback(name, mt, mainIngredient);
  const hasSpecificLocal = localMatch !== PHOTO_MAP.default;

  // Tier 1: TheMealDB full dish name match
  const p1 = await tryProxy(name.split(" ").slice(0, 3).join(" "));
  if (p1) return p1;

  // Tier 2: if we have a confident local category match, use it now
  // This ensures "Vegetable Curry" → curry photo, "Chicken Parmesan" → chicken photo,
  // "Shrimp Scampi" → prawn photo — before trying random word-by-word API calls
  if (hasSpecificLocal) return localMatch;

  // Tier 3: mainIngredient is always kept in English by the AI, so the proxy can reliably
  // match it against TheMealDB even when the meal name is in a non-English language
  if (mainIngredient) {
    const p = await tryProxy(mainIngredient);
    if (p) return p;
  }

  // Tier 4: word-by-word API search (only reached for truly unrecognised dishes)
  const stopWords = /^(with|and|in|on|of|the|for|à|al|au|en|la)$/i;
  const words = name.split(" ").filter(w => w.length > 3 && !stopWords.test(w));
  for (const w of words) {
    const p = await tryProxy(w);
    if (p) return p;
  }

  // Tier 5: first ingredient word (e.g. "400g chicken thighs" → "chicken")
  if (ingredients && ingredients.length > 0) {
    const raw = ingredients[0].replace(/^[\d\s.,]+/i, "").trim();
    const ingWord = raw.split(" ").find(w => w.length > 3) || "";
    if (ingWord) {
      const p = await tryProxy(ingWord);
      if (p) return p;
    }
  }

  // Tier 6: guaranteed curated fallback (generic food photo)
  return localMatch;
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
  lang: "en",
};

// ─── FONTS + CSS ──────────────────────────────────────────────────────────────
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');`;

const CSS = `
/* reset */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Plus Jakarta Sans',sans-serif;background:#faf7f0;color:#2a2a1a;-webkit-font-smoothing:antialiased}

/* layout */
.app{min-height:100vh;background:#faf7f0}
.hdr{background:#1a4a2a;padding:12px 22px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;gap:8px}
.hdr-logo{cursor:pointer;display:flex;align-items:center;line-height:1;flex-shrink:0}
.hdr-logo span:first-child{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#fff;letter-spacing:-.3px}
.hdr-logo span:last-child{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:700;color:#c4622d;letter-spacing:-.3px}
.hdr-right{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;min-width:0;overflow:visible}
.ver-pill{font-size:11px;color:#8abca0;font-weight:600;background:rgba(255,255,255,.1);padding:3px 9px;border-radius:100px;flex-shrink:0}
.lang-btn{font-size:12px;font-weight:600;background:rgba(255,255,255,.12);color:rgba(255,255,255,.9);border:1.5px solid rgba(255,255,255,.35);border-radius:100px;padding:4px 10px;cursor:pointer;display:flex;align-items:center;gap:4px;white-space:nowrap;flex-shrink:0}
.lang-btn:hover{background:rgba(255,255,255,.22)}
.lang-code{font-size:11px;opacity:.85}
@media(max-width:520px){.ver-pill{display:none}.lang-code{display:none}.hdr{padding:10px 14px}}
.lang-wrap{position:relative}
.lang-drop{position:absolute;top:calc(100% + 6px);right:0;background:#fff;border:1px solid #d0dcc8;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.13);z-index:200;min-width:170px;padding:4px 0;max-height:300px;overflow-y:auto}
.lang-opt{padding:9px 14px;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:8px;color:#2a2a1a}
.lang-opt:hover{background:#f0f5e8}
.lang-opt.active{font-weight:700;color:#2a6a3a}
.pb{height:3px;background:#c8d8b8}
.pf{height:100%;background:linear-gradient(90deg,#2a6a3a,#c4622d);transition:width .4s}
.page{max-width:900px;margin:0 auto;padding:36px 20px 120px}

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
.meal-card-img-box{position:relative;width:72px;height:72px;border-radius:14px;overflow:hidden;flex-shrink:0;background:#e8e4d8}
.meal-card-thumb{width:72px;height:72px;object-fit:cover;display:block}
.meal-card-thumb-blank{width:72px;height:72px;background:#e8e4d8}
.meal-card-flag-badge{position:absolute;bottom:4px;right:4px;font-size:16px;line-height:1;background:rgba(255,255,255,.88);border-radius:6px;padding:2px 3px;backdrop-filter:blur(2px)}
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
.list-tip-banner{display:flex;align-items:center;gap:10px;background:#f0f7f0;border:1.5px solid #c8e6c9;border-radius:14px;padding:12px 14px;margin-bottom:16px}
.list-tip-icon{font-size:18px;flex-shrink:0}
.list-tip-text{flex:1;font-size:12px;color:#3a6a3a;line-height:1.5}
.list-tip-dismiss{flex-shrink:0;background:#2a6a3a;color:#fff;border:none;border-radius:100px;padding:5px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif}
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
.land-ai-badge{display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,rgba(196,98,45,.12),rgba(196,98,45,.06));border:1.5px solid rgba(196,98,45,.3);border-radius:100px;padding:5px 14px;font-size:11px;font-weight:700;color:#c4622d;letter-spacing:.5px;text-transform:uppercase;margin-bottom:18px}
.ai-features{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;padding:0 16px 32px;max-width:540px;margin:0 auto}
.ai-feat{display:flex;align-items:flex-start;gap:9px;background:#fff;border:1.5px solid #e8e4d8;border-radius:14px;padding:12px 14px;flex:1;min-width:140px;max-width:180px;text-align:left}
.ai-feat-icon{font-size:20px;flex-shrink:0;line-height:1}
.ai-feat-text{font-size:12px;font-weight:600;color:#1a3a1a;line-height:1.4}
.ai-feat-sub{font-size:11px;color:#6a7a5a;font-weight:400;margin-top:2px}
.land-sub{font-size:15px;color:#5a6a4a;max-width:360px;margin:0 auto;line-height:1.7;font-weight:300}
.land-cta{margin-top:24px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.land-cta-p{background:#1a4a2a;color:#fff;border:none;padding:13px 26px;border-radius:100px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.land-cta-p:hover{background:#0f3020;transform:translateY(-1px);box-shadow:0 5px 18px rgba(26,74,42,.3)}
.land-cta-s{background:transparent;color:#2a6a3a;border:1.5px solid #a0c090;padding:12px 22px;border-radius:100px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.land-cta-s:hover{background:#f0f5e8}
.install-btn{margin-top:12px;display:inline-flex;align-items:center;gap:7px;background:rgba(26,74,42,.07);color:#1a4a2a;border:1.5px solid rgba(26,74,42,.25);padding:10px 22px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .2s}
.install-btn:hover{background:rgba(26,74,42,.13);border-color:rgba(26,74,42,.4)}

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
.wt-scroll{display:flex;gap:10px;overflow-x:auto;padding:14px 0 12px;scrollbar-width:none}
.wt-scroll::-webkit-scrollbar{display:none}
.wk{flex-shrink:0;width:155px;background:#fff;border-radius:16px;padding:14px;border:1.5px solid #e0ddd0;cursor:pointer;transition:all .2s;position:relative}
.wk:hover{border-color:#a0c090;transform:translateY(-2px);box-shadow:0 4px 12px rgba(30,60,20,.1)}
.wk.cur{border-color:#c4622d;width:172px}
.wk.has{border-color:#c8d8a8;width:172px;background:#f7faf2}
.wk.empty{border-style:dashed;cursor:default}
.wk.empty:hover{transform:none;box-shadow:none}
.wk-dot{width:8px;height:8px;border-radius:50%;background:#e0ddd0;margin-bottom:9px}
.wk.cur .wk-dot{background:#c4622d}
.wk.has .wk-dot{background:#2a6a3a}
.wk-lbl{font-size:10px;color:#8a9a7a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.wk-dates{font-size:11px;font-weight:600;color:#1a3a1a;line-height:1.4;margin-bottom:7px}
.wk-meals{display:flex;flex-direction:column;gap:3px;margin-bottom:6px}
.wk-meal{font-size:10px;color:#3a5a3a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wk-empty-txt{font-size:11px;color:#b0b898;margin-bottom:7px}
.wk-acts{display:flex;gap:5px;flex-wrap:wrap;padding-top:4px}
.wk-btn{font-size:11px;padding:5px 10px;border-radius:100px;border:1.5px solid #d0ccb8;background:transparent;color:#4a6a4a;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;transition:all .15s;white-space:nowrap}
.wk-btn:hover{border-color:#2a6a3a;color:#2a6a3a}
.wk-btn.pri{background:#1a4a2a;color:#fff;border-color:#1a4a2a}
.wk-btn.pri:hover{background:#2a6a3a;border-color:#2a6a3a}
.wk-badge{position:absolute;top:-10px;left:14px;font-size:9px;font-weight:700;padding:2px 8px;border-radius:100px;text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
.wk-badge.now{background:#c4622d;color:#fff}
.wk-badge.saved{background:#ddeec8;color:#2a5a1a}
.wk-del{position:absolute;top:9px;right:9px;background:transparent;border:none;padding:0;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#c8c0a8;cursor:pointer;border-radius:50%;transition:all .15s}
.wk-del:hover{background:#fde8e0;color:#b04020}

/* footer */
.land-footer{text-align:center;padding:14px 0 6px;display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap}
.land-footer-v{font-size:11px;color:#aaa898}
.land-footer-link{font-size:11px;color:#8a9a7a;background:none;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;text-decoration:underline;padding:0}
.land-footer-link:hover{color:#2a3a1a}
.btn-update{background:transparent;border:none;color:#8a9a7a;font-size:12px;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border-radius:8px}
.btn-update:hover{background:#f0ece0;color:#2a3a1a}
/* privacy page */
.privacy-page{max-width:700px;margin:0 auto;padding:36px 20px 100px}
.privacy-page h1{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#1a3a1a;margin-bottom:6px}
.privacy-page .prv-date{font-size:13px;color:#6a7a5a;margin-bottom:28px}
.privacy-page h2{font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:600;color:#1a3a1a;margin:28px 0 8px}
.privacy-page p,.privacy-page li{font-size:14px;color:#3a4a2a;line-height:1.75;margin-bottom:8px}
.privacy-page ul{padding-left:20px;margin-bottom:8px}
.privacy-page strong{color:#1a3a1a}

/* modeloop link */
.modeloop-card{background:#fff;border:1px solid #e0ddd0;border-radius:16px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-decoration:none;color:inherit;transition:all .2s}
.modeloop-card:hover{border-color:#a0c090;transform:translateY(-1px);box-shadow:0 4px 12px rgba(30,60,20,.08)}
.ml-left{display:flex;align-items:center;gap:13px;min-width:0}
.ml-icon{width:42px;height:42px;background:linear-gradient(135deg,#1a4a2a,#2a6a3a);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;flex-shrink:0}
.ml-title{font-size:14px;font-weight:600;color:#1a3a1a;margin-bottom:1px}
.ml-sub{font-size:12px;color:#7a8a6a}
.ml-arrow{font-size:18px;color:#a0c090;flex-shrink:0}

/* feedback floating button — bottom LEFT */
.fb-fab{position:fixed;left:16px;bottom:18px;z-index:400;background:linear-gradient(135deg,#1a4a2a,#2a6a3a);color:#fff;border:none;padding:10px 16px;border-radius:100px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;display:inline-flex;align-items:center;gap:6px;box-shadow:0 6px 18px rgba(26,74,42,.28);transition:bottom .2s,box-shadow .2s,transform .2s}
.fb-fab:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(26,74,42,.35)}
/* chat FAB — bottom RIGHT */
.chat-fab{position:fixed;right:16px;bottom:18px;z-index:400;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#c4622d,#a04820);border:none;color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(196,98,45,.35);transition:bottom .2s,box-shadow .2s,transform .2s}
.chat-fab:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(196,98,45,.45)}
/* chat panel */
.chat-panel{position:fixed;right:16px;bottom:82px;z-index:410;transition:bottom .2s;width:340px;max-width:calc(100vw - 32px);max-height:min(520px,70vh);background:#fff;border-radius:18px;box-shadow:0 12px 40px rgba(20,30,15,.18);display:flex;flex-direction:column;overflow:hidden;border:1px solid #e8e4d8}
.chat-hdr{background:#1a4a2a;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.chat-hdr-title{color:#fff;font-weight:600;font-size:14px;display:flex;align-items:center;gap:7px}
.chat-hdr-close{background:rgba(255,255,255,.18);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;line-height:1}
.chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px;min-height:0}
.chat-bubble{max-width:82%;padding:9px 12px;border-radius:14px;font-size:13px;line-height:1.55;word-break:break-word;white-space:pre-wrap}
.chat-bubble.user{align-self:flex-end;background:#1a4a2a;color:#fff;border-bottom-right-radius:4px}
.chat-bubble.ai{align-self:flex-start;background:#f4f0e8;color:#1a2a1a;border-bottom-left-radius:4px}
.chat-bubble.ai.loading{opacity:.6}
.chat-input-row{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #f0ece0;flex-shrink:0;background:#faf7f0}
.chat-input{flex:1;border:1.5px solid #d0ccb8;border-radius:10px;padding:8px 11px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:#1a3a1a;background:#fff;outline:none}
.chat-input:focus{border-color:#2a6a3a}
.chat-send{background:#1a4a2a;color:#fff;border:none;border-radius:10px;padding:8px 13px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.chat-send:disabled{opacity:.5;cursor:default}
.fb-ta{width:100%;min-height:110px;padding:10px 12px;border:1.5px solid #d0ccb8;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:#1a3a1a;background:#fff;resize:vertical;box-sizing:border-box}
.fb-ta:focus{outline:none;border-color:#2a6a3a}
.fb-email{width:100%;padding:9px 12px;border:1.5px solid #d0ccb8;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;color:#1a3a1a;background:#fff;box-sizing:border-box;margin-top:10px}
.fb-email:focus{outline:none;border-color:#2a6a3a}

/* onboarding highlights */
.ob-hl{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px solid #f0ece0}
.ob-hl:last-child{border-bottom:none}
.ob-icon{width:36px;height:36px;border-radius:10px;background:#f0f5e8;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
.ob-title{font-size:14px;font-weight:600;color:#1a3a1a;margin-bottom:2px}
.ob-sub{font-size:12px;color:#6a7a5a;line-height:1.5}

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
  const [prefs, setPrefs]   = useState(() => { try { const l = localStorage.getItem(LK); return { ...DPREFS, ...(l ? { lang: l } : {}) }; } catch { return { ...DPREFS }; } });

  // plan data
  const [plan, setPlan]         = useState(null);
  const [englishPlan, setEnglishPlan] = useState(null); // always the English original for re-translation
  const [translating, setTranslating] = useState(false);
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
  const [showManage, setShowManage]   = useState(false);
  const [cancelStep, setCancelStep]   = useState("idle"); // idle | confirm | busy | done
  const [cancelErr, setCancelErr]     = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [showLangDrop, setShowLangDrop] = useState(false);
  const [fbText, setFbText]   = useState("");
  const [fbEmail, setFbEmail] = useState("");
  const [fbState, setFbState] = useState("idle"); // idle | busy | done | error
  const [fbErr, setFbErr]     = useState("");
  const [showOnboard, setShowOnboard]               = useState(false);
  const [showListTip, setShowListTip]               = useState(false);
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
  const [installPrompt, setInstallPrompt]           = useState(null);
  const [chatOpen, setChatOpen]                     = useState(false);
  const [chatMsgs, setChatMsgs]       = useState([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatMsgsEndRef = useRef(null);

  const sym    = CURRENCY[prefs.currency] || "€";
  const tsrv   = prefs.adults + (prefs.kidsDiff ? 0 : prefs.kids);
  const fabBottom = step === "mealplan" ? 90 : 18;
  const chatPanelBottom = fabBottom + 64;
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
  const t = key => (UI[prefs.lang]?.[key] ?? UI.en[key] ?? key);
  const pop = msg => { setToast(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2800); };

  // PWA install prompt
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstallPrompt(null));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Chat scroll-to-bottom
  useEffect(() => { chatMsgsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs, chatLoading]);

  // boot
  useEffect(() => {
    if (window.location.pathname === "/privacy") setStep("privacy");
    try { const s = localStorage.getItem(FK); if (s) setFavs(JSON.parse(s)); } catch {}
    try { if (!localStorage.getItem(OK)) setShowOnboard(true); } catch {}
    try { if (!localStorage.getItem(SK)) setShowListTip(true); } catch {}
    const p = loadP(); setPremium(p);
    setUsage(loadU());
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    const act = params.get("activate");
    if (act === "premium") {
      window.history.replaceState({}, document.title, window.location.pathname);
      const pd = { email: "premium@dishroll.app", id: "manual", until: Date.now() + 365 * 864e5 };
      saveP(pd); setPremium(pd);
      try { if (!localStorage.getItem(PW)) setShowPremiumWelcome(true); } catch {};
    } else if (sid) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setVerifying(true);
      fetch("/.netlify/functions/verify", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ sessionId: sid }) })
        .then(r => r.json())
        .then(d => {
          if (d.premium) { const pd = { email: d.email, id: d.customerId, subId: d.subscriptionId, until: d.validUntil }; saveP(pd); setPremium(pd); try { if (!localStorage.getItem(PW)) setShowPremiumWelcome(true); } catch {} }
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
    try { localStorage.setItem(LK, prefs.lang || "en"); } catch {}
    saveWk(key, {
      plan: p2,
      epln: englishPlan || null,
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
    const globalLang = (() => { try { return localStorage.getItem(LK) || "en"; } catch { return "en"; } })();
    const planLang = d.prefs?.lang || "en";
    setAwk(key); setPlan(d.plan); setCosts(d.costs || {});
    // Always honour the user's currently-chosen language, not the language the plan was saved in
    if (d.prefs) setPrefs({ ...DPREFS, ...d.prefs, lang: globalLang });
    setEnglishPlan(d.epln || null);
    setSl(d.sl || null); setTicked(new Set(d.ticked || [])); setCustom(d.custom || []);
    setPicked(new Set()); setKPicked(new Set(d.kPicked || [])); setErr("");
    // If the plan content is in a different language and we have the English original, re-translate now
    if (globalLang !== planLang && globalLang !== "en" && d.epln) {
      setTranslating(true);
      const days = (d.prefs?.days) || DAYS;
      const types = (d.prefs?.types) || ["dinner"];
      (async () => {
        try { setPlan(await translateMealPlan(d.epln, globalLang, days, types)); } catch {}
        setTranslating(false);
      })();
    }
    setStep("mealplan");
  }
  function openList(key) {
    const d = loadWk(key); if (!d?.sl) return;
    const globalLang = (() => { try { return localStorage.getItem(LK) || "en"; } catch { return "en"; } })();
    setAwk(key); setPlan(d.plan || null); setCosts(d.costs || {});
    if (d.prefs) setPrefs({ ...DPREFS, ...d.prefs, lang: globalLang });
    setEnglishPlan(d.epln || null);
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
      const kf = prefs.kids > 0 && prefs.kidsDiff ? `,"kidsAlt":{"name":"","description":"","mainIngredient":"","ingredients":[]}` : "";
      const kn = prefs.kids > 0 && prefs.kidsDiff ? `Each meal needs "kidsAlt" for ${prefs.kids} kids: real dish name, 1-sentence description, mainIngredient, real ingredients (mild).` : "";
      const mealShape = `{"name":"","mainIngredient":"","description":"2 sentences: method then flavour","time":"","estCost":0.00,"ingredients":[]${kf}}`;
      const daySchema = `{${prefs.types.map(t => `"${t}":${mealShape}`).join(",")}}`;
      const dJ = selDays.map(d => `"${d.toLowerCase()}":${daySchema}`).join(",");
      const varietyCap = Math.max(2, Math.ceil(selDays.length / 3));
      const varietyRule = `VARIETY:No mainIngredient more than ${varietyCap}x. Rotate proteins+bases.`;
      const raw = await callAI(
        `Meal plan. ONLY valid compact JSON, no whitespace.\n` +
        `Days:${selDays.map(d => d.slice(0,3)).join(",")}|Types:${prefs.types.join(",")}|` +
        `Cuisines:${prefs.cuisines.length ? prefs.cuisines.join(",") : "varied"}|` +
        `Dietary:${prefs.dietary.length ? prefs.dietary.join(",") : "none"}|` +
        `Adventure:${prefs.adventure}%|Servings:${tsrv}|Favs:${fh || "none"}|${bn}${cn}${kn}\n` +
        `${varietyRule}\nReturn:{${dJ}}`,
        4000
      );
      let p2 = JSON.parse(raw);
      const anyMeal = selDays.some(d => { const day = p2[d.toLowerCase()]; return day && prefs.types.some(t => day[t]?.name); });
      if (!anyMeal) throw new Error("No meals returned — please try again.");
      setEnglishPlan(p2); // always keep the English original for re-translation
      if (prefs.lang && prefs.lang !== "en") {
        try { p2 = await translateMealPlan(p2, prefs.lang, selDays, prefs.types); } catch {}
      }
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
        `Return ONLY JSON array:[{"name":"...","description":"Two sentences: ingredients/method then flavour profile.","time":"X min","estCost":0.00,"ingredients":["qty item"]},...]`,
        1200
      );
      let opts = JSON.parse(raw);
      if (prefs.lang && prefs.lang !== "en") {
        try {
          const langName = LANG_EN[prefs.lang];
          if (langName) {
            const sb = {}; opts.forEach((o, i) => { sb[i] = { n: o.name, d: o.description || "", g: o.ingredients || [] }; });
            const raw2 = await callAI(`Translate every string value to ${langName}. Return ONLY JSON with identical numeric keys and structure:\n${JSON.stringify(sb)}`, 1500);
            const tr = JSON.parse(raw2);
            opts = opts.map((o, i) => { const v = tr[i]; return v ? { ...o, ...(v.n && { name: v.n }), ...(v.d && { description: v.d }), ...(Array.isArray(v.g) && v.g.length && { ingredients: v.g }) } : o; });
          }
        } catch {}
      }
      setSwapOpts(opts);
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
      const listLang = langPrefix(prefs.lang).replace("meal names, descriptions, and ingredient names", "ingredient item names (keep category names in English)");
      const raw = await callAI(
        listLang +
        `Combine into grocery list. Merge identical items. Group by supermarket aisle.\nMeals:${JSON.stringify(items)}\n` +
        `Return ONLY JSON:{"categories":[{"name":"Produce","items":["2 onions"]},{"name":"Proteins","items":["600g chicken"]}]}\n` +
        `Categories MUST be exactly these English names:Produce,Proteins,Dairy,Grains,Pantry,Condiments,Frozen,Bakery,Beverages,Other.`,
        2400,
        prefs.lang
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
    fetchPhoto(meal.name, mt, meal.ingredients, meal.mainIngredient).then(url => {
      setRecipe(p => (p?.meal?.name === meal.name && p?.mt === mt && p?.variant === variant)
        ? { ...p, photoUrl: url || photoFallback(meal.name, mt, meal.mainIngredient), photoLd: false }
        : p);
    });
    // Recipe: detailed prompt with retry on failure
    const srv = isKids ? prefs.kids : tsrv;
    const prompt = isKids
      ? `Write a simple, fun child-friendly recipe for "${meal.name}" for ${srv} kids (ages 4–12). Use mild flavours and simple techniques a child can help with.
Return ONLY JSON:{"steps":["Step 1 with detail...","Step 2...","Step 3...","Step 4...","Step 5..."],"tip":"a fun tip for cooking with kids","prepTime":"X min","cookTime":"X min","difficulty":"Easy"}`
      : `Write a detailed, professional home cook recipe for "${meal.name}" for ${srv} servings.
Rules: each step must include exact ingredient quantities, specific cooking temperatures in °C, and precise timing. Minimum 7 steps. Be thorough — a beginner should be able to follow this exactly.
Return ONLY JSON:{"steps":["Step 1: [action] — [exact qty, temp °C if applicable, time]. [tip]","Step 2:...","Step 3:...","Step 4:...","Step 5:...","Step 6:...","Step 7:..."],"tip":"One expert chef insight specific to this dish","prepTime":"X min","cookTime":"X min","difficulty":"Easy|Medium|Hard"}`;
    const recipeLang = prefs.lang && prefs.lang !== "en" ? prefs.lang : null;
    const tryLoad = async (attempt) => {
      try {
        const raw = await callAI(prompt, 2200);
        const d = JSON.parse(raw);
        if (!d.steps || d.steps.length === 0) throw new Error("empty");
        // Two-step: translate steps and tip after generating in English
        let steps = d.steps, tip = d.tip || "";
        if (recipeLang) {
          try {
            const langName = LANG_EN[recipeLang];
            const batch = { steps: d.steps, tip: d.tip || "" };
            const tr = JSON.parse(await callAI(`Translate every string value to ${langName}. Return ONLY JSON with identical structure.\n${JSON.stringify(batch)}`, 2200, recipeLang));
            if (tr.steps?.length) steps = tr.steps;
            if (tr.tip) tip = tr.tip;
          } catch {}
        }
        setRecipe(p => (p?.meal?.name === meal.name && p?.mt === mt && p?.variant === variant)
          ? { ...p, steps, tip, prepTime: d.prepTime || "", cookTime: d.cookTime || "", difficulty: d.difficulty || "", stepsLd: false }
          : p);
      } catch (e) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 1000));
          return tryLoad(attempt + 1);
        }
        // Always show something — use ingredients list as fallback
        const fallback = meal.ingredients && meal.ingredients.length > 0
          ? [`Prepare all ingredients: ${meal.ingredients.slice(0,5).join(", ")}${meal.ingredients.length > 5 ? " and more" : ""}. Cook according to standard method for ${meal.name}. Season to taste and serve hot.`]
          : [`Cook ${meal.name} according to your preferred method. Season well and serve.`];
        setRecipe(p => (p?.meal?.name === meal.name && p?.mt === mt && p?.variant === variant)
          ? { ...p, steps: fallback, tip: "Recipe details unavailable — tap ↻ on the meal card to swap for a different dish.", stepsLd: false }
          : p);
      }
    };
    tryLoad(0);
  }

  // chat
  async function sendChat(text) {
    const userMsg = text.trim();
    if (!userMsg || chatLoading) return;
    const next = [...chatMsgs, { role: "user", content: userMsg }];
    setChatMsgs(next);
    setChatInput("");
    setChatLoading(true);
    // Build a context-aware system prompt
    const langName = LANG_EN[prefs.lang] || null;
    const planCtx = plan
      ? selDays.flatMap(d => prefs.types.map(mt => {
          const m = plan[d.toLowerCase()]?.[mt];
          return m ? `${d} ${mt}: ${m.name}` : null;
        })).filter(Boolean).join(", ")
      : null;
    const sysParts = [
      "You are DishRoll's friendly culinary assistant. Help with meal planning, recipes, cooking tips, ingredient substitutions, and food questions. Be warm, concise, and practical. Do NOT wrap answers in JSON.",
      langName ? `Always respond in ${langName}.` : "",
      planCtx ? `The user's current meal plan: ${planCtx}.` : "",
    ].filter(Boolean);
    try {
      const r = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-12), // keep last 12 turns to stay within tokens
          maxTokens: 500,
          systemPrompt: sysParts.join(" "),
        }),
      });
      const d = await r.json();
      const reply = d.text || d.error || "Sorry, I couldn't respond right now.";
      setChatMsgs(m => [...m, { role: "assistant", content: reply }]);
    } catch {
      setChatMsgs(m => [...m, { role: "assistant", content: "Connection error — please try again." }]);
    }
    setChatLoading(false);
  }

  // checkout
  function startCheckout() {
    track("upgrade_clicked", { from: step });
    window.location.href = "https://buy.stripe.com/dRmfZidobbBQeWZaIx2Ry02";
  }

  function fmtDate(ms) {
    if (!ms) return "—";
    try { return new Date(ms).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return "—"; }
  }

  async function sendFeedback() {
    const text = fbText.trim();
    if (!text) { setFbErr("Please enter some feedback first."); return; }
    setFbState("busy"); setFbErr("");
    track("feedback_submitted", { length: text.length, hasEmail: !!fbEmail.trim() });
    try {
      const r = await fetch("/.netlify/functions/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: text,
          email: fbEmail.trim() || null,
          meta: { version: APP_VERSION, path: window.location.pathname },
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) throw new Error(d.error || "Send failed");
      setFbState("done");
      setTimeout(() => {
        setShowFeedback(false);
        setFbText(""); setFbEmail(""); setFbState("idle");
      }, 1800);
    } catch (e) {
      setFbErr(e.message || "Could not send — please try again later.");
      setFbState("idle");
    }
  }

  async function cancelSubscription() {
    if (!premium?.subId) {
      setCancelErr("We couldn't find your subscription reference on this device. Please email support@dishroll.app from the email on your subscription and we'll cancel it for you.");
      return;
    }
    setCancelStep("busy"); setCancelErr("");
    track("subscription_cancel_attempt");
    try {
      const r = await fetch("/.netlify/functions/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: premium.subId }),
      });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "Cancel failed");
      const pd = { ...premium, cancelled: true, cancelledAt: Date.now(), until: d.accessUntil || premium.until };
      saveP(pd); setPremium(pd);
      setCancelStep("done");
      track("subscription_cancelled");
    } catch (e) {
      setCancelErr(e.message || "Something went wrong. Please try again or email support@dishroll.app.");
      setCancelStep("confirm");
    }
  }

  // ─── MEAL CARD (with lazy thumbnail) ────────────────────────────────────────
  function MealCard({ meal, mt, k, isSel, isFav, cFlag, cuisine, onPick, onRecipe, onFav, onSwap, sym, costs, prefs, tsrv }) {
    const [imgSrc, setImgSrc] = useState(() => photoFallback(meal.name, mt, meal.mainIngredient));
    const [imgDead, setImgDead] = useState(false);
    useEffect(() => {
      const fb = photoFallback(meal.name, mt, meal.mainIngredient);
      setImgSrc(fb);
      setImgDead(false);
      let alive = true;
      fetchPhoto(meal.name, mt, meal.ingredients, meal.mainIngredient).then(url => {
        if (alive && url && url !== fb) setImgSrc(url);
      });
      return () => { alive = false; };
    }, [meal.name, mt]);
    const handleImgErr = () => {
      if (imgSrc !== PHOTO_MAP.default) { setImgSrc(PHOTO_MAP.default); }
      else { setImgDead(true); }
    };

    // Ensure proper spacing in meal name (guard against AI-generated camelCase or missing spaces)
    const displayName = meal.name
      .replace(/([a-z])([A-Z])/g, "$1 $2")   // camelCase → spaced
      .replace(/\s+/g, " ")                    // collapse multiple spaces
      .trim();

    return (
      <div className={`meal-card${isSel?" picked":""}`} onClick={onPick}>
        {isSel && <div className="card-sel-badge">✓</div>}
        <div className="meal-card-top">
          {/* Photo box with flag overlay */}
          <div className="meal-card-img-box">
            {!imgDead && imgSrc
              ? <img src={imgSrc} alt={displayName} className="meal-card-thumb" onError={handleImgErr} />
              : <div className="meal-card-thumb-blank" />
            }
            {/* Flag always shown as overlay badge */}
            <div className="meal-card-flag-badge">{cFlag}</div>
          </div>
          {/* Title block */}
          <div className="meal-card-title-wrap">
            {cuisine && <div className="meal-card-cuisine">{cuisine}</div>}
            <div className="meal-card-name" onClick={e=>{e.stopPropagation();onRecipe();}}>{displayName}</div>
            {isFav && <div className="card-fav-dot">⭐</div>}
          </div>
        </div>
        {meal.description && <div className="meal-card-desc">{meal.description}</div>}
        <div className="meal-card-footer">
          <div className="meal-card-pills">
            {meal.time && <span className="meal-pill-item">⏱ {meal.time}</span>}
            {tsrv>1 && <span className="meal-pill-item">👥 {tsrv}</span>}
            {prefs.budgetOn && costs[k]!=null && <span className="meal-pill-item green">💰 {sym}{costs[k]}</span>}
            {isSel && <span className="meal-pill-item green">✓ In basket</span>}
          </div>
          <div className="meal-card-actions" onClick={e=>e.stopPropagation()}>
            <button className="meal-action-btn" title={isFav?"Remove favourite":"Add favourite"} onClick={onFav}>{isFav?"⭐":"☆"}</button>
            <button className="meal-action-btn" title="View recipe" onClick={onRecipe}>📖</button>
            <button className="meal-action-btn" title="Swap meal" onClick={onSwap}>↻</button>
          </div>
        </div>
      </div>
    );
  }

  function KidsCard({ kname, kdesc, kmain, kings, kSel, kk, prefs, mt, onPick, onRecipe }) {
    const [imgSrc, setImgSrc] = useState(() => photoFallback(kname, mt, kmain));
    const [imgDead, setImgDead] = useState(false);
    useEffect(() => {
      const fb = photoFallback(kname, mt, kmain);
      setImgSrc(fb);
      setImgDead(false);
      let alive = true;
      fetchPhoto(kname, mt, kings, kmain).then(url => {
        if (alive && url && url !== fb) setImgSrc(url);
      });
      return () => { alive = false; };
    }, [kname, mt]);
    const handleImgErr = () => {
      if (imgSrc !== PHOTO_MAP.default) { setImgSrc(PHOTO_MAP.default); }
      else { setImgDead(true); }
    };
    return (
      <div className={`meal-card kids-card${kSel?" picked":""}`} style={{ marginTop:8 }} onClick={onPick}>
        {kSel && <div className="card-sel-badge kids">✓</div>}
        <div className="meal-card-top">
          <div className="meal-card-img-box">
            {!imgDead && imgSrc
              ? <img src={imgSrc} alt={kname} className="meal-card-thumb" onError={handleImgErr} />
              : <div className="meal-card-thumb-blank" />
            }
            <div className="meal-card-flag-badge">👧</div>
          </div>
          <div className="meal-card-title-wrap">
            <div className="kids-badge">Kids · {prefs.kids} portion{prefs.kids>1?"s":""}</div>
            <div className="meal-card-name" style={{ color:"#2a5a1a" }} onClick={e=>{ e.stopPropagation(); onRecipe(); }}>{kname}</div>
          </div>
        </div>
        {kdesc && <div className="meal-card-desc">{kdesc}</div>}
        <div className="meal-card-footer">
          <div className="meal-card-pills">
            <span className="meal-pill-item">🥗 Child-friendly</span>
            {kSel && <span className="meal-pill-item green">✓ In basket</span>}
          </div>
          <div className="meal-card-actions" onClick={e=>e.stopPropagation()}>
            <button className="meal-action-btn" onClick={e=>{ e.stopPropagation(); onRecipe(); }}>📖</button>
          </div>
        </div>
      </div>
    );
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
          <div className="land-ai-badge">✦ AI-Powered</div>
          <div className="land-tagline">{t("hero1")}</div>
          <div className="land-h1">{t("hero2")}<br /><em>{t("hero2em")}</em></div>
          <p className="land-sub">{t("hero3")}</p>
          {!cwd && (
            <div className="land-cta">
              <button className="land-cta-p" onClick={() => newRoll(ck)}>{t("planThisWeek")}</button>
              {!isPro && <button className="land-cta-s" onClick={() => setShowPaywall(true)}>{t("goPremium")}</button>}
            </div>
          )}
          {installPrompt && (
            <button className="install-btn" onClick={() => {
              installPrompt.prompt();
              installPrompt.userChoice.then(() => setInstallPrompt(null));
            }}>{t("installApp")}</button>
          )}
        </div>

        {/* AI feature highlights */}
        <div className="ai-features">
          <div className="ai-feat">
            <div className="ai-feat-icon">🤖</div>
            <div><div className="ai-feat-text">AI Meal Plans</div><div className="ai-feat-sub">Personalised to your tastes & household</div></div>
          </div>
          <div className="ai-feat">
            <div className="ai-feat-icon">📖</div>
            <div><div className="ai-feat-text">Instant Recipes</div><div className="ai-feat-sub">Step-by-step for every meal</div></div>
          </div>
          <div className="ai-feat">
            <div className="ai-feat-icon">💬</div>
            <div><div className="ai-feat-text">AI Chef Chat</div><div className="ai-feat-sub">Ask anything, anytime</div></div>
          </div>
        </div>

        {/* Plan status strip */}
        {isPro ? (
          <div className="plan-strip premium">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.6)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>✨ DishRoll Premium</div>
              <div style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>
                {premium?.cancelled
                  ? <>Cancelled · access until {fmtDate(premium.until)}</>
                  : <>Unlimited rolls · {premium?.email || "Active"}</>
                }
              </div>
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.75)", cursor: "pointer", textDecoration: "underline" }} onClick={() => { setCancelStep("idle"); setCancelErr(""); setShowManage(true); }}>Manage</span>
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
          <div className="cw-eyebrow">{t("thisWeek")}</div>
          <div className="cw-range">{wLabel(ck)}</div>
          <div className="cw-status">{cwd ? t("alreadyPlanned") : t("notPlanned")}</div>
          {cwSample.length > 0 && (
            <div className="cw-meal-pills">
              {cwSample.map((n, i) => <span key={i} className="cw-pill">{n}</span>)}
              {Object.keys(cwd?.plan || {}).length > 3 && <span className="cw-pill">+ more</span>}
            </div>
          )}
          <div className="cw-actions">
            {cwd && <button className="cw-btn-p" onClick={() => openPlan(ck)}>{t("openPlan")}</button>}
            <button className={cwd ? "cw-btn-s" : "cw-btn-p"} onClick={() => newRoll(ck)}>{cwd ? t("planAgain") : t("planThisWeek")}</button>
          </div>
        </div>

        {/* List strip */}
        {hasList && (
          <div className="list-strip" onClick={() => openList(ck)}>
            <div className="ls-left">
              <div className="ls-icon">🛒</div>
              <div><div className="ls-title">{t("shoppingList")}</div><div className="ls-sub">{wLabel(ck)}</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {li > 0 && <span className="ls-prog">{ld}/{li} done</span>}
              <span style={{ fontSize: 18, color: "#a0c090" }}>›</span>
            </div>
          </div>
        )}

        {/* Week timeline */}
        <div className="wt-title">{t("yourWeeks")}</div>
        <div className="wt-scroll" style={{ marginBottom: 28 }}>
          {ckKeys.map(key => {
            const d = loadWk(key); const isC = isCW(key); const isF = isFW(key); const s = sample(d);
            const cls = ["wk", isC ? "cur" : d ? "has" : "empty"].join(" ");
            return (
              <div key={key} className={cls} onClick={() => d && !isF && cdel !== key && openPlan(key)}>
                {isC && <span className="wk-badge now">{t("thisWeek")}</span>}
                {!isC && d && <span className="wk-badge saved">{t("saved")}</span>}
                {d && cdel !== key && <button className="wk-del" onClick={e => { e.stopPropagation(); setCdel(key); }} title="Delete week">✕</button>}
                <div className="wk-dot" />
                <div className="wk-lbl">{isF ? t("upcoming") : isC ? "Current" : new Date(key + "T00:00:00").toLocaleDateString("en-IE", { month: "short", year: "numeric" })}</div>
                <div className="wk-dates">
                  {(() => { const m = new Date(key + "T00:00:00"); const s2 = new Date(m); s2.setDate(m.getDate() + 6); const f = d2 => d2.toLocaleDateString("en-IE", { day: "numeric", month: "short" }); return `${f(m)} – ${f(s2)}`; })()}
                </div>
                {d && s.length > 0 && <div className="wk-meals">{s.map((n, i) => <div key={i} className="wk-meal">{n}</div>)}</div>}
                {!d && <div className="wk-empty-txt">{isF ? t("planAhead") : t("tapToPlan")}</div>}
                <div className="wk-acts" onClick={e => e.stopPropagation()}>
                  {cdel === key ? (
                    <>
                      <button className="wk-btn" style={{ color:"#b04020", borderColor:"#b04020", flex:1 }} onClick={() => { delWk(key); setCdel(null); pop(t("weekDeleted")); setStep(s => s); }}>{t("confirm")}</button>
                      <button className="wk-btn" onClick={() => setCdel(null)}>{t("cancel")}</button>
                    </>
                  ) : (
                    <>
                      {d && <button className="wk-btn pri" onClick={() => openPlan(key)}>{t("open")}</button>}
                      {d?.sl && <button className="wk-btn" onClick={() => openList(key)}>{t("list")}</button>}
                      <button className="wk-btn" onClick={() => newRoll(key)}>{d ? t("replan") : t("plan")}</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Discover more products */}
        <a
          className="modeloop-card"
          href="https://asadov-stack.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => window.track && window.track("modeloop_click", { from: "landing" })}
        >
          <div className="ml-left">
            <div className="ml-icon">✦</div>
            <div>
              <div className="ml-title">Discover more on ModeLoop</div>
              <div className="ml-sub">Explore other products we're building</div>
            </div>
          </div>
          <span className="ml-arrow">›</span>
        </a>

        {/* Footer */}
        <div className="land-footer">
          <span className="land-footer-v">DishRoll v{APP_VERSION}</span>
          <button className="land-footer-link" onClick={() => { window.history.pushState({}, "", "/privacy"); setStep("privacy"); }}>Privacy Policy</button>
          <button className="btn-update" onClick={forceUpdate} disabled={updating}>
            <span className={updating ? "spinning" : ""} style={{ display: "inline-block" }}>↻</span>
            {updating ? "Updating…" : "Force update"}
          </button>
        </div>
      </div>
    );
  }

  // ─── PRIVACY POLICY ─────────────────────────────────────────────────────────
  function PrivacyPolicyView() {
    return (
      <div className="privacy-page">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }} onClick={() => { window.history.pushState({}, "", "/"); setStep("landing"); }}>← Home</button>
        <h1>Privacy Policy</h1>
        <p className="prv-date"><strong>Effective date: 2 June 2026</strong></p>

        <p>This Privacy Policy explains how DishRoll ("DishRoll," "we," "us," or "our") collects, uses, and protects your information when you use the DishRoll application and website at https://dishroll.app (the "Service"). By using the Service, you agree to the practices described here.</p>

        <h2>Information we collect</h2>
        <p><strong>Usage data.</strong> We automatically collect limited technical information such as device type, browser, general usage activity, and log data to operate, secure, and improve the Service.</p>
        <p><strong>Analytics data.</strong> We use Google Analytics to understand aggregate usage and improve the Service. Google Analytics collects information such as how often you visit the Service and what actions you take.</p>
        <p><strong>Payment information.</strong> If you subscribe to a paid plan, payments are processed by Stripe. We do not collect or store your full payment card details on our servers; that information is handled directly by Stripe under its own terms and privacy policy.</p>
        <p><strong>AI inputs.</strong> When you use AI-powered features (meal planning, recipe generation, chat), the meal preferences and messages you provide are transmitted to our AI provider solely to generate results for you. We do not store these inputs beyond what is necessary to produce the response.</p>

        <h2>How we use your information</h2>
        <p>We use the information we collect to provide and maintain the Service, process payments, generate personalised meal plans and recipes via AI, communicate with you about the Service, and analyse and improve features, performance, and security.</p>

        <h2>How we share information</h2>
        <p>We do not sell your personal information. We share information only with service providers who help us operate the Service, who process data on our behalf under their own privacy and security obligations:</p>
        <ul>
          <li><strong>Netlify</strong> — hosting and infrastructure</li>
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>Groq</strong> — AI inference (meal plans, recipes, chat)</li>
          <li><strong>Google Analytics</strong> — aggregate usage analytics</li>
        </ul>
        <p>We may also disclose information where required by law.</p>

        <h2>AI-generated content</h2>
        <p>DishRoll uses Groq's AI services (powered by Meta's Llama models) to generate meal plans, recipes, and chat responses. Inputs you provide for these features may be transmitted to Groq solely to produce results for you. Please do not include sensitive personal information in your meal preferences or chat messages.</p>

        <h2>Data retention</h2>
        <p>Meal plan data is stored locally on your device (browser localStorage) and is not transmitted to our servers. We retain other information for as long as needed to provide the Service and for legitimate or legal purposes.</p>

        <h2>Your rights</h2>
        <p>Depending on your location, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing. To exercise these rights, contact us at <strong>support@dishroll.app</strong>.</p>

        <h2>Security</h2>
        <p>We use reasonable technical and organisational measures to protect your information. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.</p>

        <h2>Children's privacy</h2>
        <p>DishRoll is not directed to children under 13 (or the minimum age required in your jurisdiction), and we do not knowingly collect personal information from them. If you believe a child has provided us personal information, contact us and we will delete it.</p>

        <h2>International users</h2>
        <p>Your information may be processed and stored in countries other than your own, which may have different data-protection laws. By using the Service you consent to such processing.</p>

        <h2>Changes to this policy</h2>
        <p>We may update this Privacy Policy from time to time. Material changes will be posted on this page with a revised effective date.</p>

        <h2>Contact us</h2>
        <p>If you have questions about this Privacy Policy, contact us at <strong>support@dishroll.app</strong>.</p>
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
                <div className="recipe-section">{t("ingredients")} — {srv} {srv !== 1 ? t("servingsP") : t("servings")}</div>
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
            <div className="recipe-section">{t("howToCook")}</div>
            {stepsLd
              ? <div className="recipe-loading"><div className="spin-ring" /><span>{t("fetchingRecipe")}</span></div>
              : <div>
                  {steps.map((s, i) => (
                    <div key={i} className="recipe-step">
                      <div className="recipe-step-n">{i + 1}</div>
                      <div className="recipe-step-txt">{s}</div>
                    </div>
                  ))}
                  {tip && <div className="recipe-tip">{t("chefsTip")} {tip}</div>}
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
          <div className="modal-title">{t("replaceWith")} {swap.mt}</div>
          <div className="modal-sub">{swap.day} · <strong>{cur?.name}</strong></div>
          {swapLd
            ? <div className="swap-loading"><div className="swap-loading-icon">🍽️</div><div style={{ fontSize: 13, color: "#6a7a5a", marginTop: 9 }}>{t("findingAlts")}</div></div>
            : swapOpts.length === 0
              ? <div style={{ color: "#6a7a5a", fontSize: 13, padding: "10px 0" }}>{t("noAlts")}</div>
              : swapOpts.map((o, i) => (
                  <div key={i} className="swap-opt" onClick={() => applySwap(o)}>
                    <div className="swap-name">{o.name}</div>
                    <div className="swap-desc">{o.description}</div>
                    <div className="swap-meta"><span>⏱ {o.time}</span>{prefs.budgetOn && o.estCost != null && <span>💰 {sym}{o.estCost}</span>}</div>
                  </div>
                ))
          }
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setSwap(null)}>{t("cancel")}</button>
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

  // ─── MANAGE SUBSCRIPTION MODAL ──────────────────────────────────────────────
  function ManageModal() {
    if (!showManage) return null;
    const close = () => { if (cancelStep !== "busy") setShowManage(false); };
    const cancelled = !!premium?.cancelled;

    return (
      <div className="modal-overlay" onClick={close}>
        <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
          <div className="modal-title">Manage Premium</div>

          {cancelStep === "confirm" ? (
            <>
              <div style={{ fontSize: 14, color: "#3a4a2a", lineHeight: 1.6, marginBottom: 14 }}>
                Your subscription will be cancelled and <strong>won't renew</strong>. You'll keep Premium access until{" "}
                <strong>{fmtDate(premium?.until)}</strong>.
              </div>
              <div style={{ fontSize: 12, color: "#8a6a3a", background: "#fff6e8", border: "1px solid #f0d8a8", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
                ⚠ No refund will be issued for the current billing period.
              </div>
              {cancelErr && <div style={{ fontSize: 12, color: "#b04020", marginBottom: 10 }}>{cancelErr}</div>}
              <button className="paywall-cta" style={{ background: "#b04020" }} onClick={cancelSubscription}>Yes, cancel subscription</button>
              <button className="paywall-skip" onClick={() => setCancelStep("idle")}>Keep subscription</button>
            </>
          ) : cancelStep === "busy" ? (
            <div style={{ padding: "20px 0", textAlign: "center" }}>
              <div className="swap-loading-icon">⏳</div>
              <div style={{ fontSize: 13, color: "#6a7a5a", marginTop: 10 }}>Cancelling your subscription…</div>
            </div>
          ) : cancelStep === "done" ? (
            <>
              <div style={{ fontSize: 14, color: "#2a6a3a", lineHeight: 1.6, marginBottom: 12 }}>
                ✓ Your subscription has been cancelled.
              </div>
              <div style={{ fontSize: 13, color: "#3a4a2a", lineHeight: 1.6, marginBottom: 16 }}>
                You'll keep Premium access until <strong>{fmtDate(premium?.until)}</strong>. No further charges will be made.
              </div>
              <button className="paywall-cta" onClick={() => { setShowManage(false); pop("Subscription cancelled."); }}>Done</button>
            </>
          ) : (
            <>
              <div style={{ background: "#f4f8ec", borderRadius: 12, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "#3a4a2a", lineHeight: 1.7 }}>
                <div><span style={{ color: "#7a8a6a" }}>Email:</span> <strong>{premium?.email || "—"}</strong></div>
                <div>
                  <span style={{ color: "#7a8a6a" }}>Status:</span>{" "}
                  <strong style={{ color: cancelled ? "#b06a20" : "#2a6a3a" }}>
                    {cancelled ? "Cancelled" : "Active"}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#7a8a6a" }}>{cancelled ? "Access until:" : "Renews:"}</span>{" "}
                  <strong>{fmtDate(premium?.until)}</strong>
                </div>
              </div>

              {cancelErr && <div style={{ fontSize: 12, color: "#b04020", marginBottom: 10 }}>{cancelErr}</div>}

              {!cancelled && (
                <button className="paywall-cta" style={{ background: "#b04020" }} onClick={() => { setCancelErr(""); setCancelStep("confirm"); }}>
                  Cancel subscription
                </button>
              )}
              {cancelled && (
                <button className="paywall-cta" onClick={startCheckout}>Resubscribe</button>
              )}
              <button className="paywall-skip" style={{ color: "#8a9a7a" }} onClick={() => { clearP(); setPremium(null); setShowManage(false); pop("Removed from this device."); }}>
                Remove from this device only
              </button>
              <button className="paywall-skip" onClick={close}>Close</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── FEEDBACK MODAL ─────────────────────────────────────────────────────────
  function FeedbackModal() {
    if (!showFeedback) return null;
    const close = () => { if (fbState !== "busy") { setShowFeedback(false); setFbErr(""); } };
    return (
      <div className="modal-overlay" onClick={close}>
        <div className="modal-box" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
          <div className="modal-title">Send feedback</div>
          {fbState === "done" ? (
            <div style={{ padding: "24px 0", textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>🙏</div>
              <div style={{ fontSize: 14, color: "#2a6a3a", fontWeight: 600 }}>Thanks — we've got your feedback.</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: "#5a6a4a", lineHeight: 1.6, marginBottom: 12 }}>
                Love something, found a bug, have an idea? Tell us — we read everything.
              </div>
              <textarea
                className="fb-ta"
                placeholder="What's on your mind?"
                value={fbText}
                onChange={e => setFbText(e.target.value)}
                maxLength={4000}
                disabled={fbState === "busy"}
              />
              <input
                className="fb-email"
                type="email"
                placeholder="Your email (optional — for a reply)"
                value={fbEmail}
                onChange={e => setFbEmail(e.target.value)}
                disabled={fbState === "busy"}
              />
              {fbErr && <div style={{ fontSize: 12, color: "#b04020", marginTop: 10 }}>{fbErr}</div>}
              <button className="paywall-cta" style={{ marginTop: 14 }} onClick={sendFeedback} disabled={fbState === "busy" || !fbText.trim()}>
                {fbState === "busy" ? "Sending…" : "Send feedback"}
              </button>
              <button className="paywall-skip" onClick={close} disabled={fbState === "busy"}>Cancel</button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── CHAT GREETING (computed inline to avoid nested-component remount) ────────
  const chatGreeting = LANG_EN[prefs.lang]
    ? { es:"Hola! Soy tu asistente culinario. ¿En qué puedo ayudarte?", fr:"Bonjour! Je suis votre assistant culinaire. Comment puis-je vous aider?", de:"Hallo! Ich bin dein kulinarischer Assistent. Wie kann ich helfen?", uk:"Привіт! Я ваш кулінарний помічник. Чим можу допомогти?", pt:"Olá! Sou o teu assistente culinário. Como posso ajudar?", it:"Ciao! Sono il tuo assistente culinario. Come posso aiutarti?", nl:"Hallo! Ik ben uw culinaire assistent. Hoe kan ik helpen?", tr:"Merhaba! Mutfak asistanınım. Nasıl yardımcı olabilirim?", zh:"你好！我是你的美食助手，有什么可以帮你的？", ar:"مرحباً! أنا مساعدك في الطهي. كيف يمكنني مساعدتك؟", hi:"नमस्ते! मैं आपका पाक सहायक हूँ। मैं आपकी कैसे मदद कर सकता हूँ?", ru:"Привет! Я ваш кулинарный помощник. Как могу помочь?"}[prefs.lang] || "Hi! I'm your culinary assistant. Ask me about meals, recipes, or cooking tips."
    : "Hi! I'm your culinary assistant. Ask me about meals, recipes, or cooking tips.";
  const chatHandleKey = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } };

  // ─── ONBOARDING MODAL ───────────────────────────────────────────────────────
  function OnboardingModal() {
    if (!showOnboard) return null;
    const dismiss = () => {
      try { localStorage.setItem(OK, "1"); } catch {}
      setShowOnboard(false);
      track("onboarding_dismissed");
    };
    return (
      <div className="modal-overlay" onClick={dismiss}>
        <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <img src="/logo.png" alt="DishRoll" style={{ width: 72, height: "auto", margin: "0 auto 8px", display: "block" }} />
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, color: "#1a3a1a" }}>Welcome to DishRoll</div>
            <div style={{ fontSize: 13, color: "#6a7a5a" }}>Roll your week. Eat well.</div>
          </div>
          {[
            { icon:"🎲", title: t("ob1title"), sub: t("ob1sub") },
            { icon:"🛒", title: t("ob2title"), sub: t("ob2sub") },
            { icon:"👩‍🍳", title: t("ob3title"), sub: t("ob3sub") },
            { icon:"💬", title: t("ob4title"), sub: t("ob4sub") },
          ].map(({ icon, title, sub }) => (
            <div key={title} className="ob-hl">
              <div className="ob-icon">{icon}</div>
              <div><div className="ob-title">{title}</div><div className="ob-sub">{sub}</div></div>
            </div>
          ))}
          <button className="paywall-cta" style={{ marginTop: 18 }} onClick={dismiss}>{t("letsRoll")}</button>
        </div>
      </div>
    );
  }

  // ─── PREMIUM WELCOME MODAL ──────────────────────────────────────────────────
  function PremiumWelcomeModal() {
    if (!showPremiumWelcome) return null;
    const dismiss = () => {
      try { localStorage.setItem(PW, "1"); } catch {}
      setShowPremiumWelcome(false);
      track("premium_welcome_dismissed");
    };
    return (
      <div className="modal-overlay" onClick={dismiss}>
        <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, color: "#1a3a1a" }}>{t("premiumWelcomeTitle")}</div>
            <div style={{ fontSize: 13, color: "#6a7a5a", marginTop: 4 }}>{t("premiumWelcomeSub")}</div>
          </div>
          {[
            { icon:"♾️",  text: t("premiumF1") },
            { icon:"📅",  text: t("premiumF2") },
            { icon:"👧",  text: t("premiumF3") },
            { icon:"💬",  text: t("premiumF4") },
          ].map(({ icon, text }) => (
            <div key={text} className="ob-hl">
              <div className="ob-icon" style={{ background: "linear-gradient(135deg,#e8f5e9,#c8e6c9)" }}>{icon}</div>
              <div style={{ display:"flex", alignItems:"center" }}><div className="ob-title" style={{ marginBottom: 0 }}>{text}</div></div>
            </div>
          ))}
          <button className="paywall-cta" style={{ marginTop: 18, background: "linear-gradient(135deg,#2a6a3a,#1a4a2a)" }} onClick={dismiss}>{t("premiumStartPlanning")}</button>
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
            <div><div className="list-title">{t("shoppingListTitle")}</div><div className="list-range">{awk ? wLabel(awk) : ""}</div></div>
            <button className="btn btn-ghost btn-sm" style={{ color: "rgba(255,255,255,.8)", borderColor: "rgba(255,255,255,.3)", background: "rgba(255,255,255,.1)" }} onClick={() => setStep(plan ? "mealplan" : "landing")}>← {plan ? t("plan") : t("home").replace("← ","")}</button>
          </div>
          <div className="list-prog-track"><div className="list-prog-fill" style={{ width: totalItems > 0 ? `${Math.round((doneCount / totalItems) * 100)}%` : "0%" }} /></div>
          <div className="list-prog-txt"><span>{doneCount} of {totalItems} items</span><span>{totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0}% done</span></div>
          <div className="list-actions">
            <button className="list-act-btn" onClick={() => { setTicked(new Set()); persist(plan, costs, sl, new Set(), custom, kPicked); pop("All items unmarked"); }}>{t("reset")}</button>
            <button className="list-act-btn" onClick={() => { const txt = sl.categories.map(c => `${c.name}:\n${c.items.map(i => "• " + i).join("\n")}`).join("\n\n") + (custom.length ? "\nMy additions:\n" + custom.map(c => "• " + c.text).join("\n") : ""); navigator.clipboard.writeText(txt); pop("List copied"); }}>{t("copyList")}</button>
            <button className="list-act-btn" onClick={() => setStep("landing")}>🏠 Home</button>
          </div>
        </div>
        {showListTip && (
          <div className="list-tip-banner">
            <span className="list-tip-icon">💡</span>
            <span className="list-tip-text">{t("listTipText")}</span>
            <button className="list-tip-dismiss" onClick={() => { try { localStorage.setItem(SK, "1"); } catch {} setShowListTip(false); }}>{t("gotIt")}</button>
          </div>
        )}
        {allDone && <div className="all-done"><div className="all-done-icon">🎉</div><div className="all-done-title">{t("allDone")}</div><div className="all-done-sub">{t("allDoneSub")}</div></div>}
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
          <input className="add-inp" placeholder={t("addItem")} value={addTxt} onChange={e => setAddTxt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && addTxt.trim()) { const nc = [...custom, { id: "c-" + Date.now(), text: addTxt.trim() }]; setCustom(nc); setAddTxt(""); persist(plan, costs, sl, ticked, nc, kPicked); } }} />
          <button className="add-btn" onClick={() => { if (addTxt.trim()) { const nc = [...custom, { id: "c-" + Date.now(), text: addTxt.trim() }]; setCustom(nc); setAddTxt(""); persist(plan, costs, sl, ticked, nc, kPicked); } }}>{t("addItemBtn")}</button>
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
            <div className="lang-wrap">
              {showLangDrop && <div style={{position:"fixed",inset:0,zIndex:199}} onClick={() => setShowLangDrop(false)} />}
              <button className="lang-btn" onClick={() => setShowLangDrop(v => !v)}>
                {translating
                  ? <span style={{fontSize:11,opacity:.8}}>…</span>
                  : (() => { const l = LANGUAGES.find(x => x.code === (prefs.lang || "en")) || LANGUAGES[0]; return (<>{l.flag ? <span>{l.flag}</span> : <span style={{fontWeight:800,fontSize:11}}>RU</span>}<span className="lang-code">{l.code.toUpperCase()}</span></>); })()
                }
              </button>
              {showLangDrop && (
                <div className="lang-drop">
                  {LANGUAGES.map(l => (
                    <div key={l.code} className={`lang-opt${prefs.lang === l.code ? " active" : ""}`}
                      onClick={() => {
                        const code = l.code;
                        sp("lang", code);
                        try { localStorage.setItem(LK, code); } catch {}
                        setShowLangDrop(false);
                        if (englishPlan) {
                          setTranslating(true);
                          (async () => {
                            try {
                              setPlan(code === "en" ? englishPlan : await translateMealPlan(englishPlan, code, selDays, prefs.types));
                            } catch {}
                            setTranslating(false);
                          })();
                        }
                      }}>
                      {l.flag ? <span>{l.flag}</span> : <span style={{fontWeight:700,fontSize:11,color:"#888",minWidth:20}}>RU</span>}
                      {l.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {sl && step !== "list" && step !== "privacy" && <button className="btn btn-ghost btn-sm" style={{color:"#fff",borderColor:"rgba(255,165,0,.7)",background:"rgba(196,98,45,.55)",fontWeight:700}} onClick={() => setStep("list")}>🛒<span style={{marginLeft:4}}>{t("list")}{doneCount > 0 ? ` (${doneCount}/${totalItems})` : ""}</span></button>}
            {step !== "landing" && step !== "generating" && step !== "privacy" && <button className="btn btn-ghost btn-sm" style={{color:"rgba(255,255,255,.9)",borderColor:"rgba(255,255,255,.35)",background:"rgba(255,255,255,.1)"}} onClick={() => setStep("landing")}>{t("home")}</button>}
          </div>
        </div>

        {/* Progress */}
        {!["landing","generating","mealplan","list","privacy"].includes(step) && <div className="pb"><div className="pf" style={{ width: prog + "%" }} /></div>}

        <div className="page">

          {/* LANDING */}
          {step === "landing" && <Landing />}

          {/* PRIVACY */}
          {step === "privacy" && <PrivacyPolicyView />}

          {/* LIST */}
          {step === "list" && <ListView />}

          {/* Week context */}
          {awk && step === "mealplan" && (
            <div className="wk-ctx">
              <span>{isCW(awk) ? "📅 " + t("thisWeek") : "📅 " + wLabel(awk)} · {t("autoSaved")}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep("landing")}>{t("calendar")}</button>
            </div>
          )}

          {/* WELCOME */}
          {step === "welcome" && (
            <div>
              <div style={{ textAlign: "center", paddingTop: 10, marginBottom: 24 }}>
                <div className="page-title">{t("step1title")}<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>{t("step1em")}</span></div>
                {awk && <p style={{ fontSize: 13, color: "#5a6a4a", marginTop: 6 }}>📅 {wLabel(awk)}</p>}
              </div>
              <div className="card">
                <div className="label">{t("step1q")}</div>
                <div className="mt-grid">
                  {[{ id:"dinner", icon:"🌙", label:t("dinnerOnly"), sub:t("dinnerOnlySub") }, { id:"all", icon:"☀️", label:t("allMeals"), sub:t("allMealsSub") }, { id:"custom", icon:"✏️", label:t("custom"), sub:t("customSub") }].map(o => (
                    <div key={o.id} className={`mt-card${prefs.scope === o.id ? " sel" : ""}`} onClick={() => setScope(o.id)}>
                      <div className="mt-icon">{o.icon}</div><div className="mt-label">{o.label}</div><div className="mt-sub">{o.sub}</div>
                    </div>
                  ))}
                </div>
                {prefs.scope === "custom" && (
                  <div style={{ marginTop: 13 }}>
                    <div className="label">{t("mealTypes")}</div>
                    <div className="chip-group">{["breakfast","lunch","dinner"].map(t => <div key={t} className={`chip${prefs.types.includes(t) ? " sel" : ""}`} onClick={() => toggleType(t)} style={{ textTransform: "capitalize" }}>{ML[t]}</div>)}</div>
                  </div>
                )}
              </div>
              {favs.length > 0 && <div className="notice">⭐ {favs.length} {favs.length > 1 ? t("favSavedP") : t("favSaved")} {t("favRollIn")}</div>}
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("landing")}>{t("back")}</button><button className="btn btn-primary" onClick={() => setStep("days")}>{t("continue")}</button></div>
            </div>
          )}

          {/* DAYS */}
          {step === "days" && (
            <div>
              <div className="page-title">{t("step2title")}<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>{t("step2em")}</span></div>
              <p className="page-sub">{t("step2hint")}</p>
              <div className="card">
                <div className="label">{t("selectDays")} — {selDays.length} of 7</div>
                <div className="day-grid">
                  {DAYS.map(d => (
                    <div key={d} className={`day-chip${selDays.includes(d) ? " sel" : ""}`} onClick={() => toggleDay(d)}>
                      <div className="dl">{d.slice(0, 1)}</div>
                      <div className="dn">{DAY3[d]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 7, marginTop: 11 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => sp("days", [...DAYS])}>{t("all7")}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => sp("days", ["Monday","Tuesday","Wednesday","Thursday","Friday"])}>{t("weekdays")}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => sp("days", ["Saturday","Sunday"])}>{t("weekend")}</button>
                </div>
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("welcome")}>{t("back")}</button><button className="btn btn-primary" onClick={() => setStep("cuisines")} disabled={selDays.length === 0}>{t("continue")}</button></div>
            </div>
          )}

          {/* CUISINES */}
          {step === "cuisines" && (
            <div>
              <div className="page-title">{t("step3title")}<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>{t("step3em")}</span></div>
              <p className="page-sub">{t("step3hint")}</p>
              <div className="card">
                <div className="label">{t("selectFavourites")}</div>
                <div className="chip-group">{CUISINES.map(c => <div key={c} className={`chip${prefs.cuisines.includes(c) ? " sel" : ""}`} onClick={() => { const n = prefs.cuisines.includes(c) ? prefs.cuisines.filter(x => x !== c) : [...prefs.cuisines, c]; sp("cuisines", n); }}>{c}</div>)}</div>
                {prefs.cuisines.filter(c => !CUISINES.includes(c)).map(c => (
                  <div key={c} className="chip sel" style={{display:"inline-flex",alignItems:"center",gap:6}}>
                    {c}
                    <button onClick={() => sp("cuisines", prefs.cuisines.filter(x => x !== c))} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)",fontSize:14,lineHeight:1,padding:"0 1px"}}>×</button>
                  </div>
                ))}
              </div>
              <div className="card" style={{marginTop:0}}>
                <div className="label">{t("addCustomCuisine")}</div>
                <div style={{display:"flex",gap:9,alignItems:"center"}}>
                  <input
                    className="inp"
                    placeholder={t("cuisinePlaceholder")}
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
                  }}>{t("add")}</button>
                </div>
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("days")}>{t("back")}</button><button className="btn btn-primary" onClick={() => setStep("dietary")}>{t("continue")}</button></div>
            </div>
          )}

          {/* DIETARY */}
          {step === "dietary" && (
            <div>
              <div className="page-title">{t("step4title")}<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>{t("step4em")}</span></div>
              <p className="page-sub">{t("step4hint")}</p>
              <div className="card">
                <div className="label">{t("selectAllThat")}</div>
                <div className="chip-group">{DIETARY.map(d => <div key={d} className={`chip${prefs.dietary.includes(d) ? " alt" : ""}`} onClick={() => { const n = prefs.dietary.includes(d) ? prefs.dietary.filter(x => x !== d) : [...prefs.dietary, d]; sp("dietary", n); }}>{d}</div>)}</div>
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("cuisines")}>{t("back")}</button><button className="btn btn-primary" onClick={() => setStep("vibe")}>{t("continue")}</button></div>
            </div>
          )}

          {/* VIBE — inlined (has range input) */}
          {step === "vibe" && (
            <div>
              <div className="page-title">{t("step5title")}<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>{t("step5em")}</span></div>
              <p className="page-sub">{t("step5hint")}</p>
              <div className="card">
                <div className="label">{t("adventureLevel")}</div>
                <input type="range" min={0} max={100} value={prefs.adventure} onChange={e => sp("adventure", +e.target.value)} className="slider" />
                <div className="var-ends"><span>{t("classics")}</span><span style={{ fontWeight: 600, color: "#c4622d" }}>{prefs.adventure < 33 ? t("safe") : prefs.adventure < 66 ? t("balanced") : t("wild")}</span><span>{t("surprises")}</span></div>
              </div>
              <div className="card">
                <div className="label">{t("dishComplexity")}</div>
                <div className="cx-grid">{COMPLEXITY.map(o => <div key={o.id} className={`cx-card${prefs.complexity === o.id ? " sel" : ""}`} onClick={() => sp("complexity", o.id)}><div className="cx-label">{o.label}</div><div className="cx-sub">{o.sub}</div></div>)}</div>
              </div>
              <div className="card">
                <div className="label">{t("lockFavourites")}</div>
                <p className="hint">{t("lockFavHint")}</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input className="inp" placeholder={t("favPlaceholder")} value={prefs.favInput} onChange={e => sp("favInput", e.target.value)} onKeyDown={e => e.key === "Enter" && addFavMeal()} style={{ flex: 1 }} />
                  <button className="btn btn-ghost btn-sm" onClick={addFavMeal}>{t("add")}</button>
                </div>
                <div className="chip-group">{prefs.favMeals.map((m, i) => <div key={i} className="tag">{m}<button onClick={() => sp("favMeals", prefs.favMeals.filter((_, j) => j !== i))}>×</button></div>)}</div>
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("dietary")}>{t("back")}</button><button className="btn btn-primary" onClick={() => setStep("budget")}>{t("continue")}</button></div>
            </div>
          )}

          {/* BUDGET — inlined (has number input) */}
          {step === "budget" && (
            <div>
              <div className="page-title">{t("step6title")}<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>{t("step6em")}</span></div>
              <p className="page-sub">{t("step6hint")}</p>
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div className="label" style={{ margin: 0 }}>{t("enableBudget")}</div>
                  <div style={{ display: "flex", gap: 8 }}>{[{ v: true, l: t("yes") }, { v: false, l: t("skip") }].map(o => <div key={String(o.v)} className={`chip${prefs.budgetOn === o.v ? " sel" : ""}`} onClick={() => sp("budgetOn", o.v)}>{o.l}</div>)}</div>
                </div>
                {prefs.budgetOn ? (
                  <>
                    <div className="label">{t("currency")}</div>
                    <div className="cur-row">{Object.entries(CURRENCY).map(([c, s]) => <div key={c} className={`cur-chip${prefs.currency === c ? " sel" : ""}`} onClick={() => sp("currency", c)}>{s} {c}</div>)}</div>
                    <div className="label">{t("weeklyBudget")}</div>
                    <div className="brow"><div className="bwrap"><span className="bpfx">{sym}</span><input className="inp b-inp" type="number" min="0" placeholder={t("budgetPlaceholder")} value={prefs.budget} onChange={e => sp("budget", e.target.value)} /></div><span style={{ fontSize: 12, color: "#6a7a5a", whiteSpace: "nowrap" }}>{t("perWeek")} · {tsrv} {tsrv > 1 ? t("people") : t("person")}</span></div>
                    {prefs.budget && <p style={{ fontSize: 12, color: "#4a8868", marginTop: 7 }}>≈ {sym}{(parseFloat(prefs.budget) / (selDays.length * prefs.types.length)).toFixed(1)} {t("perMeal")}</p>}
                  </>
                ) : <p style={{ fontSize: 13, color: "#7a8a6a", fontStyle: "italic" }}>{t("noBudget")}</p>}
              </div>
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("vibe")}>{t("back")}</button><button className="btn btn-primary" onClick={() => setStep("servings")}>{t("continue")}</button></div>
            </div>
          )}

          {/* SERVINGS — inlined (has counters) */}
          {step === "servings" && (
            <div>
              <div className="page-title">{t("step7title")}<br /><span style={{ color: "#c4622d", fontStyle: "italic" }}>{t("step7em")}</span></div>
              <p className="page-sub">{t("step7hint")}</p>
              <div className="card">
                <div className="people-row">
                  <div className="people-box">
                    <div className="people-lbl">{t("adults")}</div>
                    <div className="ctr">
                      <button className="ctr-btn" onClick={() => prefs.adults > 1 && sp("adults", prefs.adults - 1)} disabled={prefs.adults <= 1}>−</button>
                      <div className="ctr-num">{prefs.adults}</div>
                      <button className="ctr-btn" onClick={() => prefs.adults < 10 && sp("adults", prefs.adults + 1)}>+</button>
                    </div>
                  </div>
                  <div className="people-box">
                    <div className="people-lbl">{t("kids")}</div>
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
                    <div><div className="toggle-txt">{t("kidsDiff")}</div><div className="toggle-sub">{t("kidsDiffSub")}</div></div>
                  </div>
                )}
                <div style={{ marginTop: 11, padding: "8px 12px", background: "#f8f5ee", borderRadius: 9, fontSize: 13, color: "#5a6a4a" }}>
                  {t("planningFor")} <strong style={{ color: "#1a3a1a" }}>{tsrv} {tsrv === 1 ? t("person") : t("people")}</strong>{prefs.kids > 0 && prefs.kidsDiff ? ` + ${prefs.kids} kids (separate dishes)` : ""}
                </div>
              </div>
              {err && <div className="err-box">⚠️ {err}</div>}
              <div className="nav-row"><button className="btn btn-ghost" onClick={() => setStep("budget")}>{t("back")}</button><button className="btn-roll" onClick={roll}>{t("planMyWeek")}</button></div>
            </div>
          )}

          {/* GENERATING */}
          {step === "generating" && (
            <div className="gen-screen">
              <div className="gen-logo"><span>Dish</span><span>Roll</span></div>
              <div className="gen-msg">{waitMsg}</div>
              <p className="gen-sub">{t("generatingSub")}</p>
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
                      {t("yourPlanReady")}<br/><span style={{ color:"#c4622d", fontStyle:"italic" }}>{t("yourPlanReadyEm")}</span>
                    </div>
                    <p style={{ fontSize:13, color:"#7a8a6a", lineHeight:1.6 }}>{t("planHint")}</p>
                  </div>
                  <div style={{ display:"flex", gap:7, flexShrink:0 }}>
                    {sl && <button className="btn btn-ghost btn-sm" onClick={() => setStep("list")}>🛒 List</button>}
                    <button className="btn btn-ghost btn-sm" onClick={() => newRoll(awk || cWK())}>{t("replanBtn")}</button>
                  </div>
                </div>

                {/* Budget summary */}
                {prefs.budgetOn && Object.keys(costs).length > 0 && (
                  <div className="budget-sum">
                    <div><div className="budget-lbl">{t("estimatedCost")}</div><div style={{ fontSize:11, color:"#5a7a5a" }}>{selDays.length} days · {tsrv} servings</div></div>
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
                        const cFlag = cuisine && CUISINE_FLAGS[cuisine] ? CUISINE_FLAGS[cuisine] : <GlobeBadge />;
                        // Kids alt
                        const ka = m.kidsAlt;
                        const kname = ka && typeof ka==="object" ? ka.name : ka;
                        const kdesc = ka && typeof ka==="object" ? ka.description || "" : "";
                        const kmain = ka && typeof ka==="object" ? ka.mainIngredient || "" : "";
                        const kings = ka && typeof ka==="object" ? ka.ingredients||[] : [];
                        const kk = `${day.toLowerCase()}-${mt}-k`;
                        const kSel = kPicked.has(kk);
                        return (
                          <Fragment key={mt}>
                            {/* Meal type label */}
                            <div className="mt-section">
                              <div className="mt-label">{ML[mt]}</div>
                              {/* Adult card */}
                              <MealCard
                                meal={m} mt={mt} k={k}
                                isSel={isSel} isFav={isFav}
                                cFlag={cFlag} cuisine={cuisine}
                                onPick={() => togglePick(k)}
                                onRecipe={() => openRecipe(m,mt)}
                                onFav={() => toggleFav(m.name)}
                                onSwap={() => openSwap(day,mt)}
                                sym={sym} costs={costs} prefs={prefs} tsrv={tsrv}
                              />

                              {/* Kids card */}
                              {prefs.kids>0 && prefs.kidsDiff && kname && (
                                <KidsCard
                                  kname={kname} kdesc={kdesc} kmain={kmain} kings={kings}
                                  kSel={kSel} kk={kk} prefs={prefs} mt={mt}
                                  onPick={() => toggleKPick(kk)}
                                  onRecipe={() => openRecipe({name:kname,description:kdesc,ingredients:kings,time:"~20 min"},mt,"kids")}
                                />
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
                        <div className="basket-count">{totalSelected} {totalSelected!==1?t("mealsSelectedP"):t("mealsSelected")}</div>
                        <div className="basket-sub">{picked.size} adult{picked.size!==1?"s":""}{kPicked.size>0?` · ${kPicked.size} kids`:""}</div>
                      </div>
                    </div>
                    <div className="basket-bar-right">
                      {err && <div style={{ fontSize:12, color:"#b04020" }}>⚠️ {err}</div>}
                      <button className="basket-sel-all" onClick={selectAll}>{t("selectAll")}</button>
                      {sl && <button className="btn btn-ghost btn-sm" onClick={()=>setStep("list")}>{t("viewList")}</button>}
                      <button className="basket-build-btn" onClick={buildList} disabled={totalSelected===0||loading}>
                        {loading?t("buildingList"):t("buildList")}
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
        <ManageModal />
        {FeedbackModal()}
        <OnboardingModal />
        <PremiumWelcomeModal />

        {/* Floating feedback button — bottom left */}
        {step !== "privacy" && <button className="fb-fab" style={{ bottom: fabBottom }} onClick={() => { setFbErr(""); setFbState("idle"); setShowFeedback(true); track("feedback_opened"); }} aria-label="Send feedback">
          {t("feedback")}
        </button>}

        {/* Chat widget — bottom right (inline to keep input focused across re-renders) */}
        {step !== "privacy" && <>
          <button className="chat-fab" style={{ bottom: fabBottom }} onClick={() => setChatOpen(o => !o)} aria-label="Chat with culinary assistant">
            {chatOpen ? "✕" : "💬"}
          </button>
          {chatOpen && (
            <div className="chat-panel" style={{ bottom: chatPanelBottom }}>
              <div className="chat-hdr">
                <div className="chat-hdr-title">🍽️ DishRoll Assistant</div>
                <button className="chat-hdr-close" onClick={() => setChatOpen(false)}>✕</button>
              </div>
              <div className="chat-msgs">
                <div className="chat-bubble ai">{chatGreeting}</div>
                {chatMsgs.map((msg, i) => (
                  <div key={i} className={`chat-bubble ${msg.role === "user" ? "user" : "ai"}`}>{msg.content}</div>
                ))}
                {chatLoading && <div className="chat-bubble ai loading">…</div>}
                <div ref={chatMsgsEndRef} />
              </div>
              <div className="chat-input-row">
                <input
                  className="chat-input"
                  placeholder="Ask anything…"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={chatHandleKey}
                  disabled={chatLoading}
                />
                <button className="chat-send" onClick={() => sendChat(chatInput)} disabled={chatLoading || !chatInput.trim()}>Send</button>
              </div>
            </div>
          )}
        </>}

        {showToast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}
