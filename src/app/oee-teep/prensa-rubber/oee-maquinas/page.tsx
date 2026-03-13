"use client";

import { useState, useEffect } from "react";
import { getAllMachinesOeeTeep } from "@/actions/oee-metrics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OeeMaquinasPage() {
  const [periodo, setPeriodo] = useState("Hoje");
  const [data, setData] = useState<{maquina: string, oee: number, teep: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getAllMachinesOeeTeep(periodo);
        if (active) {
          // Sort by maquina name logically if needed, but it's already sorted by DB or numerical
          setData(result);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchData();

    return () => { active = false; };
  }, [periodo]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OEE Máquinas</h1>
          <p className="text-muted-foreground">Comparativo de OEE e TEEP entre todas as máquinas.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Período:</span>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Hoje">Hoje</SelectItem>
              <SelectItem value="Últimas 24h">Últimas 24h</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
          <CardDescription>
            Mostrando o desempenho (OEE e TEEP) de todas as máquinas para o período: {periodo}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[500px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 30,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="maquina" 
                    tick={{ fontSize: 12 }} 
                    angle={-45} 
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}%`]}
                    cursor={{fill: 'transparent'}}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Bar dataKey="oee" name="OEE" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="teep" name="TEEP" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
