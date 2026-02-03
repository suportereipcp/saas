
-- Run this specific script to update the lookup function without re-running the entire schema script.

create or replace function shiftapp.get_datasul_item_desc(p_code text)
returns text
language plpgsql
security definer
as $$
declare
  v_desc text;
begin
  -- Updated to use 'datasul.item' and correct columns 'desc_item', 'it_codigo'
  execute format('select "desc_item" from datasul.item where trim("it_codigo") ilike trim(%L)', p_code)
  into v_desc;
  
  return v_desc;
end;
$$;
