-- Run once in Supabase SQL Editor. No service-role key belongs in the app.
begin;
create table public.ft_garages (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 80), data jsonb not null,
 revision integer not null default 1, updated_at timestamptz not null default now(),
 check(jsonb_typeof(data)='object' and octet_length(data::text)<4000000)
);
create table public.ft_members (
 user_id uuid primary key references auth.users(id), garage_id uuid not null references public.ft_garages(id) on delete cascade
);
create table public.ft_invites (
 garage_id uuid primary key references public.ft_garages(id) on delete cascade,
 email text not null check(length(email)<255), expires_at timestamptz not null default now()+interval '7 days'
);
alter table public.ft_garages enable row level security;
alter table public.ft_members enable row level security;
alter table public.ft_invites enable row level security;
-- No direct table access. Every RPC checks auth.uid(); definer uses an empty search_path.
revoke all on public.ft_garages, public.ft_members, public.ft_invites from anon, authenticated;

create function public.ft_list() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Zaloguj się'; end if;
 select jsonb_build_object('id',g.id,'name',g.name,'owner',g.owner_id=auth.uid()) into result
 from public.ft_garages g join public.ft_members m on m.garage_id=g.id where m.user_id=auth.uid();
 return jsonb_build_object('garage',result,'invites',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name)) from public.ft_invites i join public.ft_garages g on g.id=i.garage_id where i.email=lower(auth.jwt()->>'email') and i.expires_at>now()),'[]'::jsonb));
end $$;

create function public.ft_create(p_name text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid;
begin
 if auth.uid() is null then raise exception 'Zaloguj się'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if exists(select 1 from public.ft_members where user_id=auth.uid()) then raise exception 'Masz już wspólny garaż'; end if;
 insert into public.ft_garages(owner_id,name,data) values(auth.uid(),trim(p_name),p_data) returning id into gid;
 insert into public.ft_members values(auth.uid(),gid); return gid;
end $$;

create function public.ft_invite(p_garage uuid,p_email text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Zaloguj się'; end if;
 perform 1 from public.ft_garages where id=p_garage and owner_id=auth.uid() for update;
 if not found then raise exception 'Tylko właściciel może zapraszać'; end if;
 if (select count(*) from public.ft_members where garage_id=p_garage)>=2 then raise exception 'Garaż ma już dwie osoby'; end if;
 if lower(trim(p_email))=lower(auth.jwt()->>'email') or p_email not like '%_@_%._%' then raise exception 'Podaj e-mail drugiej osoby'; end if;
 insert into public.ft_invites(garage_id,email) values(p_garage,lower(trim(p_email))) on conflict(garage_id) do update set email=excluded.email,expires_at=now()+interval '7 days';
end $$;

create function public.ft_accept(p_garage uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Zaloguj się'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 perform 1 from public.ft_garages where id=p_garage for update;
 if not exists(select 1 from public.ft_invites where garage_id=p_garage and email=lower(auth.jwt()->>'email') and expires_at>now()) then raise exception 'Brak ważnego zaproszenia'; end if;
 if (select count(*) from public.ft_members where garage_id=p_garage)>=2 then raise exception 'Garaż ma już dwie osoby'; end if;
 insert into public.ft_members values(auth.uid(),p_garage);
 delete from public.ft_invites where garage_id=p_garage;
end $$;

create function public.ft_get(p_garage uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.ft_members where garage_id=p_garage and user_id=auth.uid()) then raise exception 'Brak dostępu do garażu'; end if;
 return (select jsonb_build_object('data',data,'revision',revision,'updated_at',updated_at) from public.ft_garages where id=p_garage);
end $$;

create function public.ft_head(p_garage uuid) returns integer language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.ft_members where garage_id=p_garage and user_id=auth.uid()) then raise exception 'Brak dostępu do garażu'; end if;
 return (select revision from public.ft_garages where id=p_garage);
end $$;

create function public.ft_put(p_garage uuid,p_revision integer,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare new_rev integer;
begin
 if auth.uid() is null or not exists(select 1 from public.ft_members where garage_id=p_garage and user_id=auth.uid()) then raise exception 'Brak dostępu do garażu'; end if;
 update public.ft_garages set data=p_data,revision=revision+1,updated_at=now() where id=p_garage and revision=p_revision returning revision into new_rev;
 if not found then return jsonb_build_object('conflict',true); end if;
 return jsonb_build_object('revision',new_rev);
end $$;

revoke all on function public.ft_list(),public.ft_create(text,jsonb),public.ft_invite(uuid,text),public.ft_accept(uuid),public.ft_get(uuid),public.ft_head(uuid),public.ft_put(uuid,integer,jsonb) from public,anon;
grant execute on function public.ft_list(),public.ft_create(text,jsonb),public.ft_invite(uuid,text),public.ft_accept(uuid),public.ft_get(uuid),public.ft_head(uuid),public.ft_put(uuid,integer,jsonb) to authenticated;
commit;
