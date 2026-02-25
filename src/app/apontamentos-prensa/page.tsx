"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, RefreshCw, Image as ImageIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PrensavulcRecord {
  id: number;
  timestamp: string;
  num_maq: string;
  qtde_ciclos: number;
  status_operacao: string;
  num_pedido: string;
}

export default function ApontamentosPrensaPage() {
  const [records, setRecords] = useState<PrensavulcRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/apontamentos-prensa");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro desconhecido ao carregar dados");
      }

      setRecords(result.data || []);
    } catch (err: any) {
      console.error("Erro ao buscar apontamentos da API MariaDB:", err);
      setError("Não foi possível carregar os apontamentos. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Apontamentos da Prensa
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Acompanhamento em tempo real das operações de vulcanização.
          </p>
        </div>
        <Button onClick={fetchRecords} disabled={loading} variant="outline" className="shrink-0 flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Atualizar
        </Button>
      </div>

      {error ? (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6 text-red-600 dark:text-red-400">
            {error}
          </CardContent>
        </Card>
      ) : loading && records.length === 0 ? (
        <div className="flex justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {records.map((record) => (
            <Card key={record.id} className="overflow-hidden hover:shadow-md transition-shadow dark:border-neutral-800">
              {/* placeholder da imagem - Se tiver url real da imagem colocar aqui */}
              <div className="aspect-video bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center border-b border-neutral-200 dark:border-neutral-800 relative z-0">
                <ImageIcon className="w-10 h-10 text-neutral-300 dark:text-neutral-700" />
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                  Máquina {record.num_maq}
                </div>
              </div>

              <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800/50">
                <div className="flex justify-between items-start mb-1">
                  <Badge variant={record.status_operacao === '1' ? 'default' : 'secondary'} className="font-medium">
                    Status: {record.status_operacao}
                  </Badge>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                    ID: #{record.id}
                  </span>
                </div>
                <CardTitle className="text-lg mt-2">Pedido: {record.num_pedido}</CardTitle>
                <CardDescription>
                  {format(new Date(record.timestamp), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 config flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900/20">
                <div className="flex flex-col">
                  <span className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Ciclos</span>
                  <span className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">{record.qtde_ciclos}</span>
                </div>
                {/* Você pode adicionar mais botões de ação ou infos aqui */}
              </CardContent>
            </Card>
          ))}
          {records.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center text-neutral-500">
              Nenhum apontamento encontrado na prensa.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
