export default function AgentDashboard() {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-[#2B4964] uppercase tracking-wide">
                Dashboard Agente
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric Cards - Light Theme */}
                <div className="p-6 rounded-lg bg-white shadow-sm border border-grey-light">
                    <h3 className="text-grey-darker text-sm font-medium uppercase">Notícias Processadas</h3>
                    <p className="text-3xl font-bold text-primary mt-2">1,248</p>
                </div>
                <div className="p-6 rounded-lg bg-white shadow-sm border border-grey-light">
                    <h3 className="text-grey-darker text-sm font-medium uppercase">Fontes Ativas</h3>
                    <p className="text-3xl font-bold text-primary mt-2">42</p>
                </div>
                <div className="p-6 rounded-lg bg-white shadow-sm border border-grey-light">
                    <h3 className="text-grey-darker text-sm font-medium uppercase">Alertas Enviados</h3>
                    <p className="text-3xl font-bold text-primary mt-2">856</p>
                </div>
            </div>

            {/* Chart Placeholder */}
            <div className="p-8 rounded-lg bg-white shadow-sm border border-grey-light h-64 flex items-center justify-center">
                <p className="text-grey-darker font-medium">Gráfico de Atividade (Placeholder)</p>
            </div>
        </div>
    );
}
