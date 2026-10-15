-- Execute no projeto Supabase próprio. Compatível com a tabela da versão 2.
create table if not exists public.dados (
  user_id uuid primary key references auth.users on delete cascade,
  conteudo jsonb not null,
  atualizado_em timestamptz not null default now(),
  revisao bigint not null default 1
);
alter table public.dados add column if not exists revisao bigint not null default 1;
alter table public.dados enable row level security;
drop policy if exists "so o dono" on public.dados;
create policy "so o dono" on public.dados for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.salvar_meu_ponto(esperada bigint, payload jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare nova bigint;
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if (payload->>'schemaVersion') is distinct from '3' then raise exception 'Formato inválido'; end if;
  if esperada = 0 then
    insert into dados(user_id,conteudo,revisao) values(auth.uid(),payload,1)
    on conflict(user_id) do nothing returning revisao into nova;
  else
    update dados set conteudo=payload,revisao=revisao+1,atualizado_em=now()
      where user_id=auth.uid() and revisao=esperada returning revisao into nova;
  end if;
  return nova;
end; $$;
revoke all on function public.salvar_meu_ponto(bigint,jsonb) from public;
grant execute on function public.salvar_meu_ponto(bigint,jsonb) to authenticated;
revoke insert,update,delete on public.dados from anon,authenticated;
grant select on public.dados to authenticated;
