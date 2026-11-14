// API + classifier tests against a fresh in-memory server (no MongoDB needed).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import api from './server-app.js';
import { classifyConversation } from './ai.js';
import { SEED_CONVERSATIONS } from './seedData.js';

let server, base, cookie;

before(async () => {
  const app = express();
  app.use(api);
  await new Promise(r => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth && cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, setCookie: res.headers.get('set-cookie') };
}

test('classifier: newsletter -> noreply', () => {
  const c = SEED_CONVERSATIONS.find(x => x.key === 'a03');
  assert.equal(classifyConversation(c).label, 'noreply');
});
test('classifier: term sheet sign-off -> client', () => {
  const c = SEED_CONVERSATIONS.find(x => x.key === 'a02');
  assert.equal(classifyConversation(c).label, 'client');
});
test('classifier: reschedule request -> assistant', () => {
  const c = SEED_CONVERSATIONS.find(x => x.key === 'a01');
  assert.equal(classifyConversation(c).label, 'assistant');
});
test('classifier: mixed signals -> needs review', () => {
  const c = SEED_CONVERSATIONS.find(x => x.key === 'a09');
  const r = classifyConversation(c);
  assert.equal(r.needsReview, true);
  assert.ok(r.confidence < 0.62);
});
test('classifier: every seeded conversation gets a valid label with reasons', () => {
  for (const c of SEED_CONVERSATIONS) {
    const r = classifyConversation(c);
    assert.ok(['assistant', 'client', 'noreply'].includes(r.label));
    assert.ok(r.reasons.length > 0);
    assert.ok(r.confidence > 0 && r.confidence <= 1);
  }
});

test('auth: rejects bad login, accepts demo login', async () => {
  const bad = await req('/api/auth/login', { method: 'POST', body: { email: 'assistant@padesk.demo', password: 'wrong' }, auth: false });
  assert.equal(bad.status, 401);
  const good = await req('/api/auth/login', { method: 'POST', body: { email: 'assistant@padesk.demo', password: 'demo1234' }, auth: false });
  assert.equal(good.status, 200);
  cookie = good.setCookie.split(';')[0];
  assert.ok(cookie.startsWith('pa_session='));
});

test('auth: signup validation', async () => {
  const r = await req('/api/auth/signup', { method: 'POST', body: { name: 'X', email: 'x@y.z', password: 'short' }, auth: false });
  assert.equal(r.status, 400);
});

test('bootstrap: returns stats, connections and conversations', async () => {
  const r = await req('/api/bootstrap');
  assert.equal(r.status, 200);
  assert.ok(r.data.conversations.length >= 20);
  assert.equal(r.data.connections.length, 2);
  assert.ok(r.data.stats.clientReply >= 4);
  assert.ok(r.data.stats.needsReview >= 1);
  assert.ok(r.data.meetings.length >= 3);
});

test('segments: client segment only has client-labelled threads', async () => {
  const r = await req('/api/conversations?segment=client');
  assert.ok(r.data.length >= 4);
  for (const c of r.data) assert.equal(c.classification.label, 'client');
});

test('conversation detail includes summary and extracted dates', async () => {
  const r = await req('/api/conversations/a04');
  assert.equal(r.status, 200);
  assert.ok(r.data.summary.length >= 2);
  assert.ok(r.data.extracted.dates.length >= 1);
});

test('manual override sticks and clears needsReview', async () => {
  const r = await req('/api/conversations/a09', { method: 'PATCH', body: { classification: 'client' } });
  assert.equal(r.data.classification.label, 'client');
  assert.equal(r.data.classification.overridden, true);
  assert.equal(r.data.classification.needsReview, false);
});

test('client action: assistant takeover reclassifies and syncs', async () => {
  const r = await req('/api/conversations/s01/client-action', { method: 'POST', body: { action: 'assistant_takeover' } });
  assert.equal(r.status, 200);
  assert.equal(r.data.classification.label, 'assistant');
  assert.equal(r.data.clientStatus.state, 'assistant_takeover');
});

test('client action: handled marks completed', async () => {
  const r = await req('/api/conversations/s04/client-action', { method: 'POST', body: { action: 'handled' } });
  assert.equal(r.data.labels.completed, true);
});

test('draft then simulated send appends message and re-analyses', async () => {
  const d = await req('/api/conversations/a01/draft', { method: 'POST' });
  assert.ok(d.data.body.includes('Priya'));
  assert.equal(d.data.simulated, true);
  const before = (await req('/api/conversations/a01')).data.messages.length;
  const s = await req('/api/conversations/a01/send', { method: 'POST', body: { body: d.data.body } });
  assert.equal(s.status, 200);
  assert.equal(s.data.conversation.messages.length, before + 1);
});

test('sync adds one new message and may reclassify', async () => {
  const r = await req('/api/sync', { method: 'POST' });
  assert.equal(r.status, 200);
  assert.ok(r.data.change);
  // First pool item replies to the term sheet thread.
  assert.equal(r.data.conversation.subject, 'Term sheet - your sign-off needed');
  assert.equal(r.data.conversation.classification.label, 'client');
});

test('ask: waiting question lists waiting threads', async () => {
  const r = await req('/api/ask', { method: 'POST', body: { question: 'What am I waiting for a response on?' } });
  assert.equal(r.status, 200);
  assert.match(r.data.text, /waiting|Waiting/i);
});

test('ask: why question explains classification', async () => {
  const r = await req('/api/ask', { method: 'POST', body: { question: 'Why has this email been assigned to the client?', conversationId: 'a02' } });
  assert.match(r.data.text, /sign-off|approval|personally/i);
});

test('ask: unknown question falls back to guidance', async () => {
  const r = await req('/api/ask', { method: 'POST', body: { question: 'zzzz qqqq' } });
  assert.match(r.data.text, /I can help with/);
});

test('unauthenticated requests are rejected', async () => {
  const r = await req('/api/bootstrap', { auth: false });
  assert.equal(r.status, 401);
});
