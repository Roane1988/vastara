-- ============================================================================
-- HuniOne — Newsletter subscribers (berlangganan di footer)
-- Menyimpan email pengguna yang berlangganan newsletter.
-- ============================================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- Siapa pun (anon & authenticated) boleh mendaftar berlangganan.
do $$ begin
  create policy "Anyone can subscribe to newsletter"
    on public.newsletter_subscribers for insert
    with check (true);
exception when duplicate_object then null;
end $$;

-- Hanya admin yang boleh melihat daftar subscribers.
do $$ begin
  create policy "Admins can view newsletter subscribers"
    on public.newsletter_subscribers for select
    using (auth.uid() in (select id from public.profiles where role = 'admin'));
exception when duplicate_object then null;
end $$;

-- Hanya admin yang boleh mengubah data subscriber.
do $$ begin
  create policy "Admins can update newsletter subscribers"
    on public.newsletter_subscribers for update
    using (auth.uid() in (select id from public.profiles where role = 'admin'));
exception when duplicate_object then null;
end $$;

-- Hanya admin yang boleh menghapus subscriber.
do $$ begin
  create policy "Admins can delete newsletter subscribers"
    on public.newsletter_subscribers for delete
    using (auth.uid() in (select id from public.profiles where role = 'admin'));
exception when duplicate_object then null;
end $$;
