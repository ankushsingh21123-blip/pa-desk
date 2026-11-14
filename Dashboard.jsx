import React from 'react';
import { Badge } from './Chrome.jsx';
import { CLASS_META } from './App.jsx';

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

export default function Dashboard({ stats, meetings, conversations, onOpen, onNavigate }) {
  if (!stats) return <div className="loading"><div className="spinner" />Loading inbox...</div>;
  const attention = conversations
    .filter(c => !c.labels.archived && !c.labels.completed && (c.classification.label === 'assistant' || c.classification.needsReview))
    .slice(0, 5);
  const forClient = conversations
    .filter(c => !c.labels.archived && !c.labels.completed && c.classification.label === 'client')
    .slice(0, 5);
  const recent = [...conversations].filter(c => !c.labels.archived).slice(0, 6);

  const cards = [
    ['Needs your action', stats.actionRequired, () => onNavigate('list', 'action'), 'blue'],
    ["Needs client's attention", stats.clientReply, () => onNavigate('list', 'client'), 'amber'],
    ['Waiting for response', stats.waiting, () => onNavigate('list', 'waiting'), 'violet'],
    ['Flagged for review', stats.needsReview, () => onNavigate('list', 'review'), 'red'],
    ['Unread', stats.unread, () => onNavigate('list', 'inbox'), 'slate'],
    ['Important', stats.important, () => onNavigate('list', 'important'), 'slate'],
    ['Total conversations', stats.total, () => onNavigate('list', 'inbox'), 'slate']
  ];

  return (
    <div className="page">
      <div className="page-head">
        <h1>Good to see you</h1>
        <p className="muted">Here is what is happening across your clients' inboxes right now.</p>
      </div>
      <div className="stat-grid">
        {cards.map(([label, n, go, color]) => (
          <button key={label} className={`stat ${color}`} onClick={go}>
            <span className="stat-n">{n}</span><span className="stat-l">{label}</span>
          </button>
        ))}
      </div>
      <div className="dash-cols">
        <section className="panel">
          <h2>Needs your action</h2>
          {attention.length === 0 && <p className="empty">Nothing needs you right now. Nice.</p>}
          {attention.map(c => <Row key={c.id} c={c} onOpen={onOpen} />)}
        </section>
        <section className="panel">
          <h2>Needs your client's attention</h2>
          {forClient.length === 0 && <p className="empty">Nothing waiting on your clients.</p>}
          {forClient.map(c => <Row key={c.id} c={c} onOpen={onOpen} />)}
        </section>
        <section className="panel">
          <h2>Upcoming meetings found in email</h2>
          {meetings.length === 0 && <p className="empty">No meetings detected.</p>}
          {meetings.slice(0, 5).map((m, i) => (
            <button key={i} className="row" onClick={() => onOpen(m.conversationId)}>
              <div className="row-main">
                <span className="row-title">{m.title}</span>
                <span className="row-sub">{m.with} - {m.when}</span>
              </div>
              <span className="row-time">{m.client}</span>
            </button>
          ))}
        </section>
        <section className="panel">
          <h2>Recent conversations</h2>
          {recent.map(c => <Row key={c.id} c={c} onOpen={onOpen} />)}
        </section>
      </div>
    </div>
  );
}

export function Row({ c, onOpen }) {
  return (
    <button className={`row${c.labels.unread ? ' unread' : ''}`} onClick={() => onOpen(c.id)}>
      <div className="row-main">
        <span className="row-title">{c.labels.important && <i className="star" title="Important">*</i>}{c.subject}</span>
        <span className="row-sub">{c.from.name} - {c.client}</span>
      </div>
      <span className="row-side">
        {c.clientStatus?.state === 'handled' && <span className="pill ok">Handled by client</span>}
        {c.clientStatus?.state === 'assistant_takeover' && <span className="pill blue">Client passed to you</span>}
        <Badge classification={c.classification} compact />
        <span className="row-time">{timeAgo(c.updatedAt)}</span>
      </span>
    </button>
  );
}
