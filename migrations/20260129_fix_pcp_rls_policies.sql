-- Verificar e corrigir políticas RLS no schema dashboards_pcp

-- Primeiro, habilitar RLS em todas as tabelas se não estiver
ALTER TABLE IF EXISTS dashboards_pcp.cards_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.resumo_por_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.historico_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.performance_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.estoque_produtos_estrategicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.pedidos_recebidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.balanceamento_acabado ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.balanceamento_curva ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.calendario_fatur ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS dashboards_pcp.calendario_prod ENABLE ROW LEVEL SECURITY;

-- Criar políticas de SELECT público para todas as tabelas (dashboard é read-only)
DO $$
DECLARE
    table_name_var text;
    policy_name_var text;
BEGIN
    FOR table_name_var IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'dashboards_pcp' 
        AND table_type = 'BASE TABLE'
    LOOP
        policy_name_var := 'allow_select_' || table_name_var;
        
        -- Deletar política existente se houver
        EXECUTE format('DROP POLICY IF EXISTS %I ON dashboards_pcp.%I', policy_name_var, table_name_var);
        
        -- Criar nova política de SELECT para todos
        EXECUTE format(
            'CREATE POLICY %I ON dashboards_pcp.%I FOR SELECT TO authenticated, anon USING (true)',
            policy_name_var,
            table_name_var
        );
        
        RAISE NOTICE 'Política % criada para tabela %', policy_name_var, table_name_var;
    END LOOP;
END $$;

-- Garantir permissões de USAGE no schema
GRANT USAGE ON SCHEMA dashboards_pcp TO authenticated, anon;

-- Garantir permissões de SELECT em todas as tabelas
GRANT SELECT ON ALL TABLES IN SCHEMA dashboards_pcp TO authenticated, anon;

-- Garantir permissões de SELECT em futuras tabelas
ALTER DEFAULT PRIVILEGES IN SCHEMA dashboards_pcp GRANT SELECT ON TABLES TO authenticated, anon;
