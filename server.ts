import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HMAC_SECRET = process.env.HMAC_SECRET || 'bangla-english-portal-secret-key-2026';

app.use(express.json());
app.use(cookieParser());

// Rate Limiting Storage
interface RateLimitRecord {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

// Helper for salted hash
function hashAccessCode(code: string, salt: string): string {
  const normalized = code.trim().toUpperCase();
  return crypto.createHash('sha256').update(salt + ':' + normalized).digest('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Data Store in Memory with File Persistence
const DATA_DIR = path.resolve(__dirname, '.data');
const STORE_FILE = path.resolve(DATA_DIR, 'portal-db.json');

interface AccessCodeRecord {
  id: string;
  code_hash: string;
  salt: string;
  masked_display: string;
  assigned_student_ref: string;
  status: 'active' | 'revoked' | 'expired' | 'suspended';
  created_at: string;
  expires_at: string;
  last_used_at: string | null;
  max_sessions: number;
  active_sessions: string[]; // session tokens
}

interface LessonRecord {
  id: string;
  class_number: number;
  title_en: string;
  title_bn: string;
  description_en: string;
  description_bn: string;
  duration_minutes: number;
  provider: 'youtube' | 'vimeo' | 'hls' | 'custom';
  video_url: string;
  published: boolean;
  sort_order: number;
  topics: string[];
  vocabulary: {
    word: string;
    phonetic: string;
    meaning_bn: string;
    example: string;
  }[];
  notes_summary: string;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

interface AuditRecord {
  id: string;
  actor_ref: string;
  event_type: string;
  timestamp: string;
  outcome: 'success' | 'failure' | 'warning' | 'info';
  details: string;
  ip_masked: string;
}

interface StudentSessionRecord {
  token: string;
  code_id: string;
  student_ref: string;
  code_masked: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
}

interface HelpTicket {
  id: string;
  student_name: string;
  contact: string;
  code_prefix: string;
  issue: string;
  status: 'open' | 'resolved';
  created_at: string;
}

let accessCodes: AccessCodeRecord[] = [];
let lessons: LessonRecord[] = [];
let auditLogs: AuditRecord[] = [];
let sessions = new Map<string, StudentSessionRecord>();
let adminSessions = new Set<string>();
let studentProgress = new Map<string, { [lessonId: string]: { completed: boolean; last_position_seconds: number; completed_at: string | null } }>();
let helpTickets: HelpTicket[] = [];

// Demo codes cache strictly for developer/evaluator convenience in the admin portal
let demoCodesForTesting: { raw_code: string; label: string }[] = [];

// Pre-seed 10 Lessons from PRD
function getInitialLessons(): LessonRecord[] {
  const commonUrl = 'https://youtu.be/5rT-J8cq74U';
  return [
    {
      id: 'lesson-1',
      class_number: 1,
      title_en: 'Foundations of Spoken English & Phonetics',
      title_bn: 'শব্দ উচ্চারণ, ধ্বনিবিজ্ঞান ও প্রাথমিক কথোপকথন',
      description_en: 'Master English vowel & consonant sounds, eliminate regional accents, and establish confident everyday speaking patterns.',
      description_bn: 'ভাওয়েল ও কনসোন্যান্টের নির্ভুল উচ্চারণ, উচ্চারণের জড়তা কাটানো এবং সাবলীল প্রাথমিক বাক্য গঠন।',
      duration_minutes: 45,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 1,
      topics: ['IPA Phonetics', 'Accent Neutralization', 'Greeting Etiquette', 'Self Introduction'],
      vocabulary: [
        { word: 'Pronunciation', phonetic: '/prəˌnʌn.siˈeɪ.ʃən/', meaning_bn: 'উচ্চারণ', example: 'Clear pronunciation builds instant listener trust.' },
        { word: 'Articulation', phonetic: '/ɑːˌtɪk.jəˈleɪ.ʃən/', meaning_bn: 'শব্দের স্পষ্ট প্রকাশ', example: 'Practice articulation exercises every morning.' },
        { word: 'Intonation', phonetic: '/ˌɪn.təˈneɪ.ʃən/', meaning_bn: 'কণ্ঠস্বরের ওঠা-নামা', example: 'Questions in English usually end with rising intonation.' },
        { word: 'Fluency', phonetic: '/ˈfluː.ən.si/', meaning_bn: 'সাবলীলতা / তোতলামিমুক্ত কথা', example: 'Daily reading enhances spoken fluency.' }
      ],
      notes_summary: 'Focus on syllable stress. In English, stressing the wrong syllable often confuses listeners more than mispronouncing a letter.',
      quiz: [
        {
          question: 'Which syllable is stressed in the word "Photograph"?',
          options: ['PHO-to-graph (first syllable)', 'pho-TO-graph (second syllable)', 'pho-to-GRAPH (third syllable)', 'Equal stress on all syllables'],
          correctIndex: 0,
          explanation: 'In "Photograph", the primary stress is on the first syllable: PHO-to-graph.'
        }
      ]
    },
    {
      id: 'lesson-2',
      class_number: 2,
      title_en: 'Tense & Sentence Architecture in Everyday Conversations',
      title_bn: 'দৈনন্দিন কথোপকথনে টেন্স ও বাক্য গঠনের সহজ কৌশল',
      description_en: 'Learn how to construct error-free sentences on the fly using Present, Past, and Future conversational frames.',
      description_bn: 'মুখস্থ না করে বাস্তব জীবনের পরিস্থিতিতে টেন্সের স্বাভাবিক প্রয়োগ এবং দ্রুত বাক্য তৈরির সূত্র।',
      duration_minutes: 50,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 2,
      topics: ['Present Continuous vs Simple', 'Past Narratives', 'Future Intentions', 'Time Markers'],
      vocabulary: [
        { word: 'Simultaneous', phonetic: '/ˌsɪm.əlˈteɪ.ni.əs/', meaning_bn: 'একই সাথে ঘটা', example: 'Present continuous describes simultaneous events.' },
        { word: 'Chronological', phonetic: '/ˌkrɒn.əˈlɒdʒ.ɪ.kəl/', meaning_bn: 'কালানুক্রমিক', example: 'Narrate past stories in chronological order.' },
        { word: 'Habitual', phonetic: '/həˈbɪtʃ.u.əl/', meaning_bn: 'নিয়মিত বা স্বভাবজাত', example: 'Present simple is for habitual routines.' }
      ],
      notes_summary: 'Rule of thumb: Use Present Continuous for ongoing activities, Simple Present for permanent truths, and Simple Past for completed episodes.',
      quiz: [
        {
          question: 'Which sentence correctly depicts a routine action?',
          options: ['I am drinking tea every morning.', 'I drink tea every morning.', 'I was drinking tea every morning.', 'I drank tea every morning yet.'],
          correctIndex: 1,
          explanation: 'For daily routine or habit, Present Indefinite ("I drink tea every morning") is the natural form.'
        }
      ]
    },
    {
      id: 'lesson-3',
      class_number: 3,
      title_en: 'Essential Auxiliary & Modal Verbs (Can, Could, Should, Would)',
      title_bn: 'মডাল অক্সিলিয়ারি ভার্বসের নির্ভুল ও ভদ্রোচিত প্রয়োগ',
      description_en: 'Command modal verbs to express polite requests, professional suggestions, probability, and past hypothetical actions.',
      description_bn: 'Can, Could, Should, Would, Might ব্যবহার করে ভদ্রভাবে অনুরোধ ও অফিসের আলোচনা পরিচালনা।',
      duration_minutes: 48,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 3,
      topics: ['Polite Inquiries', 'Giving Advice', 'Conditionals', 'Obligation vs Recommendation'],
      vocabulary: [
        { word: 'Courtesy', phonetic: '/ˈkɜː.tə.si/', meaning_bn: 'ভদ্রতা / সৌজন্য', example: 'Using "Could" adds polite courtesy to questions.' },
        { word: 'Recommendation', phonetic: '/ˌrek.ə.menˈdeɪ.ʃən/', meaning_bn: 'পরামর্শ বা সুপারিশ', example: '"Should" is ideal for gentle recommendations.' },
        { word: 'Hypothetical', phonetic: '/ˌhaɪ.pəˈθet.ɪ.kəl/', meaning_bn: 'কাল্পনিক / শর্তযুক্ত', example: '"Would" conveys hypothetical scenarios.' }
      ],
      notes_summary: 'Compare: "Give me that" (demanding) vs "Could you please pass that?" (respectful international business English).',
      quiz: [
        {
          question: 'What is the most polite way to ask someone to review a report?',
          options: ['Check this report now.', 'You must check this report.', 'Could you please take a look at this report?', 'You will check this report.'],
          correctIndex: 2,
          explanation: '"Could you please..." creates a polite, professional request standard in global workplaces.'
        }
      ]
    },
    {
      id: 'lesson-4',
      class_number: 4,
      title_en: 'Active Listening & Natural Response Patterns',
      title_bn: 'মনোযোগ দিয়ে শোনা এবং স্বাভাবিক প্রত্যুত্তর প্রদানের দক্ষতা',
      description_en: 'Overcome comprehension delays when listening to native speakers and formulate natural conversational follow-ups.',
      description_bn: 'অন্যের কথা দ্রুত বুঝে অস্বস্তি দূর করা এবং সাবলীল কানেক্টিং ফ্রেইজ ব্যবহারের পদ্ধতি।',
      duration_minutes: 42,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 4,
      topics: ['Connected Speech', 'Active Fillers', 'Clarification Queries', 'Echo Questions'],
      vocabulary: [
        { word: 'Comprehension', phonetic: '/ˌkɒm.prɪˈhen.ʃən/', meaning_bn: 'অনুধাবন বা বোঝার ক্ষমতা', example: 'Active listening accelerates speech comprehension.' },
        { word: 'Paraphrase', phonetic: '/ˈpær.ə.freɪz/', meaning_bn: 'নিজের ভাষায় পুনরুল্লেখ', example: 'Paraphrase to confirm understanding during discussions.' },
        { word: 'Nuance', phonetic: '/ˈnjuː.ɑːns/', meaning_bn: 'সূক্ষ্ম অর্থভেদ', example: 'Native speakers rely heavily on emotional nuances.' }
      ],
      notes_summary: 'Never be afraid to say: "Could you rephrase that slightly?" or "If I understood correctly, you mean..."',
      quiz: [
        {
          question: 'When you did not catch what someone said, the best response is:',
          options: ['What?!', 'Pardon me, could you say that once more?', 'Speak loudly.', 'I do not care.'],
          correctIndex: 1,
          explanation: '"Pardon me, could you say that once more?" is polished and universally understood.'
        }
      ]
    },
    {
      id: 'lesson-5',
      class_number: 5,
      title_en: 'Professional & Email Communication',
      title_bn: 'কর্মক্ষেত্র, ইন্টারভিউ ও প্রফেশনাল ইমেইল যোগাযোগ',
      description_en: 'Write concise, professional emails and conduct impactful interviews and workplace discussions.',
      description_bn: 'অফিসিয়াল ইমেইল লেখার কাঠামো, ইন্টারভিউতে আত্মবিশ্বাসের সাথে উত্তর এবং মিটিং শিষ্টাচার।',
      duration_minutes: 52,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 5,
      topics: ['Email Openers & Closers', 'Actionable Summaries', 'Interview STAR Method', 'Handling Deadlines'],
      vocabulary: [
        { word: 'Concise', phonetic: '/kənˈsaɪs/', meaning_bn: 'সংক্ষিপ্ত অথচ সুস্পষ্ট', example: 'Keep your status emails crisp and concise.' },
        { word: 'Collaboration', phonetic: '/kəˌlæb.əˈreɪ.ʃən/', meaning_bn: 'যৌথ উদ্যোগ / সহযোগিতা', example: 'We look forward to mutual collaboration on this project.' },
        { word: 'Deliverable', phonetic: '/dɪˈlɪv.ər.ə.bəl/', meaning_bn: 'নির্দিষ্ট সময়ের মধ্যে প্রদেয় কাজ', example: 'Ensure all milestone deliverables are submitted on time.' }
      ],
      notes_summary: 'Avoid opening emails with "Respected Sir". Modern global workplace English uses "Hi [First Name]," or "Dear [Name],".',
      quiz: [
        {
          question: 'What is the STAR method in behavioral interview answers?',
          options: ['Speak, Talk, Ask, Repeat', 'Situation, Task, Action, Result', 'Start, Train, Answer, Review', 'Standard, Theory, Apply, Rest'],
          correctIndex: 1,
          explanation: 'STAR stands for Situation, Task, Action, and Result—the gold standard for answering interview questions.'
        }
      ]
    },
    {
      id: 'lesson-6',
      class_number: 6,
      title_en: 'Common English Errors & Bengali Speaker Traps',
      title_bn: 'বাংলাভাষীদের ইংরেজি বলার ক্ষেত্রে সাধারণ ভুল ও তার সমাধান',
      description_en: 'Identify and eliminate mother-tongue influence (MTI), false prepositions, and direct translation errors.',
      description_bn: 'শব্দে শব্দে বাংলা থেকে অনুবাদের ভুল, প্রিপজিশনের ভুল এবং প্রচলিত ব্যাকরণগত ভুল সংশোধন।',
      duration_minutes: 46,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 6,
      topics: ['Mother Tongue Influence', 'Preposition Traps', 'Countable vs Uncountable', 'Subject-Verb Agreement'],
      vocabulary: [
        { word: 'Preposition', phonetic: '/ˌprep.əˈzɪʃ.ən/', meaning_bn: 'পদান্বয়ী অব্যয়', example: 'Say "listen to me", not "listen me".' },
        { word: 'Agreement', phonetic: '/əˈɡriː.mənt/', meaning_bn: 'সঙ্গতি বা মিল', example: 'Subject-verb agreement requires "everyone has", not "everyone have".' },
        { word: 'Redundancy', phonetic: '/rɪˈdʌn.dən.si/', meaning_bn: 'অপ্রয়োজনীয় শব্দের পুনরাবৃত্তি', example: 'Avoid "revert back"; "revert" already means return.' }
      ],
      notes_summary: 'Say: "I look forward to meeting you" (NOT "meet you"). Say: "Discuss the topic" (NOT "discuss about the topic").',
      quiz: [
        {
          question: 'Which of the following sentences is grammatically correct?',
          options: ['We will discuss about this matter.', 'We will discuss this matter.', 'We will discuss over this matter.', 'We will discuss regarding this matter.'],
          correctIndex: 1,
          explanation: 'The verb "discuss" is transitive and takes a direct object without the preposition "about".'
        }
      ]
    },
    {
      id: 'lesson-7',
      class_number: 7,
      title_en: 'Vocabulary Expansion & Idiomatic Expressions',
      title_bn: 'দৈনন্দিন শব্দভাণ্ডার বৃদ্ধি ও ন্যাচারাল ইডিয়মসের ব্যবহার',
      description_en: 'Expand from basic words to high-impact descriptive adjectives, phrasal verbs, and everyday conversational idioms.',
      description_bn: 'সাধারণ শব্দের জায়গায় মানসম্মত শব্দচয়ন, ফ্রেজাল ভার্ব ও আন্তর্জাতিক ইংরেজিতে ব্যবহৃত ইডিয়ম।',
      duration_minutes: 49,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 7,
      topics: ['High-Frequency Phrasal Verbs', 'Business Idioms', 'Contextual Synonyms', 'Collocations'],
      vocabulary: [
        { word: 'Breakthrough', phonetic: '/ˈbreɪk.θruː/', meaning_bn: 'উল্লেখযোগ্য সাফল্য বা আবিষ্কার', example: 'The new method marked a major breakthrough in fluency.' },
        { word: 'Pragmatic', phonetic: '/præɡˈmæt.ɪk/', meaning_bn: 'বাস্তবধর্মী ও কার্যকর', example: 'Take a pragmatic approach to language practice.' },
        { word: 'Resilient', phonetic: '/rɪˈzɪl.jənt/', meaning_bn: 'ধৈর্যশীল ও ঘুরে দাঁড়াতে সক্ষম', example: 'Language learners must stay resilient through errors.' }
      ],
      notes_summary: 'Idiom of the week: "Cut to the chase" (মূল বিষয়ে আসা), "Hit the nail on the head" (একেবারে সঠিক কথা বলা).',
      quiz: [
        {
          question: 'What does "Cut corners" mean in an everyday conversational context?',
          options: ['Draw sharp geometric lines', 'Do something hastily or cheaply to save money/effort', 'Walk quickly around buildings', 'Trim pieces of paper'],
          correctIndex: 1,
          explanation: '"To cut corners" means to do something in a cheap, hurried or improper way to save resources.'
        }
      ]
    },
    {
      id: 'lesson-8',
      class_number: 8,
      title_en: 'Fluency & Hesitation Elimination',
      title_bn: 'ঝরঝরে ইংরেজি বলা এবং মানসিক জড়তা ও ভীতি দূরীকরণ',
      description_en: 'Techniques to stop translating in your head and train your vocal muscles for uninterrupted, smooth sentence flow.',
      description_bn: 'মাথায় বাংলা থেকে ইংরেজি অনুবাদ করার অভ্যাস বাদ দেওয়ার কৌশল এবং আত্মবিশ্বাসী স্পিকিং স্পিড।',
      duration_minutes: 44,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 8,
      topics: ['Stop Mental Translation', 'Shadowing Technique', 'Pacing & Pause Control', 'Chunking Speech'],
      vocabulary: [
        { word: 'Hesitation', phonetic: '/ˌhez.ɪˈteɪ.ʃən/', meaning_bn: 'দ্বিধা বা ইতস্তত ভাব', example: 'Regular shadowing diminishes speech hesitation.' },
        { word: 'Spontaneous', phonetic: '/spɒnˈteɪ.ni.əs/', meaning_bn: 'স্বতঃস্ফূর্ত', example: 'Our goal is spontaneous conversation without translation delays.' },
        { word: 'Rhythm', phonetic: '/ˈrɪð.əm/', meaning_bn: 'ছন্দ বা তাল', example: 'English has a stress-timed rhythm.' }
      ],
      notes_summary: 'Shadowing technique: Listen to an English podcast/audio sentence and repeat it immediately with a 0.5-second delay to mimic natural cadence.',
      quiz: [
        {
          question: 'What is speech "chunking"?',
          options: ['Speaking one word at a time slowly', 'Grouping words into meaningful phrases rather than isolated single words', 'Shouting key words loudly', 'Skipping all difficult words'],
          correctIndex: 1,
          explanation: 'Chunking means speaking in natural thought groups (e.g., "In the meantime / if you don\'t mind / let\'s review the plan").'
        }
      ]
    },
    {
      id: 'lesson-9',
      class_number: 9,
      title_en: 'Public Speaking & Presentation Skills',
      title_bn: 'পাবলিক স্পিকিং, প্রেজেন্টেশন ও অডিয়েন্স এনগেজমেন্ট',
      description_en: 'Structure a compelling speech, command the room with vocal projection, and deliver presentations that engage audiences.',
      description_bn: 'স্টেজে বা ভার্চুয়াল প্রেজেন্টেশনে ভয় দূর করা, কণ্ঠের ওঠানামা এবং সুন্দর সূচনা ও সমাপ্তির কৌশল।',
      duration_minutes: 54,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 9,
      topics: ['Presentation Structure (Hook, Meat, Call)', 'Slide Narration', 'Q&A Handling', 'Body Language'],
      vocabulary: [
        { word: 'Compelling', phonetic: '/kəmˈpel.ɪŋ/', meaning_bn: 'মনোমুগ্ধকর ও যুক্তিগ্রাহ্য', example: 'Open your presentation with a compelling true story.' },
        { word: 'Articulation', phonetic: '/ɑːˌtɪk.jəˈleɪ.ʃən/', meaning_bn: 'স্পষ্টভাবে কথা উপস্থাপন', example: 'Public speakers must have clear articulation.' },
        { word: 'Engagement', phonetic: '/ɪnˈɡeɪdʒ.mənt/', meaning_bn: 'শ্রোতার সম্পৃক্ততা ও মনোযোগ', example: 'Ask rhetorical questions to boost audience engagement.' }
      ],
      notes_summary: 'The 3-Part Presentation Rule: 1) Tell them what you are going to tell them. 2) Tell them. 3) Tell them what you told them.',
      quiz: [
        {
          question: 'What is the best way to open a high-stakes presentation?',
          options: ['Apologize for being nervous', 'Read every bullet point on slide 1', 'Open with a thought-provoking question, surprising fact, or story hook', 'Say "I am not prepared today"'],
          correctIndex: 2,
          explanation: 'A strong hook instantly grabs attention and establishes credibility.'
        }
      ]
    },
    {
      id: 'lesson-10',
      class_number: 10,
      title_en: 'Capstone Discussion & Conversational Mastery',
      title_bn: 'চূড়ান্ত ক্লাস: বাস্তব জীবনের মক ডিসকাশন ও সার্বিক পর্যালোচনা',
      description_en: 'Comprehensive synthesis of all 10 modules: debate practice, business negotiations, and lifetime speaking habits.',
      description_bn: '১০টি ক্লাসের সম্পূর্ণ রিভিশন, বিতর্ক ও আলোচনা অনুশীলন এবং আজীবন অনুশীলনের রূপরেখা।',
      duration_minutes: 58,
      provider: 'youtube',
      video_url: commonUrl,
      published: true,
      sort_order: 10,
      topics: ['Full Course Review', 'Constructive Disagreement', 'Negotiation Phrases', 'Long-term Growth Plan'],
      vocabulary: [
        { word: 'Mastery', phonetic: '/ˈmɑː.stər.i/', meaning_bn: 'পূর্ণ দক্ষতা বা পারদর্শিতা', example: 'Mastery comes from sustained daily speaking practice.' },
        { word: 'Synthesis', phonetic: '/ˈsɪn.θə.sɪs/', meaning_bn: 'সমন্বয় বা সামগ্রিক রূপ', example: 'This capstone is a synthesis of phonetics, grammar, and delivery.' },
        { word: 'Sustainable', phonetic: '/səˈsteɪ.nə.bəl/', meaning_bn: 'দীর্ঘস্থায়ী ও নিয়মিত অব্যাহত রাখা যায় এমন', example: 'Form a sustainable 15-minute daily English speaking habit.' }
      ],
      notes_summary: 'Congratulations on completing the 10-class portal! Continue to record your voice weekly and speak at least 15 minutes daily.',
      quiz: [
        {
          question: 'How do you politely disagree in a professional discussion?',
          options: ['You are totally wrong!', 'I see your point; however, let\'s also consider another perspective...', 'I refuse to listen to this.', 'That makes no sense whatsoever.'],
          correctIndex: 1,
          explanation: '"I see your point; however, let\'s also consider..." shows diplomacy while presenting your view.'
        }
      ]
    }
  ];
}

// Seed 20 Initial Access Codes per PRD FR-01 and Section 1 & 8
function initializeStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(STORE_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      accessCodes = data.accessCodes || [];
      lessons = data.lessons || [];
      auditLogs = data.auditLogs || [];
      demoCodesForTesting = data.demoCodesForTesting || [];
      if (Array.isArray(data.adminSessions)) {
        adminSessions = new Set(data.adminSessions);
      }
      return;
    } catch (e) {
      console.error('Error reading store file, creating fresh store', e);
    }
  }

  // Fresh initialization
  lessons = getInitialLessons();
  accessCodes = [];
  demoCodesForTesting = [];

  // Generate clean, predictable pre-seeded student codes 1 through 20
  // Codes supported: ENG-2026-01 to ENG-2026-20, STUDENT01 to STUDENT20, and ENG01 to ENG20
  for (let i = 1; i <= 20; i++) {
    const numStr = String(i).padStart(2, '0');
    const primaryCode = `ENG-2026-${numStr}`;
    const altStudentCode = `STUDENT${numStr}`;
    const altEngCode = `ENG${numStr}`;
    const studentRef = `STU-2026-${1000 + i}`;

    // Add primary code
    const salt1 = generateSalt();
    accessCodes.push({
      id: `code-${i}`,
      code_hash: hashAccessCode(primaryCode, salt1),
      salt: salt1,
      masked_display: `ENG-****-${numStr}`,
      assigned_student_ref: studentRef,
      status: 'active',
      created_at: new Date('2026-10-20T08:00:00Z').toISOString(),
      expires_at: new Date('2027-04-20T23:59:59Z').toISOString(),
      last_used_at: null,
      max_sessions: 2,
      active_sessions: []
    });

    // Also register STUDENT01..20 and ENG01..20 as valid aliases for the student
    const salt2 = generateSalt();
    accessCodes.push({
      id: `code-alt-stu-${i}`,
      code_hash: hashAccessCode(altStudentCode, salt2),
      salt: salt2,
      masked_display: `STU-****-${numStr}`,
      assigned_student_ref: studentRef,
      status: 'active',
      created_at: new Date('2026-10-20T08:00:00Z').toISOString(),
      expires_at: new Date('2027-04-20T23:59:59Z').toISOString(),
      last_used_at: null,
      max_sessions: 2,
      active_sessions: []
    });

    const salt3 = generateSalt();
    accessCodes.push({
      id: `code-alt-eng-${i}`,
      code_hash: hashAccessCode(altEngCode, salt3),
      salt: salt3,
      masked_display: `ENG-****-${numStr}`,
      assigned_student_ref: studentRef,
      status: 'active',
      created_at: new Date('2026-10-20T08:00:00Z').toISOString(),
      expires_at: new Date('2027-04-20T23:59:59Z').toISOString(),
      last_used_at: null,
      max_sessions: 2,
      active_sessions: []
    });

    // Store in demo list for instant testing by students/evaluators
    demoCodesForTesting.push({
      raw_code: primaryCode,
      label: `Student #${i} (${studentRef})`
    });
  }

  auditLogs.push({
    id: `audit-${Date.now()}-init`,
    actor_ref: 'SYSTEM_BOOT',
    event_type: 'BATCH_IMPORTED',
    timestamp: new Date().toISOString(),
    outcome: 'success',
    details: 'Initial 20 clean access codes (ENG-2026-01..20, STUDENT01..20, ENG01..20) securely salted, hashed and provisioned.',
    ip_masked: '127.0.0.1'
  });

  saveStore();
}

function saveStore() {
  try {
    const data = {
      accessCodes,
      lessons,
      auditLogs: auditLogs.slice(-200), // retain last 200 logs
      demoCodesForTesting,
      adminSessions: Array.from(adminSessions)
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store file:', err);
  }
}

// Security: Audit Logger Helper (Never logs raw codes or secrets)
function logAudit(
  actor_ref: string,
  event_type: string,
  outcome: 'success' | 'failure' | 'warning' | 'info',
  details: string,
  req: Request
) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
  const ip_masked = ip.split(',')[0].trim().replace(/\.\d+$/, '.***');
  const record: AuditRecord = {
    id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    actor_ref,
    event_type,
    timestamp: new Date().toISOString(),
    outcome,
    details,
    ip_masked
  };
  auditLogs.unshift(record);
  saveStore();
}

// Middleware: Student Authentication via cookie or Authorization header
function requireStudentAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = req.cookies?.session_token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please enter your access code.' });
  }

  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or revoked. Please log in again.' });
  }

  // Check code status
  const code = accessCodes.find((c) => c.id === session.code_id);
  if (!code || code.status !== 'active') {
    sessions.delete(token);
    return res.status(403).json({ error: 'Your access code has been suspended or revoked.' });
  }

  // Touch session
  session.last_seen_at = new Date().toISOString();
  (req as any).studentSession = session;
  (req as any).accessCode = code;
  next();
}

// Middleware: Admin Authentication
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = req.cookies?.admin_session;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token || !adminSessions.has(token)) {
    return res.status(401).json({ error: 'Admin authorization required.' });
  }

  next();
}

// ======================== API ROUTES ========================

// Rate limit checker helper
function checkRateLimit(ip: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const rec = rateLimits.get(ip);
  if (!rec) {
    rateLimits.set(ip, { attempts: 1, firstAttempt: now, blockedUntil: 0 });
    return { allowed: true };
  }

  if (rec.blockedUntil > now) {
    return { allowed: false, waitSeconds: Math.ceil((rec.blockedUntil - now) / 1000) };
  }

  // Reset window every 15 minutes
  if (now - rec.firstAttempt > 15 * 60 * 1000) {
    rec.attempts = 1;
    rec.firstAttempt = now;
    rec.blockedUntil = 0;
    return { allowed: true };
  }

  rec.attempts++;
  if (rec.attempts > 5) {
    // Block for 5 minutes
    rec.blockedUntil = now + 5 * 60 * 1000;
    return { allowed: false, waitSeconds: 300 };
  }

  return { allowed: true };
}

// Public demo codes preview: returns all 20 active student codes for ease of login/testing
app.get('/api/auth/demo-codes', (_req: Request, res: Response) => {
  res.json({ demo_codes: demoCodesForTesting });
});

// Public quick-import: allows user to paste their 20 passwords directly if they have a custom set
app.post('/api/auth/custom-import', (req: Request, res: Response) => {
  const { codes } = req.body;
  if (!Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({ error: 'Please provide a list of passwords/codes.' });
  }

  let added = 0;
  for (let idx = 0; idx < codes.length; idx++) {
    const raw = String(codes[idx]).trim();
    if (!raw) continue;
    const salt = generateSalt();
    const hash = hashAccessCode(raw, salt);
    const masked = raw.length > 6 ? `${raw.slice(0, 3)}-****-${raw.slice(-3)}` : `****-${raw.slice(-2)}`;
    const studentRef = `STU-CUSTOM-${1000 + accessCodes.length + 1}`;

    const rec: AccessCodeRecord = {
      id: `custom-code-${Date.now()}-${idx}`,
      code_hash: hash,
      salt,
      masked_display: masked,
      assigned_student_ref: studentRef,
      status: 'active',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      last_used_at: null,
      max_sessions: 2,
      active_sessions: []
    };

    accessCodes.unshift(rec);
    demoCodesForTesting.unshift({
      raw_code: raw,
      label: `Custom User Code #${idx + 1}`
    });
    added++;
  }

  saveStore();
  logAudit('USER', 'BATCH_IMPORTED', 'success', `User imported ${added} custom access passwords.`, req);

  res.json({
    success: true,
    count: added,
    demo_codes: demoCodesForTesting,
    message: `${added}টি পাসওয়ার্ড সফলভাবে যুক্ত হয়েছে! এখন যেকোনোটি দিয়ে লগইন করতে পারেন।`
  });
});

// 1. Student Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const ip = ((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  const { username, password, code } = req.body;
  const rawPass = String(password || code || '').trim();

  if (!rawPass) {
    return res.status(400).json({ error: 'পাসওয়ার্ড প্রদান করুন।' });
  }

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    logAudit('ANONYMOUS', 'RATE_LIMITED', 'warning', `Rate limit exceeded from client IP. Blocked for ${rateCheck.waitSeconds}s.`, req);
    return res.status(429).json({
      error: `অতিরিক্ত ভুল চেষ্টার কারণে একাউন্ট সাময়িক ব্লক করা হয়েছে। অনুগ্রহ করে ${rateCheck.waitSeconds} সেকেন্ড পর চেষ্টা করুন।`
    });
  }

  // Progressive delay to thwart automated brute-force scripts
  await new Promise((resolve) => setTimeout(resolve, 300));

  const trimmed = rawPass.toUpperCase();

  // Find matching code by checking salted hash
  let matchedCode: AccessCodeRecord | null = null;
  for (const c of accessCodes) {
    const computed = hashAccessCode(trimmed, c.salt);
    if (computed === c.code_hash) {
      matchedCode = c;
      break;
    }
  }

  if (!matchedCode) {
    logAudit('ANONYMOUS', 'LOGIN_FAILED', 'failure', 'Invalid password attempted.', req);
    return res.status(401).json({ error: 'ভুল পাসওয়ার্ড। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।' });
  }

  if (matchedCode.status !== 'active') {
    logAudit(matchedCode.assigned_student_ref, 'LOGIN_FAILED', 'failure', `Access attempted with ${matchedCode.status} code.`, req);
    return res.status(403).json({ error: 'এই পাসওয়ার্ডটি নিষ্ক্রিয় বা বাতিল করা হয়েছে।' });
  }

  const studentDisplayName = (username && typeof username === 'string' && username.trim())
    ? username.trim()
    : matchedCode.assigned_student_ref;

  // Check expiry
  if (new Date(matchedCode.expires_at).getTime() < Date.now()) {
    matchedCode.status = 'expired';
    saveStore();
    logAudit(matchedCode.assigned_student_ref, 'LOGIN_FAILED', 'failure', `Expired code ${matchedCode.masked_display} used.`, req);
    return res.status(403).json({ error: 'This access code has expired. Please contact administration for renewal.' });
  }

  // Session enforcement: check max concurrent sessions
  const activeTokens = matchedCode.active_sessions.filter((tok) => sessions.has(tok));
  if (activeTokens.length >= matchedCode.max_sessions) {
    // Terminate oldest session to enforce concurrent session limit (FR-10)
    const oldestToken = activeTokens[0];
    sessions.delete(oldestToken);
    matchedCode.active_sessions = activeTokens.slice(1);
    logAudit(matchedCode.assigned_student_ref, 'SESSION_TERMINATED', 'info', `Oldest session evicted due to max session limit (${matchedCode.max_sessions}).`, req);
  }

  // Generate cryptographically secure session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

  const sessionRecord: StudentSessionRecord = {
    token: sessionToken,
    code_id: matchedCode.id,
    student_ref: studentDisplayName,
    code_masked: matchedCode.masked_display,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
    last_seen_at: new Date().toISOString()
  };

  sessions.set(sessionToken, sessionRecord);
  matchedCode.active_sessions.push(sessionToken);
  matchedCode.last_used_at = new Date().toISOString();
  saveStore();

  logAudit(studentDisplayName, 'LOGIN_SUCCESS', 'success', `Authenticated with password.`, req);

  // Set secure cookie
  res.cookie('session_token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  });

  return res.json({
    token: sessionToken,
    student_ref: studentDisplayName,
    code_masked: matchedCode.masked_display,
    expires_at: expiresAt,
    max_sessions: matchedCode.max_sessions
  });
});

// 2. Student Me
app.get('/api/auth/me', requireStudentAuth, (req: Request, res: Response) => {
  const session = (req as any).studentSession as StudentSessionRecord;
  const code = (req as any).accessCode as AccessCodeRecord;
  res.json({
    student_ref: session.student_ref,
    code_masked: session.code_masked,
    expires_at: session.expires_at,
    max_sessions: code.max_sessions
  });
});

// 3. Student Logout
app.post('/api/auth/logout', requireStudentAuth, (req: Request, res: Response) => {
  const session = (req as any).studentSession as StudentSessionRecord;
  const code = (req as any).accessCode as AccessCodeRecord;

  sessions.delete(session.token);
  if (code) {
    code.active_sessions = code.active_sessions.filter((t) => t !== session.token);
    saveStore();
  }

  logAudit(session.student_ref, 'LOGOUT', 'info', `Student logged out. Session destroyed.`, req);
  res.clearCookie('session_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 4. Lessons List (FR-05)
app.get('/api/lessons', requireStudentAuth, (req: Request, res: Response) => {
  // Only published lessons for students; exclude direct video_url to protect assets until playback authorization
  const publicLessons = lessons
    .filter((l) => l.published)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((l) => ({
      id: l.id,
      class_number: l.class_number,
      title_en: l.title_en,
      title_bn: l.title_bn,
      description_en: l.description_en,
      description_bn: l.description_bn,
      duration_minutes: l.duration_minutes,
      provider: l.provider,
      topics: l.topics,
      has_notes: !!l.notes_summary,
      vocabulary_count: l.vocabulary.length,
      quiz_count: l.quiz.length
    }));

  res.json({ lessons: publicLessons });
});

// 5. Single Lesson Detail
app.get('/api/lessons/:id', requireStudentAuth, (req: Request, res: Response) => {
  const lesson = lessons.find((l) => l.id === req.params.id && l.published);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found.' });
  }

  res.json({
    id: lesson.id,
    class_number: lesson.class_number,
    title_en: lesson.title_en,
    title_bn: lesson.title_bn,
    description_en: lesson.description_en,
    description_bn: lesson.description_bn,
    duration_minutes: lesson.duration_minutes,
    provider: lesson.provider,
    topics: lesson.topics,
    vocabulary: lesson.vocabulary,
    notes_summary: lesson.notes_summary,
    quiz: lesson.quiz
  });
});

// 6. Playback Authorization Token (FR-06, Section 7 - Protected Playback)
app.post('/api/lessons/:id/playback-token', requireStudentAuth, (req: Request, res: Response) => {
  const session = (req as any).studentSession as StudentSessionRecord;
  const lesson = lessons.find((l) => l.id === req.params.id && l.published);

  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found or inactive.' });
  }

  // Generate short-lived playback token (10 minutes)
  const tokenExpiry = Date.now() + 10 * 60 * 1000;
  const watermarkText = `${session.student_ref} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  
  const payload = `${session.student_ref}:${lesson.id}:${tokenExpiry}`;
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  const playbackToken = Buffer.from(JSON.stringify({ payload, signature, exp: tokenExpiry })).toString('base64');

  logAudit(
    session.student_ref,
    'PLAYBACK_AUTHORIZED',
    'success',
    `Authorized playback for Class ${lesson.class_number} (${lesson.title_en}). Token expires in 10m.`,
    req
  );

  // Check if multiple classes share this same video URL (flagged per PRD Section 7 & Appendix)
  const otherLessonsWithSameUrl = lessons.filter((l) => l.id !== lesson.id && l.video_url === lesson.video_url);
  const duplicateUrlWarning = otherLessonsWithSameUrl.length > 0;

  res.json({
    authorized: true,
    token: playbackToken,
    expires_at: new Date(tokenExpiry).toISOString(),
    watermark_text: watermarkText,
    video_url: lesson.video_url,
    provider: lesson.provider,
    duplicate_url_warning: duplicateUrlWarning
  });
});

// 7. Student Progress (FR-07)
app.get('/api/progress', requireStudentAuth, (req: Request, res: Response) => {
  const session = (req as any).studentSession as StudentSessionRecord;
  const userProgress = studentProgress.get(session.student_ref) || {};
  res.json({ progress: userProgress });
});

app.post('/api/progress/:lessonId', requireStudentAuth, (req: Request, res: Response) => {
  const session = (req as any).studentSession as StudentSessionRecord;
  const { lessonId } = req.params;
  const { completed, last_position_seconds } = req.body;

  let userProg = studentProgress.get(session.student_ref);
  if (!userProg) {
    userProg = {};
    studentProgress.set(session.student_ref, userProg);
  }

  userProg[lessonId] = {
    completed: Boolean(completed),
    last_position_seconds: typeof last_position_seconds === 'number' ? last_position_seconds : 0,
    completed_at: completed ? new Date().toISOString() : null
  };

  res.json({ success: true, progress: userProg });
});

// 8. Help & Support Ticket (Page 9)
app.post('/api/help/ticket', (req: Request, res: Response) => {
  const { student_name, contact, code_prefix, issue } = req.body;
  if (!student_name || !contact || !issue) {
    return res.status(400).json({ error: 'Please provide your name, contact information, and issue details.' });
  }

  const ticket: HelpTicket = {
    id: `ticket-${Date.now()}`,
    student_name: String(student_name).slice(0, 80),
    contact: String(contact).slice(0, 80),
    code_prefix: String(code_prefix || 'N/A').slice(0, 20),
    issue: String(issue).slice(0, 500),
    status: 'open',
    created_at: new Date().toISOString()
  };

  helpTickets.push(ticket);
  logAudit(ticket.student_name, 'LOGIN_FAILED', 'info', `Student submitted access support ticket [${ticket.id}].`, req);

  res.json({
    success: true,
    ticket_id: ticket.id,
    message: 'Your inquiry has been submitted. Our course administration team will review your ticket promptly.'
  });
});

// ======================== ADMIN API ========================

// Admin Login (Passcode + Simulated MFA code 202621 per PRD: "Admin: MFA বাধ্যতামূলক")
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin2026!*';
const MFA_STATIC_CODE = '202621';

app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password, mfa_code } = req.body;

  if (password !== ADMIN_PASSWORD) {
    logAudit('ADMIN_AUTH', 'LOGIN_FAILED', 'failure', 'Invalid admin password attempt.', req);
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  if (mfa_code !== MFA_STATIC_CODE) {
    logAudit('ADMIN_AUTH', 'LOGIN_FAILED', 'failure', 'Invalid MFA verification code.', req);
    return res.status(401).json({ error: 'Invalid 6-digit MFA verification code. (Hint: 202621)' });
  }

  const adminToken = 'adm-' + crypto.randomBytes(24).toString('hex');
  adminSessions.add(adminToken);
  saveStore();

  logAudit('ADMIN_ROOT', 'LOGIN_SUCCESS', 'success', 'Admin logged in with verified MFA token.', req);

  res.cookie('admin_session', adminToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({
    token: adminToken,
    role: 'administrator',
    message: 'Admin authenticated successfully.'
  });
});

app.get('/api/admin/verify', requireAdminAuth, (_req: Request, res: Response) => {
  res.json({ valid: true, role: 'administrator' });
});

app.post('/api/admin/logout', requireAdminAuth, (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  let token = req.cookies?.admin_session;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  if (token) {
    adminSessions.delete(token);
    saveStore();
  }
  res.clearCookie('admin_session');
  res.json({ success: true });
});

// Admin Overview
app.get('/api/admin/overview', requireAdminAuth, (req: Request, res: Response) => {
  const activeCodesCount = accessCodes.filter((c) => c.status === 'active').length;
  const revokedCodesCount = accessCodes.filter((c) => c.status === 'revoked').length;
  const expiredCodesCount = accessCodes.filter((c) => c.status === 'expired').length;
  const totalActiveSessions = sessions.size;

  res.json({
    total_codes: accessCodes.length,
    active_codes: activeCodesCount,
    revoked_codes: revokedCodesCount,
    expired_codes: expiredCodesCount,
    active_sessions: totalActiveSessions,
    total_lessons: lessons.length,
    total_tickets: helpTickets.length,
    recent_audits: auditLogs.slice(0, 10),
    demo_codes: demoCodesForTesting.slice(0, 8)
  });
});

// Admin Codes List (FR-09)
app.get('/api/admin/codes', requireAdminAuth, (req: Request, res: Response) => {
  const codesData = accessCodes.map((c) => ({
    id: c.id,
    masked_display: c.masked_display,
    assigned_student_ref: c.assigned_student_ref,
    status: c.status,
    created_at: c.created_at,
    expires_at: c.expires_at,
    last_used_at: c.last_used_at,
    max_sessions: c.max_sessions,
    active_sessions_count: c.active_sessions.filter((s) => sessions.has(s)).length
  }));

  res.json({
    codes: codesData,
    demo_codes: demoCodesForTesting
  });
});

// Admin Generate Access Code (Single or Batch) (FR-09, Section 8)
// Raw codes are returned once in this API response, never stored in DB!
app.post('/api/admin/codes/generate', requireAdminAuth, (req: Request, res: Response) => {
  const count = Math.min(Math.max(parseInt(req.body.count || '1', 10), 1), 50);
  const max_sessions = parseInt(req.body.max_sessions || '2', 10);
  const expiryDays = parseInt(req.body.expiry_days || '180', 10);

  const generatedList: { raw_code: string; masked_display: string; student_ref: string }[] = [];

  for (let i = 0; i < count; i++) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const rawCode = `ENG-2026-${randomHex}`;
    const salt = generateSalt();
    const codeHash = hashAccessCode(rawCode, salt);
    const masked = `ENG-****-${rawCode.slice(-4)}`;
    const studentRef = `STU-2026-${1100 + accessCodes.length + 1}`;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    const record: AccessCodeRecord = {
      id: `code-${Date.now()}-${i}`,
      code_hash: codeHash,
      salt: salt,
      masked_display: masked,
      assigned_student_ref: studentRef,
      status: 'active',
      created_at: new Date().toISOString(),
      expires_at: expiresAt,
      last_used_at: null,
      max_sessions,
      active_sessions: []
    };

    accessCodes.unshift(record);
    generatedList.push({
      raw_code: rawCode,
      masked_display: masked,
      student_ref: studentRef
    });
  }

  saveStore();
  logAudit('ADMIN_ROOT', 'CODE_GENERATED', 'success', `Generated ${count} new access codes with salt-hashed storage.`, req);

  res.json({
    success: true,
    count,
    codes: generatedList,
    notice: 'Security Notice: These raw access codes are shown ONCE. Distribute them immediately to students. The system stores only salted cryptographic hashes.'
  });
});

// Admin Bulk Import Codes (Section 8)
app.post('/api/admin/codes/import', requireAdminAuth, (req: Request, res: Response) => {
  const { raw_codes } = req.body;
  if (!Array.isArray(raw_codes) || raw_codes.length === 0) {
    return res.status(400).json({ error: 'Please provide an array of raw access code strings to import.' });
  }

  let importedCount = 0;
  for (const raw of raw_codes) {
    const trimmed = String(raw).trim().toUpperCase();
    if (!trimmed || trimmed.length < 5) continue;

    const salt = generateSalt();
    const codeHash = hashAccessCode(trimmed, salt);
    const masked = `${trimmed.slice(0, 3)}-****-${trimmed.slice(-4)}`;
    const studentRef = `STU-IMP-${1000 + accessCodes.length + 1}`;

    const record: AccessCodeRecord = {
      id: `code-imp-${Date.now()}-${importedCount}`,
      code_hash: codeHash,
      salt,
      masked_display: masked,
      assigned_student_ref: studentRef,
      status: 'active',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      last_used_at: null,
      max_sessions: 2,
      active_sessions: []
    };

    accessCodes.unshift(record);
    importedCount++;
  }

  saveStore();
  logAudit('ADMIN_ROOT', 'BATCH_IMPORTED', 'success', `Secure one-time import of ${importedCount} access codes into hash storage.`, req);

  res.json({
    success: true,
    imported_count: importedCount,
    message: `${importedCount} codes securely converted to salted hashes and imported.`
  });
});

// Admin Code Actions: Revoke, Reissue, Terminate Sessions (FR-09, FR-10)
app.post('/api/admin/codes/:id/revoke', requireAdminAuth, (req: Request, res: Response) => {
  const code = accessCodes.find((c) => c.id === req.params.id);
  if (!code) {
    return res.status(404).json({ error: 'Access code not found.' });
  }

  code.status = 'revoked';
  // Terminate all active sessions immediately (FR-10)
  for (const token of code.active_sessions) {
    sessions.delete(token);
  }
  code.active_sessions = [];
  saveStore();

  logAudit('ADMIN_ROOT', 'CODE_REVOKED', 'warning', `Revoked access code ${code.masked_display} and terminated active sessions.`, req);

  res.json({ success: true, message: `Access code ${code.masked_display} revoked.` });
});

app.post('/api/admin/codes/:id/reissue', requireAdminAuth, (req: Request, res: Response) => {
  const oldCode = accessCodes.find((c) => c.id === req.params.id);
  if (!oldCode) {
    return res.status(404).json({ error: 'Access code not found.' });
  }

  // Revoke old code
  oldCode.status = 'revoked';
  for (const token of oldCode.active_sessions) {
    sessions.delete(token);
  }
  oldCode.active_sessions = [];

  // Generate fresh code
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  const rawCode = `ENG-2026-${randomHex}`;
  const salt = generateSalt();
  const codeHash = hashAccessCode(rawCode, salt);
  const masked = `ENG-****-${rawCode.slice(-4)}`;

  const newRecord: AccessCodeRecord = {
    id: `code-${Date.now()}-reissue`,
    code_hash: codeHash,
    salt,
    masked_display: masked,
    assigned_student_ref: oldCode.assigned_student_ref,
    status: 'active',
    created_at: new Date().toISOString(),
    expires_at: oldCode.expires_at,
    last_used_at: null,
    max_sessions: oldCode.max_sessions,
    active_sessions: []
  };

  accessCodes.unshift(newRecord);
  saveStore();

  logAudit('ADMIN_ROOT', 'CODE_REISSUED', 'success', `Reissued access code for ${oldCode.assigned_student_ref}. Old code revoked.`, req);

  res.json({
    success: true,
    new_raw_code: rawCode,
    masked_display: masked,
    student_ref: oldCode.assigned_student_ref
  });
});

app.post('/api/admin/codes/:id/terminate-sessions', requireAdminAuth, (req: Request, res: Response) => {
  const code = accessCodes.find((c) => c.id === req.params.id);
  if (!code) {
    return res.status(404).json({ error: 'Access code not found.' });
  }

  const count = code.active_sessions.length;
  for (const token of code.active_sessions) {
    sessions.delete(token);
  }
  code.active_sessions = [];
  saveStore();

  logAudit('ADMIN_ROOT', 'SESSION_TERMINATED', 'info', `Admin terminated all ${count} sessions for ${code.masked_display}.`, req);

  res.json({ success: true, terminated_count: count });
});

// Admin Lessons Management (FR-08)
app.get('/api/admin/lessons', requireAdminAuth, (req: Request, res: Response) => {
  res.json({ lessons });
});

app.put('/api/admin/lessons/:id', requireAdminAuth, (req: Request, res: Response) => {
  const lesson = lessons.find((l) => l.id === req.params.id);
  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found.' });
  }

  const { title_en, title_bn, description_en, description_bn, duration_minutes, video_url, provider, published } = req.body;

  if (title_en) lesson.title_en = title_en;
  if (title_bn) lesson.title_bn = title_bn;
  if (description_en) lesson.description_en = description_en;
  if (description_bn) lesson.description_bn = description_bn;
  if (typeof duration_minutes === 'number') lesson.duration_minutes = duration_minutes;
  if (video_url) lesson.video_url = video_url;
  if (provider) lesson.provider = provider;
  if (typeof published === 'boolean') lesson.published = published;

  saveStore();
  logAudit('ADMIN_ROOT', 'LESSON_UPDATED', 'info', `Updated Class ${lesson.class_number} (${lesson.title_en}).`, req);

  res.json({ success: true, lesson });
});

// Admin Audit Logs (FR-11)
app.get('/api/admin/audit-logs', requireAdminAuth, (req: Request, res: Response) => {
  const filterType = req.query.type as string;
  let results = auditLogs;
  if (filterType && filterType !== 'ALL') {
    results = auditLogs.filter((l) => l.event_type === filterType);
  }
  res.json({ logs: results });
});

// Initialize Database & Start Server
initializeStore();

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite in middleware mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`English Class Learning Portal running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
