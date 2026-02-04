
-- Fix inconsistent state: If items have counts, they should be marked as 'contado' (locked)
UPDATE inventario.inventario_rotativo
SET contado = true
WHERE 
    qtd_fisica IS NOT NULL 
    AND array_length(qtd_fisica, 1) > 0 
    AND contado = false;
