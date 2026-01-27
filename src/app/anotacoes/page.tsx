'use client';

import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { NotesWelcome } from './components/NotesWelcome';
import { Suspense, useEffect, useState } from 'react';

const CanvasBoard = dynamic(() => import('./components/CanvasBoard'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 font-medium">Preparando seu caderno...</p>
            </div>
        </div>
    )
});

function NotesContent() {
    const searchParams = useSearchParams();
    const router = useRouter(); // Import useRouter
    const noteId = searchParams.get('noteId');
    const isNew = searchParams.get('new') === 'true';
    const [isChecking, setIsChecking] = useState(true);

    // Auto-Redirect to Last Active Note
    useEffect(() => {
        // Only run if we are at the root (no specific note/mode selected)
        if (!noteId && !isNew) {
            const lastActive = localStorage.getItem('notes_last_active');
            if (lastActive) {
                router.replace(`/anotacoes?${lastActive}`);
                // Don't stop loading, as we are redirecting
                return;
            }
        }
        // If we didn't redirect, stop loading and show Welcome
        setIsChecking(false);
    }, [noteId, isNew, router]);

    // If "Edit Mode" (noteId) OR "Create Mode" (new=true) -> Show Canvas
    if (noteId || isNew) {
        return <CanvasBoard />;
    }

    // While checking persistence, show nothing (or a subtle spinner) to prevent flash
    if (isChecking) {
        return <div className="w-full h-full bg-slate-50" />;
    }

    // Default -> Show Welcome Landing
    return <NotesWelcome />;
}

export default function NotesPage() {
    return (
        <Suspense fallback={<div className="w-full h-full bg-slate-50" />}>
            <NotesContent />
        </Suspense>
    );
}
