"use client";

import { useEffect } from "react";

export function PwaRegistry() {
    useEffect(() => {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }
    }, []);

    return null;
}
