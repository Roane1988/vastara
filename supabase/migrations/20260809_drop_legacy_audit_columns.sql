-- ============================================================================
-- HuniOne — Drop legacy audit_logs columns
-- Kolom `action` & `details` adalah sisa schema lama yang NOT NULL tanpa
-- default. Fungsi record_audit menulis ke kolom baru (action_type, target_type,
-- dst), sehingga insert audit selalu gagal dengan NOT NULL constraint violation
-- pada kolom `action`. Kolom ini tidak dipakai oleh kode/aplikasi sama sekali.
-- Migration ini aman dijalankan berulang (idempotent).
-- ============================================================================

alter table public.audit_logs
  drop column if exists action;

alter table public.audit_logs
  drop column if exists details;