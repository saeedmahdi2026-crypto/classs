export interface AccessCode {
  id: string;
  code_hash: string;
  salt: string;
  masked_display: string;
  assigned_student_ref: string;
  status: 'active' | 'revoked' | 'expired' | 'suspended';
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  max_sessions: number;
  active_sessions_count: number;
}

export interface StudentSession {
  token: string;
  student_ref: string;
  code_masked: string;
  created_at: string;
  expires_at: string;
  max_sessions: number;
}

export interface Lesson {
  id: string;
  class_number: number;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  duration_minutes: number;
  provider: 'youtube' | 'vimeo' | 'hls' | 'custom';
  video_url: string;
  published: boolean;
  sort_order: number;
  topics: string[];
  vocabulary?: {
    word: string;
    phonetic: string;
    meaning_bn: string;
    example: string;
  }[];
  vocabulary_count?: number;
  quiz_count?: number;
  has_notes?: boolean;
  notes_summary: string;
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface StudentProgress {
  lesson_id: string;
  completed: boolean;
  last_position_seconds: number;
  completed_at: string | null;
  notes?: string;
}

export interface AuditEvent {
  id: string;
  actor_ref: string;
  event_type:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'RATE_LIMITED'
    | 'PLAYBACK_AUTHORIZED'
    | 'LOGOUT'
    | 'CODE_GENERATED'
    | 'CODE_REVOKED'
    | 'CODE_REISSUED'
    | 'SESSION_TERMINATED'
    | 'LESSON_UPDATED'
    | 'BATCH_IMPORTED';
  timestamp: string;
  outcome: 'success' | 'failure' | 'warning' | 'info';
  details: string;
  ip_masked: string;
}

export interface PlaybackAuthResponse {
  authorized: boolean;
  token: string;
  expires_at: string;
  watermark_text: string;
  video_url: string;
  provider: string;
  duplicate_url_warning?: boolean;
}
