import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { TodoList } from './components/TodoList';
import { GeminiService } from './services/geminiService';
import type { Todo } from './types/todo';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [isPrioritizing, setIsPrioritizing] = useState<boolean>(false);
  const [isTodosLoading, setIsTodosLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const geminiService = useMemo(() => new GeminiService(), []);
  const sortTodos = useCallback((list: Todo[]) => {
    return [...list].sort((a, b) => {
      const priorityA = a.priority ?? Number.MAX_SAFE_INTEGER;
      const priorityB = b.priority ?? Number.MAX_SAFE_INTEGER;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.text.localeCompare(b.text);
    });
  }, []);

  const loadTodos = useCallback(async (userId: string) => {
    setIsTodosLoading(true);
    const { data, error: fetchError } = await supabase
      .from('todos')
      .select('id, text, completed, priority')
      .eq('user_id', userId)
      .order('priority', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('Failed to load todos', fetchError);
      setError('Unable to load tasks right now.');
      setTodos([]);
    } else {
      setTodos(sortTodos(data ?? []));
    }
    setIsTodosLoading(false);
  }, [sortTodos]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setSession(data.session);
        loadTodos(data.session.user.id);
      } else {
        setIsTodosLoading(false);
      }
    };
    init();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        loadTodos(nextSession.user.id);
      } else {
        setTodos([]);
        setIsTodosLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [loadTodos]);

  const pendingCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.length - pendingCount;

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    setAuthMessage('');

    try {
      if (authMode === 'sign-up') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
        });
        if (signUpError) {
          throw signUpError;
        }
        setAuthMessage('Success! Please confirm the email Supabase sent you, then sign in.');
        setAuthMode('sign-in');
        setAuthForm({ email: authForm.email, password: '' });
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
        if (signInError) {
          throw signInError;
        }
      }
    } catch (authErr) {
      setAuthError(authErr instanceof Error ? authErr.message : 'Unable to authenticate');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setError('');
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.warn('Supabase sign-out reported an error, continuing anyway:', signOutError.message);
      }
    } catch (err) {
      console.error('Unexpected error during sign out', err);
    } finally {
      setSession(null);
      setTodos([]);
    }
  };

  const handleAddTodo = async (text: string) => {
    if (!session) {
      setError('Sign in to add tasks.');
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    const { data, error: insertError } = await supabase
      .from('todos')
      .insert({ text: trimmed, completed: false, user_id: session.user.id })
      .select('id, text, completed, priority')
      .single();

    if (insertError || !data) {
      console.error('Failed to add todo', insertError);
      setError('Unable to add that task.');
      return;
    }

    setTodos(prev => sortTodos([...prev, data]));
    setError('');
  };

  const handleDeleteTodo = async (id: string) => {
    if (!session) {
      return;
    }
    const { error: deleteError } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (deleteError) {
      console.error('Failed to delete todo', deleteError);
      setError('Unable to delete that task.');
      return;
    }

    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const handleToggleTodo = async (id: string) => {
    if (!session) {
      return;
    }
    const target = todos.find(todo => todo.id === id);
    if (!target) {
      return;
    }

    const { data, error: updateError } = await supabase
      .from('todos')
      .update({ completed: !target.completed })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('id, text, completed, priority')
      .single();

    if (updateError || !data) {
      console.error('Failed to update todo', updateError);
      setError('Unable to update that task.');
      return;
    }

    setTodos(prev => sortTodos(prev.map(todo => (todo.id === id ? data : todo))));
  };

  const handlePrioritize = async () => {
    if (!session) {
      setError('Sign in to prioritize your work.');
      return;
    }

    if (todos.length === 0) {
      setError('Add some tasks before prioritizing');
      return;
    }

    setIsPrioritizing(true);
    setError('');

    try {
      const prioritizedTodos = await geminiService.prioritizeTodos(todos);
      const normalized = prioritizedTodos.map((todo, index) => ({
        ...todo,
        priority: index + 1,
      }));
      setTodos(normalized);

      await Promise.all(
        normalized.map(todo =>
          supabase
            .from('todos')
            .update({ priority: todo.priority })
            .eq('id', todo.id)
            .eq('user_id', session.user.id)
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prioritize tasks');
    } finally {
      setIsPrioritizing(false);
    }
  };

  if (!session) {
    const isSignIn = authMode === 'sign-in';

    return (
      <div className="app auth-web">
        <div className="auth-grid">
          <section className="auth-hero">
            <p className="hero-pill">Gemini powered</p>
            <h1>Plan smarter, finish faster.</h1>
            <p>
              Capture everything on your mind once, then let our AI arrange the ideal order so you can focus on momentum—not juggling priorities.
            </p>
            <div className="hero-points">
              <div>
                <span className="point-label">Realtime sync</span>
                <strong>Cross-device updates</strong>
              </div>
              <div>
                <span className="point-label">AI insights</span>
                <strong>Instant prioritization</strong>
              </div>
            </div>
          </section>

          <section className="auth-panel">
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
                  onClick={() => setAuthMode('sign-in')}
                  disabled={isAuthLoading}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`auth-tab ${!isSignIn ? 'active' : ''}`}
                  onClick={() => setAuthMode('sign-up')}
                  disabled={isAuthLoading}
                >
                  Sign Up
                </button>
              </div>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <div className="input-wrapper">
                    <span className="input-icon">📧</span>
                    <input
                      id="email"
                      type="email"
                      value={authForm.email}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="auth-input"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🔒</span>
                    <input
                      id="password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="auth-input"
                      minLength={6}
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>

                <button type="submit" className="auth-button" disabled={isAuthLoading}>
                  {isAuthLoading ? (
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
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="app dashboard">
      <div className="dashboard-shell">
        <header className="top-bar">
          <div className="brand-block">
            <span className="brand-icon">✨</span>
            <div>
              <p className="brand-eyebrow">Gemini co-pilot</p>
              <h1>AI Todo Planner</h1>
            </div>
          </div>
          <div className="user-controls">
            <div className="user-meta">
              <span className="user-label">Signed in</span>
              <span className="user-email">{session.user.email}</span>
            </div>
            <button className="signout-button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <div className="container dashboard-grid">
          <header className="hero">
            <p className="hero-eyebrow">Plan smarter with AI</p>
            <h2>Stay sharp and let Gemini sequence your day</h2>
            <p className="hero-subtitle">
              Capture every task, prioritize in one click, and keep important work front and center on any screen size.
            </p>
            <div className="hero-stats">
              <div className="stat-card">
                <span className="stat-value">{pendingCount}</span>
                <span className="stat-label">Tasks in queue</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{completedCount}</span>
                <span className="stat-label">Completed today</span>
              </div>
            </div>
          </header>

          <section className="planner-card">
            <div className="planner-header">
              <h2>Build your plan</h2>
              <p>Add everything you need to get done, then let Gemini arrange the perfect order.</p>
            </div>

            <TodoList
              todos={todos}
              onAddTodo={handleAddTodo}
              onDeleteTodo={handleDeleteTodo}
              onToggleTodo={handleToggleTodo}
              isDisabled={isPrioritizing || isTodosLoading}
              isLoading={isTodosLoading}
            />

            <div className="planner-footer">
              {todos.length > 0 && (
                <button 
                  onClick={handlePrioritize} 
                  disabled={isPrioritizing}
                  className="prioritize-button"
                >
                  {isPrioritizing ? 'AI is thinking...' : '🤖 Prioritize with AI'}
                </button>
              )}

              {error && <div className="error-message">{error}</div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;