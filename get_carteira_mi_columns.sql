SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'dashboards_pcp' 
  AND table_name = 'carteira_mi' 
  AND column_name NOT IN ('id', 'created_at')
ORDER BY ordinal_position;
