const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Questions
  getQuestions: async () => {
    const res = await request<any>('/questions');
    return res.questions ?? res;
  },
  getQuestion: (id: number) => request<any>(`/questions/${id}`),
  getDimensions: () => request<any[]>('/questions/dimensions'),

  // Sessions
  createSession: (data: any) => request<any>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  getSessions: async () => {
    const res = await request<any>('/sessions');
    return res.sessions ?? res;
  },
  getSession: (id: string) => request<any>(`/sessions/${id}`),
  updateSession: (id: string, data: any) => request<any>(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSession: (id: string) => request<void>(`/sessions/${id}`, { method: 'DELETE' }),
  completeSession: (id: string) => request<any>(`/sessions/${id}/complete`, { method: 'POST' }),

  // Responses
  saveResponse: (sessionId: string, data: any) => request<any>(`/sessions/${sessionId}/responses`, { method: 'POST', body: JSON.stringify(data) }),
  updateResponse: (sessionId: string, questionId: number, data: any) => request<any>(`/sessions/${sessionId}/responses/${questionId}`, { method: 'PUT', body: JSON.stringify(data) }),
  getResponses: (sessionId: string) => request<any[]>(`/sessions/${sessionId}/responses`),

  // Scoring
  getScoring: (sessionId: string) => request<any>(`/scoring/${sessionId}`),

  // Comparison
  compareModels: (sessionIds: string[]) => request<any>('/comparison', { method: 'POST', body: JSON.stringify({ session_ids: sessionIds }) }),
  getModelList: () => request<any[]>('/comparison/models'),

  // Export
  exportJson: (sessionId: string) => request<any>(`/export/${sessionId}/json`),
  exportPdf: async (sessionId: string) => {
    const res = await fetch(`${BASE_URL}/export/${sessionId}/pdf`);
    if (!res.ok) throw new Error('PDF export failed');
    return res.blob();
  },
};
