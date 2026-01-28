"use client";

import { motion } from "framer-motion";

interface AnimatedProgressBarProps {
    value: number; // 0 to 100
    height?: string;
    className?: string;
    colorClass?: string;
    bgClass?: string;
}

export default function AnimatedProgressBar({
    value,
    height = "h-4",
    className = "",
    colorClass = "bg-[#a8e6cf]",
    bgClass = "bg-slate-200"
}: AnimatedProgressBarProps) {
    // Clamp value between 0 and 100
    const clampedValue = Math.min(Math.max(value, 0), 100);

    return (
        <div className={`w-full rounded-full overflow-hidden shadow-inner ${height} ${bgClass} ${className}`}>
            <motion.div
                className={`h-full rounded-full relative ${colorClass}`}
                initial={{ width: "0%" }}
                animate={{ width: `${clampedValue}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            >
                {/* Subtle shine effect */}
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/30 animate-pulse" />
            </motion.div>
        </div>
    );
}
