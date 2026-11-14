// Storage layer: MongoDB when configured, otherwise an in-memory store that
// behaves identically (used for local dev and as a labelled demo fallback).
import { MongoClient } from 'mongodb';
import { DEMO_USERS, DEMO_CONNECTIONS, SEED_CONVERSATIONS } from './seedData.js';
import { classifyConversation, computeWaiting, detectMeetings } from './ai.js';
import { scryptSync, randomBytes, createHash } from 'node:crypto';

function hashPassword(password, salt) {
  salt = salt || randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(password, salt, 32).toString('hex') };
}
export function verifyPassword(password, salt, hash) {
  return scryptSync(password, salt, 32).toString('hex') === hash;
}
export const sha256 = s => createHash('sha256').update(s).digest('hex');

function decorate(conv) {
  if (!conv.classification || conv.classification.auto == null) {
    const c = classifyConversation(conv);
    conv.classification = { ...c, auto: c.label, overridden: false, history: [{ at: new Date().toISOString(), label: c.label, confidence: c.confidence, trigger: 'initial import' }] };
  }
  conv.waiting = computeWaiting(conv);
  conv.meetings = detectMeetings(conv);
  conv.updatedAt = conv.messages[conv.messages.length - 1].at;
  return conv;
}

function buildSeed() {
  const users = DEMO_USERS.map(u => ({ ...u, ...hashPassword(u.password), password: undefined, createdAt: new Date().toISOString() }));
  const conversations = SEED_CONVERSATIONS.map((c, i) => decorate({
    ...c,
    id: c.key,
    labels: { important: ['a02', 'a05', 's01', 's04', 'a06'].includes(c.key), unread: ['a01', 'a09', 's07', 's10', 's12'].includes(c.key), archived: false, completed: false },
    clientStatus: null,
    simulated: true
  }));
  const connections = DEMO_CONNECTIONS.map((c, i) => ({ id: 'conn' + (i + 1), ...c, lastSync: new Date().toISOString() }));
  return { users, conversations, connections };
}

let state = null;       // memory fallback store
let mongo = null;       // { client, db }
let mode = 'memory';

export function storageMode() { return mode; }

function mongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const { MONGO_USER, MONGO_PASSWORD, MONGO_HOST } = process.env;
  if (MONGO_USER && MONGO_PASSWORD && MONGO_HOST) {
    return `mongodb+srv://${encodeURIComponent(MONGO_USER)}:${encodeURIComponent(MONGO_PASSWORD)}@${MONGO_HOST}/?retryWrites=true&w=majority`;
  }
  return null;
}

async function init() {
  if (state || mongo) return;
  const uri = mongoUri();
  if (uri) {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 6000 });
      await client.connect();
      const db = client.db(process.env.MONGO_DB || 'padesk');
      mongo = { client, db };
      mode = 'mongodb';
      const count = await db.collection('conversations').countDocuments();
      if (count === 0) {
        const seed = buildSeed();
        await db.collection('users').insertMany(seed.users);
        await db.collection('conversations').insertMany(seed.conversations);
        await db.collection('connections').insertMany(seed.connections);
        await db.collection('meta').insertOne({ _id: 'syncIndex', value: 0 });
      }
      return;
    } catch (e) {
      console.error('MongoDB unavailable, falling back to memory store:', e.message);
      mongo = null; mode = 'memory';
    }
  }
  const seed = buildSeed();
  state = { users: seed.users, conversations: seed.conversations, connections: seed.connections, sessions: new Map(), syncIndex: 0 };
}

export async function resetForTests() { state = null; if (mongo) { try { await mongo.client.close(); } catch {} mongo = null; } }

// ---- users & sessions ----
export async function findUserByEmail(email) {
  await init();
  if (mongo) return mongo.db.collection('users').findOne({ email: email.toLowerCase() });
  return state.users.find(u => u.email === email.toLowerCase()) || null;
}
export async function createUser({ name, email, password }) {
  await init();
  const doc = { name, email: email.toLowerCase(), role: 'assistant', ...hashPassword(password), createdAt: new Date().toISOString() };
  if (mongo) { await mongo.db.collection('users').insertOne(doc); return doc; }
  state.users.push(doc); return doc;
}
export async function createSession(email) {
  await init();
  const token = randomBytes(24).toString('hex');
  const doc = { tokenHash: sha256(token), email: email.toLowerCase(), expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() };
  if (mongo) await mongo.db.collection('sessions').insertOne(doc);
  else state.sessions.set(doc.tokenHash, doc);
  return token;
}
export async function findSession(token) {
  await init();
  const tokenHash = sha256(token || '');
  if (mongo) return mongo.db.collection('sessions').findOne({ tokenHash, expiresAt: { $gt: new Date().toISOString() } });
  const s = state.sessions.get(tokenHash);
  return s && s.expiresAt > new Date().toISOString() ? s : null;
}
export async function deleteSession(token) {
  await init();
  if (mongo) await mongo.db.collection('sessions').deleteOne({ tokenHash: sha256(token || '') });
  else state.sessions.delete(sha256(token || ''));
}

// ---- connections ----
export async function listConnections() {
  await init();
  if (mongo) return mongo.db.collection('connections').find({}).toArray();
  return state.connections;
}
export async function addConnection({ provider, email, clientName }) {
  await init();
  const doc = { id: 'conn' + randomBytes(4).toString('hex'), provider, email, clientName, status: 'connected', simulated: true, lastSync: new Date().toISOString() };
  if (mongo) await mongo.db.collection('connections').insertOne(doc);
  else state.connections.push(doc);
  return doc;
}
export async function removeConnection(id) {
  await init();
  if (mongo) return mongo.db.collection('connections').deleteOne({ id });
  state.connections = state.connections.filter(c => c.id !== id);
}
export async function touchConnectionSync() {
  await init();
  const now = new Date().toISOString();
  if (mongo) await mongo.db.collection('connections').updateMany({}, { $set: { lastSync: now } });
  else state.connections.forEach(c => c.lastSync = now);
}

// ---- conversations ----
export async function listConversations() {
  await init();
  if (mongo) return mongo.db.collection('conversations').find({}).sort({ updatedAt: -1 }).toArray();
  return [...state.conversations].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}
export async function getConversation(id) {
  await init();
  if (mongo) return mongo.db.collection('conversations').findOne({ id });
  return state.conversations.find(c => c.id === id) || null;
}
export async function saveConversation(conv) {
  decorate(conv);
  if (mongo) await mongo.db.collection('conversations').replaceOne({ id: conv.id }, conv, { upsert: true });
  else { const i = state.conversations.findIndex(c => c.id === conv.id); if (i >= 0) state.conversations[i] = conv; else state.conversations.push(conv); }
  return conv;
}

// ---- simulated sync ----
export async function nextSyncIndex() {
  await init();
  if (mongo) {
    const r = await mongo.db.collection('meta').findOneAndUpdate({ _id: 'syncIndex' }, { $inc: { value: 1 } }, { upsert: true, returnDocument: 'after' });
    return r.value;
  }
  return ++state.syncIndex;
}
export async function getSyncIndex() {
  await init();
  if (mongo) { const r = await mongo.db.collection('meta').findOne({ _id: 'syncIndex' }); return r ? r.value : 0; }
  return state.syncIndex;
    }
