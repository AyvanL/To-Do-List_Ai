import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { GeminiService } from './services/geminiService';
import type { Todo } from './types/todo';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import type { AuthMode } from './types/auth.ts';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
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

  const handleAuthFieldChange = (field: 'email' | 'password', value: string) => {
    setAuthForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
    const sharedAuthProps = {
      authForm,
      isLoading: isAuthLoading,
      authError,
      authMessage,
      onFieldChange: handleAuthFieldChange,
      onSubmit: handleAuthSubmit,
      onSwitchMode: setAuthMode,
    };

    return authMode === 'sign-in' ? (
      <LoginPage {...sharedAuthProps} />
    ) : (
      <SignupPage {...sharedAuthProps} />
    );
  }

  return (
    <DashboardPage
      session={session}
      todos={todos}
      pendingCount={pendingCount}
      completedCount={completedCount}
      error={error}
      isPrioritizing={isPrioritizing}
      isTodosLoading={isTodosLoading}
      onAddTodo={handleAddTodo}
      onDeleteTodo={handleDeleteTodo}
      onToggleTodo={handleToggleTodo}
      onPrioritize={handlePrioritize}
      onSignOut={handleSignOut}
    />
  );
}

export default App;