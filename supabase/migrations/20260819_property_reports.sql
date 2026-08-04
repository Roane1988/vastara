-- ============================================================================
-- HuniOne — Laporkan Iklan (Property Reports)
-- Alur: pembeli (login) melaporkan listing → masuk antrian admin → admin bisa
--   "Hapus Listing" (delete permanen dari properties, cascade ke related rows)
--   atau "Tutup Laporan" (tidak terbukti). Semua aksi tercatat di audit_logs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabel property_reports
-- ----------------------------------------------------------------------------
create table if not exists public.property_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('penipuan', 'harga', 'terjual', 'duplikat', 'lokasi', 'lainnya')),
  note text default '',
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  unique (property_id, reporter_id)
);

alter table public.property_reports enable row level security;

create index if not exists property_reports_status_idx
  on public.property_reports (status, created_at desc);

-- ----------------------------------------------------------------------------
-- 2. RLS
--    - Pelapor: boleh melihat laporannya sendiri & membuat laporan (login).
--    - Admin: lihat semua, update status, hapus laporan (spam).
-- ----------------------------------------------------------------------------
drop policy if exists "Reporters can view own reports" on public.property_reports;
create policy "Reporters can view own reports"
  on public.property_reports for select
  using (auth.uid() = reporter_id);

drop policy if exists "Admins can view all reports" on public.property_reports;
create policy "Admins can view all reports"
  on public.property_reports for select
  using (public.is_admin());

drop policy if exists "Users can report properties" on public.property_reports;
create policy "Users can report properties"
  on public.property_reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "Admins can update reports" on public.property_reports;
create policy "Admins can update reports"
  on public.property_reports for update
  using (public.is_admin());

drop policy if exists "Admins can delete reports" on public.property_reports;
create policy "Admins can delete reports"
  on public.property_reports for delete
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Audit whitelist: tambah aksi delete_property & dismiss_report
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
        'reject_agent',
        'delete_agent_application',
        'approve_price_change',
        'reject_price_change',
        'delete_property',
        'dismiss_report'
      )) not valid;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. Storage: izinkan admin menghapus foto properti (untuk aksi Hapus Listing)
-- ----------------------------------------------------------------------------
do $$ begin
  create policy "Admins can delete any property image"
    on storage.objects for delete
    using (
      bucket_id = 'PROPERTIES_IMAGE'
      and exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    );
exception when duplicate_object then null;
end $$;
