import { MachineGrid } from "@/components/agenteprensa/machine-grid";

// Mock data to match the image structure
const MACHINES = Array.from({ length: 24 }, (_, i) => {
    const id = i + 1;
    // Randomize some slots for visual fidelity to the image
    const hasSlot1 = Math.random() > 0.3;
    const hasSlot2 = Math.random() > 0.7;

    return {
        id: `M-${id.toString().padStart(2, '0')}`,
        slots: [
            hasSlot1 ? `P-${Math.floor(Math.random() * 900) + 100}` : null,
            // Some machines have 2 slots in the image
            (id % 3 === 0 || id % 7 === 0) ? (hasSlot2 ? `P-${Math.floor(Math.random() * 900) + 100}` : null) : undefined
        ].filter(x => x !== undefined) as (string | null)[]
    };
});

export default function AgentePrensaDashboard() {
    return (
        <div className="h-full w-full">
            <MachineGrid initialMachines={MACHINES} />
        </div>
    );
}
