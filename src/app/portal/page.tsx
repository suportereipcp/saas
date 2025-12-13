import { createClient } from "@/lib/supabase-server";
import { Bot, Package, Shield } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// Helper to map app codes to icons
const getAppIcon = (code: string) => {
    switch (code) {
        case "programadorprensa":
            return Bot;
        case "admin":
            return Shield;
        default:
            return Package; // Default icon
    }
};

// Helper to map app codes to routes
const getAppHref = (code: string) => {
    switch (code) {
        case "programadorprensa":
            return "/agenteprensa";
        case "admin":
            return "/admin";
        default:
            return `/${code}`;
    }
};

export default async function PortalPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Fetch profile and apps in parallel
    const [profileResult, appsResult] = await Promise.all([
        supabase.from("profiles").select("full_name, is_super_admin").eq("id", user.id).single(),
        supabase.from("apps").select("*").eq("active", true),
    ]);

    const profile = profileResult.data;
    const allApps = appsResult.data || [];

    // Filter apps: 'admin' code only visible to super admins
    const appsList = allApps.filter(app => {
        if (app.code === 'admin') {
            return profile?.is_super_admin;
        }
        return true;
    });

    return (
        <div className="h-full relative max-w-5xl">
            {/* Grid of Apps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {appsList.length === 0 ? (
                    <div className="col-span-full py-12 text-grey-darker">
                        Nenhum aplicativo disponível no momento.
                    </div>
                ) : (
                    appsList.map((app) => {
                        const Icon = getAppIcon(app.code);
                        const href = getAppHref(app.code);

                        return (
                            <Link
                                key={app.code}
                                href={href}
                                className="bg-white rounded-lg shadow-sm border border-grey-light hover:shadow-md hover:border-primary transition-all duration-200 p-4 flex flex-col items-center justify-center group h-36 no-underline"
                            >
                                <div className="mb-3 text-primary group-hover:scale-110 transition-transform duration-200">
                                    <Icon size={36} strokeWidth={1.5} />
                                </div>
                                <span className="text-[#2B4964] font-bold text-sm tracking-wide uppercase group-hover:text-primary transition-colors text-center leading-tight">
                                    {app.name}
                                </span>
                                {app.description && (
                                    <span className="text-[10px] text-grey-darker mt-1 text-center opacity-80 leading-tight">
                                        {app.description}
                                    </span>
                                )}
                            </Link>
                        );
                    })
                )}
            </div>

            <div className="absolute bottom-0 right-0 text-xs text-grey-darker opacity-60 font-medium">
                Powered by PCP
            </div>
        </div>
    );
}
