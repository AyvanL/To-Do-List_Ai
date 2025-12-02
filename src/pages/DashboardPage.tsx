import type { Session } from '@supabase/supabase-js';
import { TodoList } from '../components/TodoList';
import type { Todo } from '../types/todo';

interface DashboardPageProps {
  session: Session;
  todos: Todo[];
  pendingCount: number;
  completedCount: number;
  error: string;
  isPrioritizing: boolean;
  isTodosLoading: boolean;
  onAddTodo: (text: string) => Promise<void> | void;
  onDeleteTodo: (id: string) => Promise<void> | void;
  onToggleTodo: (id: string) => Promise<void> | void;
  onPrioritize: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
}

export function DashboardPage({
  session,
  todos,
  pendingCount,
  completedCount,
  error,
  isPrioritizing,
  isTodosLoading,
  onAddTodo,
  onDeleteTodo,
  onToggleTodo,
  onPrioritize,
  onSignOut,
}: DashboardPageProps) {
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
            <button className="signout-button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <div className="container dashboard-grid">
          <header className="hero">
            <p className="hero-eyebrow">Plan smarter with AI</p>
            <h2>Stay sharp and let Gemini sequence your day</h2>
            <p className="hero-subtitle">
              Capture every task, prioritize in one click, and keep important work front and center on any screen
              size.
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
              onAddTodo={onAddTodo}
              onDeleteTodo={onDeleteTodo}
              onToggleTodo={onToggleTodo}
              isDisabled={isPrioritizing || isTodosLoading}
              isLoading={isTodosLoading}
            />

            <div className="planner-footer">
              {todos.length > 0 && (
                <button onClick={onPrioritize} disabled={isPrioritizing} className="prioritize-button">
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
