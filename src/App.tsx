import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlayerPage } from './pages/PlayerPage';
import { HelpPage } from './pages/HelpPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminClassesPage } from './pages/admin/AdminClassesPage';
import { AdminCodesPage } from './pages/admin/AdminCodesPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

const AppContent: React.FC = () => {
  const { student, isAdmin, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('login');
  const [activeLessonId, setActiveLessonId] = useState<string>('lesson-1');

  // Handle routing logic based on auth
  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    setCurrentView('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Determine which page to render
  let pageContent: React.ReactNode = null;

  if (isAdmin) {
    // Admin routing
    if (currentView === 'admin-classes') {
      pageContent = <AdminClassesPage />;
    } else if (currentView === 'admin-codes') {
      pageContent = <AdminCodesPage />;
    } else if (currentView === 'admin-audit') {
      pageContent = <AdminAuditPage />;
    } else {
      pageContent = <AdminDashboardPage onNavigate={handleNavigate} />;
    }
  } else if (student) {
    // Student routing
    if (currentView === 'player') {
      pageContent = (
        <PlayerPage
          lessonId={activeLessonId}
          onBack={() => handleNavigate('dashboard')}
          onSelectLesson={handleSelectLesson}
        />
      );
    } else {
      pageContent = (
        <DashboardPage
          onSelectLesson={handleSelectLesson}
          onNavigate={handleNavigate}
        />
      );
    }
  } else {
    // Visitor / Public routing
    pageContent = <LoginPage onNavigate={handleNavigate} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-teal-500 selection:text-white">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />
      <main className="flex-1">
        {pageContent}
      </main>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
