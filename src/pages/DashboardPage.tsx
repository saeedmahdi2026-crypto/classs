import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lesson } from '../types';
import { PlayCircle, CheckCircle2, Clock, BookOpen, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

interface DashboardPageProps {
  onSelectLesson: (lessonId: string) => void;
  onNavigate: (view: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onSelectLesson, onNavigate }) => {
  const { student, language } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<{ [key: string]: { completed: boolean; last_position_seconds: number; completed_at: string | null } }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const [lessonsRes, progRes] = await Promise.all([
          api.getLessons(),
          api.getProgress()
        ]);
        setLessons(lessonsRes.lessons || []);
        setProgress(progRes.progress || {});
      } catch (err: any) {
        setError(err.message || 'Failed to load curriculum.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const completedCount = Object.values(progress).filter((p) => p.completed).length;
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Find next unfinished lesson to resume
  const nextLessonToResume = lessons.find((l) => !progress[l.id]?.completed) || lessons[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Student Welcome & Progress Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
            <div className="space-y-2">
              <p className="text-xs font-semibold text-teal-400 tracking-wide">
                {language === 'bn' ? `স্বাগতম, ${student?.student_ref}` : `Welcome, ${student?.student_ref}`}
              </p>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-balance">
                {language === 'bn' ? 'ইংরেজি মাস্টারক্লাস ক্লাসরুম' : 'English Masterclass Classroom'}
              </h1>

              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                {language === 'bn'
                  ? '১০টি নিবিড় ক্লাসের মাধ্যমে আপনার ইংরেজি উচ্চারণ, বাক্য গঠন ও কথা বলার জড়তা দূর করুন।'
                  : '10 comprehensive lessons designed to master conversational English, pronunciation, and fluency.'}
              </p>
            </div>

          {/* Quick Action Resume Button */}
          {nextLessonToResume && (
            <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3">
              <button
                onClick={() => onSelectLesson(nextLessonToResume.id)}
                className="w-full sm:w-auto px-5 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                <span>
                  {language === 'bn'
                    ? `ক্লাস ${nextLessonToResume.class_number} শুরু করুন`
                    : `Start Class ${nextLessonToResume.class_number}`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'পরবর্তী অসমাপ্ত ক্লাস'
                  : 'Resume your next unfinished module'}
              </span>
            </div>
          )}

        </div>

        {/* Course Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-medium">
              {language === 'bn'
                ? `অগ্রগতি: ১০টির মধ্যে ${completedCount}টি ক্লাস সম্পন্ন`
                : `Course Progress: ${completedCount} of ${lessons.length} Completed`}
            </span>
            <span className="font-mono-numbers font-semibold text-teal-400">
              {progressPercent}%
            </span>
          </div>

          <div className="w-full h-2 bg-slate-950/70 rounded-full overflow-hidden border border-slate-700/40">
            <div
              className="h-full bg-teal-400 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 10 Class Cards Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {language === 'bn' ? '১০টি নিবেদিত পাঠ্যসূচি' : 'Full 10-Class Syllabus'}
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'bn'
                ? 'ধারাবাহিকভাবে প্রতিটি ক্লাস সম্পূর্ণ করুন এবং লেকচার নোটস রিভিউ করুন।'
                : 'Progress chronologically through each module to build durable conversational fluency.'}
            </p>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>{language === 'bn' ? 'সম্পন্ন' : 'Completed'} ({completedCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600" />
              <span>{language === 'bn' ? 'বাকি' : 'Pending'} ({lessons.length - completedCount})</span>
            </span>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson) => {
            const isCompleted = progress[lesson.id]?.completed;

            return (
              <div
                key={lesson.id}
                onClick={() => onSelectLesson(lesson.id)}
                className={`group relative text-left bg-slate-800/80 hover:bg-slate-800 border transition-all rounded-xl p-5 cursor-pointer flex flex-col justify-between ${
                  isCompleted
                    ? 'border-teal-500/40 shadow-sm shadow-teal-500/5'
                    : 'border-slate-700/80 hover:border-slate-600'
                }`}
              >
                
                <div className="space-y-3">
                  
                  {/* Card Header: Editorial Numbering & Duration (Zero-Pill Discipline!) */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">
                        {language === 'bn' ? `ক্লাস ${lesson.class_number}` : `Class ${lesson.class_number}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono-numbers">{lesson.duration_minutes} min</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{lesson.vocabulary_count || 4} words</span>
                    </div>

                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-teal-400 text-xs font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{language === 'bn' ? 'সম্পন্ন' : 'Completed'}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">
                        {language === 'bn' ? 'অসমাপ্ত' : 'Unfinished'}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-semibold text-white group-hover:text-teal-300 transition-colors">
                    {language === 'bn' ? lesson.title_bn : lesson.title_en}
                  </h3>

                  {/* Secondary bilingual title for clarity */}
                  <p className="text-xs text-slate-400">
                    {language === 'bn' ? lesson.title_en : lesson.title_bn}
                  </p>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {language === 'bn' ? lesson.description_bn : lesson.description_en}
                  </p>

                  {/* Topic breakdown (Unboxed metadata with separators) */}
                  <div className="pt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                    {lesson.topics.map((t, idx) => (
                      <React.Fragment key={idx}>
                        <span>{t}</span>
                        {idx < lesson.topics.length - 1 && <span aria-hidden="true">/</span>}
                      </React.Fragment>
                    ))}
                  </div>

                </div>

                {/* Card Action footer */}
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {isCompleted
                      ? language === 'bn'
                        ? 'পুনরায় দেখুন'
                        : 'Review Lesson'
                      : language === 'bn'
                        ? 'ক্লাস শুরু করুন'
                        : 'Start Lesson'}
                  </span>

                  <div className="flex items-center gap-1 font-semibold text-teal-400 group-hover:translate-x-1 transition-transform">
                    <span>{language === 'bn' ? 'প্লেয়ারে যান' : 'Open Player'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
