import React from 'react';
import type { Todo } from '../types/todo';

interface TodoListProps {
  todos: Todo[];
  onAddTodo: (text: string) => void;
  onDeleteTodo: (id: string) => void;
  onToggleTodo: (id: string) => void;
  isDisabled?: boolean;
  isLoading?: boolean;
}

export const TodoList: React.FC<TodoListProps> = ({ 
  todos, 
  onAddTodo, 
  onDeleteTodo,
  onToggleTodo,
  isDisabled = false,
  isLoading = false
}) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onAddTodo(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="todo-list">
      <form onSubmit={handleSubmit} className="todo-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Add a new task..."
          className="todo-input"
          disabled={isDisabled}
        />
        <button type="submit" className="add-button" disabled={isDisabled}>
          Add Task
        </button>
      </form>

      <div className="todos-container">
        {isLoading ? (
          <p className="empty-message">Loading your tasks...</p>
        ) : todos.length === 0 ? (
          <p className="empty-message">No tasks yet. Add one above!</p>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
              <div className="todo-content">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => onToggleTodo(todo.id)}
                  className="todo-checkbox"
                  disabled={isDisabled}
                />
                <span className="todo-text">{todo.text}</span>
                {todo.priority !== undefined && (
                  <span className="priority-badge">Priority: {todo.priority}</span>
                )}
              </div>
              <button 
                onClick={() => onDeleteTodo(todo.id)}
                className="delete-button"
                disabled={isDisabled}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
