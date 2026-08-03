-- ============================================================================
-- HuniOne — Admin can delete agent applications
-- Tujuan:
--   1. Tambah policy DELETE untuk admin pada agent_applications agar aplikasi
--      yang menggantung (mis. diajukan admin sendiri) bisa dihapus.
--   2. Tambah action_type `delete_agent_application` ke whitelist audit_logs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Policy DELETE: hanya admin yang boleh menghapus pengajuan agent
-- ----------------------------------------------------------------------------
drop policy if exists "Admins can delete agent applications" on public.agent_applications;

do $$ begin
  create policy "Admins can delete agent applications"
    on public.agent_applications for delete
    using (exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ));
exception when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Audit whitelist: izinkan action `delete_agent_application`
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
        'delete_agent_application'
      )) not valid;
  end if;
end $$;
