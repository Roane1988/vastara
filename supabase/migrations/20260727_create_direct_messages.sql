create table if not exists direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) not null,
  receiver_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamptz default now()
);

alter table direct_messages enable row level security;

do $$ begin
  create policy "Users can read their own messages"
    on direct_messages for select
    using (auth.uid() = sender_id or auth.uid() = receiver_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can send messages"
    on direct_messages for insert
    with check (auth.uid() = sender_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete their own messages"
    on direct_messages for delete
    using (auth.uid() = sender_id);
exception when duplicate_object then null;
end $$;

-- Enable Realtime for the table (requires manual toggle in Supabase dashboard)
-- Go to Database > Replication > enable 'direct_messages' for INSERT
