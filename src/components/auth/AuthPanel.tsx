import type { FormEvent } from 'react';
import type { AuthMode } from '../../types/auth.ts';

export interface AuthPanelProps {
  mode: AuthMode;
  authForm: {
    email: string;
    password: string;
  };
  isLoading: boolean;
  authError: string;
  authMessage: string;
  onFieldChange: (field: 'email' | 'password', value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSwitchMode: (mode: AuthMode) => void;
}

export function AuthPanel({
  mode,
  authForm,
  isLoading,
  authError,
  authMessage,
  onFieldChange,
  onSubmit,
  onSwitchMode,
}: AuthPanelProps) {
  const isSignIn = mode === 'sign-in';

  return (
    <div className="auth-card">
      <div className="auth-header">
        <div className="auth-icon">✨</div>
        <h2>AI Todo Planner</h2>
        <p className="auth-description">
          {isSignIn
            ? 'Sign in to jump back into your organized, AI-assisted day.'
            : 'Create an account in seconds and unlock intelligent prioritization.'}
        </p>
      </div>

      <div className="auth-tabs">
        <button
          type="button"
          className={`auth-tab ${isSignIn ? 'active' : ''}`}
          onClick={() => onSwitchMode('sign-in')}
          disabled={isLoading}
        >
          Sign In
        </button>
        <button
          type="button"
          className={`auth-tab ${!isSignIn ? 'active' : ''}`}
          onClick={() => onSwitchMode('sign-up')}
          disabled={isLoading}
        >
          Sign Up
        </button>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor={`${mode}-email`}>Email Address</label>
          <div className="input-wrapper">
            <span className="input-icon">📧</span>
            <input
              id={`${mode}-email`}
              type="email"
              value={authForm.email}
              onChange={(event) => onFieldChange('email', event.target.value)}
              required
              className="auth-input"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor={`${mode}-password`}>Password</label>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span>
            <input
              id={`${mode}-password`}
              type="password"
              value={authForm.password}
              onChange={(event) => onFieldChange('password', event.target.value)}
              required
              className="auth-input"
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>
        </div>

        <button type="submit" className="auth-button" disabled={isLoading}>
          {isLoading ? (
            <span className="button-loading">⏳ Processing...</span>
          ) : isSignIn ? (
            <span>Sign In →</span>
          ) : (
            <span>Create Account →</span>
          )}
        </button>
      </form>

      {authError && (
        <div className="auth-alert auth-error">
          <span className="alert-icon">⚠️</span>
          {authError}
        </div>
      )}
      {authMessage && (
        <div className="auth-alert auth-message">
          <span className="alert-icon">✓</span>
          {authMessage}
        </div>
      )}
    </div>
  );
}
