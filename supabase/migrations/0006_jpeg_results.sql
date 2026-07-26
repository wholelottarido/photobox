update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'photobox-results';

alter table public.photobox_results
  alter column mime_type set default 'image/jpeg';
