-- ============================================================================
-- HuniOne — Audit Log Security Hardening
-- Tujuan:
--   1. Hentikan insert audit langsung dari client (RLS) — cegah entri palsu.
--   2. Semua entri dicatat lewat RPC security definer `record_audit` yang
--      me-resolve admin_id/admin_name dari auth + menangkap IP request.
--   3. Kolom konteks (ip_address, user_agent), index, dan whitelist action.
--
-- Migration ini self-contained: membuat tabel bila belum ada, dan
-- menambahkan kolom bila belum ada, sehingga aman dijalankan berapa kali pun.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Pastikan tabel audit_logs ada dengan schema lengkap
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) not null,
  admin_name text,
  action_type text not null,
  target_type text not null,
  target_id text,
  target_detail jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

alter table public.audit_logs
  add column if not exists action_type text,
  add column if not exists ip_address text,
  add column if not exists user_agent text;

alter table public.audit_logs enable row level security;

-- ----------------------------------------------------------------------------
-- 2. Blokir insert langsung dari client (RLS)
--    Entri hanya boleh dibuat lewat fungsi security definer di bawah.
-- ----------------------------------------------------------------------------
drop policy if exists "Authenticated can insert audit_logs" on public.audit_logs;

do $$ begin
  create policy "Admins can read audit_logs"
    on public.audit_logs for select
    using (auth.uid() in (select id from public.profiles where role = 'admin'));
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- 3. Index performa (dengan guard kolom)
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'action_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'created_at'
  ) then
    create index if not exists audit_logs_action_created_idx
      on public.audit_logs (action_type, created_at desc);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'admin_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'created_at'
  ) then
    create index if not exists audit_logs_admin_created_idx
      on public.audit_logs (admin_id, created_at desc);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Whitelist action_type (cegah typo / tipe liar)
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'action_type'
  ) then
    alter table public.audit_logs
      drop constraint if exists audit_logs_action_type_check;
    alter table public.audit_logs
      add constraint audit_logs_action_type_check
      check (action_type in (
        'verify_property',
        'start_review',
        'reject_property',
        'restore_property',
        'change_role',
        'approve_agent',
        'reject_agent'
      )) not valid;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 5. RPC `record_audit` — satu-satunya jalan mencatat audit
--    security definer → bypass RLS; admin identity dari auth.uid(),
--    bukan dari input client.
-- ----------------------------------------------------------------------------
create or replace function public.record_audit(
  p_action_type text,
  p_target_type text,
  p_target_id text default null,
  p_target_detail jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_admin_name text;
  v_ip text;
  v_user_agent text;
  v_headers jsonb;
begin
  -- Hanya admin yang boleh mencatat audit.
  if v_admin_id is null
     or not exists (select 1 from public.profiles where id = v_admin_id and role = 'admin') then
    raise exception 'Akses ditolak: hanya admin yang dapat mencatat audit.';
  end if;

  select coalesce(first_name, email, 'Admin') into v_admin_name
  from public.profiles
  where id = v_admin_id;

  -- IP / user-agent dari header request (jika tersedia di Supabase).
  begin
    v_headers := current_setting('request.headers', true)::jsonb;
    v_ip := coalesce(
      nullif(v_headers ->> 'x-forwarded-for', ''),
      nullif(v_headers ->> 'x-real-ip', ''),
      null
    );
    v_user_agent := nullif(v_headers ->> 'user-agent', '');
  exception when others then
    v_ip := null;
    v_user_agent := null;
  end;

  insert into public.audit_logs (
    admin_id, admin_name, action_type,
    target_type, target_id, target_detail,
    ip_address, user_agent
  ) values (
    v_admin_id, v_admin_name, p_action_type,
    p_target_type, p_target_id, p_target_detail,
    v_ip, v_user_agent
  );
end;
$$;

grant execute on function public.record_audit(text, text, text, jsonb) to authenticated;

revoke insert on public.audit_logs from authenticated, anon;
revoke update, delete on public.audit_logs from authenticated, anon;
