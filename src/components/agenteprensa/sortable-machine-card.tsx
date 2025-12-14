"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";

interface Machine {
    id: string;
    slots: (string | null)[];
}

interface SortableMachineCardProps {
    machine: Machine;
    id: string;
}

export function SortableMachineCard({ machine, id }: SortableMachineCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        touchAction: "none", // Prevent scrolling while dragging on touch devices
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm flex flex-col items-stretch h-full hover:shadow-md transition-shadow">
                {/* Machine Header */}
                <div className="bg-white p-2 border-b border-gray-100 text-center select-none">
                    <span className="text-sm font-bold text-[#2B4964]">{machine.id}</span>
                </div>

                {/* Slots Container */}
                <div className="p-2 space-y-2 bg-white min-h-[80px] flex flex-col justify-center flex-1">
                    {machine.slots.map((slot, idx) => (
                        <div key={idx}>
                            {slot ? (
                                <div className="bg-[#D1FADF] text-[#027A48] border border-[#A6F4C5] rounded py-1 px-2 text-center text-sm font-bold shadow-sm select-none">
                                    {slot}
                                </div>
                            ) : (
                                <div className="border border-dashed border-gray-300 rounded py-1 px-2 text-center h-[30px] flex items-center justify-center select-none">
                                    <span className="text-gray-300 text-xs">-</span>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Placeholder for empty machine visual balance if needed */}
                    {machine.slots.length === 0 && (
                        <div className="border border-dashed border-gray-300 rounded py-1 px-2 text-center h-[60px] flex items-center justify-center select-none">
                            <span className="text-gray-300 text-xs">Vazio</span>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
