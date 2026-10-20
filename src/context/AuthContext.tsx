import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export type Language = 'bn' | 'en';

export interface StudentAuthData {
  student_ref: string;
  code_masked: string;
  expires_at: string;
  max_sessions: number;
}

interface AuthContextType {
  student: StudentAuthData | null;
  isAdmin: boolean;
  isLoading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  loginStudent: (password: string, username?: string) => Promise<void>;
  logoutStudent: () => Promise<void>;
  loginAdmin: (password: string, mfa: string) => Promise<void>;
  logoutAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [student, setStudent] = useState<StudentAuthData | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<Language>('bn');

  useEffect(() => {
    // Check initial auth state
    const initAuth = async () => {
      const studentToken = localStorage.getItem('portal_token');
      const adminToken = localStorage.getItem('portal_admin_token');

      if (adminToken) {
        try {
          await api.verifyAdmin();
          setIsAdmin(true);
        } catch {
          localStorage.removeItem('portal_admin_token');
          setIsAdmin(false);
        }
      }

      if (studentToken) {
        try {
          const res = await api.getMe();
          setStudent(res);
        } catch {
          localStorage.removeItem('portal_token');
          setStudent(null);
        }
      }

      setIsLoading(false);
    };

    const handleAdminUnauthorized = () => {
      setIsAdmin(false);
    };
    const handleStudentUnauthorized = () => {
      setStudent(null);
    };

    window.addEventListener('portal_admin_unauthorized', handleAdminUnauthorized);
    window.addEventListener('portal_student_unauthorized', handleStudentUnauthorized);

    initAuth();

    return () => {
      window.removeEventListener('portal_admin_unauthorized', handleAdminUnauthorized);
      window.removeEventListener('portal_student_unauthorized', handleStudentUnauthorized);
    };
  }, []);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'bn' ? 'en' : 'bn'));
  };

  const loginStudent = async (password: string, username?: string) => {
    const res = await api.login(password, username);
    localStorage.setItem('portal_token', res.token);
    setStudent({
      student_ref: res.student_ref,
      code_masked: res.code_masked,
      expires_at: res.expires_at,
      max_sessions: res.max_sessions
    });
  };

  const logoutStudent = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('portal_token');
      setStudent(null);
    }
  };

  const loginAdmin = async (password: string, mfa: string) => {
    const res = await api.adminLogin(password, mfa);
    localStorage.setItem('portal_admin_token', res.token);
    setIsAdmin(true);
  };

  const logoutAdmin = async () => {
    try {
      await api.adminLogout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('portal_admin_token');
      setIsAdmin(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        student,
        isAdmin,
        isLoading,
        language,
        setLanguage,
        toggleLanguage,
        loginStudent,
        logoutStudent,
        loginAdmin,
        logoutAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
