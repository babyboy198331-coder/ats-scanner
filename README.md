# ATScan — ATS Resume Scanner

A free ATS resume scanner built with React + Gemini Flash, deployed on Vercel.

## Stack
- **Frontend**: React (Create React App)
- **Backend**: Vercel Serverless Function (`/api/analyze.js`)
- **AI**: Google Gemini 1.5 Flash (free tier)
- **PDF Parsing**: PDF.js (client-side, no server needed)

---

## Setup

### 1. Get a free Gemini API key
Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) and create a free API key.

### 2. Install dependencies
```bash
npm install
```

### 3. Run locally
Create a `.env.local` file:
```
GEMINI_API_KEY=your_key_here
```

Then run with the Vercel CLI (needed for the serverless function):
```bash
npm install -g vercel
vercel dev
```

### 4. Deploy to Vercel
```bash
vercel
```

Then in your Vercel dashboard:
- Go to **Settings > Environment Variables**
- Add `GEMINI_API_KEY` with your Gemini API key
- Redeploy

---

## Project Structure
```
ats-scanner/
├── api/
│   └── analyze.js        # Serverless function — calls Gemini, keeps API key secret
├── src/
│   ├── App.jsx            # Root component + routing between upload/results
│   ├── App.css            # Full design system
│   ├── index.js           # React entry point
│   └── components/
│       ├── UploadStep.jsx # Resume upload (PDF or paste) + JD input
│       └── ResultsView.jsx # Score ring + keyword breakdown
├── public/
│   └── index.html
├── vercel.json            # Routes /api/* to serverless functions
└── .env.example           # Copy to .env.local for local dev
```

---

## Gemini Free Tier Limits
- 15 requests/minute
- 1,500 requests/day
- $0 cost

More than enough for a portfolio project. If it gets serious traffic, upgrade to pay-as-you-go (~$0.002 per scan with Gemini Flash).
