"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";

interface Machine {
    id: string;
    slots: (string | null)[];
}

interface DraggableMachineCardProps {
    machine: Machine;
    id: string;
    top: number;
    left: number;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
    manualOffset?: { x: number; y: number } | null;
}

export function DraggableMachineCard({
    machine,
    id,
    top,
    left,
    isSelected,
    onClick,
    manualOffset
}: DraggableMachineCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging
    } = useDraggable({ id: id });

    // Determine the visual transform:
    // 1. If this card is officially dragging (active), use dnd-kit's transform.
    // 2. If this card is part of a selection being dragged (but not the handle), use manualOffset.
    const effectiveTransform = transform
        ? CSS.Translate.toString(transform)
        : manualOffset
            ? `translate3d(${manualOffset.x}px, ${manualOffset.y}px, 0)`
            : undefined;

    const style = {
        transform: effectiveTransform,
        top: top,
        left: left,
        position: 'absolute' as const,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1000 : (isSelected ? 100 : 1), // Selected items slightly higher
        width: '108px',
        touchAction: "none",
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className="cursor-pointer hover:z-50"
        >
            <Card className={`p-0 overflow-hidden border shadow-sm flex flex-col items-stretch h-full transition-shadow bg-white select-none ${isSelected ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'border-gray-200 hover:shadow-md'}`}>
                {/* Machine Header */}
                <div className={`p-2 border-b text-center ${isSelected ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100'}`}>
                    <span className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-[#2B4964]'}`}>{machine.id}</span>
                </div>

                {/* Slots Container */}
                <div className="p-2 space-y-2 bg-white min-h-[80px] flex flex-col justify-center flex-1">
                    {machine.slots.map((slot, idx) => (
                        <div key={idx}>
                            {slot ? (
                                <div className="bg-[#D1FADF] text-[#027A48] border border-[#A6F4C5] rounded py-1 px-2 text-center text-sm font-bold shadow-sm">
                                    {slot}
                                </div>
                            ) : (
                                <div className="border border-dashed border-gray-300 rounded py-1 px-2 text-center h-[30px] flex items-center justify-center">
                                    <span className="text-gray-300 text-xs">-</span>
                                </div>
                            )}
                        </div>
                    ))}
                    {machine.slots.length === 0 && (
                        <div className="border border-dashed border-gray-300 rounded py-1 px-2 text-center h-[60px] flex items-center justify-center">
                            <span className="text-gray-300 text-xs">Vazio</span>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
