import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AuditEvent } from '../../types';
import { ShieldCheck, Download, Filter, RefreshCw, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export const AdminAuditPage: React.FC = () => {
  const { language } = useAuth();
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminAuditLogs(filterType);
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filterType]);

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Audit_Logs_${new Date().toISOString().slice(0, 10)}.json`);
    downloadAnchor.click();
  };

  const exportToCsv = () => {
    const headers = ['Timestamp', 'Actor Ref', 'Event Type', 'Outcome', 'Client IP', 'Details'];
    const rows = logs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.actor_ref}"`,
      `"${l.event_type}"`,
      `"${l.outcome}"`,
      `"${l.ip_masked}"`,
      `"${l.details.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
  };

  const eventTypes = [
    'ALL',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'RATE_LIMITED',
    'PLAYBACK_AUTHORIZED',
    'CODE_GENERATED',
    'CODE_REVOKED',
    'SESSION_TERMINATED',
    'LESSON_UPDATED',
    'BATCH_IMPORTED'
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-teal-400">FR-11 Compliant Audit Logging</span>
            <span aria-hidden="true">·</span>
            <span>Secret-Redacted Storage</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {language === 'bn' ? 'নিরাপত্তা ও অ্যাক্সেস অডিট লগ' : 'Security & Access Audit Logs'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToCsv}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={exportToJson}
            className="px-3 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold text-xs rounded transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Secret Redaction Assurance Note (FR-11 & FR-12) */}
      <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-white">Redaction Policy Enforced:</span>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Per PRD FR-11 & FR-12, raw authentication codes, bearer authorization headers, cookies, and signing secrets are strictly redacted before persistence. Only anonymized actor tokens, masked IP subnets, and event categories are recorded.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-slate-400 shrink-0">Filter Event:</span>
        {eventTypes.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono-numbers font-medium whitespace-nowrap transition-colors ${
              filterType === t
                ? 'bg-teal-400 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Timestamp (Asia/Dhaka)</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor Ref</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Client Subnet</th>
                <th className="py-3 px-4">Redacted Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records match the selected filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  let outcomeIcon = <Info className="w-3.5 h-3.5 text-slate-400" />;
                  let outcomeBadge = 'text-slate-400';

                  if (log.outcome === 'success') {
                    outcomeIcon = <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />;
                    outcomeBadge = 'text-teal-400';
                  } else if (log.outcome === 'failure') {
                    outcomeIcon = <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
                    outcomeBadge = 'text-red-400';
                  } else if (log.outcome === 'warning') {
                    outcomeIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
                    outcomeBadge = 'text-amber-400';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                      
                      <td className="py-3 px-4 font-mono-numbers text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-GB', {
                          timeZone: 'Asia/Dhaka',
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      <td className="py-3 px-4 font-mono-numbers font-semibold text-white whitespace-nowrap">
                        {log.event_type}
                      </td>

                      <td className="py-3 px-4 font-mono-numbers text-teal-300 whitespace-nowrap">
                        {log.actor_ref}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-semibold capitalize ${outcomeBadge}`}>
                          {outcomeIcon}
                          <span>{log.outcome}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono-numbers text-slate-400 whitespace-nowrap">
                        {log.ip_masked}
                      </td>

                      <td className="py-3 px-4 text-slate-300 text-[11px] leading-relaxed max-w-md">
                        {log.details}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
