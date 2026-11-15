// Deterministic, rule-based stand-in for an AI model.
// Everything here is transparent heuristics over email text - no LLM, no
// external API. The UI labels its output as SIMULATED so evaluators can see
// exactly where a real LLM would plug in behind the same interface.

const NEWSLETTER = ['unsubscribe', 'view in browser', 'newsletter', 'digest', 'no-reply', 'noreply', 'automated', 'do not reply', 'notification', 'statement is', 'auto-generated', 'read online'];
const CLIENT = [
  ['approve', 'asks for an approval'], ['approval', 'asks for an approval'],
  ['sign-off', 'needs a personal sign-off'], ['sign off', 'needs a personal sign-off'],
  ['your decision', 'asks for a personal decision'], ['your call', "asks for the client's own call"],
  ['personally', 'explicitly asks for the client personally'], ['your input', "asks for the client's input"],
  ['signature', 'requires a personal signature'], ['equity', 'involves equity/ownership terms'],
  ['term sheet', 'involves an investment term sheet'], ['sensitive', 'marked sensitive/confidential'],
  ['confidential', 'marked sensitive/confidential'], ['your preference', 'asks the client to choose'],
  ['directly, not', 'explicitly asks to deal with the client directly'],
  ['under her name', "goes out under the client's name"], ['under your name', "goes out under the client's name"],
  ['deposit', 'involves a money/deposit decision']
];
const ASSISTANT = [
  ['schedule', 'scheduling/coordination'], ['reschedule', 'rescheduling request'],
  ['slot', 'asks to pick a time slot'], ['calendar', 'calendar coordination'],
  ['availability', 'asks about availability'], ['interview', 'interview logistics'],
  ['coordinate', 'coordination work'], ['arrange', 'arrangement request'],
  ['book ', 'booking request'], ['sync', 'meeting scheduling'],
  ['follow up', 'follow-up on a pending request'],
  ['following up', 'follow-up on a pending request'], ['routine', 'routine administrative work'],
  ['receipts', 'expense/receipt admin'], ['checklist', 'document/admin checklist'],
  ['headshot', 'logistics/materials request']
];
const RESOLVED = ['let\'s pause', "let's pause", 'nothing needed', 'that works', 'all set', 'no further action', 'successfully updated', 'thank you, this is resolved', 'consider it done'];

function corpus(conv) {
  return conv.messages.map(m => `${m.from} ${m.body}`).join('\n').toLowerCase();
}
function lastMessage(conv) { return conv.messages[conv.messages.length - 1]; }
function isOutbound(conv, m) { return m.from === conv.accountEmail || m.from === 'assistant@padesk.demo'; }

export function classifyConversation(conv) {
  const text = corpus(conv);
  const last = lastMessage(conv);
  const lastText = (last.from + ' ' + last.body).toLowerCase();

  const hits = { client: [], assistant: [], noreply: [] };
  for (const s of NEWSLETTER) if (text.includes(s)) hits.noreply.push(s === 'unsubscribe' || s === 'newsletter' || s === 'digest' ? 'newsletter/marketing pattern' : 'automated notification pattern');
  for (const [sig, why] of CLIENT) if (text.includes(sig)) hits.client.push(why);
  for (const [sig, why] of ASSISTANT) if (text.includes(sig)) hits.assistant.push(why);

  // Resolved signals on the latest message strongly suppress any reply need.
  let resolved = false;
  for (const s of RESOLVED) if (lastText.includes(s)) { resolved = true; break; }

  const weight = { client: 3, assistant: 2, noreply: 2.5 };
  const scores = {
    client: hits.client.length * weight.client,
    assistant: hits.assistant.length * weight.assistant,
    noreply: hits.noreply.length * weight.noreply
  };
  if (resolved) scores.noreply += 6;

  const uniq = arr => [...new Set(arr)];
  let label, reasons;
  if (scores.client === 0 && scores.assistant === 0 && scores.noreply === 0) {
    if (isOutbound(conv, last)) {
      // We spoke last: nothing to do until the other side replies.
      label = 'noreply'; reasons = ['waiting for the other side to respond - nothing to action yet'];
      scores.noreply = 2;
    } else {
      // No signals at all: default to assistant review rather than auto-filing.
      label = 'assistant'; reasons = ['no strong signals - defaulted to assistant review'];
    }
  } else if (scores.client >= scores.assistant && scores.client >= scores.noreply && scores.client > 0 && !resolved) {
    label = 'client'; reasons = uniq(hits.client);
  } else if (scores.noreply >= scores.assistant && scores.noreply > 0 && (resolved || scores.client === 0)) {
    label = 'noreply'; reasons = resolved ? ['latest message indicates the matter is resolved'] : uniq(hits.noreply);
  } else if (scores.assistant > 0) {
    label = 'assistant'; reasons = uniq(hits.assistant);
  } else {
    label = 'noreply'; reasons = ['informational only'];
  }

  const total = scores.client + scores.assistant + scores.noreply || 1;
  const top = Math.max(scores.client, scores.assistant, scores.noreply);
  const sorted = Object.values(scores).sort((a, b) => b - a);
  const margin = sorted[0] - sorted[1];
  let confidence = Math.min(0.97, 0.55 + (top / total) * 0.35 + Math.min(margin, 5) * 0.02);
  const mixed = hits.client.length > 0 && hits.assistant.length > 0;
  if (mixed) confidence = Math.min(confidence, 0.58);
  if (reasons[0].startsWith('waiting for the other side')) confidence = Math.min(confidence, 0.75);
  let needsReview = confidence < 0.62;
  if (reasons[0] === 'no strong signals - defaulted to assistant review') needsReview = true;
  if (resolved) { needsReview = false; confidence = Math.max(confidence, 0.8); }

  return { label, confidence: Math.round(confidence * 100) / 100, reasons, needsReview };
}

// A response is "waiting" when the last word is ours (client or assistant).
export function computeWaiting(conv) {
  if (!isOutbound(conv, lastMessage(conv))) return false;
  // "Waiting for their reply" means the ball is with the correspondent. When the
  // classification says the client personally must act, an assistant holding
  // acknowledgment does not move the ball off the client.
  const label = conv.classification?.label || conv.classification?.auto;
  if (label === 'client') return false;
  return true;
}

const DATE_RE = /\b((\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?)|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,\s*\d{4})?)|(\d{1,2}\s*[:.]\s*\d{2}\s*(?:AM|PM|am|pm))|(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b)/g;
const ACTION_RE = /\b(please|could you|can you|need to|needs to|submit|send|confirm|review|approve|sign|share|attach|provide|chase|follow up)\b/i;

export function extractDetails(conv) {
  const dates = new Set(); const actions = [];
  for (const m of conv.messages) {
    const sentences = m.body.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const dm = s.match(DATE_RE);
      if (dm) dm.forEach(d => dates.add(d.trim()));
      if (ACTION_RE.test(s) && s.length < 220) actions.push(s.trim());
    }
  }
  return { dates: [...dates].slice(0, 6), actions: actions.slice(0, 4) };
}

export function summarizeConversation(conv) {
  const bullets = [];
  const latest = lastMessage(conv);
  const senders = [...new Set(conv.messages.map(m => m.fromName))];
  const first = conv.messages[0];
  const topic = first.body.split(/(?<=[.!?])\s+/)[0];
  bullets.push(`${conv.messages.length}-message thread with ${senders.join(', ')}.`);
  if (topic && topic.length < 200) bullets.push(`Started: ${topic.trim()}`);
  const latestFirst = latest.body.split(/(?<=[.!?])\s+/)[0];
  if (latestFirst && latestFirst.length < 220 && latestFirst !== topic) bullets.push(`Latest (${latest.fromName}): ${latestFirst.trim()}`);
  const { dates, actions } = extractDetails(conv);
  if (dates.length) bullets.push(`Dates mentioned: ${dates.join(', ')}.`);
  if (actions.length) bullets.push(`Open ask: ${actions[actions.length - 1]}`);
  return bullets.slice(0, 4);
}

export function detectMeetings(conv) {
  const text = corpus(conv);
  if (!/meeting|call|sync|keynote|rehearsal|interview|dinner|webinar|walkthrough|checking in/.test(text)) return [];
  const { dates } = extractDetails(conv);
  if (!dates.length) return [];
  const t = conv.subject.replace(/^(re:\s*)/i, '');
  return [{ title: t, when: dates.slice(0, 3).join(' · '), with: conv.from.name }];
}

export function draftReply(conv, classification) {
  const other = conv.from.name.split(' ')[0];
  const { dates } = extractDetails(conv);
  const dateNote = dates.length ? ` I have noted ${dates[0]}.` : '';
  if (classification === 'client') {
    return `Hi ${other},\n\nThank you for this. ${conv.client} will review it personally and come back to you directly.${dateNote}\n\nBest regards,\nRiya\nAssistant to ${conv.client}`;
  }
  if (classification === 'noreply') {
    return `Hi ${other},\n\nThank you for the update - noted, and no action is needed from our side right now.\n\nBest regards,\nRiya\nAssistant to ${conv.client}`;
  }
  return `Hi ${other},\n\nThank you for reaching out. I will take care of this on ${conv.client}'s behalf and confirm the details shortly.${dateNote}\n\nBest regards,\nRiya\nAssistant to ${conv.client}`;
}

const CLASS_LABEL = { assistant: 'Assistant to reply', client: 'Client to reply', noreply: 'No reply needed' };

export function answerQuestion(question, ctx) {
  // ctx: { conversations, conversation? }
  const q = question.toLowerCase();
  const list = ctx.conversations;
  const fmt = c => `- "${c.subject}" from ${c.from.name} (${CLASS_LABEL[c.classification.label]}, ${Math.round(c.classification.confidence * 100)}% confidence)`;

  if (/\bwhy\b.*(client|assigned|classified)/ && ctx.conversation) {
    const c = ctx.conversation;
    return { text: `"${c.subject}" is classified as ${CLASS_LABEL[c.classification.label]} because: ${c.classification.reasons.join('; ')}. Confidence ${Math.round(c.classification.confidence * 100)}%. You can override it from the conversation view.`, refs: [c.id] };
  }
  if (/summar/.test(q)) {
    if (ctx.conversation) return { text: summarizeConversation(ctx.conversation).map(b => `- ${b}`).join('\n'), refs: [ctx.conversation.id] };
    return { text: 'Open a conversation and ask again, and I will summarise that thread.', refs: [] };
  }
  if (/client.*(attention|reply|respond)|require.*client|needs.*client/.test(q)) {
    const m = list.filter(c => c.classification.label === 'client' && !c.labels.completed && !c.labels.archived);
    return { text: m.length ? `These conversations need the client's personal attention:\n${m.map(fmt).join('\n')}` : 'Nothing currently needs the client.', refs: m.map(c => c.id) };
  }
  if (/waiting|pending response|awaiting/.test(q)) {
    const m = list.filter(c => c.waiting && !c.labels.completed);
    return { text: m.length ? `You are waiting on replies for:\n${m.map(fmt).join('\n')}` : 'Nothing is waiting on a reply right now.', refs: m.map(c => c.id) };
  }
  if (/need.*(my|your)?\s*attention|action|to ?do|respond/.test(q)) {
    const m = list.filter(c => (c.classification.label === 'assistant' || c.classification.needsReview) && !c.labels.completed && !c.labels.archived);
    return { text: m.length ? `These need your attention:\n${m.map(fmt).join('\n')}` : 'Inbox is clear - nothing needs your action.', refs: m.map(c => c.id) };
  }
  if (/meeting|appointment|schedule|calendar/.test(q)) {
    const meetings = list.flatMap(c => (c.meetings || []).map(mm => `- ${mm.title} with ${mm.with} (${mm.when})`));
    return { text: meetings.length ? `Upcoming meetings and events found in email:\n${meetings.join('\n')}` : 'No meetings found in the current inbox.', refs: [] };
  }
  if (/important|unread/.test(q)) {
    const m = list.filter(c => (c.labels.important || c.labels.unread) && !c.labels.archived);
    return { text: m.length ? `Important or unread conversations:\n${m.map(fmt).join('\n')}` : 'No important or unread conversations.', refs: m.map(c => c.id) };
  }
  if (/draft|reply|write/.test(q)) {
    if (ctx.conversation) return { text: `Here is a draft you can review and edit before sending:\n\n${draftReply(ctx.conversation, ctx.conversation.classification.label)}`, refs: [ctx.conversation.id], draft: true };
    return { text: 'Open a conversation and use "Draft reply" - I will prepare a reply for your review before anything is sent.', refs: [] };
  }
  // Fallback: keyword search over subjects and senders.
  const words = q.replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
  const m = list.filter(c => words.some(w => (c.subject + ' ' + c.from.name).toLowerCase().includes(w))).slice(0, 5);
  if (m.length) return { text: `I found these matching conversations:\n${m.map(fmt).join('\n')}`, refs: m.map(c => c.id) };
  return { text: 'I can help with: emails needing attention, what the client must answer, pending replies, meetings found in email, summaries, and drafting replies. Try one of the suggested questions.', refs: [] };
}
