create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role public.app_role not null, unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create or replace function public.has_role(_user_id uuid, _role public.app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create or replace function public.handle_new_user_role() returns trigger language plpgsql security definer set search_path = public as $$ begin
 insert into public.user_roles(user_id, role) values(new.id, 'user') on conflict do nothing;
 if new.email_confirmed_at is not null and lower(new.email) = 'nomarkdownloader@gmail.com' then insert into public.user_roles(user_id, role) values(new.id, 'admin') on conflict do nothing; end if;
 return new; end; $$;
create trigger on_auth_user_created_role after insert or update of email_confirmed_at on auth.users for each row execute function public.handle_new_user_role();
create table public.videos (
 id text primary key, title text not null, title_ar text not null default '', description text not null default '', category text not null default 'classic', thumbnail text not null default '', embed_url text not null, views integer not null default 0, likes integer not null default 0, duration text not null default '0:00', status text not null default 'published' check(status in ('published','pending')), quality text, quality_source text not null default 'unknown', created_at timestamptz not null default now()
);
grant select on public.videos to anon;
grant select,insert,update,delete on public.videos to authenticated;
grant all on public.videos to service_role;
alter table public.videos enable row level security;
create policy "Public reads published" on public.videos for select to anon using(status='published');
create policy "Members read published or admin pending" on public.videos for select to authenticated using(status='published' or public.has_role(auth.uid(),'admin'));
create policy "Admins insert" on public.videos for insert to authenticated with check(public.has_role(auth.uid(),'admin'));
create policy "Admins update" on public.videos for update to authenticated using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
create policy "Admins delete" on public.videos for delete to authenticated using(public.has_role(auth.uid(),'admin'));
create index videos_created_at_idx on public.videos(created_at desc);
create table public.migration_identities (original_user_id text primary key, email text not null unique, auth_user_id uuid unique, profile jsonb not null default '{}', claimed_at timestamptz);
grant all on public.migration_identities to service_role;
alter table public.migration_identities enable row level security;
create or replace function public.claim_migrated_identity() returns trigger language plpgsql security definer set search_path = public as $$ begin
 if new.email_confirmed_at is not null then update public.migration_identities set auth_user_id=new.id, claimed_at=now() where lower(email)=lower(new.email) and (auth_user_id is null or auth_user_id=new.id); end if;
 return new; end; $$;
create trigger on_verified_migration_identity after insert or update of email_confirmed_at on auth.users for each row execute function public.claim_migrated_identity();