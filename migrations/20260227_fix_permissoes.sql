-- Concede acesso de uso ao schema (se ainda não concedido)
GRANT USAGE ON SCHEMA apont_rubber_prensa TO authenticated;
GRANT USAGE ON SCHEMA apont_rubber_prensa TO anon;

-- Concede acesso a tabela nova de alertas para que a API React consiga ler e resolver eles
GRANT ALL ON apont_rubber_prensa.alertas_maquina TO authenticated;
GRANT ALL ON apont_rubber_prensa.alertas_maquina TO anon;
GRANT ALL ON apont_rubber_prensa.alertas_maquina TO service_role;
