import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Lesson } from '../../types';
import { BookOpen, Edit2, AlertTriangle, Check, ExternalLink, Clock, PlayCircle, X } from 'lucide-react';

export const AdminClassesPage: React.FC = () => {
  const { language } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadLessons = async () => {
    try {
      setIsLoading(true);
      const res = await api.getAdminLessons();
      setLessons(res.lessons || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLessons();
  }, []);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLesson) return;

    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      await api.updateAdminLesson(editingLesson.id, {
        title_en: editingLesson.title_en,
        title_bn: editingLesson.title_bn,
        description_en: editingLesson.description_en,
        description_bn: editingLesson.description_bn,
        duration_minutes: Number(editingLesson.duration_minutes),
        video_url: editingLesson.video_url,
        provider: editingLesson.provider,
        published: editingLesson.published
      });
      setFeedbackMsg(`Class ${editingLesson.class_number} updated successfully.`);
      setEditingLesson(null);
      loadLessons();
    } catch (err: any) {
      setFeedbackMsg(`Error: ${err.message || 'Failed to update'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {language === 'bn' ? '১০টি ক্লাস ও ভিডিও ব্যবস্থাপনা' : 'Class Curriculum & Video Asset Management'}
          </h1>
          <p className="text-xs text-slate-400">
            {language === 'bn'
              ? 'প্রতিটি ক্লাসের ভিডিও ইউআরএল, লেকচার বিবরণ ও প্রকাশনা স্ট্যাটাস কনফিগার করুন।'
              : 'Configure video stream sources, bilingual descriptions, durations, and publish states.'}
          </p>
        </div>

        <span className="text-xs font-mono-numbers text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded border border-teal-500/20">
          Total Modules: {lessons.length}
        </span>
      </div>

      {/* Flag Duplicate URL Notice (PRD Appendix Flag) */}
      <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl text-xs text-amber-200/90 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-200">
            {language === 'bn' ? 'পিআরডি ডুপ্লিকেট URL সতর্কতা' : 'Duplicate Video URL Warning (PRD Appendix)'}
          </p>
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            {language === 'bn'
              ? 'পিআরডি ডকুমেন্টের ১০টি ক্লাসেই একই ভিডিও লিংক দেওয়া হয়েছে (https://youtu.be/5rT-J8cq74U)। আপনি নিচে যেকোনো ক্লাসের "সম্পাদনা" বাটনে ক্লিক করে সংশ্লিষ্ট ক্লাসের আসল বা প্রাইভেট ভিডিও URL বসাতে পারেন।'
              : 'All 10 classes currently reference the initial PRD demo URL. Click "Edit Class" on any module below to assign unique private video stream URLs or YouTube video IDs.'}
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-teal-950/40 border border-teal-700 rounded-lg text-xs text-teal-200">
          {feedbackMsg}
        </div>
      )}

      {/* Lessons Table */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Title (EN / BN)</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Provider & Asset URL</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 text-slate-300">
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-slate-700/30 transition-colors">
                  
                  <td className="py-3.5 px-4 font-mono-numbers font-semibold text-teal-400">
                    Class {lesson.class_number}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{lesson.title_en}</div>
                    <div className="text-[11px] text-slate-400">{lesson.title_bn}</div>
                  </td>

                  <td className="py-3.5 px-4 font-mono-numbers text-slate-400 whitespace-nowrap">
                    {lesson.duration_minutes} mins
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-numbers uppercase text-[10px] px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700">
                        {lesson.provider}
                      </span>
                      <span className="font-mono-numbers text-slate-400 truncate">
                        {lesson.video_url}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {lesson.published ? (
                      <span className="text-teal-400 font-semibold text-[11px]">Published</span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Draft</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditingLesson({ ...lesson })}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-teal-400" />
                      <span>Edit Class</span>
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Class Modal */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="text-base font-bold text-white">
                Edit Class {editingLesson.class_number} ({editingLesson.title_en})
              </h3>
              <button
                onClick={() => setEditingLesson(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              
              <div>
                <label className="block text-slate-300 font-semibold mb-1">English Title</label>
                <input
                  type="text"
                  value={editingLesson.title_en}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Bengali Title (বাংলা শিরোনাম)</label>
                <input
                  type="text"
                  value={editingLesson.title_bn}
                  onChange={(e) => setEditingLesson({ ...editingLesson, title_bn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    value={editingLesson.duration_minutes}
                    onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 font-mono-numbers bg-slate-900 border border-slate-700 rounded text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Provider</label>
                  <select
                    value={editingLesson.provider}
                    onChange={(e) => setEditingLesson({ ...editingLesson, provider: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                  >
                    <option value="youtube">YouTube (Privacy-Enhanced Embed)</option>
                    <option value="vimeo">Vimeo Private Player</option>
                    <option value="hls">Private HLS / Signed CDN</option>
                    <option value="custom">Direct MP4 Video Host</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Video Stream URL or YouTube Link</label>
                <input
                  type="text"
                  value={editingLesson.video_url}
                  onChange={(e) => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                  placeholder="https://youtu.be/..."
                  className="w-full px-3 py-2 font-mono-numbers bg-slate-900 border border-slate-700 rounded text-white"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports YouTube links or private CDN video stream manifests.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (English)</label>
                <textarea
                  rows={2}
                  value={editingLesson.description_en}
                  onChange={(e) => setEditingLesson({ ...editingLesson, description_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (বাংলা)</label>
                <textarea
                  rows={2}
                  value={editingLesson.description_bn}
                  onChange={(e) => setEditingLesson({ ...editingLesson, description_bn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="publishedToggle"
                  checked={editingLesson.published}
                  onChange={(e) => setEditingLesson({ ...editingLesson, published: e.target.checked })}
                  className="rounded border-slate-700 text-teal-500 focus:ring-teal-400"
                />
                <label htmlFor="publishedToggle" className="text-slate-300 font-medium">
                  Published and available to authorized students
                </label>
              </div>

              <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLesson(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 font-semibold rounded"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
