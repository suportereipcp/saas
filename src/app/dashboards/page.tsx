"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function DashboardHub() {
  return (
    <div className="flex flex-col h-full p-8 gap-8">


      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-start">
        {/* Card: Dashboard PCP - Standardized Style */}
        <Link href="/dashboards/pcp" className="group col-span-1 sm:w-56 md:w-64">
           <Card className="aspect-square flex flex-col hover:shadow-lg transition-all duration-200 border-2 border-[#68D9A6] group-hover:-translate-y-1 bg-[#e1f2ea]">
                <div className="flex-1 flex items-center justify-center pt-2">
                    <div className="p-3 bg-muted/50 rounded-full group-hover:bg-primary/10 transition-colors">
                        <LayoutDashboard size={36} strokeWidth={1.5} className="text-primary group-hover:text-primary transition-colors" />
                    </div>
                </div>
                <div className="h-14 flex flex-col items-center justify-center px-2 pb-2 gap-0.5">
                    <span className="text-sm font-bold tracking-wide uppercase text-center leading-tight line-clamp-2">
                        Dashboard P.C.P.
                    </span>

                </div>
            </Card>
        </Link>
      </div>
    </div>
  );
}
