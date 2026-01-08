
import React from 'react';
import './globals.css';

export const metadata = {
  title: 'FlowControl - Gestão de Processos',
  description: 'Sistema de gerenciamento de tempo e fluxo para processos industriais.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="antialiased font-['Inter'] bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
