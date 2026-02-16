"use client";

import { useState } from "react";
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import { createSnapModifier } from "@dnd-kit/modifiers";
import { DraggableMachineCard } from "./draggable-machine-card";

interface Machine {
    id: string;
    slots: (string | null)[];
}

interface MachineGridProps {
    initialMachines: Machine[];
}

type Coordinates = {
    x: number;
    y: number;
};

// Config for the initial grid layout
const CARD_WIDTH = 128; // 108px card + 20px gap
const CARD_HEIGHT = 180; // Estimate
const COLS = 6;
const GRID_SIZE = 10; // Snap grid size

export function MachineGrid({ initialMachines }: MachineGridProps) {
    // initialize positions
    const [positions, setPositions] = useState<Record<string, Coordinates>>(() => {
        const initial: Record<string, Coordinates> = {};
        initialMachines.forEach((machine, index) => {
            const col = index % COLS;
            const row = Math.floor(index / COLS);
            initial[machine.id] = {
                x: col * CARD_WIDTH + 20, // margin-left
                y: row * CARD_HEIGHT + 20 // margin-top
            };
        });
        return initial;
    });

    // ... (omitting unchanged parts)


    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [dragState, setDragState] = useState<{ activeId: string | null; delta: { x: number; y: number } }>({
        activeId: null,
        delta: { x: 0, y: 0 }
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Prevent accidental drags on click
            },
        })
    );

    const snapToGridModifier = createSnapModifier(GRID_SIZE);

    // Toggle selection on click
    const handleCardClick = (id: string, e: React.MouseEvent) => {
        // If dragging just finished, ignore the click (prevent deselecting after drag)
        // dnd-kit usually handles this by not firing click if drag happened, but let's be safe.
        // Actually, dnd-kit activationConstraint handles it.

        const newSelected = new Set(e.ctrlKey || e.metaKey ? selectedIds : []);

        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    // Background click deselects all
    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedIds(new Set());
        }
    };

    function handleDragStart(event: any) {
        const { active } = event;
        const id = active.id as string;

        // If dragging an unselected item, select it (and deselect others unless ctrl held - simpler: just select it)
        if (!selectedIds.has(id)) {
            setSelectedIds(new Set([id]));
        }

        setDragState({ activeId: id, delta: { x: 0, y: 0 } });
    }

    function handleDragMove(event: any) {
        const { delta, active } = event;
        setDragState({ activeId: active.id, delta });
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, delta } = event;
        const id = active.id as string;

        setDragState({ activeId: null, delta: { x: 0, y: 0 } });

        // If we didn't really move, do nothing (prevents floating point drifts if any)
        if (!delta.x && !delta.y) return;

        setPositions((prev) => {
            const nextPositions = { ...prev };

            // Allow multi-drag if the active item is part of the selection
            const itemsToMove = selectedIds.has(id) ? Array.from(selectedIds) : [id];

            itemsToMove.forEach((itemId) => {
                const current = prev[itemId];
                if (!current) return;

                const newX = current.x + delta.x;
                const newY = current.y + delta.y;

                nextPositions[itemId] = {
                    x: Math.round(newX / GRID_SIZE) * GRID_SIZE,
                    y: Math.round(newY / GRID_SIZE) * GRID_SIZE,
                };
            });

            return nextPositions;
        });
    }

    const [selectionBox, setSelectionBox] = useState<{ start: Coordinates; current: Coordinates } | null>(null);

    // Helper for consistent coordinates
    const getCoordinates = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        return {
            x: e.clientX - rect.left + e.currentTarget.scrollLeft,
            y: e.clientY - rect.top + e.currentTarget.scrollTop
        };
    };

    // Box Selection Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        // Only start if clicking directly on the background
        if (e.target !== e.currentTarget) return;

        const start = getCoordinates(e);
        setSelectionBox({ start, current: start });

        if (!e.ctrlKey && !e.metaKey) {
            setSelectedIds(new Set());
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!selectionBox) return;

        const current = getCoordinates(e);
        setSelectionBox(prev => prev ? { ...prev, current } : null);

        // Calculate intersection live
        const boxLeft = Math.min(selectionBox.start.x, current.x);
        const boxTop = Math.min(selectionBox.start.y, current.y);
        const boxRight = Math.max(selectionBox.start.x, current.x);
        const boxBottom = Math.max(selectionBox.start.y, current.y);

        const newSelection = new Set(selectedIds);

        // Estimated Card Size for collision
        const CARD_W = 108;
        const CARD_H = 140;

        Object.entries(positions).forEach(([id, pos]) => {
            // Check overlap
            const machineLeft = pos.x;
            const machineRight = pos.x + CARD_W;
            const machineTop = pos.y;
            const machineBottom = pos.y + CARD_H;

            const isOverlapping =
                machineLeft < boxRight &&
                machineRight > boxLeft &&
                machineTop < boxBottom &&
                machineBottom > boxTop;

            if (isOverlapping) {
                newSelection.add(id);
            }
        });

        setSelectedIds(newSelection);
    };

    const handleMouseUp = () => {
        setSelectionBox(null);
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            modifiers={[snapToGridModifier]}
        >
            <div
                className="relative w-full min-h-full bg-[#FCFCFD] overflow-hidden select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Selection Box Overlay */}
                {selectionBox && (
                    <div
                        className="absolute bg-blue-500/20 border border-blue-500 z-50 pointer-events-none"
                        style={{
                            left: Math.min(selectionBox.start.x, selectionBox.current.x),
                            top: Math.min(selectionBox.start.y, selectionBox.current.y),
                            width: Math.abs(selectionBox.current.x - selectionBox.start.x),
                            height: Math.abs(selectionBox.current.y - selectionBox.start.y),
                        }}
                    />
                )}

                {initialMachines.map((machine) => {
                    const pos = positions[machine.id];
                    if (!pos) return null;

                    const isSelected = selectedIds.has(machine.id);
                    const manualOffset = (isSelected && dragState.activeId && dragState.activeId !== machine.id)
                        ? dragState.delta
                        : null;

                    return (
                        <DraggableMachineCard
                            key={machine.id}
                            id={machine.id}
                            machine={machine}
                            top={pos.y}
                            left={pos.x}
                            isSelected={isSelected}
                            onClick={(e) => handleCardClick(machine.id, e)}
                            manualOffset={manualOffset}
                        />
                    );
                })}
            </div>
        </DndContext>
    );
}
