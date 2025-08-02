# Figma Claude Proxy

Backend proxy server to enable Claude API calls from Figma plugins by bypassing CORS restrictions.

## Deployment Instructions

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Navigate to the backend-proxy directory**:
   ```bash
   cd backend-proxy
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

4. **Update the Figma plugin**:
   - Replace `https://your-vercel-app.vercel.app` in `code.js` with your actual Vercel deployment URL
   - Update the `manifest.json` networkAccess allowedDomains with your Vercel URL

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run locally**:
   ```bash
   vercel dev
   ```

3. **Test endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/claude-analysis \
     -H "Content-Type: application/json" \
     -H "x-api-key: your-claude-api-key" \
     -d '{"model":"claude-3-haiku-20240307","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}'
   ```

## Environment Variables

Set your Claude API key in Vercel dashboard:
- Go to your Vercel project settings
- Navigate to Environment Variables
- Add `CLAUDE_API_KEY` with your API key value

## API Endpoint

**POST** `/api/claude-analysis`

**Headers:**
- `Content-Type: application/json`
- `x-api-key: your-claude-api-key` (or set CLAUDE_API_KEY env var)

**Body:** Standard Claude API request payload

**Response:** Standard Claude API response