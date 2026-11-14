import express from 'express';
import crypto from 'node:crypto';
import * as db from './db.js';
import { classifyConversation, summarizeConversation, extractDetails, draftReply, answerQuestion } from './ai.js';
import { INCOMING_POOL } from './seedData.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

// Security headers for the demo deployment.
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});

const COOKIE = 'pa_session';
function parseCookies(req) {
  const h = req.headers.cookie || '';
  return Object.fromEntries(h.split(';').map(p => p.trim().split('=')).filter(p => p[0]));
}
async function requireAuth(req, res, next) {
  const token = parseCookies(req)[COOKIE];
  const session = await db.findSession(token);
  if (!session) return res.status(401).json({ error: 'Not signed in' });
  const user = await db.findUserByEmail(session.email);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  next();
}
function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.set('Set-Cookie', `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${7 * 86400}${secure}`);
}

const publicConv = c => ({ ...c, _id: undefined });

// ---- auth (demo-grade: salted scrypt, HttpOnly session cookie) ----
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || String(password).length < 8) {
    return res.status(400).json({ error: 'Name, email and an 8+ character password are required.' });
  }
  if (await db.findUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists.' });
  await db.createUser({ name: String(name).slice(0, 80), email: String(email).slice(0, 120), password: String(password) });
  const token = await db.createSession(email);
  setSessionCookie(res, token);
  res.status(201).json({ ok: true, name });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = email ? await db.findUserByEmail(email) : null;
  if (!user || !db.verifyPassword(String(password || ''), user.salt, user.hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  const token = await db.createSession(email);
  setSessionCookie(res, token);
  res.json({ ok: true, name: user.name });
});

app.post('/api/auth/logout', async (req, res) => {
  await db.deleteSession(parseCookies(req)[COOKIE]);
  res.set('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email, role: req.user.role, storage: db.storageMode() });
});

// ---- bootstrap: everything the dashboard needs in one call ----
app.get('/api/bootstrap', requireAuth, async (req, res) => {
  const [conversations, connections] = await Promise.all([db.listConversations(), db.listConnections()]);
  const active = conversations.filter(c => !c.labels.archived && !c.labels.completed);
  const stats = {
    total: conversations.filter(c => !c.labels.archived).length,
    unread: active.filter(c => c.labels.unread).length,
    important: active.filter(c => c.labels.important).length,
    actionRequired: active.filter(c => c.classification.label === 'assistant' || c.classification.needsReview).length,
    waiting: active.filter(c => c.waiting).length,
    assistantReply: active.filter(c => c.classification.label === 'assistant').length,
    clientReply: active.filter(c => c.classification.label === 'client').length,
    needsReview: active.filter(c => c.classification.needsReview).length
  };
  const meetings = conversations.flatMap(c => (c.meetings || []).map(m => ({ ...m, conversationId: c.id, client: c.client })));
  res.json({ conversations: conversations.map(publicConv), connections, stats, meetings, storage: db.storageMode() });
});

// ---- connections (simulated OAuth) ----
app.post('/api/connections', requireAuth, async (req, res) => {
  const { provider, email, clientName } = req.body || {};
  if (!['gmail', 'outlook'].includes(provider)) return res.status(400).json({ error: 'Provider must be gmail or outlook.' });
  if (!email || !clientName) return res.status(400).json({ error: 'Email and client name are required.' });
  const conn = await db.addConnection({ provider, email: String(email).slice(0, 120), clientName: String(clientName).slice(0, 80) });
  res.status(201).json(publicConv(conn));
});
app.delete('/api/connections/:id', requireAuth, async (req, res) => {
  await db.removeConnection(req.params.id);
  res.json({ ok: true });
});

// ---- conversations ----
app.get('/api/conversations', requireAuth, async (req, res) => {
  let list = await db.listConversations();
  const { segment, q, client } = req.query;
  if (client) list = list.filter(c => c.client === client);
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter(c => (c.subject + ' ' + c.from.name + ' ' + c.messages.map(m => m.body).join(' ')).toLowerCase().includes(needle));
  }
  if (segment) list = list.filter(c => inSegment(c, segment));
  res.json(list.map(publicConv));
});

function inSegment(c, segment) {
  const l = c.classification.label;
  switch (segment) {
    case 'inbox': return !c.labels.archived;
    case 'assistant': return l === 'assistant' && !c.labels.archived && !c.labels.completed;
    case 'client': return l === 'client' && !c.labels.archived && !c.labels.completed;
    case 'noreply': return l === 'noreply' && !c.labels.archived && !c.labels.completed;
    case 'action': return (l === 'assistant' || c.classification.needsReview) && !c.labels.archived && !c.labels.completed;
    case 'waiting': return !!c.waiting && !c.labels.archived && !c.labels.completed;
    case 'meetings': return (c.meetings || []).length > 0 && !c.labels.archived;
    case 'important': return !!c.labels.important && !c.labels.archived;
    case 'review': return !!c.classification.needsReview && !c.labels.archived && !c.labels.completed;
    case 'completed': return !!c.labels.completed;
    case 'archived': return !!c.labels.archived;
    default: return !c.labels.archived;
  }
}

app.get('/api/conversations/:id', requireAuth, async (req, res) => {
  const c = await db.getConversation(req.params.id);
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  res.json({ ...publicConv(c), summary: summarizeConversation(c), extracted: extractDetails(c) });
});

app.patch('/api/conversations/:id', requireAuth, async (req, res) => {
  const c = await db.getConversation(req.params.id);
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  const b = req.body || {};
  if (b.unread !== undefined) c.labels.unread = !!b.unread;
  if (b.important !== undefined) c.labels.important = !!b.important;
  if (b.archived !== undefined) c.labels.archived = !!b.archived;
  if (b.completed !== undefined) c.labels.completed = !!b.completed;
  if (b.unread === false && c.labels.unread) c.labels.unread = false;
  if (b.classification && ['assistant', 'client', 'noreply'].includes(b.classification)) {
    c.classification.history.push({ at: new Date().toISOString(), label: b.classification, confidence: 1, trigger: 'manual override by assistant' });
    c.classification.label = b.classification;
    c.classification.overridden = true;
    c.classification.needsReview = false;
    c.classification.confidence = 1;
    c.classification.reasons = ['manually set by the assistant'];
  }
  await db.saveConversation(c);
  res.json(publicConv(c));
});

// Client-facing actions: mark handled, or hand back to the assistant.
app.post('/api/conversations/:id/client-action', requireAuth, async (req, res) => {
  const c = await db.getConversation(req.params.id);
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  const { action } = req.body || {};
  if (action === 'handled') {
    c.clientStatus = { state: 'handled', at: new Date().toISOString(), by: c.client };
    c.labels.completed = true;
  } else if (action === 'assistant_takeover') {
    c.clientStatus = { state: 'assistant_takeover', at: new Date().toISOString(), by: c.client };
    c.classification.history.push({ at: new Date().toISOString(), label: 'assistant', confidence: 1, trigger: 'client asked the assistant to take over' });
    c.classification.label = 'assistant';
    c.classification.overridden = true;
    c.classification.needsReview = false;
    c.classification.reasons = ['client handed this to the assistant'];
  } else {
    return res.status(400).json({ error: 'Unknown action.' });
  }
  await db.saveConversation(c);
  res.json(publicConv(c));
});

// Simulated AI: summary on demand.
app.get('/api/conversations/:id/summary', requireAuth, async (req, res) => {
  const c = await db.getConversation(req.params.id);
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  res.json({ summary: summarizeConversation(c), extracted: extractDetails(c), simulated: true });
});

// Simulated AI: draft a reply for review. Nothing is sent here.
app.post('/api/conversations/:id/draft', requireAuth, async (req, res) => {
  const c = await db.getConversation(req.params.id);
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  res.json({ subject: `Re: ${c.subject.replace(/^Re:\s*/i, '')}`, body: draftReply(c, c.classification.label), simulated: true });
});

// Simulated send: the reviewed reply is appended to the thread, never emailed.
app.post('/api/conversations/:id/send', requireAuth, async (req, res) => {
  const c = await db.getConversation(req.params.id);
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  const body = String((req.body || {}).body || '').trim();
  if (body.length < 10) return res.status(400).json({ error: 'Reply text is too short.' });
  c.messages.push({ from: 'assistant@padesk.demo', fromName: 'Riya Sharma (Demo Assistant)', body: body.slice(0, 5000), at: new Date().toISOString(), simulated: true });
  c.labels.unread = false;
  const prev = c.classification.label;
  if (!c.classification.overridden) {
    const next = classifyConversation(c);
    c.classification = { ...next, auto: next.label, overridden: false, history: [...c.classification.history, { at: new Date().toISOString(), label: next.label, confidence: next.confidence, trigger: 're-analysed after reply sent' }] };
    if (prev !== next.label) c.classification.reclassified = { from: prev, to: next.label, at: new Date().toISOString() };
  }
  await db.saveConversation(c);
  res.json({ conversation: publicConv(c), sentSimulated: true });
});

// Simulated AI assistant Q&A over the inbox.
app.post('/api/ask', requireAuth, async (req, res) => {
  const { question, conversationId } = req.body || {};
  if (!question || String(question).trim().length < 3) return res.status(400).json({ error: 'Ask a question first.' });
  const conversations = await db.listConversations();
  const conversation = conversationId ? conversations.find(c => c.id === conversationId) : null;
  const answer = answerQuestion(String(question).slice(0, 500), { conversations, conversation });
  res.json({ ...answer, simulated: true });
});

// Simulated mailbox sync: one new message arrives and threads are re-analysed.
app.post('/api/sync', requireAuth, async (req, res) => {
  const idx = await db.nextSyncIndex();
  const item = INCOMING_POOL[(idx - 1) % INCOMING_POOL.length];
  await db.touchConnectionSync();
  let conv, change;
  if (item.op === 'reply') {
    const list = await db.listConversations();
    conv = list.find(c => c.subject === item.matchSubject);
    if (!conv) return res.status(500).json({ error: 'Sync target missing.' });
    conv.messages.push({ ...item.message, at: new Date().toISOString(), simulated: true });
    conv.labels.unread = true;
    change = `New reply in "${conv.subject}"`;
  } else {
    conv = {
      id: 'in' + crypto.randomBytes(3).toString('hex'),
      client: item.client, accountEmail: item.accountEmail, from: item.from, subject: item.subject,
      messages: [{ ...item.message, at: new Date().toISOString(), simulated: true }],
      labels: { important: false, unread: true, archived: false, completed: false },
      clientStatus: null, simulated: true
    };
    change = `New email: "${conv.subject}"`;
  }
  const prev = conv.classification ? conv.classification.label : null;
  const next = classifyConversation(conv);
  const history = conv.classification ? conv.classification.history : [];
  if (!conv.classification || !conv.classification.overridden) {
    conv.classification = { ...next, auto: next.label, overridden: false, history: [...history, { at: new Date().toISOString(), label: next.label, confidence: next.confidence, trigger: 're-analysed after new message' }] };
  }
  await db.saveConversation(conv);
  const moved = prev && conv.classification.label !== prev ? { from: prev, to: conv.classification.label } : null;
  res.json({ change, conversation: publicConv(conv), reclassified: moved });
});

app.get('/api/health', (req, res) => res.json({ ok: true, storage: db.storageMode(), simulated: true }));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

export default app;
