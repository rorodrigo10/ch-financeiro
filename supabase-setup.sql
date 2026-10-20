-- Ch Financeiro: executar uma única vez no SQL Editor do Supabase.
-- Dados acessíveis somente ao usuário autenticado; escrita com controle de revisão.
create table if not exists public.ch_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint ch_payload_object check (jsonb_typeof(data) = 'object'),
  constraint ch_payload_size check (octet_length(data::text) <= 2000000)
);

alter table public.ch_user_state enable row level security;
revoke all on public.ch_user_state from anon;
revoke all on public.ch_user_state from public;
grant select, insert, update on public.ch_user_state to authenticated;

drop policy if exists ch_owner_read on public.ch_user_state;
create policy ch_owner_read on public.ch_user_state for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists ch_owner_insert on public.ch_user_state;
create policy ch_owner_insert on public.ch_user_state for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists ch_owner_update on public.ch_user_state;
create policy ch_owner_update on public.ch_user_state for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.ch_save_snapshot(p_data jsonb, p_expected_revision bigint)
returns table(saved boolean, new_revision bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_rev bigint;
begin
  if v_user is null then
    raise exception 'Entre na sua conta para sincronizar.';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'Dados enviados em formato inválido.';
  end if;
  if octet_length(p_data::text) > 2000000 then
    raise exception 'O histórico ultrapassou 2 MB; faça backup e reduza mensagens antigas.';
  end if;
  insert into public.ch_user_state (user_id, data, revision, updated_at)
  values (v_user, p_data, 1, now())
  on conflict (user_id) do update
    set data = excluded.data,
        revision = public.ch_user_state.revision + 1,
        updated_at = now()
    where public.ch_user_state.revision = p_expected_revision
  returning revision into v_rev;
  return query select (v_rev is not null), coalesce(v_rev, 0)::bigint;
end;
$$;
revoke all on function public.ch_save_snapshot(jsonb,bigint) from public;
revoke all on function public.ch_save_snapshot(jsonb,bigint) from anon;
grant execute on function public.ch_save_snapshot(jsonb,bigint) to authenticated;
