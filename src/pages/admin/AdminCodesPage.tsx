import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AccessCode } from '../../types';
import {
  Key,
  PlusCircle,
  UploadCloud,
  ShieldBan,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  X,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';

export const AdminCodesPage: React.FC = () => {
  const { language } = useAuth();
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [demoCodes, setDemoCodes] = useState<{ raw_code: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modals state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [generateCount, setGenerateCount] = useState(1);
  const [maxSessions, setMaxSessions] = useState(2);
  const [expiryDays, setExpiryDays] = useState(180);

  // Newly generated raw codes (Shown ONCE to admin per PRD Section 8)
  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<
    { raw_code: string; masked_display: string; student_ref: string }[] | null
  >(null);
  const [rawImportInput, setRawImportInput] = useState('');
  const [copiedRawCode, setCopiedRawCode] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadCodes = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminCodes();
      setCodes(res.codes || []);
      setDemoCodes(res.demo_codes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.generateCodes({
        count: generateCount,
        max_sessions: maxSessions,
        expiry_days: expiryDays
      });
      setNewlyGeneratedCodes(res.codes);
      setShowGenerateModal(false);
      loadCodes();
    } catch (err: any) {
      alert(`Failed to generate codes: ${err.message}`);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = rawImportInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    try {
      const res = await api.importCodes(lines);
      setActionNotice(res.message);
      setRawImportInput('');
      setShowImportModal(false);
      loadCodes();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  const handleRevoke = async (id: string, masked: string) => {
    if (!confirm(`Are you sure you want to revoke code ${masked}? All active sessions will terminate immediately.`)) {
      return;
    }
    try {
      await api.revokeCode(id);
      setActionNotice(`Code ${masked} has been revoked.`);
      loadCodes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReissue = async (id: string) => {
    try {
      const res = await api.reissueCode(id);
      setNewlyGeneratedCodes([
        {
          raw_code: res.new_raw_code,
          masked_display: res.masked_display,
          student_ref: res.student_ref
        }
      ]);
      loadCodes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTerminateSessions = async (id: string) => {
    try {
      const res = await api.terminateCodeSessions(id);
      setActionNotice(`Terminated ${res.terminated_count} active sessions.`);
      loadCodes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRawCode(text);
    setTimeout(() => setCopiedRawCode(null), 2000);
  };

  const filteredCodes = codes.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-teal-400">Security & Credential Vault</span>
            <span aria-hidden="true">·</span>
            <span>Salted SHA-256 Hash Storage</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {language === 'bn' ? 'এক্সেস কোড ও সেশন ব্যবস্থাপনা' : 'Access Code & Session Policy Management'}
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-3.5 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Generate Codes</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-teal-400" />
            <span>Secure Batch Import</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-teal-950/40 border border-teal-700 rounded-lg text-xs text-teal-200 flex items-center justify-between">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-teal-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs (Zero-Pill interactive segmented buttons) */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700/80 w-fit">
        {['all', 'active', 'revoked', 'expired'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition-colors ${
              statusFilter === st ? 'bg-slate-900 text-teal-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {st} ({codes.filter((c) => (st === 'all' ? true : c.status === st)).length})
          </button>
        ))}
      </div>

      {/* Codes Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Code Identifier</th>
                <th className="py-3 px-4">Student Ref</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Active Sessions</th>
                <th className="py-3 px-4">Created / Expires</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {filteredCodes.map((code) => {
                let statusColor = 'text-teal-400';
                if (code.status === 'revoked') statusColor = 'text-red-400';
                if (code.status === 'expired') statusColor = 'text-amber-400';

                return (
                  <tr key={code.id} className="hover:bg-slate-700/30 transition-colors">
                    
                    <td className="py-3 px-4 font-mono-numbers font-semibold text-white">
                      {code.masked_display}
                    </td>

                    <td className="py-3 px-4 font-mono-numbers text-slate-300">
                      {code.assigned_student_ref}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`capitalize font-semibold ${statusColor}`}>
                        {code.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono-numbers whitespace-nowrap">
                      <span>{code.active_sessions_count}</span>
                      <span className="text-slate-400"> / {code.max_sessions} max</span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      <div>{new Date(code.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">Exp: {new Date(code.expires_at).toLocaleDateString()}</div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {code.active_sessions_count > 0 && (
                          <button
                            onClick={() => handleTerminateSessions(code.id)}
                            className="px-2 py-1 bg-slate-900 hover:bg-slate-950 border border-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                            title="Force terminate active sessions"
                          >
                            <LogOut className="w-3 h-3 text-amber-400 inline mr-1" />
                            Kick
                          </button>
                        )}

                        <button
                          onClick={() => handleReissue(code.id)}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-950 border border-slate-700 text-slate-300 rounded text-[11px] transition-colors"
                          title="Reissue a new code and revoke this one"
                        >
                          <RefreshCw className="w-3 h-3 text-teal-400 inline mr-1" />
                          Reissue
                        </button>

                        {code.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(code.id, code.masked_display)}
                            className="px-2 py-1 bg-red-950/40 hover:bg-red-900/50 border border-red-800 text-red-300 rounded text-[11px] transition-colors"
                            title="Revoke code immediately"
                          >
                            <ShieldBan className="w-3 h-3 text-red-400 inline mr-1" />
                            Revoke
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Newly Generated Raw Codes (Shown ONCE to admin per PRD Section 8) */}
      {newlyGeneratedCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">
                  Fresh Access Credentials Issued
                </h3>
              </div>
              <button
                onClick={() => setNewlyGeneratedCodes(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-800 rounded text-xs text-amber-200">
              <strong>PRD Security Mandate:</strong> These plaintext access codes are displayed <strong>ONCE</strong> right now. Copy and hand them off to students. The system stores only salted cryptographic hashes and cannot recover plaintext codes later.
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {newlyGeneratedCodes.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-900 border border-slate-700 rounded flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-mono-numbers font-bold text-teal-300 text-sm">
                      {item.raw_code}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Assigned to: {item.student_ref}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.raw_code)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition-colors flex items-center gap-1 font-mono-numbers"
                  >
                    {copiedRawCode === item.raw_code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-teal-400" />
                        <span className="text-teal-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setNewlyGeneratedCodes(null)}
                className="px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold rounded text-xs"
              >
                Done / I Have Saved These Codes
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Generate Codes Form */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-base font-bold text-white">Generate Access Codes</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Number of Codes to Generate</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={generateCount}
                  onChange={(e) => setGenerateCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono-numbers text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Max Concurrent Sessions per Student</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={maxSessions}
                  onChange={(e) => setMaxSessions(parseInt(e.target.value, 10) || 2)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono-numbers text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">Prevents account sharing beyond this limit.</p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Expiry Period (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(parseInt(e.target.value, 10) || 180)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded font-mono-numbers text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold rounded"
                >
                  Generate & Salt-Hash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Secure Batch Import */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-base font-bold text-white">Secure One-Time Batch Import</h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paste raw access codes below (one code per line). The server will compute individual cryptographic salts and SHA-256 hashes immediately. Raw plaintext codes are never written to disk or logs.
            </p>

            <form onSubmit={handleImport} className="space-y-4 text-xs">
              <textarea
                rows={6}
                value={rawImportInput}
                onChange={(e) => setRawImportInput(e.target.value)}
                placeholder={'ENG-2026-X1\nENG-2026-X2\nENG-2026-X3...'}
                className="w-full px-3 py-2 font-mono-numbers bg-slate-900 border border-slate-700 rounded text-white"
              />

              <div className="pt-3 border-t border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold rounded"
                >
                  Process & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
