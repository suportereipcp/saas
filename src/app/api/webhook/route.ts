import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        // 1. Verifica se a chave mestra existe (segurança do servidor)
        // Nota: O supabaseAdmin já lida parcialmente com isso, mas uma verificação explícita é boa.
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('ERRO: Service Role Key não configurada no servidor.');
            return NextResponse.json({ error: 'Configuração de servidor pendente' }, { status: 500 });
        }

        // 2. Lê os dados enviados
        const body = await request.json();

        // 3. Lê o parâmetro ?source=... da URL (ex: .../webhook?source=datasul)
        const { searchParams } = new URL(request.url);
        const source = searchParams.get('source') || 'desconhecido';

        // 4. Salva no Banco
        const { error } = await supabaseAdmin
            .from('webhook_logs')
            .insert({
                source: source,
                payload: body
            });

        if (error) {
            console.error('Erro Supabase:', error);
            return NextResponse.json({ error: 'Erro ao salvar dados' }, { status: 500 });
        }

        // 5. Retorna sucesso (200 OK)
        return NextResponse.json({ message: 'Recebido com sucesso' }, { status: 200 });

    } catch (err) {
        console.error('Erro Webhook:', err);
        return NextResponse.json({ error: 'JSON inválido ou erro interno' }, { status: 400 });
    }
}
