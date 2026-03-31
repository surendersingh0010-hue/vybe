# VYBE V3 — Event Discovery Platform

## Deploy in 5 minutes

### 1. Install dependencies
```bash
npm install
```

### 2. Add your API key
Rename `.env.local.example` to `.env.local` and paste your Anthropic key:
```
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```
Get a key at: https://console.anthropic.com

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000

### 4. Deploy to Vercel
1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import repo
3. Add environment variable: `ANTHROPIC_API_KEY` = your key
4. Click Deploy

That's it. Live in ~60 seconds.
