const BASE = '/api';

async function req(method, path, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Ensure cookies are sent and received
    body: body ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(`${BASE}${path}`, options);
  
  if (res.status === 401 && !path.includes('/auth/me')) {
    // Redirect to login if unauthorized, except when checking initial session
    // window.location.href = '/login'; 
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  
  if (!res.ok) {
    throw data;
  }
  
  return data;
}

export const api = {
  // Auth
  login: (email, password) => req('POST', '/auth/login', { email, password }),
  register: (email, password, name) => req('POST', '/auth/register', { email, password, name }),
  resetPassword: (email, newPassword) => req('POST', '/auth/reset', { email, newPassword }),
  logout: () => req('POST', '/auth/logout'),
  getMe: () => req('GET', '/auth/me'),

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
