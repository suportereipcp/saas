"use client";

import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    className?: string;
    format?: 'currency' | 'percent' | 'number';
}

export default function AnimatedCounter({
    value,
    prefix = "",
    suffix = "",
    decimals = 0,
    className = "",
    format = 'number'
}: AnimatedCounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        damping: 30, // Smooth settling
        stiffness: 80, // Response speed
        duration: 2000 // Overall duration hint
    });
    const isInView = useInView(ref, { once: true, margin: "0px" });

    useEffect(() => {
        if (isInView) {
            motionValue.set(value);
        }
    }, [motionValue, isInView, value]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
            if (ref.current) {
                let formatted = "";

                if (format === 'currency') {
                    formatted = new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals,
                    }).format(latest);
                } else if (format === 'percent') {
                    formatted = latest.toFixed(decimals).replace('.', ',') + "%";
                } else {
                    formatted = latest.toLocaleString('pt-BR', {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals,
                    });
                }

                // Intl formats usually include the symbol (e.g. R$), so we strip it if prefix is provided manually
                // But for simplicity, if 'currency' is selected, we largely trust Intl.
                // If prefix is provided, we might prepend it.

                if (format === 'currency') {
                    // Remove R$ if likely duplicate, or just trust formatting
                    // Keep user prefix if provided, but typically we rely on format
                    if (prefix) formatted = formatted.replace("R$", "").trim();
                }

                ref.current.textContent = `${prefix}${formatted}${suffix}`;
            }
        });
    }, [springValue, decimals, format, prefix, suffix]);

    return <span ref={ref} className={className} />;
}
