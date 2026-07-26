create extension if not exists pgcrypto;

create type public.room_status as enum ('created','waiting','ready','capturing','processing','completed','cancelled','expired');
create type public.invitation_status as enum ('pending','accepted','declined','expired');
create type public.participant_role as enum ('host','guest');
create type public.connection_status as enum ('offline','connecting','connected','reconnecting','disconnected');
create type public.photo_session_status as enum ('waiting','countdown','capturing','uploading','processing','completed','failed','cancelled');
create type public.capture_event_status as enum ('scheduled','triggered','completed','failed');
create type public.photo_shot_status as enum ('pending','uploading','uploaded','failed');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name varchar(50) check (display_name is null or (char_length(btrim(display_name)) between 1 and 50)),
 avatar_seed varchar(100), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.photobox_themes (
 id uuid primary key default gen_random_uuid(), slug varchar(50) unique not null, name varchar(100) not null, description text,
 preview_path text, configuration jsonb not null default '{}'::jsonb, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.photobox_rooms (
 id uuid primary key default gen_random_uuid(), code varchar(6) unique not null check(code ~ '^[A-HJ-NP-Z2-9]{6}$'),
 host_user_id uuid not null references auth.users(id), theme_id uuid references public.photobox_themes(id), status public.room_status not null default 'created',
 total_shots smallint not null default 4 check(total_shots between 1 and 8), countdown_seconds smallint not null default 3 check(countdown_seconds between 1 and 10),
 invitation_message varchar(500), expires_at timestamptz not null, started_at timestamptz, completed_at timestamptz, cancelled_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(expires_at > created_at)
);
create table public.room_invitations (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.photobox_rooms(id) on delete cascade,
 token_hash text unique not null, status public.invitation_status not null default 'pending', invited_display_name varchar(50),
 accepted_by_user_id uuid references auth.users(id), accepted_at timestamptz, declined_at timestamptz, expires_at timestamptz not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.room_participants (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.photobox_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, role public.participant_role not null, display_name varchar(50) not null check(char_length(btrim(display_name)) between 1 and 50),
 is_ready boolean not null default false, connection_status public.connection_status not null default 'offline', joined_at timestamptz not null default now(),
 last_seen_at timestamptz, left_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(room_id,user_id)
);
create unique index one_active_role_per_room on public.room_participants(room_id,role) where left_at is null;
create table public.photo_sessions (
 id uuid primary key default gen_random_uuid(), room_id uuid not null references public.photobox_rooms(id) on delete cascade,
 sequence_number integer not null default 1, status public.photo_session_status not null default 'waiting', current_shot smallint not null default 0,
 started_at timestamptz, completed_at timestamptz, failed_at timestamptz, failure_reason text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(room_id,sequence_number)
);
create table public.capture_events (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.photo_sessions(id) on delete cascade,
 shot_number smallint not null check(shot_number between 1 and 8), capture_at timestamptz not null, status public.capture_event_status not null default 'scheduled',
 created_by_user_id uuid not null references auth.users(id), triggered_at timestamptz, completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(session_id,shot_number)
);
create table public.photo_shots (
 id uuid primary key default gen_random_uuid(), session_id uuid not null references public.photo_sessions(id) on delete cascade,
 participant_id uuid not null references public.room_participants(id) on delete cascade, shot_number smallint not null check(shot_number between 1 and 8),
 status public.photo_shot_status not null default 'pending', storage_path text, mime_type varchar(50) check(mime_type is null or mime_type in ('image/webp','image/jpeg')),
 width integer check(width is null or width>0), height integer check(height is null or height>0), size_bytes bigint check(size_bytes is null or size_bytes between 1 and 6291456),
 client_captured_at timestamptz, server_received_at timestamptz, checksum_sha256 text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(session_id,participant_id,shot_number)
);
create table public.photobox_results (
 id uuid primary key default gen_random_uuid(), session_id uuid unique not null references public.photo_sessions(id) on delete cascade,
 theme_id uuid references public.photobox_themes(id), storage_path text not null, thumbnail_path text, width integer not null check(width>0), height integer not null check(height>0),
 mime_type varchar(50) not null default 'image/jpeg', size_bytes bigint, expires_at timestamptz not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), room_id uuid references public.photobox_rooms(id) on delete set null,
 user_id uuid references auth.users(id) on delete set null, event_type varchar(100) not null, metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create index rooms_host_idx on public.photobox_rooms(host_user_id); create index rooms_status_idx on public.photobox_rooms(status); create index rooms_expires_idx on public.photobox_rooms(expires_at);
create index invitations_room_idx on public.room_invitations(room_id); create index invitations_status_idx on public.room_invitations(status); create index invitations_expires_idx on public.room_invitations(expires_at);
create index participants_room_idx on public.room_participants(room_id); create index participants_user_idx on public.room_participants(user_id); create index participants_ready_idx on public.room_participants(room_id,is_ready);
create index sessions_room_idx on public.photo_sessions(room_id); create index sessions_status_idx on public.photo_sessions(status);
create index events_capture_idx on public.capture_events(capture_at); create index events_status_idx on public.capture_events(status);
create index shots_session_shot_idx on public.photo_shots(session_id,shot_number); create index shots_participant_idx on public.photo_shots(participant_id); create index shots_status_idx on public.photo_shots(status);
create index results_expires_idx on public.photobox_results(expires_at);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now();return new;end$$;
do $$declare t text;begin foreach t in array array['profiles','photobox_themes','photobox_rooms','room_invitations','room_participants','photo_sessions','capture_events','photo_shots','photobox_results'] loop execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);end loop;end$$;
create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,avatar_seed) values(new.id,encode(gen_random_bytes(8),'hex')) on conflict do nothing;return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();
