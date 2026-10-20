import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { HelpCircle, Send, CheckCircle2, MessageSquare, Phone, Mail, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export const HelpPage: React.FC = () => {
  const { language } = useAuth();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [issue, setIssue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q_en: 'What should I do if my Access Code does not work?',
      q_bn: 'আমার এক্সেস কোড কাজ না করলে কী করব?',
      a_en: 'Verify there are no accidental spaces. Each code is case-insensitive. If your code is expired or revoked, submit a support inquiry below with your registered name for a reissued code.',
      a_bn: 'কোনো অতিরিক্ত স্পেস যেন না থাকে তা নিশ্চিত করুন। কোড বড় বা ছোট হাতের অক্ষরে লিখলে সমস্যা নেই। কোডটি মেয়াদোত্তীর্ণ বা বাতিল হলে নিচের ফর্মের মাধ্যমে যোগাযোগ করে নতুন কোড রিকোয়েস্ট করুন।'
    },
    {
      q_en: 'Why do I see "Too many login attempts"?',
      q_bn: '"Too many login attempts" এর কারণ কী?',
      a_en: 'To prevent unauthorized brute-force attempts, the security firewall locks login for 5 minutes after 5 consecutive incorrect tries.',
      a_bn: 'নিরাপত্তা সুরক্ষার অংশ হিসেবে পর পর ৫ বার ভুল কোড দিলে সার্ভার স্বয়ংক্রিয়ভাবে ৫ মিনিটের জন্য ব্লক করে রাখে। ৫ মিনিট পর পুনরায় সঠিক কোড দিয়ে চেষ্টা করুন।'
    },
    {
      q_en: 'Can I watch classes simultaneously from two devices?',
      q_bn: 'আমি কি একসাথে একাধিক ডিভাইস থেকে ক্লাস দেখতে পারব?',
      a_en: 'Each student code is provisioned with a maximum concurrent session policy (typically 2 devices). Logging in from a 3rd device automatically evicts your oldest session for account security.',
      a_bn: 'প্রতিটি শিক্ষার্থীর কোডে সর্বোচ্চ সেশন সীমা (সাধারণত ২ টি ডিভাইস) নির্ধারিত থাকে। ৩য় কোনো ডিভাইসে লগইন করলে আগের সেশনটি নিরাপত্তার স্বার্থে স্বয়ংক্রিয়ভাবে লগআউট হয়ে যাবে।'
    },
    {
      q_en: 'Why do all 10 classes show the same video in this preview?',
      q_bn: 'সব ১০টি ক্লাসেই একই ভিডিও কেন দেখাচ্ছে?',
      a_en: 'As noted in the Course PRD Appendix, the course instructor initially provided one sample video URL for all 10 lessons. Administrators can replace and update each lesson URL individually in the Admin Panel.',
      a_bn: 'কোর্স পিআরডি (PRD) অনুসারে প্রাথমিক হস্তান্তরের সময় ১০টি ক্লাসের জন্যই একই ডেমো ভিডিও লিংক অন্তর্ভুক্ত করা হয়েছিল। অ্যাডমিন প্যানেল থেকে যেকোনো সময় প্রতিটি ক্লাসের স্বতন্ত্র ভিডিও লিংক আপডেট করা যায়।'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact || !issue) {
      setErrorMessage(language === 'bn' ? 'সবগুলো প্রয়োজনীয় ঘর পূরণ করুন।' : 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.submitHelpTicket({
        student_name: name,
        contact,
        code_prefix: codePrefix,
        issue
      });
      setSubmitSuccess(res.message);
      setName('');
      setContact('');
      setCodePrefix('');
      setIssue('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Page Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-md text-xs font-medium text-teal-400">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{language === 'bn' ? 'শিক্ষার্থী সহায়তা সেল' : 'Student Access Helpdesk'}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
          {language === 'bn' ? 'এক্সেস সমস্যা ও সাধারণ জিজ্ঞাসা' : 'Access Support & Knowledge Base'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          {language === 'bn'
            ? 'কোড সংক্রান্ত জটিলতা, প্লেব্যাক সমস্যা বা নতুন কোড সংগ্রহের জন্য নিচের তথ্য ও সাপোর্ট ফর্মটি ব্যবহার করুন।'
            : 'Find immediate answers regarding your access credentials, rate limits, or submit a request directly to the administration.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Col: Support Ticket Form */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-700/60 mb-6">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {language === 'bn' ? 'সহায়তা টিকিট জমা দিন' : 'Submit Access Issue Ticket'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'আমাদের টিম দ্রুত যোগাযোগ করবে' : 'Admin responds within 2-4 hours'}
              </p>
            </div>
          </div>

          {submitSuccess ? (
            <div className="p-6 bg-teal-950/40 border border-teal-800/80 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto" />
              <h3 className="text-sm font-semibold text-white">
                {language === 'bn' ? 'টিকিট সফলভাবে জমা হয়েছে!' : 'Inquiry Successfully Submitted!'}
              </h3>
              <p className="text-xs text-teal-200/90 leading-relaxed">{submitSuccess}</p>
              <button
                onClick={() => setSubmitSuccess(null)}
                className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded border border-slate-700 transition-colors"
              >
                {language === 'bn' ? 'আরেকটি বার্তা পাঠান' : 'Send Another Inquiry'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'bn' ? 'আপনার নাম *' : 'Your Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3.5 py-2 text-xs bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'bn' ? 'মোবাইল বা ইমেইল *' : 'Contact Phone / Email *'}
                </label>
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="017XXXXXXXX or name@example.com"
                  className="w-full px-3.5 py-2 text-xs bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'bn' ? 'এক্সেস কোডের প্রথম ৪ অক্ষর (ঐচ্ছিক)' : 'Code Prefix (Optional)'}
                </label>
                <input
                  type="text"
                  value={codePrefix}
                  onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                  placeholder="ENG-2026..."
                  className="w-full px-3.5 py-2 text-xs font-mono-numbers bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {language === 'bn' ? 'সমস্যার বিস্তারিত বিবরণ *' : 'Describe the Access Issue *'}
                </label>
                <textarea
                  rows={3}
                  required
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder={language === 'bn' ? 'কোড দিয়ে লগইন করার সময় কী বার্তা দেখাচ্ছে লিখুন...' : 'Describe what happens when you attempt to log in...'}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900/90 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-xs text-red-200">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? (language === 'bn' ? 'পাঠানো হচ্ছে...' : 'Submitting...') : (language === 'bn' ? 'টিকিট জমা দিন' : 'Submit Ticket')}</span>
              </button>
            </form>
          )}

          {/* Quick Contact Desk */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-teal-400 shrink-0" />
              <span>support@englishportal.edu</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-teal-400 shrink-0" />
              <span>+880 1700-000000</span>
            </div>
            <div className="sm:col-span-2 flex items-center gap-2 text-[11px] text-slate-400">
              <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Support Desk Hours: 10:00 AM – 08:00 PM (Asia/Dhaka)</span>
            </div>
          </div>

        </div>

        {/* Right Col: Interactive FAQs */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white tracking-tight">
            {language === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)' : 'Frequently Asked Questions'}
          </h2>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;

              return (
                <div
                  key={idx}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-4 flex items-center justify-between gap-3 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
                  >
                    <span>{language === 'bn' ? faq.q_bn : faq.q_en}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-teal-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-700/40">
                      {language === 'bn' ? faq.a_bn : faq.a_en}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};
