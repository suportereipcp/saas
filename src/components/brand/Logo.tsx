import Image from "next/image";
import iconParams from "@/app/icon.png";

export function Logo({ className }: { className?: string }) {
    return (
        <div className={`flex items-center gap-3 select-none cursor-default ${className}`}>
            <div className="h-10 w-10 relative shrink-0">
                <Image
                    src={iconParams}
                    alt="SaaS Logo"
                    fill
                    className="object-contain"
                />
            </div>
            <span className="text-3xl font-bold tracking-tight text-foreground font-sans whitespace-nowrap uppercase">
                SaaS PCP
            </span>
        </div>
    );
}
