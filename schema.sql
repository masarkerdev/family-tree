-- ==========================================================
-- সরকার বংশ — ডাটাবেস (নতুন Supabase প্রজেক্টে একবার Run করুন)
-- Supabase > SQL Editor > New query > পুরোটা পেস্ট > Run
-- এরপর seed.sql Run করুন (বংশের প্রথম পুরুষ ও তিন সন্তান)
-- ==========================================================

create extension if not exists pgcrypto;

-- লগইন করা মানুষের ভূমিকা
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz default now()
);

-- বংশের প্রতিটি মানুষ (জীবিত, প্রয়াত, ভবিষ্যতের শিশু, জীবনসঙ্গী, মামাবাড়ির লোক)
create table members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nick_name text,
  gender text check (gender in ('male','female')),
  in_lineage boolean not null default true,   -- false = বাইরের পরিবারের (জীবনসঙ্গী, নানাবাড়ি)
  father_id uuid references members(id) on delete set null,
  mother_id uuid references members(id) on delete set null,
  sort_order int not null default 0,           -- ভাই-বোনের ক্রম (বড় থেকে ছোট)
  birth_year int, birth_date date,             -- শুধু সাল জানা থাকলেও চলবে
  is_deceased boolean not null default false,
  death_year int, death_date date,
  occupation text, address text, bio text, photo_url text,
  dua_count int not null default 0,
  user_id uuid unique references auth.users on delete set null,
  status text not null default 'pending' check (status in ('pending','approved')),
  created_by uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index members_father_idx on members(father_id);
create index members_mother_idx on members(mother_id);

-- বিয়ে (একাধিক বিয়েও রাখা যায়)
create table marriages (
  id uuid primary key default gen_random_uuid(),
  husband_id uuid not null references members(id) on delete cascade,
  wife_id uuid not null references members(id) on delete cascade,
  married_year int, note text,
  unique (husband_id, wife_id)
);

-- ফোন নম্বর: শুধু লগইন করা সদস্যরা দেখবেন
create table member_private (
  member_id uuid primary key references members(id) on delete cascade,
  phone text
);

-- "এটা আমার পেইজ" দাবি — এডমিন অনুমোদন দিলে একাউন্ট যুক্ত হয়
create table claims (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now(),
  unique (member_id, user_id)
);

-- হোম পেইজের লেখা, আজকের আমল, প্রবীণদের কথা
create table site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- প্রতিটি বদল/মোছার ইতিহাস (ভুল হলে ফিরিয়ে আনা যায়)
create table members_history (
  id bigserial primary key,
  member_id uuid,
  action text,
  old_row jsonb,
  changed_by uuid default auth.uid(),
  changed_at timestamptz default now()
);

-- ---------- ফাংশন ও ট্রিগার ----------
create function is_admin() returns boolean language sql stable security definer set search_path = public as
$$ select exists(select 1 from profiles where id = auth.uid() and role = 'admin') $$;

create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as
$$ begin insert into profiles(id, email) values (new.id, new.email); return new; end $$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();

-- সাধারণ সদস্য বংশের কাঠামো (বাবা, মা, অনুমোদন, একাউন্ট) বদলাতে পারবেন না
create function guard_members() returns trigger language plpgsql as
$$ begin
  if not is_admin() then
    new.father_id := old.father_id; new.mother_id := old.mother_id;
    new.status := old.status; new.user_id := old.user_id;
    new.in_lineage := old.in_lineage; new.sort_order := old.sort_order;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger guard_members before update on members for each row execute function guard_members();

create function log_member_change() returns trigger language plpgsql security definer set search_path = public as
$$ begin
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'dua_count' - 'updated_at') = (to_jsonb(old) - 'dua_count' - 'updated_at') then
    return null;  -- শুধু দোয়ার সংখ্যা বদলালে ইতিহাসে রাখার দরকার নেই
  end if;
  insert into members_history(member_id, action, old_row) values (old.id, tg_op, to_jsonb(old));
  return null;
end $$;
create trigger log_members after update or delete on members for each row execute function log_member_change();

-- স্মরণ পেইজের "দোয়া করলাম" বোতাম (লগইন ছাড়াও চলে)
create function add_dua(mid uuid) returns void language sql security definer set search_path = public as
$$ update members set dua_count = dua_count + 1 where id = mid and status = 'approved' and is_deceased $$;
grant execute on function add_dua(uuid) to anon, authenticated;

-- ---------- নিরাপত্তা (RLS) ----------
alter table profiles enable row level security;
alter table members enable row level security;
alter table marriages enable row level security;
alter table member_private enable row level security;
alter table claims enable row level security;
alter table site_content enable row level security;
alter table members_history enable row level security;

create policy "profiles read" on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles admin update" on profiles for update using (is_admin());

create policy "members read" on members for select
  using (status = 'approved' or is_admin() or user_id = auth.uid() or created_by = auth.uid());
create policy "members insert" on members for insert to authenticated
  with check (is_admin() or (status = 'pending' and (user_id is null or user_id = auth.uid())));
create policy "members update" on members for update to authenticated
  using (is_admin() or user_id = auth.uid());
create policy "members delete" on members for delete using (is_admin());

create policy "marriages read" on marriages for select using (true);
create policy "marriages admin write" on marriages for all using (is_admin()) with check (is_admin());

create policy "private read" on member_private for select to authenticated using (true);
create policy "private write" on member_private for all to authenticated
  using (is_admin() or exists(select 1 from members m where m.id = member_id and m.user_id = auth.uid()))
  with check (is_admin() or exists(select 1 from members m where m.id = member_id and m.user_id = auth.uid()));

create policy "claims read" on claims for select using (user_id = auth.uid() or is_admin());
create policy "claims insert" on claims for insert to authenticated with check (user_id = auth.uid());
create policy "claims admin update" on claims for update using (is_admin());
create policy "claims admin delete" on claims for delete using (is_admin());

create policy "content read" on site_content for select using (true);
create policy "content admin write" on site_content for all using (is_admin()) with check (is_admin());

create policy "history admin read" on members_history for select using (is_admin());

-- ---------- ছবি রাখার জায়গা ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
create policy "photos read" on storage.objects for select using (bucket_id = 'photos');
create policy "photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'photos');
create policy "photos admin delete" on storage.objects for delete using (bucket_id = 'photos' and is_admin());

-- ---------- হোম পেইজের শুরুর লেখা (পরে এডমিন পেইজ থেকে বদলানো যাবে) ----------
insert into site_content(key, value) values
('about', to_jsonb('কুমিল্লা জেলার ব্রাহ্মণপাড়া উপজেলার অলুয়া গ্রামের সরকার বংশের সব সদস্যকে এক জায়গায় আনার জন্য এই সাইট। এখানে আমরা পূর্বপুরুষদের চিনব, একে অপরের খোঁজ রাখব, আর নতুন প্রজন্মকে শিকড়ের সাথে পরিচয় করিয়ে দেব।'::text)),
('amal', '["আজ অন্তত একজন বয়স্ক আত্মীয়কে ফোন করে খোঁজ নিন।","আমাদের পূর্বপুরুষদের মাগফিরাতের জন্য দোয়া করুন।","বাবা-মায়ের জন্য দোয়া করুন।","আজ সামান্য হলেও কিছু দান করুন।","আজ কারো একটি ছোট উপকার করুন।","পরিবারের ছোটদের একটি ভালো গল্প শোনান।","আজ পরিবারের সবাইকে হাসিমুখে সালাম দিন।"]'::jsonb),
('quotes', '[]'::jsonb),
('arrival', to_jsonb(''::text));  -- হোমের উপরের ছোট লাইন, যেমন বংশের আগমনের সাল (এডমিন পেইজ থেকে দিন)

-- ==========================================================
-- নিজেকে এডমিন বানান (সাইটে একাউন্ট খোলার পর এই লাইন আপনার ইমেইল দিয়ে Run করুন):
-- update profiles set role = 'admin' where email = 'আপনার@email.com';
-- ==========================================================
