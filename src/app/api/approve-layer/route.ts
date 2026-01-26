import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server'; // Note: Use server client

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const action = searchParams.get('action'); // 'approve' or 'reject'

  if (!id || !action) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const supabase = await createClient(); // Server-side supabase client

  const status = action === 'approve' ? 'APPROVED' : 'REJECTED';

  // Update the record
  // @ts-ignore - Custom schema not in generated types
  const { error } = await supabase
    .schema('app_controle_prazo_qualidade')
    .from('layer_control_records')
    .update({
      approval_status: status,
      approved_at: new Date().toISOString(),
      approved_by: 'EMAIL_ACTION' // In a real auth flow, we'd want a token, but for email links this is common simplified pattern
    })
    .eq('id', id);

  if (error) {
    return new NextResponse(`Error updating record: ${error.message}`, { status: 500 });
  }

  // Simple success page
  const html = `
    <html>
      <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f0fdf4;">
        <div style="text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <h1 style="color: ${action === 'approve' ? '#10b981' : '#ef4444'}">
            ${action === 'approve' ? 'Aprovado com Sucesso!' : 'Rejeitado com Sucesso!'}
          </h1>
          <p>O registro foi atualizado no sistema.</p>
          <a href="/controle-prazo-qualidade/camada" style="display: inline-block; margin-top: 20px; color: #64748b; text-decoration: underline;">Ir para o Dashboard</a>
        </div>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
