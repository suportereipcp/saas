"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MotivoParada {
  id: string;
  descricao: string;
  ativo: boolean;
  created_at?: string;
}

export default function MotivosParadaGestao() {
  const [motivos, setMotivos] = useState<MotivoParada[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<MotivoParada | null>(null);
  
  // Form State
  const [formId, setFormId] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAtivo, setFormAtivo] = useState(true);

  const fetchMotivos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/apont-rubber-prensa/motivos-parada");
      if (res.ok) {
        const json = await res.json();
        setMotivos(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMotivos();
  }, []);

  const openNew = () => {
    setEditingMotivo(null);
    setFormId("");
    setFormDesc("");
    setFormAtivo(true);
    setIsModalOpen(true);
  };

  const openEdit = (m: MotivoParada) => {
    setEditingMotivo(m);
    setFormId(m.id);
    setFormDesc(m.descricao);
    setFormAtivo(m.ativo);
    setIsModalOpen(true);
  };

  const saveMotivo = async () => {
    if (!formId || !formDesc) return alert("Preencha ID e Descrição");
    
    setFormLoading(true);
    try {
      if (editingMotivo) {
        // Update
        await fetch("/api/apont-rubber-prensa/motivos-parada", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingMotivo.id, newId: formId, descricao: formDesc, ativo: formAtivo }),
        });
      } else {
        // Create
        await fetch("/api/apont-rubber-prensa/motivos-parada", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: formId, descricao: formDesc, ativo: formAtivo }),
        });
      }
      setIsModalOpen(false);
      fetchMotivos();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar.");
    } finally {
      setFormLoading(false);
    }
  };

  const toggleAtivo = async (m: MotivoParada) => {
    setLoading(true);
    try {
      await fetch("/api/apont-rubber-prensa/motivos-parada", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, ativo: !m.ativo }),
      });
      fetchMotivos();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground">Motivos de Parada</h1>
          <p className="text-muted-foreground mt-1">Gerencie as opções do tablet dos operadores</p>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 px-6 shadow-md font-bold">
          <Plus className="w-5 h-5 mr-2" /> Novo Motivo
        </Button>
      </div>

      <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="p-4 font-bold text-muted-foreground">ID (Código ERP)</th>
                <th className="p-4 font-bold text-muted-foreground">Descrição</th>
                <th className="p-4 font-bold text-muted-foreground">Status no Tablet</th>
                <th className="p-4 font-bold text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
                  </td>
                </tr>
              ) : motivos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhum motivo cadastrado. Execute a migration SQL.</td>
                </tr>
              ) : (
                motivos.map((m) => (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="p-4 font-black text-lg">{m.id}</td>
                    <td className="p-4 font-semibold text-foreground">{m.descricao}</td>
                    <td className="p-4">
                      <Badge variant="outline" className={m.ativo ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "bg-red-500/10 text-red-600 border-red-200"}>
                        {m.ativo ? "Ativo (Visível)" : "Inativo (Oculto)"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                       <Button variant="ghost" size="sm" onClick={() => toggleAtivo(m)} title={m.ativo ? "Desativar" : "Ativar"}>
                         {m.ativo ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                       </Button>
                       <Button variant="outline" size="sm" onClick={() => openEdit(m)}>
                         <Edit className="w-4 h-4" />
                       </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl rounded-2xl border-border">
            <CardHeader className="border-b border-border bg-muted/30">
              <h2 className="text-xl font-bold">{editingMotivo ? 'Editar Motivo' : 'Novo Motivo'}</h2>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-muted-foreground uppercase mb-1 block">ID Numérico (ERP)</label>
                <input 
                  type="text" 
                  value={formId} 
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="Ex: 80"
                  className="w-full h-12 px-4 rounded-xl border border-input focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground uppercase mb-1 block">Descrição do Motivo</label>
                <input 
                  type="text" 
                  value={formDesc} 
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Ex: Troca de Forma"
                  className="w-full h-12 px-4 rounded-xl border border-input focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={saveMotivo} disabled={formLoading}>
                  {formLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Dados"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
