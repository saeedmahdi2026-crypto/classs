import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogOut, Globe, User } from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { student, logoutStudent, language, toggleLanguage } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-4">
        
        {/* Brand */}
        <button
          onClick={() => onNavigate(student ? 'dashboard' : 'login')}
          className="flex items-center gap-2.5 text-left group cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-sm shadow-teal-500/20">
            <BookOpen className="w-5 h-5 font-bold" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-base sm:text-lg block leading-none">
              English Masterclass
            </span>
            <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
              {language === 'bn' ? 'লার্নিং ক্লাসরুম' : 'Student Learning Portal'}
            </span>
          </div>
        </button>

        {/* Center Nav: Only when student is logged in */}
        {student && (
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`transition-colors cursor-pointer ${
                currentView === 'dashboard' ? 'text-teal-400 font-semibold' : 'hover:text-white'
              }`}
            >
              {language === 'bn' ? 'সকল ক্লাস' : 'All Classes'}
            </button>
          </nav>
        )}

        {/* Right Action & Language Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggleLanguage}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>{language === 'bn' ? 'EN' : 'বাংলা'}</span>
          </button>

          {student && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                <User className="w-3.5 h-3.5 text-teal-400" />
                <span>{student.student_ref}</span>
              </div>
              <button
                onClick={logoutStudent}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                <span>{language === 'bn' ? 'লগআউট' : 'Logout'}</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
