import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  colorClass: string;
  subtext?: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, colorClass, subtext, onClick }) => {
  return (
    <Card
      onClick={onClick}
      className="relative overflow-hidden cursor-pointer hover:shadow-md transition-all group border-0 shadow-sm ring-1 ring-gray-100"
    >
      <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500", colorClass)}>
        <Icon className="w-24 h-24" />
      </div>
      <CardContent className="p-6 relative z-10">
        <div className={cn("flex items-center gap-2 mb-2 font-medium", colorClass)}>
          <Icon className="w-5 h-5" />
          {title}
        </div>
        <div className="text-4xl font-bold text-slate-800 mb-1">{value}</div>
        {subtext && <div className="text-xs text-muted-foreground">{subtext}</div>}
      </CardContent>
    </Card>
  );
};