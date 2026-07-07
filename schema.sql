-- Dar ul Huda School Management System - Authoritative Supabase Schema
-- Paste this script into your Supabase SQL Editor to initialize/reset the tables.

-- Drop existing tables to prevent conflicts (dependencies ordered)
drop table if exists public.donations cascade;
drop table if exists public.fee_payments cascade;
drop table if exists public.fees cascade;
drop table if exists public.attendance cascade;
drop table if exists public.courses cascade;
drop table if exists public.teachers cascade;
drop table if exists public.students cascade;
drop table if exists public.users cascade;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS TABLE
create table public.users (
    id uuid references auth.users on delete cascade primary key,
    full_name text not null,
    phone text,
    role text not null check (role in ('admin', 'teacher', 'student', 'data_entry')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create is_data_entry helper function
create or replace function public.is_data_entry()
returns boolean as $$
begin
    return exists (
        select 1 from public.users u 
        where u.id = auth.uid() and u.role = 'data_entry'
    );
end;
$$ language plpgsql security definer;

-- Enable RLS for users
alter table public.users enable row level security;

create policy "Allow read access to all authenticated users"
on public.users for select using (auth.role() = 'authenticated');

create policy "Allow admins full access to users"
on public.users for all using (
    exists (
        select 1 from public.users u 
        where u.id = auth.uid() and u.role = 'admin'
    )
);

create policy "Allow data_entry insert users" 
on public.users for insert 
with check (public.is_data_entry());

create policy "Allow data_entry update users" 
on public.users for update 
using (public.is_data_entry())
with check (public.is_data_entry());

-- 2. STUDENTS TABLE
create table public.students (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    class text not null,
    roll_number text unique not null,
    father_name text not null,
    address text
);

-- Enable RLS for students
alter table public.students enable row level security;

create policy "Allow select access to students list"
on public.students for select using (auth.role() = 'authenticated');

create policy "Allow admins full access to students"
on public.students for all using (
    exists (
        select 1 from public.users 
        where users.id = auth.uid() and users.role = 'admin'
    )
);

create policy "Allow data_entry insert students" 
on public.students for insert 
with check (public.is_data_entry());

create policy "Allow data_entry update students" 
on public.students for update 
using (public.is_data_entry())
with check (public.is_data_entry());

-- 3. TEACHERS TABLE
create table public.teachers (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    subject text not null,
    qualification text,
    salary numeric(10, 2) not null check (salary >= 0),
    joining_date date default current_date not null
);

-- Enable RLS for teachers
alter table public.teachers enable row level security;

create policy "Allow select access to teachers list"
on public.teachers for select using (auth.role() = 'authenticated');

create policy "Allow admins full access to teachers"
on public.teachers for all using (
    exists (
        select 1 from public.users 
        where users.id = auth.uid() and users.role = 'admin'
    )
);

create policy "Allow data_entry insert teachers" 
on public.teachers for insert 
with check (public.is_data_entry());

create policy "Allow data_entry update teachers" 
on public.teachers for update 
using (public.is_data_entry())
with check (public.is_data_entry());

-- 4. COURSES TABLE
create table public.courses (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    description text,
    teacher_id uuid references public.teachers(id) on delete set null
);

-- Enable RLS for courses
alter table public.courses enable row level security;

create policy "Allow read access to courses"
on public.courses for select using (auth.role() = 'authenticated');

create policy "Allow admins full access to courses"
on public.courses for all using (
    exists (
        select 1 from public.users 
        where users.id = auth.uid() and users.role = 'admin'
    )
);

-- 5. ATTENDANCE TABLE
create table public.attendance (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    date date default current_date not null,
    status text not null check (status in ('present', 'absent', 'late')),
    constraint unique_user_daily_attendance unique (user_id, date)
);

-- Enable RLS for attendance
alter table public.attendance enable row level security;

create policy "Allow read access to attendance logs"
on public.attendance for select using (auth.role() = 'authenticated');

create policy "Allow admin and teachers full access to attendance"
on public.attendance for all using (
    exists (
        select 1 from public.users 
        where users.id = auth.uid() and users.role in ('admin', 'teacher')
    )
);

create policy "Allow data_entry insert attendance" 
on public.attendance for insert 
with check (public.is_data_entry());

create policy "Allow data_entry update attendance" 
on public.attendance for update 
using (public.is_data_entry())
with check (public.is_data_entry());

-- 6. FEES TABLE (Billing invoices)
create table public.fees (
    id uuid default uuid_generate_v4() primary key,
    student_id uuid references public.students(id) on delete cascade not null,
    amount numeric(10, 2) not null check (amount >= 0),
    due_date date not null,
    status text default 'unpaid' not null check (status in ('paid', 'unpaid'))
);

-- Enable RLS for fees
alter table public.fees enable row level security;

create policy "Allow select access to fees"
on public.fees for select using (auth.role() = 'authenticated');

create policy "Allow admins full access to fees"
on public.fees for all using (
    exists (
        select 1 from public.users 
        where users.id = auth.uid() and users.role = 'admin'
    )
);

create policy "Allow data_entry insert fees" 
on public.fees for insert 
with check (public.is_data_entry());

create policy "Allow data_entry update fees" 
on public.fees for update 
using (public.is_data_entry())
with check (public.is_data_entry());

-- 7. FEE_PAYMENTS TABLE
create table public.fee_payments (
    id uuid default uuid_generate_v4() primary key,
    fee_id uuid references public.fees(id) on delete cascade not null,
    amount_paid numeric(10, 2) not null check (amount_paid > 0),
    payment_mode text not null check (payment_mode in ('cash', 'bank', 'online')),
    payment_date date default current_date not null
);

-- Enable RLS for fee payments
alter table public.fee_payments enable row level security;

create policy "Allow select access to fee payments"
on public.fee_payments for select using (auth.role() = 'authenticated');

create policy "Allow admins full access to fee payments"
on public.fee_payments for all using (
    exists (
        select 1 from public.users 
        where users.id = auth.uid() and users.role = 'admin'
    )
);

create policy "Allow data_entry insert fee_payments" 
on public.fee_payments for insert 
with check (public.is_data_entry());

create policy "Allow data_entry update fee_payments" 
on public.fee_payments for update 
using (public.is_data_entry())
with check (public.is_data_entry());

-- 8. DONATIONS TABLE
create table public.donations (
    id uuid default uuid_generate_v4() primary key,
    donor_name text not null,
    amount numeric(10, 2) not null check (amount > 0),
    source text not null, -- e.g. campaign or program name
    payment_mode text not null check (payment_mode in ('cash', 'bank', 'online')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for donations
alter table public.donations enable row level security;

create policy "Allow select access to donations list"
on public.donations for select using (auth.role() = 'authenticated');

create policy "Allow admins full access to donations"
on public.donations for all using (
    exists (
        select 1 from public.users 
        where users.id = auth.uid() and users.role = 'admin'
    )
);

create policy "Allow data_entry insert donations" 
on public.donations for insert 
with check (public.is_data_entry());

create policy "Allow data_entry update donations" 
on public.donations for update 
using (public.is_data_entry())
with check (public.is_data_entry());

-- 9. CMS NOTICE BOARD TABLE (Extended notice feature preserved)
create table public.cms_notices (
    id uuid default uuid_generate_v4() primary key,
    title text not null,
    content text not null,
    urgency text default 'Medium' check (urgency in ('High', 'Medium', 'Low')),
    published_date date default current_date not null,
    is_active boolean default true not null
);

alter table public.cms_notices enable row level security;

create policy "Allow notices read access to everyone"
on public.cms_notices for select using (true);

create policy "Allow admins full access to notices"
on public.cms_notices for all using (
    exists (
        select 1 from public.users 
        where users.id = auth.uid() and users.role = 'admin'
    )
);

create policy "Allow data_entry insert notices" 
on public.cms_notices for insert 
with check (public.is_data_entry());

create policy "Allow data_entry update notices" 
on public.cms_notices for update 
using (public.is_data_entry())
with check (public.is_data_entry());
