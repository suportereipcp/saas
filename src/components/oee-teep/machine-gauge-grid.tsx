"use client";

import { useId } from "react";
import { Card, CardContent } from "@/components/ui/card";

type MachineGaugeCardItem = {
  maquina: string;
  valor: number;
};

function getKpiTone(value: number) {
  if (value < 50) {
    return {
      textClass: "text-red-500",
      accentColor: "#ef4444",
      trackColor: "#fee2e2",
      borderClass: "border-red-200",
      badgeClass: "bg-red-50 text-red-600",
      labelClass: "text-red-400",
    };
  }

  if (value < 70) {
    return {
      textClass: "text-amber-500",
      accentColor: "#f59e0b",
      trackColor: "#fef3c7",
      borderClass: "border-amber-200",
      badgeClass: "bg-amber-50 text-amber-600",
      labelClass: "text-amber-400",
    };
  }

  return {
    textClass: "text-emerald-500",
    accentColor: "#22c55e",
    trackColor: "#dcfce7",
    borderClass: "border-emerald-200",
    badgeClass: "bg-emerald-50 text-emerald-600",
    labelClass: "text-emerald-400",
  };
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeTopArc(centerX: number, centerY: number, radius: number, percent: number) {
  const start = polarToCartesian(centerX, centerY, radius, 270);
  const clampedPercent = Math.max(0, Math.min(100, percent));
  const endAngle = 270 + (clampedPercent / 100) * 180;
  const end = polarToCartesian(centerX, centerY, radius, endAngle);

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

function MetricGauge({
  value,
  textClass,
  accentColor,
  trackColor,
}: {
  value: number;
  textClass: string;
  accentColor: string;
  trackColor: string;
}) {
  const markerId = useId();
  const safeValue = Math.max(0, Math.min(100, value));
  const centerX = 110;
  const centerY = 110;
  const radius = 76;
  const pointerLength = radius;
  const pointerAngle = 270 + (safeValue / 100) * 180;
  const pointerTip = polarToCartesian(centerX, centerY, pointerLength, pointerAngle);
  const trackPath = describeTopArc(centerX, centerY, radius, 100);
  const valuePath = describeTopArc(centerX, centerY, radius, safeValue);

  return (
    <div className="relative mx-auto w-full max-w-[280px]">
      <svg viewBox="0 0 220 140" className="w-full h-auto">
        <defs>
          <marker
            id={markerId}
            markerWidth="5"
            markerHeight="5"
            refX="4.2"
            refY="2.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 5 2.5 L 0 5 z" fill="#505E71" />
          </marker>
        </defs>
        <path
          d={trackPath}
          fill="none"
          stroke={trackColor}
          strokeWidth="28"
          strokeLinecap="butt"
        />
        {safeValue > 0 && (
          <path
            d={valuePath}
            fill="none"
            stroke={accentColor}
            strokeWidth="28"
            strokeLinecap="butt"
          />
        )}

        <line
          x1={centerX}
          y1={centerY}
          x2={pointerTip.x}
          y2={pointerTip.y}
          stroke="#505E71"
          strokeWidth="2"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
        <circle cx={centerX} cy={centerY} r="3" fill="#505E71" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pt-4">
        <span className={`text-3xl font-black tracking-tight ${textClass}`}>{safeValue}%</span>
      </div>
    </div>
  );
}

export function MachineGaugeGrid({
  items,
}: {
  items: MachineGaugeCardItem[];
}) {
  if (items.length === 0) {
    return (
      <Card className="border border-dashed border-slate-200 shadow-none">
        <CardContent className="py-16 text-center">
          <p className="text-sm font-semibold text-slate-700">Nenhuma máquina encontrada para os filtros selecionados.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {items.map((item) => {
        const tone = getKpiTone(item.valor);

        return (
          <Card key={item.maquina} className={`border ${tone.borderClass} shadow-sm hover:shadow-md transition-shadow bg-white`}>
            <CardContent className="p-5">
              <div className="mb-2">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${tone.labelClass}`}>Máquina</p>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900">{item.maquina}</h2>
                </div>
              </div>

              <MetricGauge
                value={item.valor}
                textClass={tone.textClass}
                accentColor={tone.accentColor}
                trackColor={tone.trackColor}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
