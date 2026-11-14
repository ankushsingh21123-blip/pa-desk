import React, { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Minimalistic client-facing view: only what needs the client personally.
export default function ClientView({ conversations, onChanged, showToast }) {
  const clients = useMemo(() => [...new Set(conversations.map(c => c.client))], [conversations]);
  const [client, setClient] = useState(clients[0] || '');
  useEffect(() => { if (!client && clients.length) setClient(clients[0]); }, [clients, client]);

  const items = conversations.filter(c =>
    c.client === client &&
    (c.classification.label === 'client' || c.clientStatus) &&
    !c.labels.archived
  );

  const [openId, setOpenId] = useState(null);
  const [openConv, setOpenConv] = useState(null);
  const [busy, setBusy] = useState(false);

  const openThread = async (id) => {
    setOpenId(id);
    setOpenConv(null);
    try { setOpenConv(await api.conversation(id)); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const act = async (id, action, msg) => {
    setBusy(true);
    try { await api.clientAction(id, action); await onChanged(); showToast(msg); setOpenId(null); }
    catch (e) { showToast(e.message, 'error'); }
    setBusy(false);
  };

  return (
    <div className="page client-page">
      <div className="page-head">
        <h1>Your attention, please</h1>
        <p className="muted">Only the emails that need you personally. Everything else is handled by your assistant.</p>
        <div className="client-picker">
          {clients.map(cl => (
            <button key={cl} className={'btn small' + (cl === client ? ' primary' : '')} onClick={() => setClient(cl)}>{cl}</button>
          ))}
        </div>
      </div>
      <div className="client-list">
        {items.length === 0 && (
          <div className="empty-state">
            <p>Nothing needs you right now.</p>
            <p className="muted">When an email needs your personal decision, it will appear here with a short summary.</p>
          </div>
        )}
        {items.map(c => <ClientCard key={c.id} c={c} onOpen={() => openThread(c.id)} onAct={act} busy={busy} />)}
      </div>

      {openId && (
        <div className="modal-back" onClick={() => setOpenId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {!openConv ? <div className="loading"><div className="spinner" /></div> : (
              <>
                <h2>{openConv.subject}</h2>
                <div className="thread mini">
                  {openConv.messages.map((m, i) => (
                    <div key={i} className="msg">
                      <div className="msg-head"><span className="msg-from">{m.fromName}</span><span className="msg-time">{fmtDate(m.at)}</span></div>
                      <p className="msg-body">{m.body}</p>
                    </div>
                  ))}
                </div>
                <div className="row-gap">
                  <button className="btn" onClick={() => setOpenId(null)}>Close</button>
                  <button className="btn ok" disabled={busy} onClick={() => act(openConv.id, 'handled', 'Marked as handled. Your assistant has been notified.')}>Mark as handled</button>
                  <button className="btn primary" disabled={busy} onClick={() => act(openConv.id, 'assistant_takeover', 'Passed to your assistant.')}>Ask my assistant to handle</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientCard({ c, onOpen, onAct, busy }) {
  const [summary, setSummary] = useState(null);
  useEffect(() => { api.summary(c.id).then(s => setSummary(s)).catch(() => {}); }, [c.id, c.updatedAt]);
  const done = c.clientStatus?.state === 'handled';
  const passed = c.clientStatus?.state === 'assistant_takeover';
  return (
    <div className={`client-card${done || passed ? ' done' : ''}`}>
      <div className="cc-top">
        <span className="cc-from">{c.from.name}</span>
        <span className="cc-date">{fmtDate(c.updatedAt)}</span>
      </div>
      <div className="cc-subject">{c.subject}</div>
      {summary ? (
        <ul className="summary">{summary.summary.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}</ul>
      ) : <p className="muted">Summarising...</p>}
      <div className="cc-why">
        <span className="ai-label">Why it needs you</span>
        <p>{c.classification.reasons.join('; ')}.</p>
      </div>
      {done && <span className="pill ok">Handled</span>}
      {passed && <span className="pill blue">With your assistant</span>}
      {!done && !passed && (
        <div className="row-gap">
          <button className="btn small" onClick={onOpen}>Read conversation</button>
          <button className="btn small ok" disabled={busy} onClick={() => onAct(c.id, 'handled', 'Marked as handled.')}>Mark as handled</button>
          <button className="btn small primary" disabled={busy} onClick={() => onAct(c.id, 'assistant_takeover', 'Passed to your assistant.')}>Ask assistant to handle</button>
        </div>
      )}
    </div>
  );
          }
