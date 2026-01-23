import { createClient } from "@/lib/supabase-server";
import { Bot, Package, Shield, Activity, NotebookPen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

// Helper to map app codes to icons
const getAppIcon = (code: string) => {
    switch (code) {
        case "programadorprensa":
            return Bot;
        case "admin":
            return Shield;
        case "controle_prazo_qualidade":
            return Activity;
        case "anotacoes":
            return NotebookPen;
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
        case "controle_prazo_qualidade":
            return "/controle-prazo-qualidade";
        case "anotacoes":
            return "/anotacoes";
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

    // Fetch profile, apps, and permissions in parallel
    const [profileResult, appsResult, permissionsResult] = await Promise.all([
        supabase.from("profiles").select("full_name, is_super_admin").eq("id", user.id).single(),
        supabase.from("apps").select("*"),
        supabase.from("permissions").select("app_code").eq("user_id", user.id),
    ]);

    const profile = profileResult.data;
    const allApps = appsResult.data || [];
    const userPermissions = new Set((permissionsResult.data || []).map(p => p.app_code));

    // Filter apps
    const appsList = allApps.filter(app => {
        // Super Admin sees ALL active apps (and admin app)
        if (profile?.is_super_admin) {
            return true;
        }

        // Regular users:
        // 1. App must be active
        if (!app.active) return false;

        // 2. 'admin' app is hidden
        if (app.code === 'admin') return false;

        // 3. Must have permission
        return userPermissions.has(app.code);
    });

    // --- MOCK ANOTAÇÕES APP (TEMPORARY) ---
    // This allows us to access the app without database migration for now.
    const hasNotesApp = appsList.find(a => a.code === 'anotacoes');
    if (!hasNotesApp) {
        appsList.push({
            code: 'anotacoes',
            name: 'Caderno Inteligente',
            description: 'Anotações Manuais com IA',
            active: true,
            created_at: new Date().toISOString()
        });
    }

    return (
        <div className="h-full relative w-full">

            {/* Grid of Apps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {appsList.length === 0 ? (
                    <div className="col-span-full py-12 text-muted-foreground text-center">
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
                                className="block group h-full no-underline"
                            >
                                <Card className="h-full aspect-square flex flex-col hover:shadow-lg transition-all duration-200 hover:border-primary/50 group-hover:-translate-y-1">
                                    <div className="flex-1 flex items-center justify-center pt-2">
                                        <div className="p-3 bg-muted/50 rounded-full group-hover:bg-primary/10 transition-colors">
                                            <Icon size={36} strokeWidth={1.5} className="text-primary group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                    <div className="h-10 flex items-center justify-center px-2 pb-2">
                                        <span className="text-sm font-bold tracking-wide uppercase text-center leading-tight line-clamp-2">
                                            {app.name}
                                        </span>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })
                )}
            </div>

            <div className="absolute -bottom-12 right-0 text-xs text-muted-foreground opacity-60 font-medium">
                Powered by PCP
            </div>
        </div>
    );
}
