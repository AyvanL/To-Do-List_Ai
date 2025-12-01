import { useMemo, useState } from 'react';
import './App.css';
import { TodoList } from './components/TodoList';
import { GeminiService } from './services/geminiService';
import type { Todo } from './types/todo';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isPrioritizing, setIsPrioritizing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const geminiService = useMemo(() => new GeminiService(), []);
  const pendingCount = todos.filter(todo => !todo.completed).length;
  const completedCount = todos.length - pendingCount;

  const handleAddTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now(),
      text,
      completed: false,
    };
    setTodos([...todos, newTodo]);
    setError('');
  };

  const handleDeleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const handleToggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handlePrioritize = async () => {
    if (todos.length === 0) {
      setError('Add some tasks before prioritizing');
      return;
    }

    setIsPrioritizing(true);
    setError('');

    try {
      const prioritizedTodos = await geminiService.prioritizeTodos(todos);
      setTodos(prioritizedTodos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prioritize tasks');
    } finally {
      setIsPrioritizing(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="hero">
          <p className="hero-eyebrow">Plan smarter with AI</p>
          <h1>AI-Powered Todo List</h1>
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
  );
}

export default App;