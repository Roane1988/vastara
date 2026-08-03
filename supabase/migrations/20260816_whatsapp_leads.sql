-- ============================================================================
-- HuniOne — WhatsApp leads (klik "Hubungi via WhatsApp" di properti)
-- Mencatat minat pembeli terhadap properti untuk dilihat seller/admin.
-- ============================================================================

create table if not exists public.whatsapp_leads (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  seller_id uuid not null references public.profiles(id),
  buyer_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_leads_property_idx
  on public.whatsapp_leads (property_id, created_at desc);

alter table public.whatsapp_leads enable row level security;

do $$ begin
  create policy "Anyone can create leads"
    on public.whatsapp_leads for insert
    with check (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Sellers can view leads for own properties"
    on public.whatsapp_leads for select
    using (exists (
      select 1 from public.properties p
      where p.id = property_id and p.seller_id = auth.uid()
    ));
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Admins can view all leads"
    on public.whatsapp_leads for select
    using (auth.uid() in (select id from public.profiles where role = 'admin'));
exception when duplicate_object then null;
end $$;