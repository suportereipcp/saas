require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log('--- Teste de Conexão SMTP ---');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);
    console.log(`Secure: ${process.env.SMTP_SECURE}`);

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        tls: {
            rejectUnauthorized: false
        },
        // Debugging options
        logger: true,
        debug: true
    });

    try {
        console.log('Tentando verificar conexão (verify)...');
        await transporter.verify();
        console.log('✅ CONEXÃO SMTP BEM SUCEDIDA!');
        console.log('O servidor aceitou suas credenciais.');
    } catch (error) {
        console.error('❌ ERRO DE CONEXÃO:');
        console.error(error);
    }
}

testEmail();
