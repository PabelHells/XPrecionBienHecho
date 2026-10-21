-- XPRECION: instalacion completa para SQL Editor de Supabase.
-- Ejecutar TODO este archivo una sola vez en un proyecto nuevo.
-- Alternativa a ejecutar las dos migraciones por separado: no ejecutar ambas opciones.
-- Crea el esquema de la aplicacion dentro de la BD existente de Supabase.
-- Compatible con src/ (web y Capacitor); legacy/ PHP/MySQL no utiliza este esquema.
-- No borra ni reemplaza tablas existentes. Si hay un conflicto, la transaccion falla.
-- Registrar las cuentas DESPUES de ejecutar este archivo para crear sus perfiles.
-- Configurar Auth, SMTP y .env por separado segun docs/DESPLIEGUE_LOCAL_SUPABASE.md.
-- XPRECION: single shared backend for web, Android and iOS.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null check (length(username) between 3 and 40),
 full_name text not null check (length(full_name) between 2 and 150),
 birth_date date check (birth_date <= current_date), phone text not null default '' check (length(phone)<=30),
 address text not null default '' check (length(address)<=500),
 role text not null default 'patient' check (role in ('patient','staff','admin')),
 created_at timestamptz not null default now()
);
create unique index profiles_username_unique on public.profiles(lower(username));
create function app_private.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and role in ('staff','admin'));
$$;
create function app_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create function app_private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,username,full_name)
 values(new.id, coalesce(nullif(new.raw_user_meta_data->>'username',''), 'p_' || replace(new.id::text,'-','')),
 coalesce(nullif(new.raw_user_meta_data->>'full_name',''), 'Paciente'));
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function app_private.handle_new_user();

create table public.clinic_settings (
 id boolean primary key default true check(id), name text not null default 'XPRECION',
 phone text not null default '', address text not null default '', email text not null default '',
 timezone text not null default 'America/Mazatlan' check(timezone='America/Mazatlan')
);
insert into public.clinic_settings(id) values(true);
create table public.areas (id uuid primary key default gen_random_uuid(), name text unique not null check(length(name) between 2 and 100), active boolean not null default true);
create table public.services (
 id uuid primary key default gen_random_uuid(), area_id uuid not null references public.areas(id),
 name text unique not null check(length(name) between 2 and 150), description text not null default '', preparation text not null default '',
 price numeric(10,2) check(price>=0), active boolean not null default true
);
create table public.doctors (
 id uuid primary key default gen_random_uuid(), area_id uuid not null references public.areas(id),
 name text not null check(length(name) between 2 and 150), active boolean not null default true
);
create table public.schedules (
 id uuid primary key default gen_random_uuid(), doctor_id uuid not null references public.doctors(id),
 weekday integer not null check(weekday between 1 and 5), opens_at time not null, closes_at time not null,
 unique(doctor_id,weekday), check(closes_at>opens_at),
 check(extract(minute from opens_at) in (0,30) and extract(second from opens_at)=0),
 check(extract(minute from closes_at) in (0,30) and extract(second from closes_at)=0)
);
create table public.appointments (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id),
 service_id uuid not null references public.services(id), doctor_id uuid not null references public.doctors(id),
 starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','confirmed','completed','cancelled')),
 notes text not null default '' check(length(notes)<=1000), created_at timestamptz not null default now(),
 unique(id,patient_id), check(ends_at=starts_at + interval '30 minutes')
);
-- All appointments occupy one aligned 30-minute slot; unique indexes also protect races.
create unique index doctor_slot_unique on public.appointments(doctor_id,starts_at) where status <> 'cancelled';
create unique index patient_slot_unique on public.appointments(patient_id,starts_at) where status <> 'cancelled';
create index appointments_patient on public.appointments(patient_id,starts_at desc);
create index appointments_service on public.appointments(service_id);
create table public.results (
 id uuid primary key default gen_random_uuid(), appointment_id uuid not null,
 patient_id uuid not null, title text not null check(length(title) between 2 and 150),
 file_path text unique not null, created_at timestamptz not null default now(),
 foreign key(appointment_id,patient_id) references public.appointments(id,patient_id),
 check(split_part(file_path,'/',1)=patient_id::text)
);
create index results_patient on public.results(patient_id);
create table public.feedback (
 id uuid primary key default gen_random_uuid(), patient_id uuid not null references public.profiles(id),
 message text not null check(length(message) between 10 and 3000), resolved boolean not null default false,
 created_at timestamptz not null default now()
);
create index feedback_patient on public.feedback(patient_id);
create table public.audit_log (
 id bigint generated always as identity primary key, actor_id uuid, entity text not null,
 entity_id text not null, action text not null, created_at timestamptz not null default now()
);
create function app_private.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.audit_log(actor_id,entity,entity_id,action)
 values(auth.uid(),tg_table_name,coalesce(new.id::text,old.id::text),tg_op);
 return coalesce(new,old);
end; $$;
create trigger audit_appointments after insert or update on public.appointments for each row execute function app_private.audit_change();
create trigger audit_results after insert or delete on public.results for each row execute function app_private.audit_change();

alter table public.profiles enable row level security;
alter table public.clinic_settings enable row level security;
alter table public.areas enable row level security;
alter table public.services enable row level security;
alter table public.doctors enable row level security;
alter table public.schedules enable row level security;
alter table public.appointments enable row level security;
alter table public.results enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_log enable row level security;

-- Explicit privileges instead of relying on a project's default grants.
revoke all on public.profiles,public.clinic_settings,public.areas,public.services,public.doctors,public.schedules,public.appointments,public.results,public.feedback,public.audit_log from anon,authenticated;
grant select on public.clinic_settings,public.areas,public.services,public.doctors,public.schedules to anon,authenticated;
grant insert,update on public.clinic_settings,public.areas,public.services,public.doctors,public.schedules to authenticated;
grant delete on public.schedules to authenticated;
grant select on public.profiles,public.appointments,public.results,public.feedback,public.audit_log to authenticated;
grant update(username,full_name,birth_date,phone,address) on public.profiles to authenticated;
grant insert,delete on public.results to authenticated;
grant insert(patient_id,message),update(resolved) on public.feedback to authenticated;

create policy own_profile_read on public.profiles for select to authenticated using(id=auth.uid() or app_private.is_staff());
create policy own_profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy clinic_public on public.clinic_settings for select to anon,authenticated using(true);
create policy clinic_admin on public.clinic_settings for all to authenticated using(app_private.is_admin()) with check(app_private.is_admin());
create policy areas_public on public.areas for select to anon,authenticated using(active);
create policy areas_admin on public.areas for all to authenticated using(app_private.is_admin()) with check(app_private.is_admin());
create policy services_public on public.services for select to anon,authenticated using(active);
create policy services_admin on public.services for all to authenticated using(app_private.is_admin()) with check(app_private.is_admin());
create policy doctors_public on public.doctors for select to anon,authenticated using(active);
create policy doctors_admin on public.doctors for all to authenticated using(app_private.is_admin()) with check(app_private.is_admin());
create policy schedules_public on public.schedules for select to anon,authenticated using(true);
create policy schedules_admin on public.schedules for all to authenticated using(app_private.is_admin()) with check(app_private.is_admin());
create policy appointments_read on public.appointments for select to authenticated using(patient_id=auth.uid() or app_private.is_staff());
create policy results_read on public.results for select to authenticated using(patient_id=auth.uid() or app_private.is_staff());
create policy results_staff_insert on public.results for insert to authenticated with check(app_private.is_staff());
create policy results_staff_delete on public.results for delete to authenticated using(app_private.is_staff());
create policy feedback_read on public.feedback for select to authenticated using(patient_id=auth.uid() or app_private.is_staff());
create policy feedback_insert on public.feedback for insert to authenticated with check(patient_id=auth.uid() and not resolved);
create policy feedback_update on public.feedback for update to authenticated using(app_private.is_staff()) with check(app_private.is_staff());
create policy audit_admin on public.audit_log for select to authenticated using(app_private.is_admin());

create function public.available_slots(p_service uuid,p_doctor uuid,p_date date)
returns table(starts_at timestamptz) language sql stable security definer set search_path = '' as $$
 select slot from public.schedules h
 join public.doctors d on d.id=h.doctor_id and d.active
 join public.services s on s.id=p_service and s.area_id=d.area_id and s.active
 join public.areas a on a.id=s.area_id and a.active
 cross join lateral generate_series((p_date+h.opens_at) at time zone 'America/Mazatlan',
 (p_date+h.closes_at) at time zone 'America/Mazatlan'-interval '30 minutes',interval '30 minutes') slot
 where auth.uid() is not null and h.doctor_id=p_doctor and h.weekday=extract(isodow from p_date)
 and p_date between (now() at time zone 'America/Mazatlan')::date and (now() at time zone 'America/Mazatlan')::date+180
 and slot>now()
 and not exists(select 1 from public.appointments ap where ap.starts_at=slot and ap.status<>'cancelled' and (ap.doctor_id=p_doctor or ap.patient_id=auth.uid()))
 order by slot;
$$;
create function public.book_appointment(p_service uuid,p_doctor uuid,p_starts_at timestamptz,p_notes text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare appointment_id uuid;
begin
 if auth.uid() is null then raise exception 'Inicie sesión para reservar.'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and birth_date is not null and length(phone)>=7) then
  raise exception 'Complete su fecha de nacimiento y teléfono en Mi perfil.';
 end if;
 if length(p_notes)>1000 then raise exception 'Las notas no deben superar 1000 caracteres.'; end if;
 perform 1 from public.doctors where id=p_doctor for update;
 if not exists(select 1 from public.available_slots(p_service,p_doctor,(p_starts_at at time zone 'America/Mazatlan')::date) av where av.starts_at=p_starts_at) then
  raise exception 'El horario ya no está disponible. Actualice la disponibilidad.';
 end if;
 insert into public.appointments(patient_id,service_id,doctor_id,starts_at,ends_at,notes)
 values(auth.uid(),p_service,p_doctor,p_starts_at,p_starts_at+interval '30 minutes',coalesce(p_notes,'')) returning id into appointment_id;
 return appointment_id;
end; $$;
create function public.cancel_appointment(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare ap public.appointments;
begin
 select * into ap from public.appointments where id=p_id for update;
 if not found or auth.uid() is null or (ap.patient_id<>auth.uid() and not app_private.is_staff()) then raise exception 'Cita no disponible.'; end if;
 if ap.status not in ('pending','confirmed') then raise exception 'La cita ya no puede cancelarse.'; end if;
 if ap.starts_at<=now() and not app_private.is_staff() then raise exception 'Comuníquese con recepción para modificar esta cita.'; end if;
 update public.appointments set status='cancelled' where id=p_id;
end; $$;
create function public.set_appointment_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path = '' as $$
declare ap public.appointments;
begin
 if not app_private.is_staff() then raise exception 'Acceso restringido.'; end if;
 select * into ap from public.appointments where id=p_id for update;
 if not found then raise exception 'Cita no encontrada.'; end if;
 if not ((ap.status='pending' and p_status in ('confirmed','cancelled')) or (ap.status='confirmed' and p_status in ('completed','cancelled'))) then
  raise exception 'Cambio de estado no permitido.';
 end if;
 if p_status='completed' and ap.ends_at>now() then raise exception 'No puede finalizar una cita antes de su hora de término.'; end if;
 update public.appointments set status=p_status where id=p_id;
end; $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('results','results',false,10485760,array['application/pdf']);
create policy results_storage_read on storage.objects for select to authenticated using(bucket_id='results' and
 (app_private.is_staff() or exists(select 1 from public.results r where r.file_path=name and r.patient_id=auth.uid())));
create policy results_storage_insert on storage.objects for insert to authenticated with check(bucket_id='results' and app_private.is_staff());
create policy results_storage_delete on storage.objects for delete to authenticated using(bucket_id='results' and app_private.is_staff());

revoke all on all functions in schema app_private from public,anon,authenticated;
grant execute on function app_private.is_staff(),app_private.is_admin() to authenticated;
revoke all on function public.available_slots(uuid,uuid,date),public.book_appointment(uuid,uuid,timestamptz,text),public.cancel_appointment(uuid),public.set_appointment_status(uuid,text) from public,anon;
grant execute on function public.available_slots(uuid,uuid,date),public.book_appointment(uuid,uuid,timestamptz,text),public.cancel_appointment(uuid),public.set_appointment_status(uuid,text) to authenticated;

-- Catalog only: no fictional clinicians, appointments, patients or prices.
insert into public.areas(name) values ('Tomografía'),('Ultrasonido'),('Biopsias'),('Radiología');
insert into public.services(area_id,name,description)
select a.id,s.name,s.description from (values
 ('Tomografía','Tomografía axial multicorte','Estudio de imagen por cortes para la evaluación de estructuras internas.'),
 ('Tomografía','Angiotomografía','Evaluación por imagen de los vasos sanguíneos.'),
 ('Ultrasonido','Ultrasonido','Estudios mediante ondas de sonido.'),
 ('Ultrasonido','Ultrasonido Doppler color y espectral','Evaluación del flujo sanguíneo mediante ultrasonido.'),
 ('Ultrasonido','Elastografía hepática','Evaluación de la rigidez del tejido hepático.'),
 ('Ultrasonido','Ultrasonido 2D y 4D','Visualización de estructuras mediante ultrasonido.'),
 ('Ultrasonido','Ultrasonido musculoesquelético','Evaluación de músculos, tendones y articulaciones.'),
 ('Biopsias','Biopsia de tiroides','Procedimiento de obtención de muestra guiado por imagen.'),
 ('Biopsias','Biopsia de próstata','Procedimiento de obtención de muestra guiado por imagen.'),
 ('Biopsias','Biopsia de mama','Procedimiento de obtención de muestra guiado por imagen.'),
 ('Radiología','Rayos X','Estudios radiográficos para evaluación diagnóstica.'),
 ('Radiología','Cistograma miccional','Estudio contrastado de las vías urinarias.'),
 ('Radiología','Uretrograma','Estudio radiográfico contrastado de la uretra.'),
 ('Radiología','Colon por enema','Estudio contrastado del colon.'),
 ('Radiología','Serie esófago-gastro-duodenal','Estudio contrastado del tracto digestivo superior.'),
 ('Radiología','Fistulografía','Evaluación radiográfica de trayectos fistulosos.')
) as s(area,name,description) join public.areas a on a.name=s.area;

-- Actualizar la cache del API al confirmar la transaccion.
notify pgrst, 'reload schema';
commit;

-- Resultado esperado en una instalacion nueva: 10 tablas, 4 areas y 16 estudios.
select
 (select count(*) from pg_tables where schemaname = 'public'
  and tablename in ('profiles','clinic_settings','areas','services','doctors',
                    'schedules','appointments','results','feedback','audit_log')) as tablas,
 (select count(*) from public.areas) as areas,
 (select count(*) from public.services) as estudios,
 (select not public from storage.buckets where id = 'results') as bucket_results_privado;
