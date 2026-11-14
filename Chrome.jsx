import React from 'react';
import { CLASS_META } from './App.jsx';
import { SEGMENT_DEFS } from './segments.js';

export function Sidebar({ view, segment, conversations, connections, onNavigate, onConnect, onDisconnect, mobileOpen }) {
  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand" onClick={() => onNavigate('dashboard')}>
        <span className="brand-mark">PA</span><span className="brand-name">PA Desk</span>
      </div>
      <button className={'nav-item' + (view === 'dashboard' ? ' active' : '')} onClick={() => onNavigate('dashboard')}>
        <span className="dot-ic" />Dashboard
      </button>
      <div className="nav-head">Segments</div>
      {SEGMENT_DEFS.map(({ key, label, pred }) => {
        const n = conversations.filter(pred).length;
        return (
          <button key={key} className={'nav-item' + (view === 'list' && segment === key ? ' active' : '')} onClick={() => onNavigate('list', key)}>
            <span className={`seg-ic seg-${key}`} />{label}<span className="count">{n}</span>
          </button>
        );
      })}
      <div className="nav-head">Connected accounts</div>
      <div className="conns">
        {connections.map(c => (
          <div key={c.id} className="conn">
            <span className={`provider ${c.provider}`}>{c.provider === 'gmail' ? 'G' : 'O'}</span>
            <div className="conn-meta">
              <div className="conn-mail">{c.clientName}</div>
              <div className="conn-sub">{c.email}</div>
              <div className="conn-status"><span className="okdot" />Connected - simulated</div>
            </div>
            <button className="mini" title="Disconnect" onClick={() => onDisconnect(c.id)}>x</button>
          </div>
        ))}
        <button className="btn small ghost" onClick={onConnect}>+ Connect account</button>
      </div>
      <div className="sidebar-foot">Synthetic demo data</div>
    </aside>
  );
}

export function Topbar({ me, query, setQuery, view, onSwitch, onAsk, onSync, syncing, onLogout, onMenu, lastSync }) {
  return (
    <header className="topbar">
      <button className="hamburger" onClick={onMenu} aria-label="Menu">=</button>
      <div className="view-switch">
        <button className={view !== 'client' ? 'on' : ''} onClick={() => onSwitch('dashboard')}>Assistant view</button>
        <button className={view === 'client' ? 'on' : ''} onClick={() => onSwitch('client')}>Client view</button>
      </div>
      <div className="search">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search conversations, people, clients..." />
      </div>
      <button className="btn small" onClick={onSync} disabled={syncing} title="Simulate a mailbox sync - one new email arrives and threads are re-analysed">
        {syncing ? 'Syncing...' : 'Sync now'}
      </button>
      <button className="btn small primary" onClick={onAsk}>Ask PA</button>
      <div className="me">
        <span className="avatar">{me.name[0]}</span>
        <button className="mini" onClick={onLogout}>Sign out</button>
      </div>
    </header>
  );
}

export function Badge({ classification, compact }) {
  const meta = CLASS_META[classification.label];
  return (
    <span className={`badge ${meta.color}${classification.needsReview ? ' review' : ''}`} title={classification.reasons.join('; ')}>
      {meta.label}{!compact && <> <em>{Math.round(classification.confidence * 100)}%</em></>}
      {classification.overridden && <i title="Manually overridden"> (set by you)</i>}
      {classification.needsReview && <strong title="Low confidence - please review"> !</strong>}
    </span>
  );
}
