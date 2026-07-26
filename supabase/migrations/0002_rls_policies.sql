create or replace function public.is_room_member(room_uuid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.room_participants p where p.room_id=room_uuid and p.user_id=auth.uid() and p.left_at is null)
$$;
create or replace function public.is_room_host(room_uuid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.room_participants p where p.room_id=room_uuid and p.user_id=auth.uid() and p.role='host' and p.left_at is null)
$$;
revoke all on function public.is_room_member(uuid),public.is_room_host(uuid) from public;grant execute on function public.is_room_member(uuid),public.is_room_host(uuid) to authenticated;

create or replace function public.accept_room_invitation(p_token_hash text,p_user_id uuid,p_display_name text) returns jsonb
language plpgsql security definer set search_path='' as $$declare i public.room_invitations;r public.photobox_rooms;active_count int;
begin
 if p_user_id<>auth.uid() then raise exception 'UNAUTHORIZED';end if;
 select * into i from public.room_invitations where token_hash=p_token_hash for update;
 if not found or i.status<>'pending' or i.expires_at<=now() then raise exception 'INVITATION_INVALID';end if;
 select * into r from public.photobox_rooms where id=i.room_id for update;
 if r.host_user_id=p_user_id then raise exception 'HOST_CANNOT_ACCEPT';end if;
 select count(*) into active_count from public.room_participants where room_id=r.id and left_at is null;
 if active_count>=2 then raise exception 'ROOM_FULL';end if;
 insert into public.room_participants(room_id,user_id,role,display_name,connection_status) values(r.id,p_user_id,'guest',btrim(p_display_name),'connecting')
 on conflict(room_id,user_id) do update set left_at=null,display_name=excluded.display_name,connection_status='connecting';
 update public.room_invitations set status='accepted',accepted_by_user_id=p_user_id,accepted_at=now() where id=i.id;
 return jsonb_build_object('roomId',r.id,'code',r.code);
end$$;
revoke all on function public.accept_room_invitation(text,uuid,text) from public;grant execute on function public.accept_room_invitation(text,uuid,text) to authenticated;

create or replace function public.start_photo_session(p_room_id uuid,p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.photobox_rooms;n int;s public.photo_sessions;e public.capture_events;
begin
 if p_user_id<>auth.uid() then raise exception 'UNAUTHORIZED';end if;select * into r from public.photobox_rooms where id=p_room_id for update;
 if r.host_user_id<>p_user_id then raise exception 'NOT_HOST';end if;
 if r.status='capturing' then select * into s from public.photo_sessions where room_id=r.id order by sequence_number desc limit 1;return jsonb_build_object('session_id',s.id,'idempotent',true);end if;
 if r.status not in ('waiting','ready') then raise exception 'INVALID_ROOM_STATE';end if;
 select count(*) into n from public.room_participants where room_id=r.id and left_at is null and is_ready and connection_status='connected';if n<>2 then raise exception 'NOT_READY';end if;
 select coalesce(max(sequence_number),0)+1 into n from public.photo_sessions where room_id=r.id;
 insert into public.photo_sessions(room_id,sequence_number,status,started_at) values(r.id,n,'countdown',now()) returning * into s;
 insert into public.capture_events(session_id,shot_number,capture_at,created_by_user_id) values(s.id,1,now()+(r.countdown_seconds||' seconds')::interval,p_user_id) returning * into e;
 update public.photobox_rooms set status='capturing',started_at=now() where id=r.id;
 return jsonb_build_object('session_id',s.id,'capture_at',e.capture_at,'idempotent',false);
end$$;
revoke all on function public.start_photo_session(uuid,uuid) from public;grant execute on function public.start_photo_session(uuid,uuid) to authenticated;

create or replace function public.retake_photo_session(p_room_id uuid,p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.photobox_rooms;n int;s public.photo_sessions;e public.capture_events;
begin
 if p_user_id<>auth.uid() then raise exception 'UNAUTHORIZED';end if;select * into r from public.photobox_rooms where id=p_room_id for update;
 if not exists(select 1 from public.room_participants where room_id=r.id and user_id=p_user_id and left_at is null) then raise exception 'NOT_MEMBER';end if;
 if r.status not in('completed','processing') then raise exception 'INVALID_ROOM_STATE';end if;
 select coalesce(max(sequence_number),0)+1 into n from public.photo_sessions where room_id=r.id;
 insert into public.photo_sessions(room_id,sequence_number,status,started_at) values(r.id,n,'countdown',now()) returning * into s;
 insert into public.capture_events(session_id,shot_number,capture_at,created_by_user_id) values(s.id,1,now()+(r.countdown_seconds||' seconds')::interval,p_user_id) returning * into e;
 update public.room_participants set is_ready=true where room_id=r.id and left_at is null;
 update public.photobox_rooms set status='capturing',completed_at=null where id=r.id;
 return jsonb_build_object('session_id',s.id,'capture_at',e.capture_at);
end$$;
revoke all on function public.retake_photo_session(uuid,uuid) from public;grant execute on function public.retake_photo_session(uuid,uuid) to authenticated;

create or replace function public.expire_old_rooms() returns integer language plpgsql security definer set search_path='' as $$declare n int;begin update public.photobox_rooms set status='expired' where expires_at<now() and status not in('completed','cancelled','expired');get diagnostics n=row_count;update public.room_invitations set status='expired' where expires_at<now() and status='pending';return n;end$$;

alter table public.profiles enable row level security;alter table public.photobox_themes enable row level security;alter table public.photobox_rooms enable row level security;alter table public.room_invitations enable row level security;alter table public.room_participants enable row level security;alter table public.photo_sessions enable row level security;alter table public.capture_events enable row level security;alter table public.photo_shots enable row level security;alter table public.photobox_results enable row level security;alter table public.audit_events enable row level security;
create policy "own profile select" on public.profiles for select using(id=auth.uid());create policy "own profile update" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "active themes read" on public.photobox_themes for select to authenticated using(is_active);
create policy "members read rooms" on public.photobox_rooms for select to authenticated using(host_user_id=auth.uid() or public.is_room_member(id));
create policy "members read participants" on public.room_participants for select to authenticated using(public.is_room_member(room_id));
create policy "members read sessions" on public.photo_sessions for select to authenticated using(public.is_room_member(room_id));
create policy "members read capture events" on public.capture_events for select to authenticated using(public.is_room_member((select room_id from public.photo_sessions where id=session_id)));
create policy "own room shots read" on public.photo_shots for select to authenticated using(public.is_room_member((select room_id from public.photo_sessions where id=session_id)));
create policy "members read results" on public.photobox_results for select to authenticated using(public.is_room_member((select room_id from public.photo_sessions where id=session_id)));
