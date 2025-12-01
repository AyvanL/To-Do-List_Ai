import type { Todo } from '../types/todo';

export class GeminiService {
  async prioritizeTodos(todos: Todo[]): Promise<Todo[]> {
    if (todos.length === 0) {
      return todos;
    }

    const response = await fetch('/api/prioritize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ todos })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = typeof errorBody.message === 'string'
        ? errorBody.message
        : 'Failed to prioritize tasks.';
      throw new Error(message);
    }

    const data = await response.json();
    return data.todos as Todo[];
  }
}
