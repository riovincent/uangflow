-- Apply once in the UangFlow Supabase SQL editor after review.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,262144,array['image/webp'])
on conflict(id) do nothing;
do $$begin
  if exists(select 1 from storage.buckets where id='avatars' and public) then
    raise exception 'Existing avatars bucket must be reviewed: it is public';
  end if;
end;$$;
create policy "UangFlow own avatar read" on storage.objects for select to authenticated
using(bucket_id='avatars' and name=(select auth.uid())::text||'/profile.webp');
create policy "UangFlow own avatar insert" on storage.objects for insert to authenticated
with check(bucket_id='avatars' and name=(select auth.uid())::text||'/profile.webp');
create policy "UangFlow own avatar update" on storage.objects for update to authenticated
using(bucket_id='avatars' and name=(select auth.uid())::text||'/profile.webp')
with check(bucket_id='avatars' and name=(select auth.uid())::text||'/profile.webp');
create policy "UangFlow own avatar delete" on storage.objects for delete to authenticated
using(bucket_id='avatars' and name=(select auth.uid())::text||'/profile.webp');

create function public.uangflow_delete_own_account(confirmation_email text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  owner_id uuid:=auth.uid();
  token_email text:=auth.jwt()->>'email';
  existing_email text;
begin
  if owner_id is null then raise exception 'authentication_required'; end if;
  select email into existing_email from auth.users where id=owner_id;
  if lower(trim(confirmation_email)) is distinct from lower(coalesce(existing_email,token_email)) then
    raise exception 'email_confirmation_mismatch';
  end if;
  -- Expired/replayed sessions cannot initiate deletion; a deleted user's JWT can retry D1 cleanup.
  if existing_email is not null and not exists(
    select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) method
    where method->>'method' in ('oauth','password','otp','totp','webauthn')
      and (method->>'timestamp')::numeric between extract(epoch from now())-300 and extract(epoch from now())+30
  ) then raise exception 'recent_login_required'; end if;
  -- Physical files must be removed via Storage, not by deleting storage.objects rows.
  if exists(select 1 from storage.objects where bucket_id='avatars' and name=owner_id::text||'/profile.webp') then
    raise exception 'remove_avatar_first';
  end if;
  delete from auth.users where id=owner_id;
  return jsonb_build_object('user_id',owner_id);
end;
$$;
revoke all on function public.uangflow_delete_own_account(text) from public,anon;
grant execute on function public.uangflow_delete_own_account(text) to authenticated;
commit;
