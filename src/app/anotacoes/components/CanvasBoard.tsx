'use client';

import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import { Button } from '@/components/ui/button';
import { Save, File, NotebookText, Palette, Pencil } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { TaggingModal } from './TaggingModal';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';


import { MOCK_CHAT_HISTORY } from '../mock-data';

const TLDRAW_COMPONENTS = {
    PageMenu: null,
    MainMenu: null,
    NavigationPanel: null,
    DebugMenu: null,
    HelpMenu: null,
};

export default function CanvasBoard() {
    const searchParams = useSearchParams();
    const noteId = searchParams.get('noteId');
    const isEditing = !!noteId;

    // Find existing note data to pre-fill tags
    const existingNote = noteId ? MOCK_CHAT_HISTORY.find(n => n.id === noteId) : null;
    const initialTags = existingNote ? existingNote.tags : [];

    const [taggingOpen, setTaggingOpen] = useState(false);
    const [bgPattern, setBgPattern] = useState<'blank' | 'lines'>('lines');
    const [showPalette, setShowPalette] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);
    const [scrollProgress, setScrollProgress] = useState(0);

    useEffect(() => {
        if (!editor) return;

        const updateState = () => {
            const camera = editor.getCamera();

            // 1. Constrain Camera: Prevent panning above y=0 (Top of page)
            if (camera.y > 0) { // Tldraw camera.y > 0 means looking "up" (content moves down)? 
                // Wait, Tldraw coordinates:
                // Camera(0,0) = Top-left at 0,0.
                // Panning DOWN (to see lower content) -> Camera Y moves NEGATIVE? Or Positive?
                // Let's re-verify standard logic.
                // Usually Viewport = Content * Zoom + Camera.
                // If I pan down, I want to see y=1000. My viewport rect shifts down.
                // In Tldraw, camera.y increases as you pan down?
                // Let's test with the scroll indicator logic I verified: 
                // "const progress = Math.min(Math.max(-y / VIRTUAL_HEIGHT, 0), 1) * 100;"
                // If I pan down, -y increases? So y is negative?
                // Yes, typically in 2D engines: Camera Position is inverse of World movement.
                // Moving Camera DOWN (positive Y) usually means world moves UP.
                // Wait... if I behave like a scrollable page:
                // ScrollTop increases. Content moves UP.
                // Tldraw Camera Y typically represents the point of the world at top-left.
                // If I scroll down 100px, Camera Y = 100.
                // If I scroll UP past 0, Camera Y = -100.

                // Let's stick to the visual debugging: 
                // "progress = -y" in my previous code worked for "descendo a pagina".
                // If I descend, progress increases. So -y increases. So y decreases (becomes more negative).
                // So "Top" is y=0. "Down" is y < 0.
                // Wait, if y < 0 is "Down", then y > 0 is "Up" (Above top).
                // User wants to block "Up". So block y > 0.

                editor.setCamera({ ...camera, y: 0 });
            }

            // Update Scrollbar Progress
            // Recalculate with constrained y
            const { y } = editor.getCamera();
            const VIRTUAL_HEIGHT = 5000;
            const progress = Math.min(Math.max(-y / VIRTUAL_HEIGHT, 0), 1) * 100;
            setScrollProgress(progress);
        };

        const cleanup = editor.store.listen(() => {
            updateState();
        });

        return () => cleanup();
    }, [editor]);

    // Calculate background offset to make lines scroll with canvas
    // We need current camera Y for this. Storing it in state might cause too many re-renders.
    // Ideally use a ref or Tldraw's shape for lines. 
    // BUT for now, user asked about "infinite up". Let's solve that.
    // If lines are static, they look like a transparent overlay. That's acceptable for "notebook" feel usually.
    // Let's just fix the infinite up first.

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
                    hideUi={false}
                    onMount={setEditor}
                    // We use a constant components object to avoid unmounting/remounting
                    // Visibility is handled by the CSS above
                    components={TLDRAW_COMPONENTS}
                />
            </div>

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

            {/* Floating Action Button */}
            <div className="absolute bottom-20 right-6 z-50">
                <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-110 group ring-1 ring-white/20 ring-inset"
                    onClick={() => setTaggingOpen(true)}
                >
                    <Save className="w-7 h-7 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                </Button>
            </div>

            {/* Visual Right Scrollbar */}
            <div className="absolute top-0 bottom-0 right-0 w-3 bg-transparent pointer-events-none z-40 flex flex-col items-start pt-4 pr-0.5">
                <div
                    className="w-1.5 h-32 bg-gray-300/50 rounded-full backdrop-blur-sm transition-all duration-75"
                    style={{ transform: `translateY(${window.innerHeight * (scrollProgress / 100)}px)` }}
                />
            </div>

            <TaggingModal
                open={taggingOpen}
                onOpenChange={setTaggingOpen}
                initialSelectedTags={initialTags}
            />
        </div>
    );
}
