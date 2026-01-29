"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default function DashboardHub() {
  return (
    <div className="flex flex-col h-full p-8 gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[#374151]">Central de Dashboards</h1>
        <p className="text-muted-foreground">Selecione o módulo de visualização desejado.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card: Dashboard PCP */}
        <Link href="/dashboards/pcp" className="group">
          <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer h-[250px] gap-4 w-full">
            <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
              <LayoutDashboard className="w-12 h-12 text-primary" />
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-bold text-lg text-[#374151] uppercase tracking-wider">Dashboard P.C.P.</span>
              <span className="text-sm text-muted-foreground font-medium">Programação e Controle da Produção</span>
            </div>
          </div>
        </Link>

        {/* Placeholder for future dashboards */}
        <div className="flex flex-col items-center justify-center p-8 border border-border border-dashed rounded-xl h-[250px] gap-4 w-full opacity-50">
          <div className="p-4 bg-muted rounded-full">
            <LayoutDashboard className="w-12 h-12 text-muted-foreground" />
          </div>
          <span className="font-medium text-muted-foreground uppercase tracking-wider text-sm">Em Breve</span>
        </div>
      </div>
    </div>
  );
}
