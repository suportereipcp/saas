import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Tag, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NoteDetailModalProps {
    note: {
        id: string;
        created_at: string;
        title: string;
        tags: string[];
        content?: string;
        transcription?: string; // Add transcription support
    } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NoteDetailModal({ note, open, onOpenChange }: NoteDetailModalProps) {
    const [copied, setCopied] = useState(false);

    if (!note) return null;

    const displayDate = new Date(note.created_at).toLocaleString('pt-BR');
    const displayContent = note.transcription || note.content || note.title;

    const handleCopy = () => {
        navigator.clipboard.writeText(displayContent);
        setCopied(true);
        toast.success("Conteúdo copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

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
                    <div className="bg-slate-50 p-8 rounded-xl border border-slate-100 text-slate-800 text-xl leading-relaxed whitespace-pre-wrap font-medium min-h-[400px]">
                        {displayContent}
                    </div>

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

                    <Button onClick={() => onOpenChange(false)} className="bg-slate-900 text-slate-100 hover:bg-slate-800">
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
