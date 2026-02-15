import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Tag, Copy, Check, Pencil, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface NoteDetailModalProps {
    note: {
        id: string;
        created_at: string;
        title: string;
        tags: string[];
        content?: string;
        transcription?: string;
    } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTranscriptionUpdated?: (noteId: string, newText: string) => void;
}

export function NoteDetailModal({ note, open, onOpenChange, onTranscriptionUpdated }: NoteDetailModalProps) {
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // Reset edit state when modal opens/closes or note changes
    useEffect(() => {
        if (open && note) {
            setIsEditing(false);
            setEditText(note.transcription || note.content || note.title);
        }
    }, [open, note]);

    if (!note) return null;

    const displayContent = note.transcription || note.content || note.title;

    const handleCopy = () => {
        navigator.clipboard.writeText(isEditing ? editText : displayContent);
        setCopied(true);
        toast.success("Conteúdo copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStartEdit = () => {
        setEditText(displayContent);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .schema('app_anotacoes')
                .from('notes')
                .update({ transcription: editText, updated_at: new Date().toISOString() })
                .eq('id', note.id);

            if (error) throw error;

            toast.success("Transcrição atualizada!");
            setIsEditing(false);

            // Notify parent to update local state
            if (onTranscriptionUpdated) {
                onTranscriptionUpdated(note.id, editText);
            }
        } catch (error: any) {
            console.error("Error updating transcription:", error);
            toast.error("Erro ao salvar transcrição.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditText(displayContent);
    };

    const displayDate = new Date(note.created_at).toLocaleString('pt-BR');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white border-slate-200 shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">
                        <Calendar size={14} />
                        {displayDate}
                    </div>
                    <div className="hidden">
                        <DialogTitle>{note.title}</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="py-6 overflow-y-auto max-h-[70vh]">
                    {isEditing ? (
                        <Textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="min-h-[400px] bg-slate-50 border-emerald-300 focus:border-emerald-500 text-slate-800 text-lg leading-relaxed p-6 rounded-xl font-medium"
                            autoFocus
                        />
                    ) : (
                        <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 text-slate-800 text-xl leading-relaxed whitespace-pre-wrap font-medium min-h-[400px]">
                            {displayContent}
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-2">
                        {note.tags.map(tag => (
                            <div key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wide border border-emerald-100">
                                <Tag size={12} />
                                {tag}
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter className="flex sm:justify-between items-center gap-4 border-t pt-4">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCopy}
                            className={cn(
                                "gap-2 transition-all duration-300",
                                copied ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "text-slate-500"
                            )}
                        >
                            {copied ? (
                                <>
                                    <Check size={16} />
                                    Copiado
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    Copiar Texto
                                </>
                            )}
                        </Button>

                        {isEditing ? (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleCancelEdit}
                                    className="text-slate-500 gap-2"
                                    disabled={isSaving}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSaveEdit}
                                    disabled={isSaving}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                >
                                    {isSaving ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    Salvar
                                </Button>
                            </>
                        ) : (
                            <Button
                                variant="outline"
                                onClick={handleStartEdit}
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 gap-2"
                            >
                                <Pencil size={16} />
                                Editar Transcrição
                            </Button>
                        )}
                    </div>

                    <Button onClick={() => onOpenChange(false)} className="bg-slate-900 text-slate-100 hover:bg-slate-800">
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
