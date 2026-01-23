'use client';

import dynamic from 'next/dynamic';

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

export default function NotesPage() {
    return <CanvasBoard />;
}
