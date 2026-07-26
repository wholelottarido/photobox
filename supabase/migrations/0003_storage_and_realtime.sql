insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('photobox-raw','photobox-raw',false,6291456,array['image/webp','image/jpeg']),
 ('photobox-results','photobox-results',false,12582912,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

alter table public.photobox_rooms replica identity full;alter table public.room_participants replica identity full;alter table public.photo_sessions replica identity full;alter table public.capture_events replica identity full;alter table public.photo_shots replica identity full;alter table public.photobox_results replica identity full;
do $$begin
 alter publication supabase_realtime add table public.photobox_rooms,public.room_participants,public.photo_sessions,public.capture_events,public.photo_shots,public.photobox_results;
exception when duplicate_object then null;end$$;
