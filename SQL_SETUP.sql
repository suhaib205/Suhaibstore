-- 1) جدول المنتجات
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  title_ar text not null,
  title_en text not null,
  desc_ar text default '',
  desc_en text default '',
  price text default '',
  category text default 'General',
  image_url text default '',
  featured boolean default false,
  created_at timestamptz not null default now()
);

-- 2) فعّل RLS
alter table public.products enable row level security;

-- 3) سياسات القراءة (مفتوحة للجميع)
drop policy if exists "Public read products" on public.products;
create policy "Public read products"
on public.products for select
to public
using (true);

-- 4) سياسات الكتابة (فقط للمسجّلين)
drop policy if exists "Auth write products" on public.products;
create policy "Auth write products"
on public.products for all
to authenticated
using (true)
with check (true);

-- ملاحظة:
-- لرفع الصور من الموقع نستخدم Supabase Storage bucket باسم: product-images
-- اجعله Public من Dashboard.
