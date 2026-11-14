import React, { useState } from 'react';
import { api } from './api.js';

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      if (mode === 'signup') {
        await api.signup(name, email, password);
        onAuthed({ name, email, isNew: true });
      } else {
        const r = await api.login(email, password);
        onAuthed({ name: r.name, email, isNew: false });
      }
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const demo = async () => {
    setBusy(true); setError(null);
    try {
      const r = await api.login('assistant@padesk.demo', 'demo1234');
      onAuthed({ name: r.name, email: 'assistant@padesk.demo', isNew: false });
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="logo-lg">PA Desk</div>
        <p className="muted">AI-assisted email management for personal assistants. Prototype with synthetic demo data.</p>
        <div className="view-switch auth-switch">
          <button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Log in</button>
          <button className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>Sign up</button>
        </div>
        <form onSubmit={submit}>
          {mode === 'signup' && (
            <>
              <label className="ai-label">Your name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
            </>
          )}
          <label className="ai-label">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          <label className="ai-label">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} required />
          {error && <p className="error-text">{error}</p>}
          <button className="btn primary wide" disabled={busy}>{busy ? 'One moment...' : mode === 'login' ? 'Log in' : 'Create account'}</button>
        </form>
        <div className="divider"><span>or</span></div>
        <button className="btn wide" onClick={demo} disabled={busy}>Explore the demo account</button>
        <p className="muted small center">Demo sign-in: assistant@padesk.demo / demo1234. No real email is connected; all data is synthetic.</p>
      </div>
    </div>
  );
}
