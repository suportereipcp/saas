"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export type ActionState = {
    error?: string;
    success?: string;
};

export async function saveInventoryCount(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const itemCode = formData.get("it_codigo") as string;
    const qtdInput = formData.get("qtd_fisica") as string;
    const centroCusto = formData.get("centro_custo") as string;
    const isFinalizado = formData.get("contado") === "on";

    if (!itemCode || !qtdInput || !centroCusto) {
        return { error: "Preencha Código do Item, Quantidade e Centro de Custo." };
    }

    const qtd = parseFloat(qtdInput);
    if (isNaN(qtd)) {
        return { error: "Quantidade inválida." };
    }
    if (qtd < 0) {
        return { error: "A quantidade não pode ser negativa." };
    }

    try {
        const { data: existingItem, error: fetchError } = await supabaseAdmin
            .schema('inventario' as any)
            .from("inventario_rotativo")
            .select("id, qtd_fisica, contado")
            .eq("it_codigo", itemCode)
            .eq("centro_custo", centroCusto)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (existingItem) {
            // Check if already finalized/approved
            if (existingItem.contado) {
                 return { error: "Este item já foi finalizado e não aceita novas contagens." };
            }

            const currentArray = existingItem.qtd_fisica || [];
            const newArray = [...currentArray, qtd];

            let finalContado = false; 

            // 1st Count: LOCK IMMEDIATELY using contado=true.
            // This ensures Operator CANNOT proceed to 2nd count until Admin Rejects (unlocks).
            if (newArray.length === 1) {
                finalContado = true;
            }
            // 2nd Count: Check divergence
            else if (newArray.length === 2) {
                const c1 = newArray[0];
                const c2 = newArray[1];
                if (c1 === c2) {
                    finalContado = true; // Auto-Approve if equal
                } else {
                    finalContado = false; // Divergence -> UNLOCK for 3rd Count (Auto 3rd)
                }
            }
            // 3rd Count: Default to Locked (Admin final decision)
            else {
                finalContado = true;
            }

            const { error: updateError } = await supabaseAdmin
                .schema('inventario' as any)
                .from("inventario_rotativo")
                .update({
                    qtd_fisica: newArray,
                    contado: finalContado, // Use 'true' to signal "Pending Admin Action" or "Done"
                    dt_contagem: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq("id", existingItem.id);

            if (updateError) throw updateError;

        } else {
            const { error: insertError } = await supabaseAdmin
                .schema('inventario' as any)
                .from("inventario_rotativo")
                .insert({
                    it_codigo: itemCode,
                    centro_custo: centroCusto,
                    qtd_fisica: [qtd],
                    contado: true, // LOCK 1st count immediately
                    dt_contagem: new Date().toISOString()
                });

            if (insertError) throw insertError;
        }

        revalidatePath("/inventario-rotativo");
        revalidatePath("/inventario-rotativo/acompanhamento");
        
        return { success: "Contagem salva com sucesso!" };

    } catch (error: any) {
        console.error("saveInventoryCount Error:", error);
        return { error: "Erro ao salvar: " + (error.message || JSON.stringify(error)) };
    }
}

export type InventoryReportItem = {
    it_codigo: string;
    desc_item: string;
    total_qtd: number;
    status_geral: "liberado" | "pendente"; // Liberado se todos CCs confirmaram
    details: {
        id: string;
        centro_custo: string;
        qtd_fisica: number;
        contado: boolean;
        updated_at: string;
        counts_count: number; // To track if we hit limit of 3
        counts_history: number[];
    }[];
};

export async function getInventoryReport(startDate: string, endDate: string) {
    try {
        const { data: records, error: dbError } = await supabaseAdmin
            .schema('inventario' as any)
            .from("inventario_rotativo")
            .select("*")
            .gte("dt_contagem", `${startDate}T00:00:00`)
            .lte("dt_contagem", `${endDate}T23:59:59`);

        if (dbError) throw dbError;

        if (!records || records.length === 0) return [];

        const itemCodes = Array.from(new Set(records.map(r => r.it_codigo)));
        let descriptions: Record<string, string> = {};

        try {
            const { data: items } = await supabaseAdmin
                .schema('datasul' as any) 
                .from('item')
                .select('it_codigo, desc_item')
                .in('it_codigo', itemCodes);
            
            if (items) {
                items.forEach((i: any) => {
                    descriptions[i.it_codigo] = i.desc_item;
                });
            }
        } catch (e) {
            console.warn("Could not fetch Datasul items", e);
        }

        const reportMap = new Map<string, InventoryReportItem>();

        records.forEach(record => {
            const currentQtd = record.qtd_fisica && record.qtd_fisica.length > 0 
                ? record.qtd_fisica[record.qtd_fisica.length - 1] 
                : 0;

            if (!reportMap.has(record.it_codigo)) {
                reportMap.set(record.it_codigo, {
                    it_codigo: record.it_codigo,
                    desc_item: descriptions[record.it_codigo] || "Item sem descrição",
                    total_qtd: 0,
                    status_geral: "liberado", 
                    details: []
                });
            }

            const group = reportMap.get(record.it_codigo)!;
            
            group.details.push({
                id: record.id,
                centro_custo: record.centro_custo || "N/A",
                qtd_fisica: currentQtd,
                contado: record.contado || false,
                updated_at: record.updated_at,
                counts_count: record.qtd_fisica ? record.qtd_fisica.length : 0,
                counts_history: record.qtd_fisica || []
            });

            // Updated Status Logic:
            // "Liberado" if contado=true AND we have confirmed results (counts > 1).
            // If only 1 count and contado=true -> It is "Pending Admin".
            const isConfirmed = record.contado && (record.qtd_fisica && record.qtd_fisica.length > 1);

            if (isConfirmed) {
                group.total_qtd += currentQtd;
            } else {
                group.status_geral = "pendente"; // It's pending admin or pending operator.
            }
        });

        return Array.from(reportMap.values());

    } catch (error) {
        console.error("getInventoryReport Error:", error);
        return []; 
    }
}

export async function getPendingOperatorItems(userCC: string, startDate?: string, endDate?: string, isAdmin: boolean = false) {
    try {
        let query = supabaseAdmin
            .schema('inventario' as any)
            .from("inventario_rotativo")
            .select("*");
            
        if (!isAdmin) {
             query = query.eq("centro_custo", userCC);
        }

        if (startDate && endDate) {
            query = query
                .gte("created_at", `${startDate}T00:00:00`)
                .lte("created_at", `${endDate}T23:59:59`);
        }

        const { data: records, error } = await query
            .order("contado", { ascending: true }) 
            .order("created_at", { ascending: false });

        if (error) throw error;
        
        const itemCodes = Array.from(new Set(records.map(r => r.it_codigo)));
        let descriptions: Record<string, string> = {};

        try {
             const { data: items } = await supabaseAdmin
                .schema('datasul' as any) 
                .from('item')
                .select('it_codigo, desc_item')
                .in('it_codigo', itemCodes);
            
             if (items) {
                 items.forEach((i: any) => {
                     descriptions[i.it_codigo] = i.desc_item;
                 });
             }
        } catch (e) {
             // Ignore
        }

        return records.map(r => ({
            id: r.id,
            it_codigo: r.it_codigo,
            desc_item: descriptions[r.it_codigo] || "",
            counts: r.qtd_fisica || [], 
            dt_contagem: r.dt_contagem,
            contado: r.contado
        }));

    } catch (error) {
        console.error("getPendingOperatorItems Error:", error);
        return [];
    }
}

export async function requestRecount(itemId: string): Promise<ActionState> {
    try {
        const { data: item, error: fetchError } = await supabaseAdmin
            .schema('inventario' as any)
            .from("inventario_rotativo")
            .select("id, qtd_fisica, it_codigo, contado")
            .eq("id", itemId)
            .single();

        if (fetchError || !item) {
            return { error: "Item não encontrado." };
        }

        const currentCounts = item.qtd_fisica || [];
        if (currentCounts.length >= 3) {
            return { error: "Limite de 3 contagens atingido para este item." };
        }

        const { error: updateError } = await supabaseAdmin
            .schema('inventario' as any)
            .from("inventario_rotativo")
            .update({
                contado: false,
                updated_at: new Date().toISOString()
            })
            .eq("id", itemId);

        if (updateError) throw updateError;

        revalidatePath("/inventario-rotativo/acompanhamento");
        revalidatePath("/inventario-rotativo");

        return { success: `Recontagem solicitada para item ${item.it_codigo}.` };

    } catch (error: any) {
        console.error("requestRecount Error:", error);
        return { error: "Erro ao solicitar recontagem." };
    }
}

export async function approveInventoryItem(itemId: string, action: 'approve' | 'reject', selectedValue?: number): Promise<ActionState> {
    try {
        const { data: item, error: fetchError } = await supabaseAdmin
            .schema('inventario' as any)
            .from("inventario_rotativo")
            .select("*")
            .eq("id", itemId)
            .single();

        if (fetchError || !item) {
            return { error: "Item não encontrado." };
        }

        const counts = item.qtd_fisica || [];
        const countIndex = counts.length; // 1, 2, or 3

        // REJECT LOGIC
        if (action === 'reject') {
            await supabaseAdmin.schema('inventario' as any).from("inventario_rotativo")
                .update({ contado: false, updated_at: new Date().toISOString() }).eq("id", itemId);
            
            revalidatePath("/inventario-rotativo/acompanhamento");
            return { success: "Item reprovado. Solicitada nova contagem." };
        }

        // APPROVE LOGIC
        if (action === 'approve') {
            
            // Override with Admin Selected Value (Tie-Breaker)
            if (selectedValue !== undefined && selectedValue !== null) {
                const newArray = [...counts, selectedValue];
                 await supabaseAdmin.schema('inventario' as any).from("inventario_rotativo")
                    .update({ 
                        contado: true, 
                        qtd_fisica: newArray,
                        updated_at: new Date().toISOString() 
                    }).eq("id", itemId);
                
                revalidatePath("/inventario-rotativo/acompanhamento");
                return { success: "Valor selecionado e contagem finalizada." };
            }

            let shouldApprove = true;
            let message = "Contagem aprovada e finalizada.";

            // 1st Count - Approval
            if (countIndex === 1) {
                // STRATEGY: To signal "Approved" state without status column,
                // we DUPLICATE the first count. 
                // [10] -> [10, 10]. 
                // This makes existing logic assume it's "Matched" and finalized.
                const val = counts[0];
                const newArray = [val, val];
                
                await supabaseAdmin.schema('inventario' as any).from("inventario_rotativo")
                    .update({ 
                        contado: true, 
                        qtd_fisica: newArray,
                        updated_at: new Date().toISOString() 
                    }).eq("id", itemId);

                revalidatePath("/inventario-rotativo/acompanhamento");
                return { success: "Contagem aprovada (Validada automaticamente)." };
            }

            // 2nd Count
            else if (countIndex === 2) {
                const c1 = counts[0];
                const c2 = counts[1];
                
                if (c1 === c2) {
                    shouldApprove = true;
                    message = "Valores conferem. Contagem finalizada.";
                } else {
                    shouldApprove = true; 
                    message = "Aprovado com divergência (decisão do admin).";
                }
            }
            // 3rd Count (or more)
            else if (countIndex >= 3) {
                shouldApprove = true;
            }

            if (shouldApprove) {
                await supabaseAdmin.schema('inventario' as any).from("inventario_rotativo")
                    .update({ contado: true, updated_at: new Date().toISOString() }).eq("id", itemId);
                
                revalidatePath("/inventario-rotativo/acompanhamento");
                return { success: message };
            }
        }

        return { error: "Ação desconhecida." };

    } catch (error: any) {
         return { error: "Erro: " + error.message };
    }
}
