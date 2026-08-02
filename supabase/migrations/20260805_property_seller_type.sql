-- ============================================================================
-- HuniOne — Seller Type & Delegation
-- Tujuan:
--   1. seller_type membedakan "siapa yang memasang iklan" (owner/agent/developer)
--      tanpa mengubah role akun.
--   2. owner_id / agent_id untuk skema delegasi: pemilik + agent pengelola.
--   3. Trigger memastikan hanya agen/pengembang terverifikasi yang bisa
--      memasang iklan atas nama peran tersebut.
-- ============================================================================

alter table public.properties
  add column if not exists seller_type text default 'owner',
  add column if not exists agent_id uuid references public.profiles(id),
  add column if not exists owner_id uuid references public.profiles(id);

alter table public.properties
  drop constraint if exists properties_seller_type_check;

alter table public.properties
  add constraint properties_seller_type_check
  check (seller_type in ('owner', 'agent', 'developer')) not valid;

-- ----------------------------------------------------------------------------
-- Enforce seller_type terhadap role akun penjual.
-- seller_id selalu = auth.uid() (dijamin RLS properties insert policy),
-- jadi kita cek role dari profil si penjual.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_property_seller_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if new.seller_id is null then
    return new;
  end if;

  select role into v_role
  from public.profiles
  where id = new.seller_id;

  if new.seller_type = 'agent' and v_role is distinct from 'agent' then
    raise exception 'Hanya agen terverifikasi yang dapat memasang iklan sebagai agen.';
  end if;

  if new.seller_type = 'developer' and v_role is distinct from 'developer' then
    raise exception 'Hanya pengembang yang dapat memasang iklan sebagai pengembang.';
  end if;

  return new;
end;
$$;

drop trigger if exists properties_seller_type_trg on public.properties;
create trigger properties_seller_type_trg
  before insert or update on public.properties
  for each row
  execute function public.enforce_property_seller_type();
