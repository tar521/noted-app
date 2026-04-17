const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  // FIX: If the response is empty (like a Delete 204), don't try to parse JSON
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

export const api = {
  getConfig: () => req('GET', '/config'),
  updateConfig: (key, data) => req('PUT', `/config/${key}`, { data }),

  // Folders
  getFolders: () => req('GET', '/folders'),
  createFolder: (data) => req('POST', '/folders', data),
  updateFolder: (id, data) => req('PATCH', `/folders/${id}`, data),
  deleteFolder: (id) => req('DELETE', `/folders/${id}`),

  // Notes
  getNotes: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/notes${qs ? '?' + qs : ''}`);
  },
  getNote: (id) => req('GET', `/notes/${id}`),
  createNote: (data) => req('POST', '/notes', data),
  updateNote: (id, data) => req('PATCH', `/notes/${id}`, data),
  deleteNote: (id) => req('DELETE', `/notes/${id}`),

  // Todos
  getTodos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/todos${qs ? '?' + qs : ''}`);
  },
  createTodo: (data) => req('POST', '/todos', data),
  updateTodo: (id, data) => req('PATCH', `/todos/${id}`, data),
  deleteTodo: (id) => req('DELETE', `/todos/${id}`),
  /**
   * New Reorder Method
   * @param {Array<number|string>} ids - An array of todo IDs in the desired order
   */
  reorderTodos: (ids) => req('PUT', '/todos/reorder', { ids }),
  kanbanReorderTodos: (columns) => req('PUT', '/todos/kanban-reorder', { columns }),
  // Activity
  getActivity: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req('GET', `/activity${qs ? '?' + qs : ''}`);
  },
};
