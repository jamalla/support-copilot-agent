# Support Copilot Agent 🤖💬

A lightweight Customer Support Copilot for agents.

- Paste a ticket conversation  
- Get a short summary  
- Get a suggested reply (tone: professional / friendly / firm)  
- Get extracted fields (issue type, priority, next action, optional order id)

## Tech Stack
- **Web + API**: Next.js (App Router) on Vercel  
- **LLM**: OpenAI API  
- **Validation**: Zod  

## Local Development

### 1) Install
```bash
pnpm install
```

### 2) Web + API (single app)
Create `apps/web/.env.local`:
```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Run:
```bash
pnpm -C apps/web dev
```

Open:
- http://localhost:3000

## Deploy (Vercel)
1. Import the repo into Vercel  
2. Set **Root Directory** to `apps/web`  
3. Add env vars:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)

That’s it ✅

## API
The UI calls a built-in API route:

- `POST /api/copilot/draft`

Example body:
```json
{
  "ticket": {
    "subject": "Order delayed",
    "messages": [
      { "from": "customer", "text": "My order has not arrived yet. Order #A10293." }
    ]
  },
  "tone": "professional"
}
```

## Notes
If OpenAI quota/billing isn’t enabled, the API will return a safe fallback response and include an `_meta` error field.
