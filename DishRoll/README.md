# 🎲 DishRoll

> **Roll your week. Eat well.**

DishRoll is an AI-powered weekly meal planner that rolls a personalised 7-day menu based on your cuisine preferences, dietary needs, adventure level, and budget — then builds a smart shopping list you can send straight to Alexa.

---

## Features

- 🎲 **AI meal generation** — roll a full week of meals in seconds using Claude
- 🍽️ **Flexible planning** — dinner only, all meals, or a custom mix
- 🌍 **Cuisine & dietary preferences** — 15 cuisines, 10 dietary options
- 🎯 **Adventure slider** — from comforting classics to bold surprises
- 💰 **Budget tracking** — set a weekly grocery budget, see estimated costs per meal
- ⭐ **Favourites** — star meals to save them; they reappear in future rolls
- 🔄 **Re-roll individual meals** — swap any meal with 3 AI alternatives
- 🛒 **Smart shopping list** — AI aggregates and deduplicates ingredients by category
- 🔵 **Alexa export** — one-tap copy to paste into your Alexa shopping list

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Pure CSS (no framework) |
| AI | Claude Sonnet via Anthropic API |
| Backend | Netlify Functions (serverless) |
| Hosting | Netlify |

---

## Getting Started

### Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- A [Netlify account](https://netlify.com) for deployment

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/dishroll.git
cd dishroll

# 2. Install dependencies
npm install

# 3. Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# 4. Create a .env file with your API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# 5. Run locally with Netlify Dev (enables serverless functions)
netlify dev
```

The app will be available at `http://localhost:8888`

> **Note:** Use `netlify dev` rather than `npm run dev` — this runs the Netlify Functions locally, which the app needs to call the AI.

---

## Deployment to Netlify

### Option A — Deploy via Netlify CLI

```bash
# Build and deploy
netlify deploy --prod
```

### Option B — Deploy via GitHub

1. Push this repo to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**
3. Connect your GitHub repo
4. Build settings are auto-detected from `netlify.toml`
5. Add your environment variable (see below)
6. Click **Deploy**

### Setting the API Key

In your Netlify dashboard:

1. Go to **Site configuration** → **Environment variables**
2. Click **Add a variable**
3. Set:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-your-key-here`
4. Save and redeploy

---

## Project Structure

```
dishroll/
├── src/
│   ├── App.jsx          # Main React application
│   └── main.jsx         # React entry point
├── netlify/
│   └── functions/
│       └── chat.js      # Serverless function — Anthropic API proxy
├── public/
│   └── dice.svg         # Favicon
├── index.html           # HTML template
├── package.json
├── vite.config.js
├── netlify.toml         # Netlify build & function config
├── .gitignore
└── README.md
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | Your Anthropic API key from [console.anthropic.com](https://console.anthropic.com/) |

---

## Roadmap

- [ ] Calendar export (Google Calendar / iCal)
- [ ] Recipe detail modal with step-by-step instructions
- [ ] Household sharing (shared favourites & plan)
- [ ] Supermarket price integration (Tesco, Lidl, Dunnes)
- [ ] Weekly history — view past rolls
- [ ] PWA support — install on mobile home screen

---

## License

MIT — do whatever you like with it.

---

*Built with 🎲 and Claude by [Samir Asadov](https://github.com/YOUR_USERNAME)*
