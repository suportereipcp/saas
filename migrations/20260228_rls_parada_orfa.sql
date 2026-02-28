-- Corrige a permissão RLS faltante para que o Frontend/Backend do Next.js (como usuário autenticado)
-- possa realizar INSERT na tabela de paradas (para registros Manuais e Automáticos do Zero-Gaps OEE).
-- O silent-fail acontecia porque o supabase.insert() da Rota do Next retornava erro de RLS mas prosseguia a execução.

CREATE POLICY "authenticated_insert_paradas" 
ON apont_rubber_prensa.paradas_maquina 
FOR INSERT TO authenticated 
WITH CHECK (true);
