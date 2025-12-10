-- 1. Función para manejar nuevos usuarios automáticamente
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'seller');
  return new;
end;
$$ language plpgsql security definer;

-- 2. Crear el trigger (disparador) que ejecuta la función
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. SOLUCIÓN AL ERROR ACTUAL: Crear perfiles para los usuarios que ya existen
insert into public.profiles (id, email, role)
select id, email, 'seller'
from auth.users
where id not in (select id from public.profiles);
