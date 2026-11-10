# Matchmallow V1 — Database & Backend Guide

> Status: Architecture agreed; implementation in progress. This is the reference for future changes, not proof that Supabase is deployed.

## Goal
Keep Matchmallow small, affordable, secure, and reliable. The public website is static HTML/CSS/JS under `public/`; the backend will use Supabase Edge Functions and PostgreSQL. No accounts or email login.

## Non-negotiable product rules
- A creator completes 10 fixed multiple-choice questions and receives a shareable public quiz code.
- The quiz expires **exactly 48 hours after successful creation**, based on database time; every read/write checks expiry server-side. No grace period.
- Each quiz accepts **at most 20 successful recipient submissions**, enforced atomically under concurrency.
- The creator sees recipient nicknames, scores, tiers, and highlights, **not full recipient answers**.
- Recipients see their own results, not other recipients' results or the creator's answers before submitting.
- Duplicate nicknames are allowed. Retry with the same submission request ID must not consume another slot.
- Creator can delete their quiz immediately, cascading to all responses. Hourly cleanup deletes expired quizzes and responses.
- Browser-local drafts are not saved to Supabase until submitted.
- Scoring is computed server-side on demand using the quiz's scoring version, not persisted as a result.

## Architecture
```text
Browser (static frontend)
  -> HTTPS /api/v1/* (logical versioned routes)
  -> Supabase Edge Functions (validation, authorization, rate limits, errors)
  -> PostgreSQL (quizzes + responses; atomic create/submit functions)
```
Versioned routes may be implemented using Edge Function routing; the route examples are a contract, not deployed URLs.

### Two tables only for V1
**quizzes**
- `id` UUID primary key
- `public_code` unique, short random non-secret identifier
- `creation_request_id` unique UUID for idempotent creation
- `creator_token_hash` SHA-256 hash of a random >=256-bit private token
- `answers` JSONB array of exactly 10 validated option codes
- `question_version`, `scoring_version` fixed for the quiz
- `created_at` and `expires_at` TIMESTAMPTZ assigned by database; expiry is exactly +48h

**responses**
- `id` UUID primary key
- `quiz_id` FK to quizzes, `ON DELETE CASCADE`
- `submission_id` UUID; unique within a quiz for idempotent retries
- `recipient_token_hash` SHA-256 hash of a random >=256-bit private result token
- `nickname`, `answers` JSONB array of exactly 10 option codes
- `created_at` TIMESTAMPTZ

Indexes: unique public code, unique creation request ID, expiry, quiz foreign key, unique (quiz_id, submission_id), and private token hashes where lookup requires them. Avoid indexes on answers.

### Security
- Enable RLS on both tables. Do not grant public client roles direct access.
- Edge Functions are the only public-facing database gateway; privileged credentials stay in backend secrets, never browser JS.
- Revoke `EXECUTE` on privileged functions from PUBLIC/anon/authenticated; grant only to trusted backend role. Audit function ownership and set a trusted `search_path` on SECURITY DEFINER functions.
- Public quiz codes are **not** authorization credentials. Creator and recipient access use separate private random tokens. Store hashes only, never plaintext tokens.
- Private tokens travel in URL fragments and authorized HTTPS requests; avoid logging them or placing them in query strings. The browser retains a private token until successful creation/submission and for return visits; protect against XSS. No account-based recovery.
- Hash high-entropy random tokens using SHA-256; don't use password hashing for random 256-bit secrets.
- Validate quiz code, nickname, answer values, versions, token format, and payload sizes on the server. Use risk-based CAPTCHA and rate limits.

### Critical transaction behavior
**Create quiz**: Client generates a stable request ID and creator secret before sending. Edge Function validates input; a PostgreSQL transaction validates the active question version, inserts the complete quiz, and sets timestamps from database time. Unique-code collisions retry a bounded number of times. Same request ID returns the existing quiz *only after verifying the same creator secret/request ownership*; it must not leak someone else's private data or change expiry. The browser retains its original private secret for safe retries.

**Submit response**: Client generates stable submission ID and recipient result secret. Under a row lock on the parent quiz, PostgreSQL checks the exact expiry and 20-response cap, validates the answers, then inserts once. An identical authorized retry returns the existing response; a conflicting reuse of the ID is rejected. Return structured errors for expired, full, invalid, or temporary failure. Never reveal private answers prematurely.

**Read dashboard/result**: Verify the appropriate token hash in the backend, check quiz expiry, then calculate score, tier, and highlights using the saved versions. Dashboard returns summaries only, not raw recipient answers.

**Delete/cleanup**: Authorized creator deletion removes quiz; FK cascade removes responses. Hourly scheduled cleanup deletes expired quizzes, with monitoring and retries. App expiry is separate from backup retention.

### Question and scoring versions
V1 has 10 fixed questions. Each quiz pins its question-bank and scoring versions. Keep the interpretation of old versions available while any associated quiz is active; avoid creating extra tables solely for versions unless needed. Validate option codes against the pinned version in the backend and again in privileged write functions where feasible.

## Implementation sequence
1. **Foundation (started)**: add this guide and initial SQL migration on a feature branch; inspect existing frontend before wiring it.
2. Create separate Supabase **development** and **production** projects; configure server-only secrets. Never commit credentials or `.env` files.
3. Apply and test the initial migration in **development only**.
4. Implement privileged atomic quiz-creation and response-submission SQL functions; review RLS/GRANTs and concurrency tests.
5. Implement versioned Edge Functions for create, public quiz read, submit, private creator dashboard, private recipient result, and delete. Add structured errors and rate limiting.
6. Connect frontend flows and local draft storage. Keep the static site functional during development.
7. Add hourly expiry cleanup, health monitoring, retries and alerts. Confirm the chosen Supabase plan's backup and restore capabilities.
8. Add GitHub Actions validation/tests; deploy production migrations/functions **only with manual approval**, using protected secrets.
9. Test end-to-end: duplicate clicks, retries, collisions, simultaneous 20th/21st submissions, exactly-at-expiry access, token isolation, cascade deletion, and failed cleanup. Verify old quizzes survive backward-compatible migrations.
10. Deploy production only after passing tests and manual approval.

## Operational checklist
- [ ] Development Supabase project created
- [ ] Production Supabase project created
- [ ] Schema migrated and tested in development
- [ ] No public table or privileged function access
- [ ] Creation idempotency and token ownership tested
- [ ] 20-response concurrency test passed
- [ ] Exact 48-hour expiry test passed
- [ ] Dashboard privacy and recipient isolation verified
- [ ] Cascade deletion and hourly cleanup tested
- [ ] Backups/recovery limits documented
- [ ] Error monitoring and cleanup alerts enabled
- [ ] GitHub Actions tests and manual production approval configured

## Change policy
Prefer the two-table model and simple managed services. Use version-controlled SQL migrations. Make schema changes backward-compatible (expand, transition, contract), preserving active quizzes and older clients. Do not add Redis, extra tables, real-time subscriptions, long-term custom backup systems, or newsletter features without a demonstrated need.

## Notes / open implementation details
- The SQL migration establishes **table structure only**; atomic write functions, function permissions, Edge Functions, cleanup, and tests are subsequent steps.
- The actual 10 question codes and scoring rules must be taken from the approved product specification; do not invent them.
- Supabase backup features, scheduling options, and quotas depend on the selected plan and must be verified before production.
