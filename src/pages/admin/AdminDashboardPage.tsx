import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AuditEvent } from '../../types';
import {
  ShieldAlert,
  Users,
  Key,
  BookOpen,
  PlusCircle,
  FileText,
  Activity,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';

interface AdminDashboardPageProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onNavigate }) => {
  const { language } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadOverview = async () => {
    try {
      setIsLoading(true);
      const data = await api.getAdminOverview();
      setStats(data);
    } catch (err: any) {
      if (err.status === 401 || err.message?.includes('Admin authorization')) {
        localStorage.removeItem('portal_admin_token');
        onNavigate('admin-login');
        return;
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading admin control overview...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-teal-400">Admin Command Center</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-numbers">Zone: Asia/Dhaka</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {language === 'bn' ? 'প্রশাসনিক ড্যাশবোর্ড ও নিয়ন্ত্রণ' : 'Administration & Security Overview'}
          </h1>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('admin-codes')}
            className="px-3.5 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন কোড তৈরি' : 'Generate Access Codes'}</span>
          </button>
          
          <button
            onClick={() => onNavigate('admin-classes')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-teal-400" />
            <span>{language === 'bn' ? 'ক্লাস লিংক পরিবর্তন' : 'Manage Classes'}</span>
          </button>

          <button
            onClick={() => onNavigate('admin-audit')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>{language === 'bn' ? 'নিরাপত্তা লগ' : 'Security Logs'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards (Single elevation, unboxed discipline) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'bn' ? 'মোট সক্রিয় কোড' : 'Active Access Codes'}</span>
            <Key className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-white">
            {stats.active_codes} <span className="text-xs font-normal text-slate-500">/ {stats.total_codes} total</span>
          </div>
          <p className="text-[11px] text-slate-400">Salted SHA-256 hash stored</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'bn' ? 'সক্রিয় সেশন' : 'Live Concurrent Sessions'}</span>
            <Users className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-white">
            {stats.active_sessions}
          </div>
          <p className="text-[11px] text-slate-400">Max 2 sessions per student limit</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'bn' ? 'বাতিল বা মেয়াদোত্তীর্ণ' : 'Revoked / Expired'}</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-white">
            {stats.revoked_codes + stats.expired_codes}
          </div>
          <p className="text-[11px] text-slate-400">Blocked from playback tokens</p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{language === 'bn' ? 'মোট ক্লাস' : 'Curriculum Modules'}</span>
            <BookOpen className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-white">
            {stats.total_lessons} <span className="text-xs font-normal text-slate-500">lessons</span>
          </div>
          <p className="text-[11px] text-slate-400">Token-authorized playback</p>
        </div>

      </div>

      {/* Main Grid: Demo Codes List & Live Security Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col (1): Seeded Demo Codes for Tester Convenience */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div>
              <h2 className="text-sm font-bold text-white">
                {language === 'bn' ? 'পরীক্ষামূলক কোডস (Demo Testing)' : 'Seeded Test Access Codes'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'কপি করে শিক্ষার্থী হিসেবে লগইন পরীক্ষা করুন' : 'Copy to test student login'}
              </p>
            </div>
            <span className="text-[11px] font-mono-numbers text-teal-400">20 provisioned</span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {stats.demo_codes?.map((dc: any, idx: number) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-900/60 border border-slate-700/60 rounded-lg flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-mono-numbers text-teal-300 font-medium">{dc.raw_code}</p>
                  <p className="text-[10px] text-slate-400">{dc.label}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(dc.raw_code)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors flex items-center gap-1"
                  title="Copy Code"
                >
                  {copiedCode === dc.raw_code ? (
                    <>
                      <Check className="w-3 h-3 text-teal-400" />
                      <span className="text-teal-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-700/60 text-center">
            <button
              onClick={() => onNavigate('admin-codes')}
              className="text-xs text-teal-400 hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              <span>{language === 'bn' ? 'সকল কোড পরিচালনা করুন' : 'Manage All Access Codes'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Col (2): Recent Security Events Stream */}
        <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <span>{language === 'bn' ? 'সাম্প্রতিক নিরাপত্তা ও অডিট লগ' : 'Recent Security Audit Events'}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'রিয়েলটাইম প্লেব্যাক ও এক্সেস ট্র্যাকিং' : 'Real-time playback and access monitoring'}
              </p>
            </div>

            <button
              onClick={() => onNavigate('admin-audit')}
              className="text-xs text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>View Full Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {stats.recent_audits?.map((log: AuditEvent) => {
              let badgeColor = 'text-slate-400';
              if (log.outcome === 'success') badgeColor = 'text-teal-400';
              if (log.outcome === 'failure') badgeColor = 'text-red-400';
              if (log.outcome === 'warning') badgeColor = 'text-amber-400';

              return (
                <div
                  key={log.id}
                  className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono-numbers font-semibold ${badgeColor}`}>
                        {log.event_type}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-300 font-mono-numbers">{log.actor_ref}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[11px] text-slate-400 font-mono-numbers">{log.ip_masked}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{log.details}</p>
                  </div>

                  <span className="text-[10px] font-mono-numbers text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>

        </div>

      </div>

    </div>
  );
};
