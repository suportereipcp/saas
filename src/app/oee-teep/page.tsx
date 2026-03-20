import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Gauge } from "lucide-react";

export default function OeeTeepPage() {
  return (
    <div className="relative w-full p-4 sm:p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 md:gap-6 w-full">
        <Link href="/oee-teep/prensa-rubber" className="block group no-underline w-full">
          <Card className="aspect-square flex flex-col hover:shadow-lg transition-all duration-200 border-2 border-[#68D9A6] group-hover:-translate-y-1 bg-[#e1f2ea]">
            <div className="flex-1 flex items-center justify-center pt-2">
              <div className="p-3 bg-muted/50 rounded-full group-hover:bg-primary/10 transition-colors">
                <Gauge size={36} strokeWidth={1.5} className="text-primary group-hover:text-primary transition-colors" />
              </div>
            </div>
            <div className="h-14 flex flex-col items-center justify-center px-2 pb-2 gap-0.5">
              <span className="text-sm font-bold tracking-wide uppercase text-center leading-tight line-clamp-2">
                Prensa Rubber
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
