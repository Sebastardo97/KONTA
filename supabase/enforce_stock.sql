-- 1. Asegurar que el stock nunca sea negativo a nivel de base de datos
alter table products add constraint check_stock_non_negative check (stock >= 0);

-- 2. Función segura para descontar stock
create or replace function decrement_stock(row_id uuid, quantity int)
returns void as $$
declare
  current_stock int;
begin
  -- Bloquear la fila para evitar condiciones de carrera (race conditions)
  select stock into current_stock from products where id = row_id for update;

  if current_stock < quantity then
    raise exception 'Stock insuficiente. Disponible: %, Solicitado: %', current_stock, quantity;
  end if;

  update products
  set stock = stock - quantity
  where id = row_id;
end;
$$ language plpgsql;
