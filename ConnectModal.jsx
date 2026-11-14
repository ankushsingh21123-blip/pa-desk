import React, { useState } from 'react';
import { api } from './api.js';

// Simulated email-provider connection flow. No real OAuth happens: this
// demonstrates the UX of authorising Gmail/Outlook access with clear labels.
export default function ConnectModal({ onClose, onConnected }) {
  const [provider, setProvider] = useState(null);
  const [email, setEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [stage, setStage] = useState('pick'); // pick | form | authorizing | done
  const [error, setError] = useState(null);

  const connect = async () => {
    if (!email.includes('@') || !clientName.trim()) { setError('Enter the client name and a valid email address.'); return; }
    setError(null);
    setStage('authorizing');
    // Simulated authorisation + first sync delay.
    await new Promise(r => setTimeout(r, 1600));
    try {
      const conn = await api.connect(provider, email, clientName);
      setStage('done');
      setTimeout(() => onConnected(conn), 700);
    } catch (e) { setError(e.message); setStage('form'); }
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="ai-head"><h2>Connect an email account</h2><span className="pill slate">SIMULATED FLOW</span></div>
        {stage === 'pick' && (
          <>
            <p>Choose the provider for the client's inbox you want to manage.</p>
            <div className="provider-pick">
              <button className="provider-btn" onClick={() => { setProvider('gmail'); setStage('form'); }}>
                <span className="provider gmail">G</span> Connect Gmail
              </button>
              <button className="provider-btn" onClick={() => { setProvider('outlook'); setStage('form'); }}>
                <span className="provider outlook">O</span> Connect Outlook / Microsoft
              </button>
            </div>
            <p className="muted small">In the production product this opens the provider's real OAuth consent screen. In this prototype the flow is simulated and no real inbox is accessed.</p>
            <div className="row-gap"><button className="btn" onClick={onClose}>Cancel</button></div>
          </>
        )}
        {stage === 'form' && (
          <>
            <p>Authorise PA Desk to read and organise mail for this account (simulated consent):</p>
            <ul className="ticks">
              <li>Read email conversations</li>
              <li>Organise and label conversations</li>
              <li>Prepare replies for your review - never sends on its own</li>
            </ul>
            <label className="ai-label">Client name</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Priya Verma" />
            <label className="ai-label">Account email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. priya.verma@gmail.com" />
            {error && <p className="error-text">{error}</p>}
            <div className="row-gap">
              <button className="btn" onClick={() => setStage('pick')}>Back</button>
              <button className="btn primary" onClick={connect}>Authorise (simulated)</button>
            </div>
          </>
        )}
        {stage === 'authorizing' && (
          <div className="loading"><div className="spinner" /><p>Authorising and running the first sync (simulated)...</p></div>
        )}
        {stage === 'done' && (
          <div className="loading"><p className="success-text">Connected - initial sync complete.</p></div>
        )}
      </div>
    </div>
  );
}
