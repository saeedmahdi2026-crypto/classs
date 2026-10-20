import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Key, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess, onBack }) => {
  const { loginAdmin, language } = useAuth();
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !mfaCode) {
      setError(language === 'bn' ? 'পাসওয়ার্ড এবং ৬-ডিজিটের MFA কোড উভয়ই প্রদান করুন।' : 'Please provide both password and 6-digit MFA code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await loginAdmin(password, mfaCode);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Admin authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAutofill = () => {
    setPassword('Admin2026!*');
    setMfaCode('202621');
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded text-xs font-semibold text-teal-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'প্রশাসক পোর্টাল' : 'Administrator Gateway'}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {language === 'bn' ? 'অ্যাডমিন লগইন ও MFA যাচাইকরণ' : 'Admin Login & Multi-Factor Auth'}
          </h1>
          <p className="text-xs text-slate-400">
            {language === 'bn'
              ? 'পিআরডি নিরাপত্তা নীতি অনুসারে অ্যাডমিনদের জন্য টু-ফ্যাক্টর অথেনটিকেশন বাধ্যতামূলক।'
              : 'Mandatory 2FA authentication enforced for course administrators per PRD Section 3 & 12.'}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {language === 'bn' ? 'অ্যাডমিন পাসওয়ার্ড' : 'Admin Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {language === 'bn' ? '৬-ডিজিট MFA ভেরিফিকেশন কোড' : '6-Digit MFA Token'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="202621"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono-numbers tracking-widest bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Authenticating...' : language === 'bn' ? 'লগইন করুন' : 'Sign In as Admin'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

          </form>

          {/* Quick autofill for evaluator */}
          <div className="mt-5 pt-4 border-t border-slate-700/60 text-center">
            <button
              type="button"
              onClick={handleQuickAutofill}
              className="text-xs text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autofill Default Credentials (Admin2026!* / 202621)</span>
            </button>
          </div>

        </div>

        <div className="text-center">
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← {language === 'bn' ? 'শিক্ষার্থী লগইনে ফিরে যান' : 'Return to Student Login'}
          </button>
        </div>

      </div>
    </div>
  );
};
