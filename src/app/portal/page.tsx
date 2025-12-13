import { Bot } from "lucide-react";
import Link from "next/link";

const apps = [
    {
        name: "Programador Prensa Vulc.",
        icon: Bot,
        href: "/agenteprensa",
        description: "Gestão de Armazém"
    }
];

export default function PortalPage() {
    return (
        <div className="min-h-screen bg-grey-lighter font-sans text-grey-darkest p-8">
            <div className="container mx-auto max-w-5xl">
                {/* Header Section */}
                <div className="mb-8 flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-[#2B4964] uppercase tracking-wide">
                        Seus Aplicativos
                    </h1>
                    <div className="text-sm text-grey-darker">
                        Bem-vindo, <strong>Usuário</strong>
                    </div>
                </div>

                {/* Grid of Apps */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {apps.map((app) => (
                        <Link
                            key={app.name}
                            href={app.href}
                            className="bg-white rounded-lg shadow-sm border border-grey-light hover:shadow-md hover:border-primary transition-all duration-200 p-8 flex flex-col items-center justify-center group h-48 no-underline"
                        >
                            <div className="mb-4 text-primary group-hover:scale-110 transition-transform duration-200">
                                <app.icon size={48} strokeWidth={1.5} />
                            </div>
                            <span className="text-[#2B4964] font-bold text-lg tracking-wide uppercase group-hover:text-primary transition-colors text-center">
                                {app.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="absolute bottom-4 right-4 text-xs text-grey-darker opacity-60 font-medium">
                Powered by PCP
            </div>
        </div>
    );
}
