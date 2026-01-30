-- Script para eliminar facturas de prueba CON sus dependencias
-- Este script elimina en el orden correcto para evitar errores de restricción

-- PASO 1: Ver todas las facturas y sus dependencias
SELECT 
  i.id,
  i.number,
  i.date,
  i.total,
  i.status,
  COUNT(DISTINCT ii.id) as items_count,
  COUNT(DISTINCT cn.id) as credit_notes_count
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
LEFT JOIN credit_notes cn ON i.id = cn.invoice_id
GROUP BY i.id, i.number, i.date, i.total, i.status
ORDER BY i.number;

-- PASO 2: Eliminar TODAS las dependencias de las facturas que quieres borrar
-- Reemplaza (1, 2, 3, 4, 5, 6) con los números de factura que quieres eliminar

-- 2A. Eliminar items de las notas de crédito
DELETE FROM credit_note_items 
WHERE credit_note_id IN (
  SELECT id FROM credit_notes 
  WHERE invoice_id IN (
    SELECT id FROM invoices WHERE number IN (1, 2, 3, 4, 5, 6)
  )
);

-- 2B. Eliminar las notas de crédito
DELETE FROM credit_notes 
WHERE invoice_id IN (
  SELECT id FROM invoices WHERE number IN (1, 2, 3, 4, 5, 6)
);

-- 2C. Eliminar los items de factura
DELETE FROM invoice_items 
WHERE invoice_id IN (
  SELECT id FROM invoices WHERE number IN (1, 2, 3, 4, 5, 6)
);

-- 2D. Finalmente, eliminar las facturas
DELETE FROM invoices WHERE number IN (1, 2, 3, 4, 5, 6);

-- PASO 3: Verificar que se eliminaron
SELECT COUNT(*) as facturas_restantes FROM invoices;

-- PASO 4: Resetear el contador (solo después de verificar)
-- ALTER SEQUENCE invoices_number_seq RESTART WITH 1;
-- SELECT setval('invoices_number_seq', 1, false);
