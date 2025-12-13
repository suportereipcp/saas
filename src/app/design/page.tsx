import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DesignPage() {
    return (
        <div className="container mx-auto py-10 space-y-12">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">PCP Design System</h1>
                <p className="text-xl text-muted-foreground">
                    Guia de estilos e componentes padrões da PCP Suporte Rei.
                </p>
            </div>

            {/* Tipografia */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Tipografia</h2>
                <div className="grid gap-4">
                    <div className="flex items-center gap-4">
                        <span className="w-32 text-muted-foreground text-sm">Heading 1</span>
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                            The quick brown fox
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="w-32 text-muted-foreground text-sm">Heading 2</span>
                        <h2 className="text-3xl font-semibold tracking-tight first:mt-0">
                            The quick brown fox
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="w-32 text-muted-foreground text-sm">Heading 3</span>
                        <h3 className="text-2xl font-semibold tracking-tight">
                            The quick brown fox
                        </h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="w-32 text-muted-foreground text-sm">Paragraph</span>
                        <p className="leading-7 [&:not(:first-child)]:mt-6">
                            The quick brown fox jumps over the lazy dog.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="w-32 text-muted-foreground text-sm">Small</span>
                        <small className="text-sm font-medium leading-none">
                            The quick brown fox jumps over the lazy dog.
                        </small>
                    </div>
                </div>
            </section>

            {/* Cores */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Cores</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <ColorCard name="Primary" className="bg-primary text-primary-foreground" />
                    <ColorCard name="Secondary" className="bg-secondary text-secondary-foreground" />
                    <ColorCard name="Destructive" className="bg-destructive text-destructive-foreground" />
                    <ColorCard name="Muted" className="bg-muted text-muted-foreground" />
                    <ColorCard name="Accent" className="bg-accent text-accent-foreground" />
                </div>
            </section>

            {/* Botões */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Botões</h2>
                <div className="flex flex-wrap gap-4">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                </div>
            </section>

            {/* Formulários */}
            <section className="space-y-6">
                <h2 className="text-2xl font-semibold border-b pb-2">Formulários & Cards</h2>
                <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Exemplo de Card</CardTitle>
                            <CardDescription>Este é um card padrão do sistema.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="example-email">Email</Label>
                                <Input id="example-email" placeholder="email@exemplo.com" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="example-pass">Senha</Label>
                                <Input id="example-pass" type="password" />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full">Ação Principal</Button>
                        </CardFooter>
                    </Card>
                </div>
            </section>
        </div>
    );
}

function ColorCard({ name, className }: { name: string; className: string }) {
    return (
        <div className="flex flex-col gap-2">
            <div className={`h-24 w-full rounded-md flex items-center justify-center border shadow-sm ${className}`}>
                <span className="font-semibold">{name}</span>
            </div>
        </div>
    );
}
