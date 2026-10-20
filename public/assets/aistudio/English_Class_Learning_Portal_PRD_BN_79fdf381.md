# Product Requirements Document (PRD)
## English Class Learning Portal
**Version:** 1.0  
**Date:** ২১ অক্টোবর ২০২৬  
**Status:** Proposed MVP / Development Handoff

> **নিরাপত্তা নোট:** কোনো ওয়েবসাইট ভিডিও কপি বা screen recording ১০০% বন্ধ করতে পারে না। এই PRD অননুমোদিত অ্যাক্সেস কঠিন করা, শেয়ার করা URL-এর কার্যকারিতা সীমিত করা এবং অপব্যবহার শনাক্ত করার নিয়ন্ত্রণ নির্ধারণ করে।

## 1. Executive Summary
১০টি রেকর্ডেড ইংলিশ ক্লাসের জন্য responsive learning portal। শিক্ষার্থী access code দিয়ে লগইন করে dashboard থেকে ক্লাস দেখবে। Admin ক্লাস, কোড এবং access policy পরিচালনা করবেন।

২০টি প্রদত্ত code-কে raw plaintext হিসেবে frontend, source code, সাধারণ documentation বা logs-এ রাখা যাবে না। Secure import-এর মাধ্যমে hash-only storage-এ নিতে হবে। Production-এ per-student unique code/account সুপারিশ করা হচ্ছে।

## 2. Goals
- ১০টি পৃথক lesson record ও class card।
- Authenticated শিক্ষার্থীদের জন্য protected playback।
- Backend authorization, expiring playback token এবং revocation।
- Responsive, accessible UI।
- Admin panel, code lifecycle ও audit logs।

## 3. Roles
- **Visitor:** login/help page।
- **Student:** dashboard, authorized playback, progress, logout।
- **Admin:** class management, code issue/revoke, security logs; MFA বাধ্যতামূলক।

## 4. Pages
1. Login
2. Student Dashboard
3. Lesson Player
4. Admin Login
5. Admin Dashboard
6. Class Management
7. Access Code Management
8. Security/Audit Logs
9. Help / Access Issue

## 5. Student Journey
1. Access code submit।
2. Backend hash/status/expiry/rate-limit checks।
3. Secure server-side session create।
4. Dashboard থেকে Class 1–10 নির্বাচন।
5. Backend authorization-এর পর short-lived playback token।
6. Logout/expiry/revoke হলে protected playback বন্ধ।

## 6. Functional Requirements
- **FR-01:** ২০টি প্রাথমিক code server-side validate।
- **FR-02:** Raw code database-এ নয়; salted secure hash।
- **FR-03:** IP/code-based rate limit ও progressive delay।
- **FR-04:** HTTPS; Secure, HttpOnly, SameSite session cookie; session rotation ও timeout।
- **FR-05:** ১০টি unique lesson record, title/order/publish state/asset reference।
- **FR-06:** প্রতিটি playback request-এর আগে backend authorization।
- **FR-07:** Optional progress tracking।
- **FR-08:** Admin class CRUD।
- **FR-09:** Code activate/revoke/expire/reissue।
- **FR-10:** Session revoke ও configurable concurrent session limit।
- **FR-11:** Audit log; raw code/token log করা যাবে না।
- **FR-12:** Generic login errors; stack traces প্রকাশ নয়।
- **FR-13:** Keyboard navigation, contrast, labels; WCAG 2.2 AA লক্ষ্য।
- **FR-14:** Mobile-first responsive design।

## 7. Video Protection
সব ১০টি ক্লাসের জন্য একই URL দেওয়া হয়েছে: `https://youtu.be/5rT-J8cq74U`। এটি ইচ্ছাকৃত কি না owner-কে নিশ্চিত করতে হবে।

### Hosting preference
1. সাধারণ/unlisted YouTube embed — কম সুরক্ষা; sensitive paid course-এর জন্য সুপারিশ নয়।
2. Private video hosting + signed playback URL/cookie — MVP-এর ন্যূনতম সুপারিশ।
3. DRM-enabled HLS/DASH (Widevine/FairPlay/PlayReady) — উচ্চ-মূল্যের কনটেন্টের জন্য সর্বোচ্চ ব্যবহারিক ওয়েব সুরক্ষা।

### Controls
- Public file বা permanent direct-download URL নয়।
- Short-lived signed playback authorization।
- Manifest, segment ও key endpoint-সহ সব media request-এ authorization।
- Private origin/CDN, hotlink protection, token validation।
- Student-specific subtle watermark; sensitive data দেখানো যাবে না।
- Download-button/context-menu blocking কেবল deterrent, security boundary নয়।
- Source URL/token/API secret frontend bundle বা logs-এ নয়।
- Screen recording পুরোপুরি আটকানো সম্ভব নয়।

## 8. Access-Code Policy
- Per-student unique code/account সর্বোত্তম; shared code sharing risk তৈরি করে।
- Raw code শুধু issuance-এর সময় একবার দেখানো; পরে hash-only।
- Code হারালে reissue; পুরোনো code revoke।
- Code secure one-time import দিয়ে load করতে হবে; repository/logs/PRD-তে plaintext নয়।
- Production rollout-এর আগে existing shared codes rotate করার কথা বিবেচনা করুন।
- Revocation নির্ধারিত সীমার মধ্যে active sessions ও playback বন্ধ করবে।

## 9. UI Direction
- Clean, premium, uncluttered education design।
- Deep navy/charcoal, white/light neutral, restrained blue/teal accent।
- Readable Bengali/English font stack।
- Login: course title, code field, show/hide, CTA, error/help।
- Dashboard: progress + ১০টি class card।
- Player: responsive video, title, previous/next, lesson list, watermark।
- Admin: searchable tables, confirmation dialogs, clear loading/error states।

## 10. Suggested Architecture
- Frontend: Next.js/React or equivalent.
- Backend: Node.js/NestJS, Django, Laravel, or server routes.
- Database: PostgreSQL.
- Sessions: server-side session store; Redis optional.
- Video: private host/CDN with signed playback or DRM.
- Deployment: HTTPS, secrets manager, staging/production separation.
- Logs: structured, with secret redaction.

## 11. Minimum Data Model
- `AccessCode`: id, code_hash, status, expires_at, created_at, last_used_at, assigned_student_ref, max_sessions.
- `Student`: id, display_name/alias, status, optional contact only if needed.
- `Session`: id, access_code_ref, created_at, last_seen_at, expires_at, revoked_at.
- `Lesson`: id, class_number, title, description, provider, private_asset_id, published, sort_order.
- `Progress`: student_ref, lesson_ref, last_position_seconds, completed_at.
- `AuditEvent`: actor_ref, event_type, timestamp, outcome, limited metadata.

## 12. Security & Privacy
- HTTPS/TLS, HSTS, secure cookies.
- CSRF protection, strict CORS, CSP, output encoding, parameterized queries.
- Admin MFA, RBAC, least privilege.
- Rate limiting, monitoring, dependency updates, vulnerability scans.
- Never log raw codes, cookies, authorization headers or signed URLs.
- Data minimization, privacy notice, retention policy, encrypted backups and restore tests.

## 13. Non-Functional Requirements
- Dashboard content target: within 3 seconds on typical connection.
- Initial availability target: 99.5% monthly, subject to provider SLA.
- Latest Chrome/Edge/Firefox/Safari; Android/iOS browsers.
- WCAG 2.2 AA target.
- Timezone: Asia/Dhaka.
- Documented deployment, backup and recovery process.

## 14. Acceptance Criteria
- Active codes work; invalid/revoked/expired codes fail.
- Rate limiting prevents brute-force attempts.
- Anonymous users cannot access dashboard, lesson API or playback authorization.
- Direct API calls without permission return 401/403.
- Expired/revoked sessions cannot obtain new playback tokens.
- Admin changes create audit events.
- Ten class cards appear; duplicate URL mapping is flagged.
- No raw code or provider secret appears in browser storage, bundles or logs.
- Mobile/desktop playback works and backup restore is tested.

## 15. QA
Test authentication, authorization, brute-force resistance, session fixation, direct manifest/segment access, token expiry, origin bypass, XSS, CSRF, SQL injection, CORS/CSP, secret leakage, accessibility, mobile layout, backup restore and revocation.

## 16. Deployment Checklist
- Domain/TLS/HSTS configured.
- Database not publicly exposed.
- Secrets manager configured.
- Admin MFA verified.
- Private video hosting and token/DRM behavior tested.
- Codes securely imported; plaintext import file deleted.
- All 10 lesson mappings verified.
- Privacy notice, support contact, retention and incident owner defined.
- Staging acceptance tests passed before production.

## 17. Risks & Open Decisions
- All class URLs are identical; confirm whether intentional.
- Select private video provider and protection level.
- Decide per-student account vs shared code-only access.
- Define code expiry, concurrent session limit and inactivity timeout.
- Set hosting/video budget and data retention policy.

## Appendix: Class Mapping
| Class | Provided URL | Note |
|---|---|---|
| Class 1 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 2 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 3 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 4 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 5 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 6 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 7 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 8 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 9 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |
| Class 10 | https://youtu.be/5rT-J8cq74U | Same URL; confirm mapping |

**Credential handling:** The 20 raw access codes were intentionally not reproduced in this document. Import them through a secure one-time process and store only hashes. If they have already been distributed, consider rotating them before production launch.
