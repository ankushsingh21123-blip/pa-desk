import React, { useState } from 'react';
import { api } from './api.js';

const SUGGESTED = [
  'Show me emails that need my attention',
  'Which emails require the client?',
  'What am I waiting for a response on?',
  'What meetings are coming up?',
  'Summarize this conversation',
  'Why has this email been assigned to the client?'
];

export default function AskPanel({ conversationId, onClose, onOpenRef }) {
  const [history, setHistory] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const ask = async (question) => {
    if (!question.trim() || busy) return;
    setBusy(true);
    setHistory(h => [...h, { role: 'you', text: question }]);
    setQ('');
    try {
      const r = await api.ask(question, conversationId || undefined);
      setHistory(h => [...h, { role: 'pa', text: r.text, refs: r.refs || [] }]);
    } catch (e) {
      setHistory(h => [...h, { role: 'pa', text: `Sorry - ${e.message}` }]);
    }
    setBusy(false);
  };

  return (
    <div className="ask-back" onClick={onClose}>
      <div className="ask" onClick={e => e.stopPropagation()}>
        <div className="ask-head">
          <h2>Ask PA</h2>
          <span className="pill slate" title="Deterministic rules stand in for an LLM in this prototype">SIMULATED</span>
          <button className="mini" onClick={onClose}>x</button>
        </div>
        <div className="ask-body">
          {history.length === 0 && (
            <div className="ask-intro">
              <p>Ask questions about your clients' inboxes in plain language.</p>
              <div className="suggested">
                {SUGGESTED.map(s => <button key={s} className="chip-btn" onClick={() => ask(s)}>{s}</button>)}
              </div>
            </div>
          )}
          {history.map((m, i) => (
            <div key={i} className={`ask-msg ${m.role}`}>
              <p style={{ whiteSpace: 'pre-line' }}>{m.text}</p>
              {m.refs?.length > 0 && (
                <div className="ask-refs">{m.refs.map(r => <button key={r} className="mini" onClick={() => onOpenRef(r)}>Open</button>)}</div>
              )}
            </div>
          ))}
          {busy && <div className="ask-msg pa"><p>Thinking...</p></div>}
        </div>
        <div className="ask-input">
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask(q)} placeholder="Ask about your emails..." />
          <button className="btn primary small" onClick={() => ask(q)} disabled={busy}>Ask</button>
        </div>
      </div>
    </div>
  );
}
