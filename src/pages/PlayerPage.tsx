import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lesson, PlaybackAuthResponse } from '../types';
import { WatermarkOverlay } from '../components/WatermarkOverlay';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Volume2,
  Download,
  AlertTriangle,
  BookOpen,
  HelpCircle,
  Sparkles,
  ShieldCheck,
  Check
} from 'lucide-react';

interface PlayerPageProps {
  lessonId: string;
  onBack: () => void;
  onSelectLesson: (id: string) => void;
}

export const PlayerPage: React.FC<PlayerPageProps> = ({ lessonId, onBack, onSelectLesson }) => {
  const { student, language } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [playbackAuth, setPlaybackAuth] = useState<PlaybackAuthResponse | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'vocabulary' | 'notes' | 'quiz'>('overview');
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<{ [qIdx: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Fetch lesson & playback token
  useEffect(() => {
    let isMounted = true;

    const fetchLessonAndAuthorize = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [lessonData, tokenData, lessonsList, progressData] = await Promise.all([
          api.getLesson(lessonId),
          api.getPlaybackToken(lessonId),
          api.getLessons(),
          api.getProgress()
        ]);

        if (isMounted) {
          setLesson(lessonData);
          setPlaybackAuth(tokenData);
          setAllLessons(lessonsList.lessons || []);
          const prog = progressData.progress?.[lessonId];
          setIsCompleted(!!prog?.completed);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Playback authorization denied. Please refresh or log in again.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchLessonAndAuthorize();

    return () => {
      isMounted = false;
    };
  }, [lessonId]);

  // Handle Mark as Completed
  const handleToggleComplete = async () => {
    if (!lesson) return;
    const nextState = !isCompleted;
    setIsCompleted(nextState);
    try {
      await api.updateProgress(lesson.id, {
        completed: nextState,
        last_position_seconds: 0
      });
    } catch (err) {
      console.error('Failed to update progress', err);
    }
  };

  // Pronounce word via SpeechSynthesis
  const pronounceWord = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Convert YouTube URL into privacy-enhanced embed URL
  const getEmbedUrl = (rawUrl: string) => {
    try {
      let videoId = '5rT-J8cq74U';
      if (rawUrl.includes('youtu.be/')) {
        videoId = rawUrl.split('youtu.be/')[1]?.split('?')[0] || videoId;
      } else if (rawUrl.includes('watch?v=')) {
        videoId = rawUrl.split('watch?v=')[1]?.split('&')[0] || videoId;
      }
      return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
    } catch {
      return `https://www.youtube-nocookie.com/embed/5rT-J8cq74U?rel=0&modestbranding=1`;
    }
  };

  // Navigation helpers
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-400">
          {language === 'bn' ? 'প্লেব্যাক অনুমোদন যাচাই করা হচ্ছে...' : 'Authorizing secure playback stream...'}
        </p>
      </div>
    );
  }

  if (error || !lesson || !playbackAuth) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-red-950/60 border border-red-800 text-red-400 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">
          {language === 'bn' ? 'প্লেব্যাক অননুমোদিত' : 'Playback Authorization Failed'}
        </h2>
        <p className="text-xs text-slate-400">{error || 'Session may have expired.'}</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded border border-slate-700 transition-colors"
        >
          {language === 'bn' ? 'ড্যাশবোর্ডে ফিরে যান' : 'Return to Dashboard'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{language === 'bn' ? 'ড্যাশবোর্ড' : 'Back to Dashboard'}</span>
          </button>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-semibold text-slate-300">
            {language === 'bn' ? `ক্লাস ${lesson.class_number}` : `Class ${lesson.class_number}`}
          </span>
        </div>

        {/* Next / Previous Quick Jump */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => prevLesson && onSelectLesson(prevLesson.id)}
            disabled={!prevLesson}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'আগের ক্লাস' : 'Previous'}</span>
          </button>

          <button
            onClick={handleToggleComplete}
            className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors flex items-center gap-1.5 ${
              isCompleted
                ? 'bg-teal-950/60 text-teal-300 border-teal-700/80 hover:bg-teal-900/60'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? 'text-teal-400' : 'text-slate-400'}`} />
            <span>
              {isCompleted
                ? language === 'bn'
                  ? 'সম্পন্ন হয়েছে'
                  : 'Completed'
                : language === 'bn'
                  ? 'সম্পন্ন চিহ্নিত করুন'
                  : 'Mark Completed'}
            </span>
          </button>

          <button
            onClick={() => nextLesson && onSelectLesson(nextLesson.id)}
            disabled={!nextLesson}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 transition-colors flex items-center gap-1"
          >
            <span>{language === 'bn' ? 'পরের ক্লাস' : 'Next'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Main Grid: Player Stage (Left) & Playlist Deck (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Video Player Canvas & Content Tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Responsive Video Container with Security Deterrents & Subtle Watermark */}
          <div
            className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl group"
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Dynamic Moving Watermark Overlay (Section 7) */}
            <WatermarkOverlay watermarkText={playbackAuth.watermark_text} />

            {/* Embedded Stream */}
            <iframe
              src={getEmbedUrl(playbackAuth.video_url)}
              title={lesson.title_en}
              className="w-full h-full border-0 select-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Lesson Title & Metadata (Zero-Pill discipline) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-teal-400">
                {language === 'bn' ? `ক্লাস ${lesson.class_number}` : `Class ${lesson.class_number}`}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 font-mono-numbers">
                <Clock className="w-3.5 h-3.5" />
                <span>{lesson.duration_minutes} minutes</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {language === 'bn' ? lesson.title_bn : lesson.title_en}
            </h1>
            <p className="text-xs text-slate-400">
              {language === 'bn' ? lesson.title_en : lesson.title_bn}
            </p>
          </div>

          {/* Interactive Learning Companion Tabs (Functional Buttons) */}
          <div className="space-y-4">
            <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-lg border border-slate-700/80 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'bg-slate-900 text-teal-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'bn' ? 'আলোচনা ও বিষয়বস্তু' : 'Overview & Topics'}
              </button>
              
              <button
                onClick={() => setActiveTab('vocabulary')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'vocabulary'
                    ? 'bg-slate-900 text-teal-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{language === 'bn' ? 'শব্দভাণ্ডার' : 'Key Vocabulary'}</span>
                <span className="text-[10px] font-mono-numbers text-slate-500">
                  ({(lesson.vocabulary || []).length})
                </span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  activeTab === 'notes'
                    ? 'bg-slate-900 text-teal-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'bn' ? 'লেকচার হ্যান্ডআউট' : 'Handout & Notes'}
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'quiz'
                    ? 'bg-slate-900 text-teal-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{language === 'bn' ? 'অনুশীলনী কুইজ' : 'Practice Quiz'}</span>
                <span className="text-[10px] font-mono-numbers text-slate-500">
                  ({(lesson.quiz || []).length})
                </span>
              </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    {language === 'bn' ? 'ক্লাসের মূল উদ্দেশ্য' : 'Module Objectives'}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {language === 'bn' ? lesson.description_bn : lesson.description_en}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-700/60">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {language === 'bn' ? 'মূল বিষয়সমূহ' : 'Covered Concepts'}
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                    {lesson.topics.map((topic, i) => (
                      <span key={i} className="px-2.5 py-1 bg-slate-900/80 rounded border border-slate-700/80">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Vocabulary with Audio Pronunciation */}
            {activeTab === 'vocabulary' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  {language === 'bn'
                    ? 'প্রতিটি শব্দের উচ্চারণ শোনার জন্য স্পিকার আইকনে ক্লিক করুন।'
                    : 'Click the speaker icon to hear authentic standard American/British pronunciation.'}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(lesson.vocabulary || []).map((voc, i) => (
                    <div
                      key={i}
                      className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-bold text-white tracking-wide">
                            {voc.word}
                          </span>
                          <span className="ml-2 text-xs font-mono-numbers text-slate-400">
                            {voc.phonetic}
                          </span>
                        </div>
                        <button
                          onClick={() => pronounceWord(voc.word)}
                          className="w-7 h-7 rounded bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 flex items-center justify-center transition-colors"
                          title="Listen Pronunciation"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs">
                        <span className="text-slate-400 font-medium">
                          {language === 'bn' ? 'বাংলা অর্থ: ' : 'Meaning: '}
                        </span>
                        <span className="text-teal-300 font-medium">{voc.meaning_bn}</span>
                      </div>

                      <div className="text-[11px] text-slate-300 italic pt-1 border-t border-slate-700/40">
                        "{voc.example}"
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Handout & Notes */}
            {activeTab === 'notes' && (
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {language === 'bn' ? 'ক্লাস সামারি ও গুরুত্বপূর্ণ নোটস' : 'Lecture Key Summary & Rules'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {language === 'bn' ? 'স্মার্ট রিভিশন নোটস' : 'High-yield memory points'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const text = `English Class ${lesson.class_number} Handout\nTitle: ${lesson.title_en}\n\nSummary:\n${lesson.notes_summary}\n\nVocabulary:\n` +
                        (lesson.vocabulary || []).map((v) => `- ${v.word} (${v.phonetic}): ${v.meaning_bn}\n  Example: ${v.example}`).join('\n');
                      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Class_${lesson.class_number}_Handout.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-slate-200 text-xs rounded border border-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-400" />
                    <span>{language === 'bn' ? 'নোটস ডাউনলোড' : 'Download Text Handout'}</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-700/60 text-xs text-slate-300 leading-relaxed font-sans">
                  {lesson.notes_summary}
                </div>
              </div>
            )}

            {/* Tab 4: Practice Quiz */}
            {activeTab === 'quiz' && (
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">
                    {language === 'bn' ? 'ক্লাস মূল্যায়ন কুইজ' : 'Comprehension Check'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {language === 'bn' ? 'সঠিক উত্তর নির্বাচন করুন' : 'Select the best answer'}
                  </span>
                </div>

                {(lesson.quiz || []).map((q, qIdx) => {
                  const userAnswer = selectedQuizAnswers[qIdx];
                  const hasAnswered = typeof userAnswer === 'number';

                  return (
                    <div key={qIdx} className="space-y-3 pt-2">
                      <p className="text-xs font-semibold text-slate-200">
                        {qIdx + 1}. {q.question}
                      </p>

                      <div className="space-y-1.5">
                        {q.options.map((opt, optIdx) => {
                          const isSelected = userAnswer === optIdx;
                          const isCorrect = q.correctIndex === optIdx;

                          let btnStyle = 'bg-slate-900/60 border-slate-700/80 text-slate-300 hover:bg-slate-900';
                          if (quizSubmitted) {
                            if (isCorrect) {
                              btnStyle = 'bg-teal-950/60 border-teal-600 text-teal-200';
                            } else if (isSelected && !isCorrect) {
                              btnStyle = 'bg-red-950/60 border-red-700 text-red-200';
                            }
                          } else if (isSelected) {
                            btnStyle = 'bg-teal-900/30 border-teal-500 text-white';
                          }

                          return (
                            <button
                              key={optIdx}
                              onClick={() => {
                                if (!quizSubmitted) {
                                  setSelectedQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
                                }
                              }}
                              className={`w-full text-left px-3.5 py-2 text-xs rounded-lg border transition-all flex items-center justify-between ${btnStyle}`}
                            >
                              <span>{opt}</span>
                              {quizSubmitted && isCorrect && <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {quizSubmitted && (
                        <div className="p-3 bg-slate-900/90 rounded border border-slate-700/80 text-[11px] text-slate-300">
                          <span className="font-semibold text-teal-400">Explanation: </span>
                          <span>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="pt-3 border-t border-slate-700/60 flex items-center justify-end">
                  {!quizSubmitted ? (
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      className="px-4 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-semibold rounded transition-colors"
                    >
                      {language === 'bn' ? 'উত্তর যাচাই করুন' : 'Submit Answers'}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedQuizAnswers({});
                        setQuizSubmitted(false);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded border border-slate-700 transition-colors"
                    >
                      {language === 'bn' ? 'আবার চেষ্টা করুন' : 'Reset Quiz'}
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Col: 10-Class Playlist Deck */}
        <div className="space-y-4">
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-4 shadow-lg">
            
            <div className="pb-3 border-b border-slate-700/60 mb-3">
              <h3 className="text-sm font-bold text-white">
                {language === 'bn' ? '১০টি ক্লাসের তালিকা' : 'Course Playlist'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'যে কোনো ক্লাসে লাফ দিন' : 'Select any lesson'}
              </p>
            </div>

            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {allLessons.map((item) => {
                const isCurrent = item.id === lessonId;

                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectLesson(item.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start gap-2.5 ${
                      isCurrent
                        ? 'bg-teal-950/40 border-teal-500/60 text-white'
                        : 'bg-slate-900/40 hover:bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono-numbers shrink-0 mt-0.5 ${
                        isCurrent
                          ? 'bg-teal-400 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.class_number}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isCurrent ? 'text-teal-200' : 'text-slate-200'}`}>
                        {language === 'bn' ? item.title_bn : item.title_en}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span className="font-mono-numbers">{item.duration_minutes}m</span>
                      </p>
                    </div>

                    {isCurrent && (
                      <span className="text-[10px] text-teal-400 font-semibold uppercase shrink-0 mt-1">
                        Playing
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
