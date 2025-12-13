export function Logo({ className }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Text */}
            <span className="text-4xl font-bold tracking-tight text-[#2B4964] font-sans whitespace-nowrap">
                SUPORTE REI
            </span>
        </div>
    );
}
