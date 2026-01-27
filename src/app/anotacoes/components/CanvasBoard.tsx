'use client';

import { Tldraw, Editor, DefaultSizeStyle, DefaultDashStyle, DefaultColorStyle, DefaultFillStyle, getSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { Button } from '@/components/ui/button';
import { Save, File, NotebookText, Palette, Pencil, Loader2, X } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { TaggingModal } from './TaggingModal';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';

// Mock removed, using real DB

const TLDRAW_COMPONENTS = {
    PageMenu: null,
    MainMenu: null,
    NavigationPanel: null,
    DebugMenu: null,
    HelpMenu: null,
};


interface ScrollIndicatorProps {
    editor: Editor | null;
}

// DEBUG: Check license key in production
if (typeof window !== 'undefined') {
    console.log('Tldraw License Check:', process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY ? 'Key Found' : 'Key Missing', process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY);
}

function ScrollIndicator({ editor }: ScrollIndicatorProps) {
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        if (!editor) return;

        const updateState = () => {
            const { y } = editor.getCamera();
            const VIRTUAL_HEIGHT = 5000;
            const progress = Math.min(Math.max(-y / VIRTUAL_HEIGHT, 0), 1) * 100;
            setScrollProgress(progress);
        };

        // Initial update
        updateState();

        const cleanup = editor.store.listen(() => {
            updateState();
        });

        return () => cleanup();
    }, [editor]);

    if (!editor) return null;

    return (
        <div className="absolute top-0 bottom-0 right-0 w-3 bg-transparent pointer-events-none z-40 flex flex-col items-start pt-4 pr-0.5">
            <div
                className="w-1.5 h-32 bg-gray-300/50 rounded-full backdrop-blur-sm transition-all duration-75"
                style={{ transform: `translateY(${window.innerHeight * (scrollProgress / 100)}px)` }}
            />
        </div>
    );
}

export default function CanvasBoard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const noteId = searchParams.get('noteId');
    const isEditing = !!noteId;

    // --- PERSISTENCE: Save Active State ---
    useEffect(() => {
        // We are inside the editor, so we are "active".
        // Save the current search string (e.g. "?new=true" or "?noteId=...")
        const params = searchParams.toString();
        if (params) {
            localStorage.setItem('notes_last_active', params);
        }
    }, [searchParams]);

    const handleDiscardClick = () => {
        setIsDiscardDialogOpen(true);
    };

    const executeDiscard = () => {
        // 0. Set Discarding Flag to prevent auto-save from writing back
        isDiscardingRef.current = true;

        // 1. Clear persistence
        localStorage.removeItem('notes_last_active');
        
        // 2. Clear Local Draft content (since user explicitly discarded)
        if (userId) {
            const key = `draft_note_${userId}_new`; // We only allow discarding NEW notes via this button
            localStorage.removeItem(key);
        }

        // 3. Navigate back
        router.replace('/anotacoes');
    };



    // State
    const [taggingOpen, setTaggingOpen] = useState(false);
    const [bgPattern, setBgPattern] = useState<'blank' | 'lines'>('lines');
    const [showPalette, setShowPalette] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTags, setCurrentTags] = useState<string[]>([]);
    const [currentTranscription, setCurrentTranscription] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    
    // Ref to track if we are currently discarding the note to prevent race conditions with auto-save
    const isDiscardingRef = useRef(false);
    
    // State for Discard Confirmation Dialog
    const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

    // Fetch User on Mount
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();
    }, [supabase]);

    // Load Note Data if Editing (With Priority for Local Drafts)
    useEffect(() => {
        if (!editor || !noteId || !userId) return;

        const loadNote = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .schema('app_anotacoes')
                .from('notes')
                .select('*')
                .eq('id', noteId)
                .single();

            if (error) {
                console.error("Error loading note:", error);
                toast.error("Erro ao carregar anotação.");
            } else if (data) {
                // 1. Restore Metadata (always from DB)
                if (data.tags) setCurrentTags(data.tags);
                if (data.transcription) setCurrentTranscription(data.transcription);

                // 2. Restore Canvas (Check Local Draft First)
                const draftKey = `draft_note_${userId}_${noteId}`;
                const localDraft = localStorage.getItem(draftKey);
                
                let loadedFromDraft = false;
                if (localDraft) {
                    try {
                        const snapshot = JSON.parse(localDraft);
                        editor.loadSnapshot(snapshot);
                        loadedFromDraft = true;
                    } catch (e) {
                        console.error("Error loading local draft:", e);
                    }
                }

                // 3. Fallback to DB Canvas if no valid draft
                if (!loadedFromDraft && data.canvas_data) {
                    editor.loadSnapshot(data.canvas_data as any);
                }

                // FIX: Enforce default styles (M, Draw, Black) even after loading snapshot
                editor.run(() => {
                    editor.setStyleForNextShapes(DefaultSizeStyle, 'm');
                    editor.setStyleForNextShapes(DefaultDashStyle, 'draw');
                    editor.setStyleForNextShapes(DefaultColorStyle, 'black');
                    editor.setStyleForNextShapes(DefaultFillStyle, 'none');
                    editor.setCurrentTool('draw');
                });
            }
            setIsLoading(false);
        };

        loadNote();
    }, [editor, noteId, userId, supabase]);


    // Initial Editor Config (Styles)
    useEffect(() => {
        if (!editor) return;

        // Set defaults: Size M, Dash Draw (Pen-like), Black, No Fill
        editor.run(() => {
            editor.setStyleForNextShapes(DefaultSizeStyle, 'm');
            editor.setStyleForNextShapes(DefaultDashStyle, 'draw');
            editor.setStyleForNextShapes(DefaultColorStyle, 'black');
            editor.setStyleForNextShapes(DefaultFillStyle, 'none');
            editor.setCurrentTool('draw'); // Default to Pen
        });

    }, [editor]);

    // --- PERSISTENCE: Auto-Save Drafts ---
    useEffect(() => {
        if (!editor || !userId) return;

        const key = `draft_note_${userId}_${noteId || 'new'}`;
        let timeout: NodeJS.Timeout;

        const saveToStorage = () => {
            if (!editor) return;
            try {
                const snapshot = getSnapshot(editor.store);
                localStorage.setItem(key, JSON.stringify(snapshot));
            } catch (e) {
                console.error("Failed to save draft locally", e);
            }
        };

        const handleChange = () => {
            clearTimeout(timeout);
            // Debounce save (1s) to avoid spamming LS
            timeout = setTimeout(saveToStorage, 1000);
        };

        const cleanup = editor.store.listen(handleChange);

        return () => {
            cleanup();
            clearTimeout(timeout);
            // FORCE SAVE on unmount/dep change to capture last second edits
            // BUT ONLY IF NOT DISCARDING
            if (!isDiscardingRef.current) {
                saveToStorage();
            }
        };
    }, [editor, userId, noteId]);

    // --- PERSISTENCE: Restore Draft (New Notes) ---
    useEffect(() => {
        // Only run for new notes (no noteId) and when editor/user is ready
        if (!editor || !userId || noteId) return;

        const key = `draft_note_${userId}_new`;
        const localDraft = localStorage.getItem(key);

                if (localDraft) {
                    try {
                        const snapshot = JSON.parse(localDraft);
                        editor.loadSnapshot(snapshot);
                        // toast.info("Rascunho não salvo restaurado."); // Removed per user request
                    } catch (e) {
                        console.error("Error restoring new note draft:", e);
                    }
                }
    }, [editor, userId, noteId]);

    const handleSave = async (selectedTags: string[], transcriptionInputValue: string) => {
        if (!editor || !userId) {
            toast.error("Erro: Editor não carregado ou usuário não logado.");
            return;
        }

        try {
            // 1. Auto-Transcribe Content (Fresh AI analysis)
            // We ignore the input value if we want to force a refresh, or we could use it if provided.
            // The user requested "The intelligence needs to identify the content", implying a fresh look.
            toast.loading("Analisando conteúdo da nota...", { id: 'save-process' });
            
            let finalTranscription = transcriptionInputValue;
            
            // Always try to update transcription on save
            try {
                const freshTranscription = await handleAutoTranscribe();
                if (freshTranscription) {
                    finalTranscription = freshTranscription;
                }
            } catch (transcribeError) {
                console.warn("Auto-transcription failed on save:", transcribeError);
                // Fallback to existing input or empty, don't block save
            }

            const snapshot = getSnapshot(editor.store);

            // Generate a Title (First text or Default)
            const title = `Anotação ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

            const payload = {
                user_id: userId,
                title: title,
                canvas_data: snapshot as any,
                tags: selectedTags,
                transcription: finalTranscription, // Use the fresh one
                updated_at: new Date().toISOString()
            };

            let result;
            if (isEditing && noteId) {
                // Update
                result = await supabase
                    .schema('app_anotacoes')
                    .from('notes')
                    .update(payload)
                    .eq('id', noteId);
            } else {
                // Insert
                result = await supabase
                    .schema('app_anotacoes')
                    .from('notes')
                    .insert(payload)
                    .select()
                    .single();
            }

            if (result.error) throw result.error;

            // Clear Local Draft on Success
            const key = `draft_note_${userId}_${noteId || 'new'}`;
            localStorage.removeItem(key);

            toast.dismiss('save-process');
            toast.success("Anotação salva e transcrita com sucesso!");

            // Redirect to My Notes
            router.push('/anotacoes/memory');

        } catch (error: any) {
            console.error("Save error:", error);
            toast.dismiss('save-process');
            toast.error(`Erro ao salvar: ${error.message}`);
        }
    };


    const handleAutoTranscribe = async (): Promise<string> => {
        if (!editor) return "";

        try {
            const ids = Array.from(editor.getCurrentPageShapeIds());
            if (ids.length === 0) return "";

            // Use editor.toImage to get a PNG Blob directly
            // @ts-ignore
            const result = await (editor as any).toImage(ids, { format: 'png', background: true, padding: 32 });

            if (!result || !result.blob) {
                throw new Error("Falha ao gerar imagem da anotação");
            }

            const blob = result.blob;

            // Convert to Base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') resolve(reader.result);
                    else reject(new Error("Failed to read blob"));
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const base64 = await base64Promise;

            // Call API
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to transcribe");
            }

            const data = await response.json();
            return data.text || "";

        } catch (error: any) {
            console.error("Transcribe Error:", error);
            throw error;
        }
    };

    return (
        <div
            className="w-full h-full relative bg-white transition-colors duration-300"
            style={bgPattern === 'lines' ? {
                backgroundColor: '#f8f9fa',
                backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '100% 2.5rem',
                backgroundAttachment: 'local' // Attempt to make it scroll? No, main div doesn't scroll.
            } : undefined}
        >
            {/* Dynamic Styles for Tldraw Overrides */}
            {/* We use a standard style tag to reliably override Tldraw's internal CSS */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    /* Background Pattern Overrides */
                    .tl-container, .tl-canvas, .tl-background {
                        touch-action: none; /* Crucial: Prevents browser scrolling/zooming gestures to fix "passive event" console error */
                    }

                    ${bgPattern === 'lines' ? `
                        .tl-container, .tl-canvas, .tl-background {
                            background-color: transparent !important;
                        }
                    ` : ''}

                    /* Palette Visibility Toggle & Positioning */
                    .tlui-style-panel {
                        right: 60px !important; /* Move palette left to avoid scrollbar overlap */
                        ${!showPalette ? 'display: none !important;' : ''}
                    }
                `
            }} />

            <div className="absolute inset-0 z-0">
                <Tldraw
                    licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
                    hideUi={false}
                    onMount={setEditor}
                    // We use a constant components object to avoid unmounting/remounting
                    // Visibility is handled by the CSS above
                    components={TLDRAW_COMPONENTS}
                />
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                </div>
            )}

            {/* Top Center Background Toggle & Tools */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                {isEditing && (
                    <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
                        <Pencil size={12} />
                        Editando Nota Original
                    </div>
                )}

                <div className="bg-white/90 backdrop-blur shadow-md border border-emerald-100 p-1 rounded-full flex gap-1 items-center">
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                            "rounded-full px-4 h-8 transition-all hover:bg-emerald-50 hover:text-emerald-700",
                            bgPattern === 'blank' && "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        )}
                        onClick={() => setBgPattern('blank')}
                    >
                        <File className="w-4 h-4 mr-2" />
                        Liso
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        className={cn(
                            "rounded-full px-4 h-8 transition-all hover:bg-emerald-50 hover:text-emerald-700",
                            bgPattern === 'lines' && "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        )}
                        onClick={() => setBgPattern('lines')}
                    >
                        <NotebookText className="w-4 h-4 mr-2" />
                        Pautado
                    </Button>

                    {/* Vertical Separator */}
                    <div className="w-px h-5 bg-emerald-200 mx-1" />

                    {/* Palette Toggle */}
                    <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                            "rounded-full h-8 w-8 transition-all",
                            showPalette ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" : "text-emerald-700 hover:bg-emerald-50"
                        )}
                        onClick={() => setShowPalette(!showPalette)}
                        title={showPalette ? "Ocultar Cores" : "Mostrar Cores"}
                    >
                        <Palette className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Discard Button (Only for New Notes) - Above Save Button */}
            {!isEditing && (
                <div className="absolute bottom-44 right-6 z-50">
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 shadow-sm transition-all duration-300 hover:scale-110 group border border-red-200"
                        onClick={handleDiscardClick}
                        title="Descartar Rascunho"
                    >
                        <X className="w-6 h-6 transition-transform duration-300 group-hover:rotate-90" />
                    </Button>
                </div>
            )}

            {/* Floating Action Button */}
            <div className="absolute bottom-28 right-6 z-50">
                <Button
                    size="icon"
                    className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 hover:text-emerald-700 shadow-md transition-all duration-300 hover:scale-110 group border border-emerald-200"
                    onClick={() => setTaggingOpen(true)}
                    title={isEditing ? "Salvar Alterações" : "Salvar Nova Nota"}
                >
                    <Save className="w-7 h-7 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                </Button>
            </div>

            {/* Visual Right Scrollbar - ISOLATED COMPONENT */}
            <ScrollIndicator editor={editor} />

            <TaggingModal
                open={taggingOpen}
                onOpenChange={setTaggingOpen}
                initialSelectedTags={currentTags}
                initialTranscription={currentTranscription}
                onConfirm={handleSave}
                onAutoTranscribe={handleAutoTranscribe}
            />

            <Dialog open={isDiscardDialogOpen} onOpenChange={setIsDiscardDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Descartar Anotação?</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja descartar este rascunho? Esta ação não pode ser desfeita e todo o conteúdo desenhado será perdido.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">
                                Cancelar
                            </Button>
                        </DialogClose>
                        <Button 
                            type="button" 
                            variant="destructive" 
                            onClick={executeDiscard}
                        >
                            Sim, descartar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
