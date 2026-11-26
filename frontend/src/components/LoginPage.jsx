import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldIcon } from './Icons';

export default function LoginPage() {
  const { login, register, resetPassword } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setNotice('');
  };

  const fillDemo = (role) => {
    setError('');
    setNotice('');
    if (role === 'admin') {
      setEmail('admin@threatlens.io');
      setPassword('Admin@123');
    } else {
      setEmail('analyst@threatlens.io');
      setPassword('Analyst@123');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (!res?.ok) {
          setError(res?.error || 'Invalid email or password.');
        }
      } else if (mode === 'signup') {
        const res = await register(name, email, password);
        if (!res?.ok) {
          setError(res?.error || 'Could not create account.');
        }
      } else if (mode === 'forgot') {
        const res = await resetPassword(email);
        if (!res?.ok) {
          setError(res?.error || 'Could not send reset instructions.');
        } else {
          setNotice(res?.message || 'Password reset instructions sent.');
        }
      }
    } catch (err) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const headingText =
    mode === 'login'
      ? 'Sign in to your workspace'
      : mode === 'signup'
      ? 'Create your account'
      : 'Reset your password';

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-shield">
            <ShieldIcon size={20} />
          </div>
          <div>
            <div className="auth-brand-title">
              ThreatLens <span className="cyan-accent">Auditor</span>
            </div>
            <div className="auth-brand-sub">Security Assessment &amp; Attack Surface Workspace</div>
          </div>
        </div>

        <h1 className="auth-heading">{headingText}</h1>

        {error && <div className="auth-alert error">{error}</div>}
        {notice && <div className="auth-alert success">{notice}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                className="tl-input"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="workEmail">Work Email</label>
            <input
              id="workEmail"
              type="email"
              className="tl-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => switchMode('forgot')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>

              <div className="password-wrap">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="tl-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-pw-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-cyan-primary full-width">
            {submitting
              ? 'Please wait...'
              : mode === 'login'
              ? 'Log in'
              : mode === 'signup'
              ? 'Create account'
              : 'Send reset link'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="demo-box">
            <span className="demo-label">Quick Role Fill:</span>
            <div className="demo-btns">
              <button type="button" className="demo-pill" onClick={() => fillDemo('admin')}>
                Admin Account
              </button>
              <button type="button" className="demo-pill" onClick={() => fillDemo('analyst')}>
                Analyst Account
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          {mode === 'login' && (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" className="text-link" onClick={() => switchMode('signup')}>
                Sign up
              </button>
            </>
          )}

          {(mode === 'signup' || mode === 'forgot') && (
            <>
              Already have an account?{' '}
              <button type="button" className="text-link" onClick={() => switchMode('login')}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}