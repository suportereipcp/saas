-- Allow 'dia_util' in calendar tables

DO $$
BEGIN
    -- Calendario Prod
    ALTER TABLE dashboards.calendario_prod DROP CONSTRAINT IF EXISTS calendario_prod_type_check;
    ALTER TABLE dashboards.calendario_prod ADD CONSTRAINT calendario_prod_type_check 
        CHECK (type IN ('feriado', 'meio_dia', 'ponte', 'dia_util'));

    -- Calendario Fatur
    ALTER TABLE dashboards.calendario_fatur DROP CONSTRAINT IF EXISTS calendario_fatur_type_check;
    ALTER TABLE dashboards.calendario_fatur ADD CONSTRAINT calendario_fatur_type_check 
        CHECK (type IN ('feriado', 'meio_dia', 'ponte', 'dia_util'));
END $$;
