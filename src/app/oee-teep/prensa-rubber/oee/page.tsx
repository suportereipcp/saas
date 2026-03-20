"use client";

import { useEffect, useState } from "react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Filter } from "lucide-react";
import { SearchableSelect, Option } from "@/components/ui/searchable-select";
import { MachineGaugeGrid } from "@/components/oee-teep/machine-gauge-grid";
import { getFilteredMachinesOee, getOeeFiltersData } from "@/actions/oee-metrics";

type MachineOeeCard = {
  maquina: string;
  oee: number;
  disponibilidade: number;
  performance: number;
  qualidade: number;
  tempoOperacional: number;
  qtdSessoes: number;
};

const PERIODOS = ["Hoje", "Últimas 24h", "Últimos 7 dias", "Últimos 30 dias", "Personalizado"];

export default function PrensaRubberOeePage() {
  const [maquina, setMaquina] = useState("Todas");
  const [operador, setOperador] = useState("Todos");
  const [periodo, setPeriodo] = useState("Últimas 24h");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<MachineOeeCard[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [maquinasOptions, setMaquinasOptions] = useState<Option[]>([{ label: "Todas", value: "Todas" }]);
  const [operadoresOptions, setOperadoresOptions] = useState<Option[]>([{ label: "Todos", value: "Todos" }]);

  useEffect(() => {
    async function loadFilters() {
      const data = await getOeeFiltersData();
      setMaquinasOptions([
        { label: "Todas", value: "Todas" },
        ...data.maquinas.map((m) => ({ label: m, value: m })),
      ]);
      setOperadoresOptions([
        { label: "Todos", value: "Todos" },
        ...data.operadores.map((o) => ({ label: o.nome, value: o.matricula })),
      ]);
    }

    loadFilters();
  }, []);

  useEffect(() => {
    async function fetchCards() {
      setLoading(true);
      setLoadError(null);

      try {
        const data = await getFilteredMachinesOee({
          maquina,
          operador,
          periodo,
          dateRangeStr: periodo === "Personalizado" ? JSON.stringify(dateRange) : undefined,
        });
        setCards(data);
      } catch (error) {
        console.error("Erro ao carregar OEE por maquina:", error);
        setCards([]);
        setLoadError("Nao foi possivel carregar os indicadores agora.");
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [maquina, operador, periodo, dateRange]);

  const isFiltered = maquina !== "Todas" || operador !== "Todos" || periodo !== "Últimas 24h";

  if (loading) {
    return (
      <div className="p-4 sm:p-5 flex flex-col items-center justify-center h-[60vh] text-primary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
          Carregando OEE por máquina...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 mr-1">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filtros</span>
        </div>

        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[170px] h-9 text-sm font-semibold">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {periodo === "Personalizado" && (
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        )}

        <SearchableSelect
          options={maquinasOptions}
          value={maquina}
          onChange={setMaquina}
          placeholder="Máquina..."
          className="w-[180px]"
        />

        <SearchableSelect
          options={operadoresOptions}
          value={operador}
          onChange={setOperador}
          placeholder="Operador..."
          className="w-[200px]"
        />

        {isFiltered && (
          <button
            onClick={() => {
              setMaquina("Todas");
              setOperador("Todos");
              setPeriodo("Últimas 24h");
            }}
            className="text-xs font-bold text-primary hover:underline ml-1"
          >
            Limpar filtros
          </button>
        )}
      </div>

      <MachineGaugeGrid
        items={cards.map((card) => ({
          maquina: card.maquina,
          valor: card.oee,
        }))}
      />

      {loadError && (
        <p className="text-sm font-medium text-red-500">{loadError}</p>
      )}
    </div>
  );
}
