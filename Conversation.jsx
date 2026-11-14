import React, { useEffect, useState } from 'react';
import { api } from './api.js';
import { Badge } from './Chrome.jsx';
import { CLASS_META } from './App.jsx';

function fmtTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function Conversation({ id, onBack, onChanged, showToast }) {
  const [conv, setConv] = useState(null);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null); // {subject, body}
  const [draftLoading, setDraftLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    try { setConv(await api.conversation(id)); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [id]);

  if (error) {
    return (
      <div className="page"><div className="empty-state">
        <p>Could not open this conversation.</p><p className="muted">{error}</p>
        <button className="btn" onClick={onBack}>Back</button>
      </div></div>
    );
  }
  if (!conv) return <div className="loading"><div className="spinner" />Opening conversation...</div>;

  const applyPatch = async (patch, msg) => {
    try { await api.update(id, patch); await load(); onChanged(); if (msg) showToast(msg); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const override = async (label) => {
    await applyPatch({ classification: label }, `Reclassified as "${CLASS_META[label].label}" (manual override).`);
  };

  const makeDraft = async () => {
    setDraftLoading(true);
    try { setDraft(await api.draft(id)); }
    catch (e) { showToast(e.message, 'error'); }
    setDraftLoading(false);
  };

  const sendDraft = async () => {
    setSending(true);
    try {
      const r = await api.send(id, draft.body);
      setDraft(null);
      await load(); onChanged();
      const moved = r.conversation.classification.reclassified;
      showToast('Reply recorded (simulated send - no real email left the system).' + (moved ? ' Thread re-analysed.' : ''));
    } catch (e) { showToast(e.message, 'error'); }
    setSending(false);
  };

  return (
    <div className="page conv-page">
      <div className="conv-head">
        <button className="btn small ghost" onClick={onBack}>&larr; Back</button>
        <div className="conv-title">
          <h1>{conv.subject}</h1>
          <div className="conv-meta">
            <span>{conv.client}</span><span className="sep">|</span><span>{conv.accountEmail}</span><span className="sep">|</span>
            <span>{conv.messages.length} message{conv.messages.length === 1 ? '' : 's'}</span>
            {conv.waiting && <span className="pill violet">Waiting for their reply</span>}
            {conv.clientStatus?.state === 'handled' && <span className="pill ok">Handled by client</span>}
            {conv.clientStatus?.state === 'assistant_takeover' && <span className="pill blue">Client passed this to you</span>}
          </div>
        </div>
      </div>

      <div className="conv-cols">
        <div className="thread">
          {conv.messages.map((m, i) => (
            <div key={i} className={`msg${m.from === conv.accountEmail || m.from === 'assistant@padesk.demo' ? ' outbound' : ''}`}>
              <div className="msg-head">
                <span className="msg-from">{m.fromName}</span>
                <span className="msg-mail">{m.from}</span>
                <span className="msg-time">{fmtTime(m.at)}</span>
                {m.simulated && i === conv.messages.length - 1 && <span className="pill slate">simulated</span>}
              </div>
              <p className="msg-body">{m.body}</p>
            </div>
          ))}
          <div className="thread-actions">
            <button className="btn primary" onClick={makeDraft} disabled={draftLoading}>
              {draftLoading ? 'Preparing draft...' : 'Draft reply (simulated AI)'}
            </button>
          </div>
        </div>

        <aside className="ai-panel">
          <div className="ai-head">
            <h2>AI analysis</h2>
            <span className="pill slate" title="Deterministic rules stand in for an LLM in this prototype">SIMULATED</span>
          </div>
          <div className="ai-block">
            <div className="ai-label">Who should reply</div>
            <Badge classification={conv.classification} />
            <div className="ai-reasons">
              <div className="ai-label">Why</div>
              <ul>{conv.classification.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              {conv.classification.needsReview && <p className="review-note">Confidence is low - please review this classification.</p>}
            </div>
            <div className="ai-label">Change classification</div>
            <div className="override-row">
              {Object.entries(CLASS_META).map(([k, m]) => (
                <button key={k} className={'btn small' + (conv.classification.label === k ? ' primary' : '')} onClick={() => override(k)}>{m.label}</button>
              ))}
            </div>
          </div>
          <div className="ai-block">
            <div className="ai-label">Summary</div>
            <ul className="summary">{conv.summary.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          {conv.extracted.dates.length > 0 && (
            <div className="ai-block">
              <div className="ai-label">Dates and deadlines found</div>
              <div className="chips">{conv.extracted.dates.map((d, i) => <span key={i} className="chip">{d}</span>)}</div>
            </div>
          )}
          {conv.extracted.actions.length > 0 && (
            <div className="ai-block">
              <div className="ai-label">Action items</div>
              <ul className="summary">{conv.extracted.actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
            </div>
          )}
          <div className="ai-block">
            <div className="ai-label">Manage</div>
            <div className="manage-grid">
              <button className="btn small" onClick={() => applyPatch({ important: !conv.labels.important }, conv.labels.important ? 'Removed from Important.' : 'Marked important.')}>{conv.labels.important ? 'Unmark important' : 'Mark important'}</button>
              <button className="btn small" onClick={() => applyPatch({ unread: true }, 'Marked unread.')}>Mark unread</button>
              <button className="btn small" onClick={() => applyPatch({ completed: !conv.labels.completed }, conv.labels.completed ? 'Reopened.' : 'Marked completed.')}>{conv.labels.completed ? 'Reopen' : 'Mark completed'}</button>
              <button className="btn small" onClick={() => { applyPatch({ archived: !conv.labels.archived }, conv.labels.archived ? 'Unarchived.' : 'Archived.'); onBack(); }}>{conv.labels.archived ? 'Unarchive' : 'Archive'}</button>
            </div>
          </div>
          <div className="ai-block history">
            <div className="ai-label">Classification history</div>
            <ul>{conv.classification.history.map((h, i) => (
              <li key={i}>{CLASS_META[h.label].label} ({Math.round(h.confidence * 100)}%) - {h.trigger} - {fmtTime(h.at)}</li>
            ))}</ul>
          </div>
        </aside>
      </div>

      {draft && (
        <div className="modal-back" onClick={() => setDraft(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Review reply before sending</h2>
            <p className="muted">This draft was prepared by the simulated assistant. Review and edit it - nothing is sent without your approval, and sending here is itself simulated (no real email is delivered).</p>
            <label className="ai-label">Subject</label>
            <input className="draft-subject" value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} />
            <label className="ai-label">Reply</label>
            <textarea className="draft-body" rows={10} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
            <div className="row-gap">
              <button className="btn" onClick={() => setDraft(null)}>Discard</button>
              <button className="btn primary" onClick={sendDraft} disabled={sending}>{sending ? 'Sending...' : 'Approve & send (simulated)'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
