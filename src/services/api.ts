import { Lesson, AuditEvent, PlaybackAuthResponse, AccessCode } from '../types';

class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('portal_token');
  const adminToken = localStorage.getItem('portal_admin_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (adminToken && endpoint.startsWith('/api/admin') && !endpoint.includes('/login')) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${adminToken}`;
  } else if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include'
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      if (endpoint.startsWith('/api/admin') && !endpoint.includes('/login')) {
        localStorage.removeItem('portal_admin_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('portal_admin_unauthorized'));
        }
      } else if (!endpoint.includes('/login')) {
        localStorage.removeItem('portal_token');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('portal_student_unauthorized'));
        }
      }
    }
    throw new ApiError(data.error || 'Request failed', res.status);
  }

  return data as T;
}

export const api = {
  // Admin Verification
  async verifyAdmin() {
    return request<{ valid: boolean; role: string }>('/api/admin/verify');
  },

  // Student Auth
  async login(password: string, username?: string) {
    return request<{
      token: string;
      student_ref: string;
      code_masked: string;
      expires_at: string;
      max_sessions: number;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password, username, code: password })
    });
  },

  async getMe() {
    return request<{
      student_ref: string;
      code_masked: string;
      expires_at: string;
      max_sessions: number;
    }>('/api/auth/me');
  },

  async logout() {
    return request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
  },

  // Lessons & Playback
  async getLessons() {
    return request<{ lessons: Lesson[] }>('/api/lessons');
  },

  async getLesson(id: string) {
    return request<Lesson>(`/api/lessons/${id}`);
  },

  async getPlaybackToken(id: string) {
    return request<PlaybackAuthResponse>(`/api/lessons/${id}/playback-token`, {
      method: 'POST'
    });
  },

  // Progress
  async getProgress() {
    return request<{
      progress: {
        [lessonId: string]: {
          completed: boolean;
          last_position_seconds: number;
          completed_at: string | null;
        };
      };
    }>('/api/progress');
  },

  async updateProgress(lessonId: string, payload: { completed: boolean; last_position_seconds?: number }) {
    return request<{ success: boolean }>(`/api/progress/${lessonId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Help Ticket
  async submitHelpTicket(payload: { student_name: string; contact: string; code_prefix?: string; issue: string }) {
    return request<{ success: boolean; ticket_id: string; message: string }>('/api/help/ticket', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Admin Auth
  async adminLogin(password: string, mfa_code: string) {
    return request<{ token: string; role: string; message: string }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password, mfa_code })
    });
  },

  async adminLogout() {
    return request<{ success: boolean }>('/api/admin/logout', { method: 'POST' });
  },

  // Admin Features
  async getAdminOverview() {
    return request<{
      total_codes: number;
      active_codes: number;
      revoked_codes: number;
      expired_codes: number;
      active_sessions: number;
      total_lessons: number;
      total_tickets: number;
      recent_audits: AuditEvent[];
      demo_codes: { raw_code: string; label: string }[];
    }>('/api/admin/overview');
  },

  async getAdminCodes() {
    return request<{
      codes: AccessCode[];
      demo_codes: { raw_code: string; label: string }[];
    }>('/api/admin/codes');
  },

  async generateCodes(params: { count: number; max_sessions: number; expiry_days: number }) {
    return request<{
      success: boolean;
      count: number;
      codes: { raw_code: string; masked_display: string; student_ref: string }[];
      notice: string;
    }>('/api/admin/codes/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  },

  async importCodes(raw_codes: string[]) {
    return request<{
      success: boolean;
      imported_count: number;
      message: string;
    }>('/api/admin/codes/import', {
      method: 'POST',
      body: JSON.stringify({ raw_codes })
    });
  },

  async revokeCode(id: string) {
    return request<{ success: boolean; message: string }>(`/api/admin/codes/${id}/revoke`, {
      method: 'POST'
    });
  },

  async reissueCode(id: string) {
    return request<{
      success: boolean;
      new_raw_code: string;
      masked_display: string;
      student_ref: string;
    }>(`/api/admin/codes/${id}/reissue`, {
      method: 'POST'
    });
  },

  async terminateCodeSessions(id: string) {
    return request<{ success: boolean; terminated_count: number }>(`/api/admin/codes/${id}/terminate-sessions`, {
      method: 'POST'
    });
  },

  async getAdminLessons() {
    return request<{ lessons: Lesson[] }>('/api/admin/lessons');
  },

  async updateAdminLesson(id: string, updates: Partial<Lesson>) {
    return request<{ success: boolean; lesson: Lesson }>(`/api/admin/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async getAdminAuditLogs(filterType?: string) {
    const q = filterType ? `?type=${encodeURIComponent(filterType)}` : '';
    return request<{ logs: AuditEvent[] }>(`/api/admin/audit-logs${q}`);
  }
};
