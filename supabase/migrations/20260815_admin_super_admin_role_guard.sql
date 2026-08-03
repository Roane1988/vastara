-- ============================================================================
-- HuniOne — Super Admin Role Guard
-- Tujuan: cegah admin biasa mengubah peran (rol) user, termasuk admin lain
--   dan dirinya sendiri, serta mencegah eskalasi privilege.
-- Desain:
--   1. Kolom profiles.is_super_admin (boolean, default false).
--   2. Trigger BEFORE UPDATE of role, is_super_admin pada profiles:
--      - Hanya super admin yang boleh mengubah peran / is_super_admin.
--      - Admin biasa tidak bisa menyentuh peran sama sekali (fokus moderasi).
--      - Super admin terakhir tidak boleh diturunkan (proteksi lockout).
--   3. Seluruh admin yang sudah ada dijadikan super admin (sementara), supaya
--      tidak ada yang terkunci; super admin bisa menurunkan yang lain.
--   4. get_admin_users() mengekspos is_super_admin untuk UI.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Kolom is_super_admin
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

-- Semua admin yang TELAH ADA dijadikan super admin agar tidak ada yang
-- terkunci. Kamu (super admin) bisa menurunkan yang lain via dashboard.
update public.profiles set is_super_admin = true where role = 'admin';

-- ----------------------------------------------------------------------------
-- 2. Trigger guard (di level DB, tidak bisa dilewati dari client)
-- ----------------------------------------------------------------------------
create or replace function public.enforce_role_super_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self_admin   boolean;
  v_self_super   boolean;
  v_role_changed boolean := new.role is distinct from old.role;
  v_super_changed boolean := new.is_super_admin is distinct from old.is_super_admin;
begin
  select true, is_super_admin into v_self_admin, v_self_super
  from public.profiles
  where id = auth.uid();

  -- Pelaku bukan admin: tidak boleh menyentuh peran.
  if not coalesce(v_self_admin, false) then
    if v_role_changed or v_super_changed then
      raise exception 'Hanya admin yang dapat mengelola peran.';
    end if;
    return new;
  end if;

  if coalesce(v_self_super, false) then
    -- Jangan biarkan super admin terakhir diturunkan / kehilangan akses.
    if old.is_super_admin and not new.is_super_admin then
      if (select count(*) from public.profiles where is_super_admin) <= 1 then
        raise exception 'Tidak dapat menurunkan sama admin terakhir.';
      end if;
    end if;
    return new;
  end if;

  -- Admin biasa: tidak boleh mengubah peran apa pun (termasuk dirinya sendiri
  -- dan mengangkat siapa pun menjadi admin). Data lain tetap boleh diedit.
  if v_role_changed or v_super_changed then
    raise exception 'Hanya super admin yang dapat mengubah peran pengguna.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_role_super_guard on public.profiles;
create trigger profiles_role_super_guard
  before update of role, is_super_admin on public.profiles
  for each row
  execute function public.enforce_role_super_guard();

-- ----------------------------------------------------------------------------
-- 3. Ekspos is_super_admin lewat get_admin_users untuk UI
-- ----------------------------------------------------------------------------
drop function if exists public.get_admin_users();

create or replace function public.get_admin_users()
returns table (
  id uuid,
  email text,
  whatsapp text,
  first_name text,
  role text,
  is_super_admin boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.email, p.whatsapp, p.first_name, p.role, p.is_super_admin, p.created_at
  from public.profiles p
  where exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  order by p.created_at desc nulls last;
$$;

revoke execute on function public.get_admin_users() from public;
grant execute on function public.get_admin_users() to authenticated;