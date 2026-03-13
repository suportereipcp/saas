import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Gauge, Cog, Droplets, Flame, Clock } from "lucide-react";

const setores = [
  {
    nome: "Prensa Rubber",
    descricao: "OEE e TEEP das prensas de borracha",
    href: "/oee-teep/prensa-rubber",
    icon: Gauge,
    ativo: true,
  },
  {
    nome: "Injeção",
    descricao: "Máquinas injetoras",
    href: "#",
    icon: Droplets,
    ativo: false,
  },
  {
    nome: "Extrusão",
    descricao: "Linhas de extrusão",
    href: "#",
    icon: Flame,
    ativo: false,
  },
  {
    nome: "Usinagem",
    descricao: "Centros de usinagem CNC",
    href: "#",
    icon: Cog,
    ativo: false,
  },
  {
    nome: "Montagem",
    descricao: "Linhas de montagem",
    href: "#",
    icon: Clock,
    ativo: false,
  },
];

export default function OeeTeepPage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-600" />
          OEE x TEEP
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione o setor para visualizar os indicadores
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {setores.map((setor) => {
          const Icon = setor.icon;
          const content = (
            <Card
              key={setor.nome}
              className={`relative aspect-square flex flex-col transition-all duration-200 border-2 ${
                setor.ativo
                  ? "border-emerald-400 bg-emerald-50/50 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                  : "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
              }`}
            >
              {!setor.ativo && (
                <Badge className="absolute top-2 right-2 bg-gray-400 text-white text-[9px] px-1.5">
                  EM BREVE
                </Badge>
              )}
              <div className="flex-1 flex items-center justify-center pt-2">
                <div
                  className={`p-4 rounded-full ${
                    setor.ativo
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Icon size={36} strokeWidth={1.5} />
                </div>
              </div>
              <CardContent className="p-3 pt-0 text-center">
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  {setor.nome}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {setor.descricao}
                </p>
              </CardContent>
            </Card>
          );

          if (setor.ativo) {
            return (
              <Link key={setor.nome} href={setor.href} className="block no-underline">
                {content}
              </Link>
            );
          }
          return <div key={setor.nome}>{content}</div>;
        })}
      </div>
    </div>
  );
}
