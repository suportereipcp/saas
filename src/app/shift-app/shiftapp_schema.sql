-- ==============================================================================
-- SCHEMA: shiftapp
-- SETUP SCRIPT FOR LOCAL SUPABASE
-- ==============================================================================

-- 1. Create Schema
create schema if not exists shiftapp;

-- GRANT PERMISSIONS (Fixes 42501 permission denied)
grant usage on schema shiftapp to anon, authenticated, service_role;
grant all on all tables in schema shiftapp to anon, authenticated, service_role;
grant all on all sequences in schema shiftapp to anon, authenticated, service_role;
grant execute on all functions in schema shiftapp to anon, authenticated, service_role;
alter default privileges in schema shiftapp grant all on tables to anon, authenticated, service_role;
alter default privileges in schema shiftapp grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema shiftapp grant execute on functions to anon, authenticated, service_role;


-- 2. Utility Functions (Trigger to update updated_at)
create or replace function shiftapp.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 3. Enum Types (Optional, using Text for flexibility is often easier with Supabase clients, but Enum is safer)
-- We will visualize Status as Text to match the frontend string values directly or strictly map them.
-- Frontend uses: 'AVALIAÇÃO DE MUDANÇA', 'EM DESENVOLVIMENTO', etc.

-- 4. Tables

-- TABLE: TICKETS
create table if not exists shiftapp.tickets (
  id text primary key default ('TK-' || to_char(now(), 'YYYY') || '-' || lpad(floor(random() * 10000)::text, 4, '0')), -- Simple ID generation default, explicit gen preferred
  product_code text not null,
  product_name text not null,
  product_image text,
  description text,
  status text not null default 'AVALIAÇÃO DE MUDANÇA',
  
  -- Roles / People
  requester_name text not null,
  tracking_responsible text,
  changer_name text,
  validation_responsible text,
  superior_approver text,
  approver_name text,
  
  -- Arrays/JSON
  approvers text[], -- Array of names
  
  -- Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  development_started_at timestamptz,
  validation_sent_at timestamptz,
  finalized_at timestamptz
);

-- Trigger for tickets updated_at
drop trigger if exists on_tickets_updated on shiftapp.tickets;
create trigger on_tickets_updated
  before update on shiftapp.tickets
  for each row execute procedure shiftapp.handle_updated_at();

-- TABLE: SUBTASKS (Tarefas)
create table if not exists shiftapp.subtasks (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references shiftapp.tickets(id) on delete cascade,
  description text not null,
  assigned_to text,
  completed boolean default false,
  completion_notes text,
  created_at timestamptz default now()
);

-- TABLE: ATTACHMENTS (Arquivos)
create table if not exists shiftapp.attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references shiftapp.tickets(id) on delete cascade,
  name text not null,
  type text not null, -- 'IMAGE' or 'DOCUMENT'
  url text not null,
  stage text, -- Stage where it was uploaded
  uploaded_at timestamptz default now()
);

-- TABLE: HISTORY (Histórico)
create table if not exists shiftapp.history (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references shiftapp.tickets(id) on delete cascade,
  action text not null,
  "user" text not null, -- "user" is a specific reserved keyword in some contexts, quoting for safety
  details text,
  timestamp timestamptz default now()
);

-- 5. Helper Function for Ticket ID Generation
-- Replaces the random ID default above with a proper sequence-based ID if desired.
create sequence if not exists shiftapp.ticket_id_seq;

create or replace function shiftapp.generate_ticket_id()
returns trigger as $$
begin
  -- Example format: TK-2024-001
  new.id := 'TK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('shiftapp.ticket_id_seq')::text, 4, '0');
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_ticket_insert_id on shiftapp.tickets;
create trigger on_ticket_insert_id
  before insert on shiftapp.tickets
  for each row
  when (new.id is null) -- Only generate if not provided
  execute procedure shiftapp.generate_ticket_id();


-- 6. Storage Bucket Setup
-- Note: 'storage' schema usually exists in Supabase.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shiftapp-files', 
  'shiftapp-files', 
  true, 
  10485760, -- 10MB limit
  '{image/*, application/pdf}'
) on conflict (id) do nothing;

-- Storage Policies (RLS)
-- Allow public access for now as requested for the project context (simplified)

drop policy if exists "Public Access ShiftApp" on storage.objects;
create policy "Public Access ShiftApp"
  on storage.objects for select
  using ( bucket_id = 'shiftapp-files' );

drop policy if exists "Public Insert ShiftApp" on storage.objects;
create policy "Public Insert ShiftApp"
  on storage.objects for insert
  with check ( bucket_id = 'shiftapp-files' );
  
drop policy if exists "Public Update ShiftApp" on storage.objects;
create policy "Public Update ShiftApp"
  on storage.objects for update
  using ( bucket_id = 'shiftapp-files' ); 

-- 7. Helper to Fetch Product Description from external Datasul Schema (New)
create or replace function shiftapp.get_datasul_item_desc(p_code text)
returns text
language plpgsql
security definer
as $$
declare
  v_desc text;
begin
  -- Using dynamic SQL to query datasul schema.
  -- Added TRIM and ILIKE for more robust matching (case-insensitive, ignore padding).
  -- Removed exception block to allow errors (like "table not found") to bubble up to the client for debugging.
  
  execute format('select "desc_item" from datasul.item where trim("it_codigo") ilike trim(%L)', p_code)
  into v_desc;
  
  return v_desc;
end;
$$;

-- ==============================================================================
-- END OF SCRIPT
-- ==============================================================================
