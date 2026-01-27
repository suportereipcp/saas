import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    console.log("API: /api/send-layer-email triggered");
    console.log("Email Config Check:", {
        hasHost: !!process.env.SMTP_HOST,
        hasUser: !!process.env.SMTP_USER,
        host: process.env.SMTP_HOST // safe to log host probably, but user/pass no
    });

    try {
        const body = await request.json();
        const {
            id,
            date,
            item_code,
            op_number,
            process_type,
            standard_range,
            average,
            calculatedStatus,
            user_email
        } = body;

        // Recipients list
        const recipients = [
            'mateus.paulista@suporterei.com.br',
            'alcides.kobayashi@suporterei.com.br',
            'rafael.fonseca@suporterei.com.br',
            'adesivo@suporterei.com.br',
            'michel.santos@suporterei.com.br',
            'mateuspaulista55@gmail.com'
        ];

        if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('Missing SMTP Configuration');
            return NextResponse.json({ success: false, error: 'Configuração de email (SMTP) incompleta no servidor.' }, { status: 500 });
        }

        // Create Transporter (Configure with your SMTP vars)
        // For now, assuming environment variables or standard SMTP
        // Create Transporter using Environment Variables
        // Compatible with Office 365, Gmail, Exchange, etc.
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false // Helps with self-signed certs in some internal servers
            }
        });

        const appUrl = 'https://saas.pcpsuporterei.site';
        const approvalLink = `${appUrl}/api/approve-layer?id=${id}&action=approve`;
        const rejectLink = `${appUrl}/api/approve-layer?id=${id}&action=reject`;

        console.log('🔗 Links gerados (HARDCODED):', { approvalLink, rejectLink });

        // Use clean sender format to improve deliverability (no spoofing)
        const systemEmail = process.env.SMTP_USER || 'suportereipcp@gmail.com';
        const cleanSender = `"SaaS PCP - Suporte Rei" <${systemEmail}>`;

        const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Aviso: Controle de Camada Fora do Padrão</h2>
        <p>Um novo registro foi realizado por <strong>${user_email || 'Usuário Desconhecido'}</strong> e requer sua atenção.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td><strong>Data:</strong></td><td>${date}</td></tr>
            <tr><td><strong>Item:</strong></td><td>${item_code}</td></tr>
            <tr><td><strong>OP:</strong></td><td>${op_number}</td></tr>
            <tr><td><strong>Processo:</strong></td><td>${process_type}</td></tr>
            <tr><td><strong>Padrão Esperado:</strong></td><td>${standard_range} uM</td></tr>
            <tr><td><strong>Média Medida:</strong></td><td><strong style="color: red;">${average} uM</strong></td></tr>
            <tr><td><strong>Status:</strong></td><td>${calculatedStatus}</td></tr>
            <tr><td><strong>Responsável:</strong></td><td>${user_email || 'Não identificado'}</td></tr>
        </table>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
            <tr>
                <td>
                    <a href="${approvalLink}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">APROVAR</a>
                </td>
                <td width="20" style="width: 20px;">&nbsp;</td>
                <td>
                    <a href="${rejectLink}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; font-family: Arial, sans-serif;">REJEITAR</a>
                </td>
            </tr>
        </table>
        
        <p style="margin-top: 30px; font-size: 12px; color: #999;">Este é um email automático do sistema SaaS PCP.</p>
      </div>
    `;

        const info = await transporter.sendMail({
            from: cleanSender, // Clean sender format for better deliverability
            replyTo: user_email,  // Replies go to the user
            to: recipients.join(', '),
            subject: `[ALERTA] Camada Fora do Padrão - Item ${item_code} / OP ${op_number}`,
            html: htmlContent,
        });

        return NextResponse.json({ success: true, messageId: info.messageId });

    } catch (error: any) {
        console.error('Email Error Details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            response: error.response
        });

        // Ensure we strictly return a JSON object, even if error.message is elusive
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);

        return NextResponse.json(
            {
                success: false,
                error: errorMessage || 'Erro desconhecido ao enviar email'
            },
            { status: 500 }
        );
    }
}
