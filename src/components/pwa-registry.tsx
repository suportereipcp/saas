"use client";

import { useEffect } from "react";
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase-auth";

const DEV_SW_CLEANUP_RELOAD_KEY = "saas-pcp-dev-sw-cleanup-reloaded";
const DEV_COOKIE_CLEANUP_KEY = "saas-pcp-dev-cookie-cleanup-v3";

function clearLocalhostCookies() {
    const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    if (process.env.NODE_ENV !== "development" || !isLocalhost) {
        return;
    }

    const isLoginPage = window.location.pathname === "/login";

    if (!isLoginPage && sessionStorage.getItem(DEV_COOKIE_CLEANUP_KEY)) {
        return;
    }
    const keepAuthCookie = (name: string) =>
        name === SUPABASE_AUTH_COOKIE_NAME ||
        name.startsWith(`${SUPABASE_AUTH_COOKIE_NAME}.`);

    document.cookie
        .split(";")
        .map((cookie) => cookie.trim().split("=")[0])
        .filter(Boolean)
        .forEach((name) => {
            if (!isLoginPage && keepAuthCookie(name)) {
                return;
            }

            document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
        });

    sessionStorage.setItem(DEV_COOKIE_CLEANUP_KEY, "true");
}

export function PwaRegistry() {
    useEffect(() => {
        clearLocalhostCookies();

        if (!("serviceWorker" in navigator)) {
            return;
        }

        const isLocalhost =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";

        const shouldRegister = process.env.NODE_ENV === "production" && !isLocalhost;

        const cleanupDevRegistrations = async () => {
            const hadController = Boolean(navigator.serviceWorker.controller);
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map((registration) => registration.unregister()));

            if ("caches" in window) {
                const cacheKeys = await window.caches.keys();
                await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
            }

            if ((hadController || registrations.length > 0) && !sessionStorage.getItem(DEV_SW_CLEANUP_RELOAD_KEY)) {
                sessionStorage.setItem(DEV_SW_CLEANUP_RELOAD_KEY, "true");
                window.location.reload();
                return;
            }

            sessionStorage.removeItem(DEV_SW_CLEANUP_RELOAD_KEY);
        };

        if (!shouldRegister) {
            cleanupDevRegistrations().catch((error) => {
                console.error("Failed to clean up service workers in development", error);
            });
            return;
        }

        navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
            console.error("Failed to register service worker", error);
        });
    }, []);

    return null;
}
