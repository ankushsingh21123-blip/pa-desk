# PA Desk - AI-powered email management for personal assistants (prototype)

A mobile-responsive web prototype that helps personal assistants manage their
clients' email inboxes. Every conversation is automatically classified by who
should respond: the assistant, the client, or nobody. Clients get a separate,
minimal view showing only what needs them personally.

Built for the Humanity Founders AI Full-Stack Engineer intern task.

## What is real and what is simulated

Real (working end to end):

- React frontend + Node/Express API (deployed on Vercel) + MongoDB storage
- Sign up / log in with salted-hash passwords and HttpOnly session cookies
- Persistent conversation state: labels, overrides, client actions, sent
  replies and sync history survive reloads
- Search, segments, dashboard stats, meeting extraction

Simulated (clearly labelled in the UI):

- Email connections: the Gmail/Outlook connect flow demonstrates the intended
  OAuth UX but never touches a real inbox
- "AI" features (classification, summaries, Q&A, draft replies) use a
  transparent deterministic rules engine - the exact place a real LLM would
  plug in. No live LLM calls are made
- "Sync now" simulates a new email arriving so reclassification is visible
- "Send" records the reviewed reply in the thread; no real email is delivered
- All people, companies and emails are fictional

## Core journeys

1. Onboarding: sign up / log in (demo: `assistant@padesk.demo` / `demo1234`),
   connect simulated Gmail + Outlook client accounts, land on the dashboard
2. Assistant dashboard: stats, what needs you, what needs your client,
   upcoming meetings, quick search
3. Automatic classification with confidence, reasons, low-confidence review
   flag, manual override, and reclassification when new mail arrives
4. Client view: only "Client to reply" emails, with summary + why, mark
   handled or pass back to the assistant (synced to the assistant side)
5. Conversation view: thread, summary, extracted dates/actions, draft reply
   with review-before-send
6. Ask PA: plain-language questions over the inbox

## Run locally

```bash
npm install
npm run build
npm start          # serves UI + API on :4174 (memory store)
# or, with MongoDB:
MONGODB_URI=mongodb+srv://... npm start
npm test           # 19 API + classifier tests
```

## Deploy

Standard Vercel project: build command `npm run build`, output `dist`,
`/api/*` routed to the serverless function in `api/index.js`. Set
`MONGO_USER` / `MONGO_PASSWORD` / `MONGO_HOST` (or `MONGODB_URI`) for the
persistent store. Without them the app runs in a clearly labelled in-memory
demo mode.
