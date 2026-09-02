-- supabase/migrations/015_web_bookings_rls.sql
-- RLS policies para que el cliente (rol CUSTOMER) pueda operar sobre sus propios datos
-- en bookings, customer_credits_ledger y waitlist. Las policies de staff/admin
-- (creadas en 011_bookings.sql) se mantienen intactas.

-- 1. bookings: el cliente lee SOLO sus reservaciones
create policy "bookings_own_select"
  on public.bookings for select
  using (customer_id = auth.uid());

-- 2. customer_credits_ledger: el cliente lee SOLO sus movimientos
create policy "credits_ledger_own_select"
  on public.customer_credits_ledger for select
  using (customer_id = auth.uid());

-- 3. waitlist: el cliente inserta/borra SOLO sus propias entradas
-- (el unique index waitlist_unique ya evita duplicados class_id+customer_id)
create policy "waitlist_own_manage"
  on public.waitlist for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());