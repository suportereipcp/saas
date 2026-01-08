export default function AdminInfoPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Sobre o Sistema</h3>
                <p className="text-sm text-muted-foreground">
                    Informações de versão e licenciamento.
                </p>
            </div>
            <div className="bg-muted/50 rounded-lg border p-6">
                <h4 className="font-semibold mb-2">SaaS PCP</h4>
                <div className="text-sm text-muted-foreground">Versão: v0.1.0</div>
                <div className="text-sm text-muted-foreground mt-2">
                    Desenvolvido para gerenciamento centralizado de aplicações.
                </div>
            </div>
        </div>
    );
}
