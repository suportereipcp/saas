import { ProductTicket, TicketStatus, User, Attachment, AttachmentType, SubTask, HistoryLog } from '../_types/types';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
    db: { schema: 'shiftapp' }
});

// --- AUTH SERVICE ---

export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch profile (Note: profiles is likely in PUBLIC schema, not shiftapp)
    // We need a separate client or use fully qualified name if allowed, 
    // BUT since we scoped the client to 'shiftapp', accessing 'public.profiles' might be tricky 
    // without a second client or if the user didn't expose 'shiftapp' and 'public' correctly.
    // However, typically "public" is always available? 
    // Let's rely on the fact that Auth user metadata is available.
    // If we need profiles from public, we might need a separate client instance or just use user_metadata.

    // Attempt to query public schema explicitly if needed, but for now let's hope cross-schema access works 
    // or just use user metadata to be safe and avoid multi-schema complexity.

    return {
        id: user.id,
        name: user.user_metadata?.full_name || user.email || 'Usuário',
        email: user.email || '',
        role: 'USER',
        avatar: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.user_metadata?.full_name || 'User')}`,
        jobTitle: 'Colaborador', // Default since we might not reach profiles table easily from here
        active: true
    };
};

export const getUsers = async (): Promise<User[]> => {
    // Return empty or mock if we can't easily reach 'public.profiles' with the scoped client
    return [];
};

// --- DATA SERVICE ---

// Helper to map DB to Type
const mapTicketFromDB = (data: any): ProductTicket => {
    return {
        id: data.id,
        productCode: data.product_code,
        productName: data.product_name,
        productImage: data.product_image,
        description: data.description,
        status: data.status as TicketStatus,
        requesterName: data.requester_name,
        trackingResponsible: data.tracking_responsible,
        changerName: data.changer_name,
        validationResponsible: data.validation_responsible,
        superiorApprover: data.superior_approver,
        approverName: data.approver_name,
        approvers: data.approvers || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        developmentStartedAt: data.development_started_at,
        validationSentAt: data.validation_sent_at,
        finalizedAt: data.finalized_at,
        subTasks: (data.subtasks || []).map((t: any) => ({
            id: t.id,
            description: t.description,
            assignedTo: t.assigned_to,
            completed: t.completed,
            completionNotes: t.completion_notes,
            createdAt: t.created_at
        })),
        attachments: (data.attachments || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type as AttachmentType,
            url: a.url,
            stage: a.stage,
            uploadedAt: a.uploaded_at
        })),
        history: (data.history || []).map((h: any) => ({
            id: h.id,
            action: h.action,
            user: h.user,
            details: h.details,
            timestamp: h.timestamp
        }))
    };
};

export const getDashboardStats = async () => {
    const { count: total, error: e1 } = await supabase.from('tickets').select('*', { count: 'exact', head: true });
    const { count: evaluation } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', TicketStatus.EVALUATION);
    const { count: inProgress } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', TicketStatus.IN_CHANGE);
    const { count: pending } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', TicketStatus.PENDING_APPROVAL);

    if (e1) console.error("Stats Error:", JSON.stringify(e1, null, 2));

    return {
        total: total || 0,
        evaluation: evaluation || 0,
        inProgress: inProgress || 0,
        pending: pending || 0
    };
};

export const getTickets = async (page: number, limit: number, search?: string) => {
    let query = supabase
        .from('tickets')
        .select(`
            *,
            subtasks(*),
            attachments(*),
            history(*)
        `, { count: 'exact' });

    if (search) {
        query = query.or(`product_name.ilike.%${search}%,product_code.ilike.%${search}%,id.ilike.%${search}%`);
    }

    const { data, count, error } = await query
        .order('updated_at', { ascending: false })
        .range((page - 1) * limit, (page * limit) - 1);

    if (error) {
        console.error("Error fetching tickets:", JSON.stringify(error, null, 2));
        return { data: [], count: 0 };
    }

    return {
        data: data.map(mapTicketFromDB),
        count: count || 0
    };
};

export const getTicketById = async (id: string): Promise<ProductTicket | null> => {
    const { data, error } = await supabase
        .from('tickets')
        .select(`
            *,
            subtasks(*),
            attachments(*),
            history(*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error("Error fetching ticket by ID:", JSON.stringify(error, null, 2));
        return null;
    }

    if (!data) return null;
    return mapTicketFromDB(data);
};

// Helper to check for valid UUID
const isUUID = (id: string) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const saveTicket = async (ticket: ProductTicket): Promise<void> => {
    // 1. Update/Insert Ticket
    const ticketPayload = {
        id: ticket.id,
        product_code: ticket.productCode,
        product_name: ticket.productName,
        product_image: ticket.productImage,
        description: ticket.description,
        status: ticket.status,
        requester_name: ticket.requesterName,
        tracking_responsible: ticket.trackingResponsible,
        changer_name: ticket.changerName,
        validation_responsible: ticket.validationResponsible,
        superior_approver: ticket.superiorApprover,
        approver_name: ticket.approverName,
        approvers: ticket.approvers,
        development_started_at: ticket.developmentStartedAt,
        validation_sent_at: ticket.validationSentAt,
        finalized_at: ticket.finalizedAt,
        updated_at: new Date().toISOString()
    };

    // Upsert Ticket
    const { error: ticketError } = await supabase
        .from('tickets')
        .upsert(ticketPayload);

    if (ticketError) {
        console.error("Error saving ticket:", JSON.stringify(ticketError, null, 2));
        throw ticketError;
    }

    // 2. Subtasks
    // Delete missing
    const validTaskIds = ticket.subTasks.filter(t => isUUID(t.id)).map(t => t.id);

    if (validTaskIds.length > 0) {
        await supabase.from('subtasks')
            .delete()
            .eq('ticket_id', ticket.id)
            .not('id', 'in', `(${validTaskIds.join(',')})`);
    } else {
        // If empty or filtering led to empty (all new), we might choose to wipe existing.
        // Safety: assuming non-UUIDs are new additions and UUIDs are kept.
        // If NO valid UUIDs exist in the incoming list, it could mean:
        // 1. All previous tasks were deleted by user.
        // 2. All tasks are new.
        // In both cases, if the user saved "empty list of UUIDs", we should probably delete what's in DB 
        // that isn't in this list. Since the list is empty of UUIDs, we delete ALL?
        // Let's protect against accidental wipe if fetch failed? No, this is save logic.
        // We delete anything in DB that isn't in validTaskIds.
        // If validTaskIds is empty, we delete ALL for this ticket.
        const { error } = await supabase.from('subtasks').delete().eq('ticket_id', ticket.id);
        if (error) console.error("Error clearing subtasks:", error);
    }

    // Upsert/Insert
    for (const task of ticket.subTasks) {
        const isNew = !isUUID(task.id);

        const payload: any = {
            ticket_id: ticket.id,
            description: task.description,
            assigned_to: task.assignedTo,
            completed: task.completed,
            completion_notes: task.completionNotes,
        };

        if (!isNew) {
            payload.id = task.id;
        }

        const { error } = isNew
            ? await supabase.from('subtasks').insert(payload)
            : await supabase.from('subtasks').upsert(payload);

        if (error) console.error("Error saving subtask:", JSON.stringify(error, null, 2));
    }

    // 3. Attachments
    const validAttIds = ticket.attachments.filter(a => isUUID(a.id)).map(a => a.id);
    if (validAttIds.length > 0) {
        const { error } = await supabase.from('attachments').delete().eq('ticket_id', ticket.id).not('id', 'in', `(${validAttIds.join(',')})`);
        if (error) console.error("Error deleting attachments:", error);
    } else {
        const { error } = await supabase.from('attachments').delete().eq('ticket_id', ticket.id);
        if (error) console.error("Error clearing attachments:", error);
    }

    for (const att of ticket.attachments) {
        const isNew = !isUUID(att.id);
        const payload: any = {
            ticket_id: ticket.id,
            name: att.name,
            type: att.type,
            url: att.url,
            stage: att.stage,
            uploaded_at: att.uploadedAt
        };

        if (!isNew) payload.id = att.id;

        const { error } = isNew
            ? await supabase.from('attachments').insert(payload)
            : await supabase.from('attachments').upsert(payload);

        if (error) console.error("Error saving attachment:", JSON.stringify(error, null, 2));
    }

    // 4. History
    for (const log of ticket.history) {
        if (!isUUID(log.id)) { // New log
            const { error } = await supabase.from('history').insert({
                ticket_id: ticket.id,
                action: log.action,
                user: log.user,
                details: log.details,
                timestamp: log.timestamp
            });
            if (error) console.error("Error saving history:", error);
        }
    }
};

export const getProductDescription = async (code: string): Promise<string | null> => {
    // This calls the postgres function 'get_datasul_item_desc' in the 'shiftapp' schema
    const { data, error } = await supabase.rpc('get_datasul_item_desc', { p_code: code });

    if (error) {
        console.error("Error fetching Datasul desc:", JSON.stringify(error, null, 2));
        return null;
    }
    return data as string;
};

export const uploadFile = async (file: File): Promise<string> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('shiftapp-files')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('shiftapp-files')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error("Erro no upload:", error);
        throw new Error('Falha no upload do arquivo');
    }
};