-- ============================================================================
-- Meridian — 0006 account deletion
--
-- Deleting an account has to remove the auth user, which is what every foreign
-- key cascades from. A signed-in client holds only the anon key and cannot
-- touch auth.users directly, so this is done through a SECURITY DEFINER
-- function that deletes exactly one row: the caller's own.
--
-- The function takes no arguments on purpose. There is no parameter to
-- tamper with — the row it removes is whichever user auth.uid() resolves to.
-- ============================================================================

create or replace function public.meridian_delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;

  -- Everything the user owns cascades from this one delete.
  delete from auth.users where id = caller;
end;
$$;

comment on function public.meridian_delete_account() is
  'Deletes the calling user and, by cascade, every record they own.';

revoke all on function public.meridian_delete_account() from public;
revoke all on function public.meridian_delete_account() from anon;
grant execute on function public.meridian_delete_account() to authenticated;
