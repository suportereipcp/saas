'use client';

import { Tldraw, Editor, DefaultSizeStyle, DefaultDashStyle, DefaultColorStyle, DefaultFillStyle, getSnapshot } from 'tldraw';
import 'tldraw/tldraw.css';
import { Button } from '@/components/ui/button';
import { Save, File, NotebookText, Palette, Pencil, Loader2, X, FilePlus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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

// License check removed for security

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

// Helper: Calculate a safe image scale to prevent Out of Memory (OOM) crashes
const getSafeScaleForImage = (editor: Editor, ids: any[]): number => {
    try {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const id of ids) {
            const bounds = editor.getShapePageBounds(id);
            if (bounds) {
                if (bounds.minX < minX) minX = bounds.minX;
                if (bounds.minY < minY) minY = bounds.minY;
                if (bounds.maxX > maxX) maxX = bounds.maxX;
                if (bounds.maxY > maxY) maxY = bounds.maxY;
            }
        }
        const width = maxX === -Infinity ? 0 : maxX - minX;
        const height = maxY === -Infinity ? 0 : maxY - minY;
        const maxDim = Math.max(width, height);
        if (maxDim > 0) {
             return Math.max(0.01, Math.min(0.5, 1500 / maxDim));
        }
    } catch (e) {
        console.warn("Fallback scale due to bounds error", e);
    }
    return 0.2; 
};

// Helper: Redimensiona imagem via Canvas 2D para garantir payload pequeno o suficiente para a Vercel
// Limite: 800px na maior dimensão, JPEG quality 0.7
const resizeImageToMaxSize = (base64: string, maxPx = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const h = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64); return; }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64); // fallback: retorna original
        img.src = base64;
    });
};

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





    // State
    const [taggingOpen, setTaggingOpen] = useState(false);
    const [bgPattern, setBgPattern] = useState<'blank' | 'lines'>('lines');
    const [showPalette, setShowPalette] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTags, setCurrentTags] = useState<string[]>([]);
    const [currentTranscription, setCurrentTranscription] = useState("");
    const [userId, setUserId] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    
    // DIRTY STATE: Track initial state to warn on unsaved close
    const [initialHash, setInitialHash] = useState<string>("");
    const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);

    // Monitor Online Status & Sync
    useEffect(() => {
        if (typeof window === 'undefined') return;
        setIsOnline(navigator.onLine);

        const handleOnline = async () => {
            setIsOnline(true);
            toast.success("Conexão restabelecida!");
            // Sincronizar notas salvas offline ANTES de transcrever
            await syncOfflineQueue();
            processPendingTranscriptions();
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.warning("Você está offline. As notas serão salvas, mas a transcrição ficará pendente.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, editor]);

    // Warn user about unsaved changes before closing/navigating away
    useEffect(() => {
        if (!editor) return;

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            const currentHash = getCanvasHash();
            let isDirty = false;

            if (noteId) {
                isDirty = currentHash !== initialHash;
            } else {
                isDirty = currentHash !== "empty";
            }

            if (isDirty) {
                event.preventDefault();
                event.returnValue = ''; // Required for Chrome to show the prompt
                return ''; // Standard for other browsers
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [editor, noteId, initialHash]);

    // Intercept SPA Navigation (Next.js Link clicks)
    useEffect(() => {
        if (!editor) return;

        const handleAnchorClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            
            if (anchor) {
                const href = anchor.getAttribute('href');
                // Allow external links or same-page anchors if needed (refine as necessary)
                if (href && (href.startsWith('/') || href.startsWith(window.location.origin))) {
                     const currentHash = getCanvasHash();
                     let isDirty = false;
         
                     if (noteId) {
                          isDirty = currentHash !== initialHash;
                     } else {
                          isDirty = currentHash !== "empty";
                     }

                     if (isDirty) {
                         e.preventDefault();
                         e.stopPropagation();
                         setIsCloseDialogOpen(true);
                     }
                }
            }
        };

        // Capture phase to intercept before Next.js Link handles it
        document.addEventListener('click', handleAnchorClick, true);
        return () => document.removeEventListener('click', handleAnchorClick, true);
    }, [editor, noteId, initialHash]);

    const processPendingTranscriptions = async () => {
        if (!editor || !userId) return;

        // Find notes with PENDENTE_TRANSCRICAO
        const { data: pendingNotes } = await supabase
            .schema('app_anotacoes')
            .from('notes')
            .select('*')
            .eq('user_id', userId)
            .contains('tags', ['PENDENTE_TRANSCRICAO']);

        if (!pendingNotes || pendingNotes.length === 0) return;

        toast.loading(`Sincronizando ${pendingNotes.length} transcrições pendentes...`, { id: 'sync-trx' });

        const currentSnapshot = getSnapshot(editor.store); // Backup current

        try {
            for (const note of pendingNotes) {
                if (note.canvas_data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    editor.loadSnapshot(note.canvas_data as any);
                    await new Promise(resolve => setTimeout(resolve, 800));

                    try {
                        let ids = Array.from(editor.getCurrentPageShapeIds());
                        // Filtra formas com dimensões inválidas que causam crash no SVG export
                        ids = ids.filter(id => {
                            const bounds = editor.getShapePageBounds(id);
                            return bounds && bounds.w > 0 && bounds.h > 0;
                        });
                        if (ids.length > 0) {
                            const safeScale = getSafeScaleForImage(editor, ids);
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const result = await (editor as any).toImage(ids, { format: 'jpeg', quality: 0.6, scale: safeScale, background: true, padding: 32 });
                            if (result && result.blob) {
                                const blob = result.blob;
                                const reader = new FileReader();
                                const base64 = await new Promise<string>((resolve) => {
                                    reader.onloadend = () => resolve(reader.result as string);
                                    reader.readAsDataURL(blob);
                                });

                                const response = await fetch('/api/transcribe', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ image: base64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "") })
                                });

                                if (response.ok) {
                                    const data = await response.json();
                                    const text = data.text || "";
                                    const newTags = (note.tags || []).filter((t: string) => t !== 'PENDENTE_TRANSCRICAO');
                                    await supabase
                                        .schema('app_anotacoes')
                                        .from('notes')
                                        .update({ transcription: text, tags: newTags })
                                        .eq('id', note.id);
                                }
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to sync note ${note.id}`, e);
                    }
                }
            }
            toast.success("Sincronização concluída!");
        } catch (err) {
            console.error("Sync error", err);
            toast.error("Erro na sincronização.");
        } finally {
            editor.loadSnapshot(currentSnapshot);
            toast.dismiss('sync-trx');
        }
    };

    // --- OFFLINE QUEUE: Salvar notas localmente quando sem internet ---
    const OFFLINE_QUEUE_KEY = `offline_notes_queue_${userId}`;

    const saveToOfflineQueue = (snapshot: any, title: string, tags: string[], transcription: string) => {
        try {
            const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
            queue.push({
                snapshot,
                title,
                tags,
                transcription,
                noteId: noteId || null, // null = nota nova
                userId,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        } catch (e) {
            console.error('Failed to save to offline queue:', e);
        }
    };

    const syncOfflineQueue = async () => {
        if (!userId) return;
        try {
            const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
            if (queue.length === 0) return;

            toast.loading(`Sincronizando ${queue.length} nota(s) salva(s) offline...`, { id: 'sync-offline' });

            const remainingQueue: any[] = [];

            for (const item of queue) {
                try {
                    // Adicionar tag para transcrição posterior
                    const syncTags = [...(item.tags || [])];
                    if (!syncTags.includes('PENDENTE_TRANSCRICAO')) {
                        syncTags.push('PENDENTE_TRANSCRICAO');
                    }

                    if (item.noteId) {
                        // UPDATE nota existente
                        const result = await supabase
                            .schema('app_anotacoes')
                            .from('notes')
                            .update({
                                canvas_data: item.snapshot,
                                tags: syncTags,
                                transcription: item.transcription || '[Aguardando transcrição...]',
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', item.noteId);
                        if (result.error) throw result.error;
                    } else {
                        // INSERT nota nova
                        const result = await supabase
                            .schema('app_anotacoes')
                            .from('notes')
                            .insert({
                                user_id: item.userId,
                                title: item.title,
                                canvas_data: item.snapshot,
                                tags: syncTags,
                                transcription: item.transcription || '[Aguardando transcrição...]',
                                updated_at: new Date().toISOString()
                            });
                        if (result.error) throw result.error;
                    }
                } catch (e) {
                    console.error('Failed to sync offline note:', e);
                    remainingQueue.push(item); // Mantém na fila se falhou
                }
            }

            // Atualizar fila com apenas os que falharam
            if (remainingQueue.length > 0) {
                localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingQueue));
                toast.warning(`${remainingQueue.length} nota(s) não sincronizaram. Tentaremos novamente.`, { id: 'sync-offline' });
            } else {
                localStorage.removeItem(OFFLINE_QUEUE_KEY);
                toast.success(`${queue.length} nota(s) sincronizada(s) com sucesso!`, { id: 'sync-offline' });
            }
        } catch (e) {
            console.error('Sync offline queue error:', e);
            toast.error('Erro ao sincronizar notas offline.', { id: 'sync-offline' });
        }
    };

    // Ref to track if we are currently discarding the note to prevent race conditions with auto-save
    const isDiscardingRef = useRef(false);

    // State for Discard Confirmation Dialog


    // State for Saving Loading Dialog
    const [isSavingDialogOpen, setIsSavingDialogOpen] = useState(false);
    
    // CACHE: Store last transcribed hash to avoid redundant API calls
    const [lastTranscribedHash, setLastTranscribedHash] = useState<string>("");
    
    // Fetch User on Mount
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        };
        getUser();
    }, []);

    // Load Note Data
    useEffect(() => {
        if (!editor || !userId) return;

        const loadNote = async () => {
            setIsLoading(true);

            if (noteId) {
                // --- EXISTING NOTE ---
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
                    // 1. Restore Metadata
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

                    // 3. Fallback to DB Canvas
                    if (!loadedFromDraft && data.canvas_data) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        editor.loadSnapshot(data.canvas_data as any);
                    }
                }
            } else {
                // --- NEW NOTE ---
                // Reset metadata
                setCurrentTags([]);
                setCurrentTranscription("");

                // Check for new note draft
                const draftKey = `draft_note_${userId}_new`;
                const localDraft = localStorage.getItem(draftKey);
                
                // Only restore draft if we have an active session (prevents "zombie" drafts after clean exit)
                const hasActiveSession = localStorage.getItem('notes_last_active');
                
                if (localDraft && hasActiveSession) {
                    try {
                        const snapshot = JSON.parse(localDraft);
                        editor.loadSnapshot(snapshot);
                    } catch (e) {
                        console.error("Error loading new note draft:", e);
                    }
                } else {
                    // CLEAN SLATE
                    editor.run(() => {
                        editor.selectAll();
                        editor.deleteShapes(editor.getSelectedShapeIds());
                    });
                }
            }

            // Enforce default styles after any load/clear
            editor.run(() => {
                editor.setStyleForNextShapes(DefaultSizeStyle, 's');
                editor.setStyleForNextShapes(DefaultDashStyle, 'solid');
                editor.setStyleForNextShapes(DefaultColorStyle, 'black');
                editor.setStyleForNextShapes(DefaultFillStyle, 'none');
                editor.setCurrentTool('draw');
            });

            // CAMERA POSITIONING: Center on content or set default zoom
            setTimeout(() => {
                const shapeIds = Array.from(editor.getCurrentPageShapeIds());
                if (shapeIds.length > 0 && noteId) {
                    // Nota existente: centralizar câmera no conteúdo desenhado
                    // Calculando bounding box manualmente para posicionar câmera
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    for (const id of shapeIds) {
                        const bounds = editor.getShapePageBounds(id);
                        if (bounds) {
                            if (bounds.minX < minX) minX = bounds.minX;
                            if (bounds.minY < minY) minY = bounds.minY;
                            if (bounds.maxX > maxX) maxX = bounds.maxX;
                            if (bounds.maxY > maxY) maxY = bounds.maxY;
                        }
                    }
                    if (minX !== Infinity) {
                        const contentW = maxX - minX;
                        const contentH = maxY - minY;
                        const vp = editor.getViewportScreenBounds();
                        const padding = 64;
                        // Calcular zoom necessário para encaixar o conteúdo com padding
                        const zoomX = (vp.width - padding * 2) / contentW;
                        const zoomY = (vp.height - padding * 2) / contentH;
                        const zoom = Math.min(zoomX, zoomY, 1); // Nunca maior que 100%
                        const centerX = minX + contentW / 2;
                        const centerY = minY + contentH / 2;
                        editor.setCamera({
                            x: -(centerX - (vp.width / zoom) / 2),
                            y: -(centerY - (vp.height / zoom) / 2),
                            z: zoom
                        });
                    }
                } else {
                    // Nota nova: forçar zoom 100% na posição inicial
                    editor.setCamera({ x: 0, y: 0, z: 1 });
                }
            }, 150);

            // Set Initial Hash for Dirty Checking
            setTimeout(() => {
                const initHash = getCanvasHash();
                setInitialHash(initHash);
                setLastTranscribedHash(initHash);
            }, 200);

            setIsLoading(false);
        };

        loadNote();
    }, [editor, noteId, userId]);


    // Auto-Retry Logic
    useEffect(() => {
        const autoRetry = searchParams.get('autoRetry') === 'true';
        // Ensure we only retry if fully loaded (isLoading=false), editor is ready, and we have the note data
        if (autoRetry && !isLoading && editor && noteId && currentTags !== undefined) {
             const timer = setTimeout(() => {
                 toast.info("Reprocessando transcrição automaticamente...");
                 handleSave(currentTags, currentTranscription);
             }, 800);
             
             return () => clearTimeout(timer);
        }
        // Add currentTags/transcription to dep array to ensure we have latest values
    }, [isLoading, editor, noteId, searchParams, currentTags, currentTranscription]);


    // Initial Editor Config (Styles)
    useEffect(() => {
        if (!editor) return;

        // Set defaults: Size S, Dash Solid (Continuous), Black, No Fill
        editor.run(() => {
            editor.setStyleForNextShapes(DefaultSizeStyle, 's');
            editor.setStyleForNextShapes(DefaultDashStyle, 'solid');
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



    // Helper: Generate fingerprint of current canvas state
    const getCanvasHash = (): string => {
        if (!editor) return "";
        try {
            const ids = Array.from(editor.getCurrentPageShapeIds()).sort();
            if (ids.length === 0) return "empty";
            
            // Serialize relevant properties of all shapes to detect changes
            const shapesData = ids.map(id => {
                const shape = editor.getShape(id);
                if (!shape) return "";
                // Include props, position, rotation, etc.
                return JSON.stringify({
                    type: shape.type,
                    x: shape.x,
                    y: shape.y,
                    props: shape.props,
                    rotation: shape.rotation,
                    opacity: shape.opacity
                });
            });
            
            return shapesData.join('|');
        } catch (e) {
            console.error("Hash error", e);
            return Date.now().toString(); // Fallback always new
        }
    };

    const handleSave = async (selectedTags: string[], transcriptionInputValue: string) => {
        if (!editor || !userId) {
            toast.error("Erro: Editor não carregado ou usuário não logado.");
            return;
        }

        try {
            // Open Loading Dialog
            setIsSavingDialogOpen(true);

            let finalTranscription = transcriptionInputValue;
            let finalTags = [...selectedTags];

            // --- OFFLINE MODE: Salvar na fila local e sair ---
            if (!isOnline) {
                const snapshot = getSnapshot(editor.store);
                const title = `Anotação ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

                if (!finalTags.includes('PENDENTE_TRANSCRICAO')) {
                    finalTags.push('PENDENTE_TRANSCRICAO');
                }

                saveToOfflineQueue(snapshot, title, finalTags, finalTranscription || '');

                isDiscardingRef.current = true;
                const draftKey = `draft_note_${userId}_${noteId || 'new'}`;
                localStorage.removeItem(draftKey);
                localStorage.removeItem('notes_last_active');

                toast.success("Salvo localmente! Será sincronizado quando a internet voltar.", { duration: 4000 });
                setIsSavingDialogOpen(false);
                router.push('/anotacoes/memory');
                return;
            }

            // 1. DETERMINE IF TRANSCRIPTION WILL BE NEEDED & GENERATE IMAGE
            const textWasModifiedInModal = transcriptionInputValue !== currentTranscription && transcriptionInputValue.trim() !== '';
            const currentHash = getCanvasHash();
            const drawingChanged = currentHash !== lastTranscribedHash;
            let shouldTranscribe = drawingChanged || !textWasModifiedInModal;
            let processingImageBase64 = "";

            if (shouldTranscribe) {
                try {
                    let ids = Array.from(editor.getCurrentPageShapeIds());
                    // Filter out zero or negative dimension shapes which cause <foreignObject> SVG export crashes
                    ids = ids.filter(id => {
                        const bounds = editor.getShapePageBounds(id);
                        return bounds && bounds.w > 0 && bounds.h > 0;
                    });

                    if (ids.length > 0) {
                        const safeScale = getSafeScaleForImage(editor, ids);
                        const imgResult = await (editor as any).toImage(ids, { format: 'jpeg', quality: 0.6, scale: safeScale, background: true, padding: 32 });
                        if (imgResult?.blob) {
                            const reader = new FileReader();
                            const rawBase64 = await new Promise<string>((resolve, reject) => {
                                reader.onloadend = () => {
                                    if (typeof reader.result === 'string') resolve(reader.result);
                                    else reject(new Error("Failed to read blob"));
                                };
                                reader.onerror = reject;
                                reader.readAsDataURL(imgResult.blob);
                            });

                            // Redimensiona para máximo 800px: garante payload < 300KB independente do tamanho do desenho
                            processingImageBase64 = await resizeImageToMaxSize(rawBase64, 800, 0.75);

                            // Vercel Serverless limit: 4.5MB. Com resize 800px isso nunca deve ser atingido.
                            if (processingImageBase64.length > 3.5 * 1024 * 1024) {
                                console.warn("Image too large for background transcription");
                                toast.warning("Imagem muito grande para transcrição automática. Tente dividir em duas notas.");
                                shouldTranscribe = false;
                            } else {
                                finalTags = finalTags.filter(t =>
                                    t !== 'TRANSCRIPTION_SUCCESS' &&
                                    t !== 'TRANSCRIPTION_ERROR'
                                );
                                if (!finalTags.includes('PROCESSING_TRANSCRIPTION')) {
                                    finalTags.push('PROCESSING_TRANSCRIPTION');
                                }
                            }
                        } else {
                            shouldTranscribe = false;
                        }
                    } else {
                        shouldTranscribe = false;
                    }
                } catch (e) {
                    console.warn("Background image gen failed before saving", e);
                    shouldTranscribe = false;
                }
            }

            // 2. OPTIMISTIC UI: SAVE TO LOCAL CACHE AND REDIRECT IMMEDIATELY
            const snapshot = getSnapshot(editor.store);
            const title = `Anotação ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            const finalNoteId = noteId || crypto.randomUUID();

            try {
                // Save to optimistic cache for the Memory page to pick up instantly
                // NOTE: We intentionally exclude canvas_data to avoid localStorage quota issues
                const OPTIMISTIC_KEY = 'optimistic_saving_notes';
                const cachedDocs = JSON.parse(localStorage.getItem(OPTIMISTIC_KEY) || '[]');
                const newOptDoc = {
                    id: finalNoteId,
                    user_id: userId,
                    title: title,
                    tags: finalTags,
                    transcription: finalTranscription,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_optimistic: true
                };
                
                // Remove older version if updating
                const filteredDocs = cachedDocs.filter((d: any) => d.id !== finalNoteId);
                filteredDocs.push(newOptDoc);
                localStorage.setItem(OPTIMISTIC_KEY, JSON.stringify(filteredDocs));
            } catch (cacheErr) {
                console.warn("Failed to write optimistic cache", cacheErr);
            }

            // CLEANUP LOCAL DRAFTS & REDIRECT IMMEDIATELY
            isDiscardingRef.current = true;
            const draftKey = `draft_note_${userId}_${noteId || 'new'}`;
            localStorage.removeItem(draftKey);
            localStorage.removeItem('notes_last_active');

            toast.success("Anotação salva!");
            setIsSavingDialogOpen(false);
            router.push('/anotacoes/memory');

            // 3. BACKGROUND TASKS: DB WRITE AND TRANSCRIPTION FIRE (Totally non-blocking)
            Promise.resolve().then(async () => {
                let dbSaveSuccess = true;
                try {
                    if (isEditing && noteId) {
                        const result = await supabase
                            .schema('app_anotacoes')
                            .from('notes')
                            .update({
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                canvas_data: snapshot as any,
                                tags: finalTags,
                                transcription: finalTranscription,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', finalNoteId);
                        if (result.error) throw result.error;
                    } else {
                        const result = await supabase
                            .schema('app_anotacoes')
                            .from('notes')
                            .insert({
                                id: finalNoteId, // Using the explicit UUID generated locally
                                user_id: userId,
                                title: title,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                canvas_data: snapshot as any,
                                tags: finalTags,
                                transcription: finalTranscription,
                                updated_at: new Date().toISOString()
                            });
                        if (result.error) throw result.error;
                    }
                } catch (dbErr) {
                    console.error("Background DB save failed:", dbErr);
                    toast.error("Anotação salva apenas localmente. Falha ao enviar para nuvem.");
                    dbSaveSuccess = false;
                    // Optionally push back to offline queue here if needed
                    saveToOfflineQueue(snapshot, title, finalTags, finalTranscription || '');
                }

                // Fire Transcription only if DB save succeeded
                if (dbSaveSuccess && isOnline && finalNoteId && shouldTranscribe && processingImageBase64) {
                    fetch('/api/transcribe-background', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ noteId: finalNoteId, image: processingImageBase64 })
                    }).catch(async (err) => {
                        console.warn("Background transcription fire failed:", err);
                        const { data: n } = await supabase.schema('app_anotacoes').from('notes').select('tags').eq('id', finalNoteId).single();
                        const fixed = (n?.tags || []).filter((t: string) => t !== 'PROCESSING_TRANSCRIPTION');
                        if (!fixed.includes('TRANSCRIPTION_ERROR')) fixed.push('TRANSCRIPTION_ERROR');
                        await supabase.schema('app_anotacoes').from('notes').update({ tags: fixed }).eq('id', finalNoteId);
                    });
                }
                
                // Cleanup optimistic cache after enough time for the real DB to show it
                // (Or Memory Page polling will clean it up on next fetch if IDs match, but we can do a safe cleanup here too)
                setTimeout(() => {
                    try {
                        const cached = JSON.parse(localStorage.getItem('optimistic_saving_notes') || '[]');
                        const left = cached.filter((d: any) => d.id !== finalNoteId);
                        localStorage.setItem('optimistic_saving_notes', JSON.stringify(left));
                    } catch (e) { /* ignore */ }
                }, 10000); // Remove from cache 10s later max
            });

        } catch (error: any) {
            console.error("Save error:", error);
            toast.error(`Erro ao salvar: ${error.message}. O rascunho continua salvo neste dispositivo.`);
            setIsSavingDialogOpen(false);
        }
    };


    const handleAutoTranscribe = async (useCache = false): Promise<string> => {
        if (!editor) return "";

        try {
            let ids = Array.from(editor.getCurrentPageShapeIds());
            // Filtra formas com dimensões inválidas que causam crash no SVG export
            ids = ids.filter(id => {
                const bounds = editor.getShapePageBounds(id);
                return bounds && bounds.w > 0 && bounds.h > 0;
            });
            if (ids.length === 0) return "";

            // CACHE CHECK
            const currentHash = getCanvasHash();
            
            if (useCache && lastTranscribedHash && currentHash === lastTranscribedHash && currentTranscription) {
                console.log("Skipping transcription: Content unchanged since last analysis.");
                return currentTranscription;
            }

            const safeScale = getSafeScaleForImage(editor, ids);
            const result = await (editor as any).toImage(ids, { format: 'jpeg', quality: 0.6, scale: safeScale, background: true, padding: 32 });

            if (!result || !result.blob) {
                throw new Error("Falha ao gerar imagem da anotação");
            }

            const blob = result.blob;

            // Convert to Base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                reader.onloadend = () => {
                    if (typeof reader.result === 'string') resolve(reader.result);
                    else reject(new Error("Failed to read blob"));
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            const base64 = await base64Promise;

            // Redimensiona para max 800px antes de enviar — garante payload < 300KB
            const base64Resized = await resizeImageToMaxSize(base64, 800, 0.75);

            // Call API
            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Resized })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to transcribe");
            }

            const data = await response.json();
            const resultText = data.text || "";

            // Update Cache
            setLastTranscribedHash(currentHash);
            
            // IMPORTANT: If called from Modal, we don't necessarily set currentTranscription here
            // Modal ends up calling setTranscription internally.
            // But if called from Save, we return it.

            return resultText;

        } catch (error: any) {
            console.error("Transcribe Error:", error);
            throw error;
        }
    };
    
    const exitEditor = () => {
        // 0. Set Discarding Flag to prevent auto-save from writing back
        isDiscardingRef.current = true;
        
        // Clear persistence
        localStorage.removeItem('notes_last_active');
        // Clear local draft for ANY note (new or existing) since user chose to exit without saving
        if (userId) {
             localStorage.removeItem(`draft_note_${userId}_${noteId || 'new'}`);
        }
        router.push('/anotacoes/memory');
    };

    const handleCloseRequest = () => {
        if (!editor) {
            exitEditor();
            return;
        }
        
        const currentHash = getCanvasHash();
        
        // If content changed from initial load OR (for new notes) if content is not empty
        // logic: if existing note -> changed from start?
        // logic: if new note -> is not empty? (hash 'empty' means empty)
        
        let isDirty = false;
        if (noteId) {
             isDirty = currentHash !== initialHash;
        } else {
             isDirty = currentHash !== "empty"; // For new notes, if not empty, it's dirty
        }

        if (isDirty) {
            setIsCloseDialogOpen(true);
        } else {
            exitEditor();
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



            {/* FAB Stack - Bottom Right */}
            <div className="absolute bottom-10 right-6 z-50 flex flex-col items-end gap-3">
                
                {/* Close/Exit Button - RED */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-red-600 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-red-200 whitespace-nowrap">
                        Fechar
                    </span>
                    <Button
                        size="icon"
                        className="h-12 w-12 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-900/15 hover:shadow-lg transition-all duration-300 hover:scale-105 group border-2 border-red-400"
                        onClick={handleCloseRequest}
                        title="Fechar e Voltar para Lista"
                    >
                        <X className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
                    </Button>
                </div>

                {/* Nova Anotação Button (Only when Editing) - BLUE */}
                {isEditing && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-blue-600 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-blue-200 whitespace-nowrap">
                            Nova Nota
                        </span>
                        <Button
                            size="icon"
                            className="h-12 w-12 rounded-full bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-900/15 hover:shadow-lg transition-all duration-300 hover:scale-105 group border-2 border-blue-400"
                            onClick={() => router.push('/anotacoes')}
                            title="Nova Anotação"
                        >
                            <FilePlus className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                        </Button>
                    </div>
                )}

                {/* Main Save Button - GREEN */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-emerald-700 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm border border-emerald-200 whitespace-nowrap">
                        Salvar
                    </span>
                    <Button
                        size="icon"
                        className="h-12 w-12 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-900/20 hover:shadow-lg transition-all duration-300 hover:scale-105 group border-2 border-emerald-500"
                        onClick={() => setTaggingOpen(true)}
                        title={isEditing ? "Salvar Alterações" : "Salvar Nova Nota"}
                    >
                        <Save className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                    </Button>
                </div>
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



            <Dialog open={isSavingDialogOpen} onOpenChange={(open) => !open && setIsSavingDialogOpen(open)}>
                <DialogContent className="sm:max-w-md flex flex-col items-center justify-center p-8 [&>button]:hidden">
                   <div className="flex flex-col items-center gap-4 text-center">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        <DialogTitle className="text-lg font-semibold text-primary">Salvando Anotação</DialogTitle>
                        <p className="text-gray-600">Donizete por favor aguarde um pouco pois estou salvando as informações...</p>
                   </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Deseja sair sem salvar?</DialogTitle>
                        <DialogDescription>
                            Você tem alterações não salvas. Se sair agora, o que você escreveu/desenhou será perdido.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                        <Button 
                            type="button" 
                            variant="ghost"
                            onClick={() => setIsCloseDialogOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={() => {
                                setIsCloseDialogOpen(false);
                                exitEditor();
                            }}
                        >
                            Sair sem Salvar
                        </Button>
                        <Button
                            type="button"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                                setIsCloseDialogOpen(false);
                                setTaggingOpen(true); // Open tagging modal to save
                            }}
                        >
                            Salvar Agora
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
