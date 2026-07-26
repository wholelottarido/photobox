create or replace function public.cleanup_expired_records() returns jsonb language plpgsql security definer set search_path='' as $$
declare rooms_marked int;begin perform public.expire_old_rooms();update public.room_invitations set status='expired' where status='pending' and expires_at<now();get diagnostics rooms_marked=row_count;return jsonb_build_object('invitations_expired',rooms_marked);end$$;
-- The Edge Function deletes private objects first. Enable pg_cron/pg_net in Supabase,
-- store the function URL and secret in Vault, then schedule it as documented in DEPLOYMENT.md.
