-- Courtside cloud sync — run this once in your Supabase project's SQL Editor
-- (Supabase dashboard → SQL Editor → New query → paste this whole file → Run).

create table if not exists products (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table products enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;

-- No login/auth — anyone with your site URL can read and write this data.
-- That's fine for a private tool only you use, but don't share the link
-- publicly. See the README security note if you want this locked down later.
create policy "public read products" on products for select using (true);
create policy "public write products" on products for insert with check (true);
create policy "public update products" on products for update using (true);
create policy "public delete products" on products for delete using (true);

create policy "public read orders" on orders for select using (true);
create policy "public write orders" on orders for insert with check (true);
create policy "public update orders" on orders for update using (true);
create policy "public delete orders" on orders for delete using (true);

create policy "public read settings" on settings for select using (true);
create policy "public write settings" on settings for insert with check (true);
create policy "public update settings" on settings for update using (true);

-- Live sync: lets every open tab/device see changes immediately, no refresh needed.
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table settings;
