-- Matchmallow V1: minimal schema foundation.
-- Apply to DEVELOPMENT first. Privileged write functions and API are added separately.
create extension if not exists pgcrypto;

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique
    check (public_code ~ '^[A-Za-z0-9]{8,16}$'),
  creation_request_id uuid not null unique,
  creator_token_hash text not null unique
    check (creator_token_hash ~ '^[0-9a-f]{64}$'),
  answers jsonb not null
    check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 10),
  question_version integer not null check (question_version > 0),
  scoring_version integer not null check (scoring_version > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  constraint quiz_exact_expiry check (expires_at = created_at + interval '48 hours')
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  submission_id uuid not null,
  recipient_token_hash text not null unique
    check (recipient_token_hash ~ '^[0-9a-f]{64}$'),
  nickname text not null check (char_length(btrim(nickname)) between 1 and 60),
  answers jsonb not null
    check (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) = 10),
  created_at timestamptz not null default now(),
  constraint response_unique_submission unique (quiz_id, submission_id)
);

create index if not exists quizzes_expires_at_idx on public.quizzes (expires_at);
create index if not exists responses_quiz_id_idx on public.responses (quiz_id);

alter table public.quizzes enable row level security;
alter table public.responses enable row level security;

-- Explicitly deny direct browser roles. No public RLS policies are created.
revoke all on table public.quizzes from public, anon, authenticated;
revoke all on table public.responses from public, anon, authenticated;

comment on table public.quizzes is 'Private quiz records. Access through authorized Edge Functions only.';
comment on table public.responses is 'Private recipient responses, deleted with their parent quiz.';
