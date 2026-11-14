import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';
import Auth from './Auth.jsx';
import { Sidebar, Topbar } from './Chrome.jsx';
import Dashboard from './Dashboard.jsx';
import EmailList from './EmailList.jsx';
import Conversation from './Conversation.jsx';
import ClientView from './ClientView.jsx';
import AskPanel from './AskPanel.jsx';
import ConnectModal from './ConnectModal.jsx';

export const CLASS_META = {
  assistant: { label: 'Assistant to reply', color: 'blue' },
  client: { label: 'Client to reply', color: 'amber' },
  noreply: { label: 'No reply needed', color: 'slate' }
};

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading
  const [data, setData] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard | list | client
  const [segment, setSegment] = useState('inbox');
  const [openId, setOpenId] = useState(null);
  const [query, setQuery] = useState('');
  const [askOpen, setAskOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const showToast = useCallback((msg, kind = 'ok') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4200);
  }, []);

  const refresh = useCallback(async () => {
    const b = await api.bootstrap();
    setData(b);
  }, []);

  useEffect(() => {
    api.me().then(setMe).catch(() => setMe(null));
  }, []);

  useEffect(() => {
    if (me) {
      refresh().catch(e => showToast(e.message, 'error'));
      if (!localStorage.getItem('padesk_onboarded')) setNeedsOnboarding(true);
    }
  }, [me, refresh, showToast]);

  const conversations = data?.conversations || [];
  const filtered = useMemo(() => {
    let list = conversations;
    if (query.trim()) {
      const n = query.toLowerCase();
      list = list.filter(c => (c.subject + ' ' + c.from.name + ' ' + c.client).toLowerCase().includes(n));
    }
    return list;
  }, [conversations, query]);

  const openConversation = async (id) => {
    setOpenId(id);
    const c = conversations.find(x => x.id === id);
    if (c?.labels.unread) {
      try { await api.update(id, { unread: false }); refresh(); } catch { /* non-blocking */ }
    }
  };

  const doSync = async () => {
    setSyncing(true);
    try {
      const r = await api.sync();
      await refresh();
      const moved = r.reclassified ? ` - reclassified from "${CLASS_META[r.reclassified.from].label}" to "${CLASS_META[r.reclassified.to].label}"` : '';
      showToast(`${r.change}${moved}`);
    } catch (e) { showToast(e.message, 'error'); }
    setSyncing(false);
  };

  const onConnected = async (conn) => {
    setConnectOpen(false);
    await refresh();
    showToast(`${conn.provider === 'gmail' ? 'Gmail' : 'Outlook'} account connected (simulated) - sync complete.`);
  };

  if (me === undefined) return <div className="boot"><div className="spinner" /><p>Loading PA Desk...</p></div>;
  if (!me) return <Auth onAuthed={(fresh) => { setMe(fresh); if (fresh.isNew) setNeedsOnboarding(true); }} />;

  if (needsOnboarding) {
    return (
      <OnboardingInline
        onDone={() => { localStorage.setItem('padesk_onboarded', '1'); setNeedsOnboarding(false); }}
        onConnected={onConnected}
        connections={data?.connections || []}
      />
    );
  }

  const openConv = conversations.find(c => c.id === openId) || null;

  return (
    <div className="shell">
      <Sidebar
        view={view} segment={segment} conversations={conversations}
        connections={data?.connections || []}
        onNavigate={(v, s) => { setView(v); if (s) setSegment(s); setOpenId(null); setMobileNav(false); }}
        onConnect={() => setConnectOpen(true)}
        onDisconnect={async (id) => { await api.disconnect(id); refresh(); showToast('Account disconnected.'); }}
        mobileOpen={mobileNav}
      />
      {mobileNav && <div className="nav-backdrop" onClick={() => setMobileNav(false)} />}
      <div className="main">
        <Topbar
          me={me} query={query} setQuery={setQuery}
          view={view} onSwitch={(v) => { setView(v); setOpenId(null); }}
          onAsk={() => setAskOpen(true)} onSync={doSync} syncing={syncing}
          onLogout={async () => { await api.logout(); setMe(null); }}
          onMenu={() => setMobileNav(!mobileNav)}
          lastSync={data?.connections?.[0]?.lastSync}
        />
        {view === 'client' ? (
          <ClientView conversations={conversations} onChanged={refresh} showToast={showToast} />
        ) : openConv ? (
          <Conversation
            key={openConv.id} id={openConv.id}
            onBack={() => setOpenId(null)}
            onChanged={refresh} showToast={showToast}
            onAsk={(q) => setAskOpen(true)}
          />
        ) : view === 'dashboard' ? (
          <Dashboard
            stats={data?.stats} meetings={data?.meetings || []} conversations={conversations}
            onOpen={openConversation} onNavigate={(v, s) => { setView(v); if (s) setSegment(s); }}
          />
        ) : (
          <EmailList segment={segment} conversations={filtered} onOpen={openConversation} />
        )}
      </div>
      {askOpen && <AskPanel conversationId={openId} onClose={() => setAskOpen(false)} onOpenRef={(id) => { setAskOpen(false); setView('list'); openConversation(id); }} />}
      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} onConnected={onConnected} />}
      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
      <footer className="demo-ribbon">Prototype demo - all emails, people and accounts are synthetic. AI features are simulated (deterministic rules, no live LLM). No real email is read or sent.</footer>
    </div>
  );
}

// Inline onboarding shown until the demo account completes the 3-step intro.
function OnboardingInline({ onDone, onConnected, connections }) {
  const [step, setStep] = useState(0);
  const [connectOpen, setConnectOpen] = useState(false);
  return (
    <div className="onboard">
      <div className="onboard-card">
        {step === 0 && (
          <>
            <div className="logo-lg">PA Desk</div>
            <h1>Your clients' inboxes, organised by who should reply</h1>
            <p>PA Desk helps personal assistants manage client email: it sorts every conversation by who needs to respond - you, your client, or nobody - and keeps a minimal view for the client.</p>
            <p className="muted">This prototype runs entirely on synthetic demo data. Email connections and AI features are simulated and labelled as such.</p>
            <button className="btn primary" onClick={() => setStep(1)}>Get started</button>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Connect an email account</h2>
            <p>Connect Gmail or Outlook accounts for each client you manage. In this prototype the authorisation flow is simulated - no real inbox is accessed.</p>
            <div className="conn-list">
              {connections.map(c => (
                <div key={c.id} className="conn-row">
                  <span className={`provider ${c.provider}`}>{c.provider === 'gmail' ? 'Gmail' : 'Outlook'}</span>
                  <span>{c.email}</span>
                  <span className="pill ok">Connected (simulated)</span>
                </div>
              ))}
            </div>
            <div className="row-gap">
              <button className="btn" onClick={() => setConnectOpen(true)}>Connect another account</button>
              <button className="btn primary" onClick={() => setStep(2)}>Continue</button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>You're set</h2>
            <p>Every incoming conversation is analysed and labelled automatically. Open the dashboard to see what needs you, what needs your client, and what needs nobody.</p>
            <ul className="ticks">
              <li>Automatic reply-responsibility classification with confidence and reasons</li>
              <li>A minimal client view for emails that need your client personally</li>
              <li>Summaries, extracted dates and a review-before-send reply drafter</li>
            </ul>
            <button className="btn primary" onClick={onDone}>Open my dashboard</button>
          </>
        )}
        <div className="dots">{[0, 1, 2].map(i => <span key={i} className={i === step ? 'dot on' : 'dot'} />)}</div>
      </div>
      {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} onConnected={(c) => { setConnectOpen(false); onConnected(c); }} />}
    </div>
  );
      }
