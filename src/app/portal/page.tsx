import { createClient } from "@/lib/supabase-server";
import { Bot, Package } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// Helper to map app codes to icons
const getAppIcon = (code: string) => {
    switch (code) {
        case "programadorprensa":
            return Bot;
        default:
            return Package; // Default icon
    }
};

// Helper to map app codes to routes
const getAppHref = (code: string) => {
    switch (code) {
        case "programadorprensa":
            return "/agenteprensa";
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
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("apps").select("*").eq("active", true),
    ]);

    const profile = profileResult.data;
    const apps = appsResult.data || [];

    return (
        <div className="min-h-screen bg-grey-lighter font-sans text-grey-darkest p-8">
            <div className="container mx-auto max-w-5xl">
                {/* Header Section */}
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#2B4964] uppercase tracking-wide">
                        Seus Aplicativos
                    </h1>
                    <div className="text-sm text-grey-darker">
                        Bem-vindo, <strong>{profile?.full_name || user.email}</strong>
                    </div>
                </div>

                {/* Grid of Apps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {apps.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-grey-darker">
                            Nenhum aplicativo disponível no momento.
                        </div>
                    ) : (
                        apps.map((app) => {
                            const Icon = getAppIcon(app.code);
                            const href = getAppHref(app.code);

                            return (
                                <Link
                                    key={app.code}
                                    href={href}
                                    className="bg-white rounded-lg shadow-sm border border-grey-light hover:shadow-md hover:border-primary transition-all duration-200 p-8 flex flex-col items-center justify-center group h-48 no-underline"
                                >
                                    <div className="mb-4 text-primary group-hover:scale-110 transition-transform duration-200">
                                        <Icon size={48} strokeWidth={1.5} />
                                    </div>
                                    <span className="text-[#2B4964] font-bold text-lg tracking-wide uppercase group-hover:text-primary transition-colors text-center">
                                        {app.name}
                                    </span>
                                    {app.description && (
                                        <span className="text-xs text-grey-darker mt-2 text-center opacity-80">
                                            {app.description}
                                        </span>
                                    )}
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            <div className="absolute bottom-4 right-4 text-xs text-grey-darker opacity-60 font-medium">
                Powered by PCP
            </div>
        </div>
    );
}
