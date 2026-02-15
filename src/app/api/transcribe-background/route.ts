import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * Background Transcription Route
 * Receives noteId + image, transcribes, and updates the note directly.
 * Called fire-and-forget from the client after save.
 */
export async function POST(req: NextRequest) {
    let noteId: string | null = null;

    try {
        const body = await req.json();
        noteId = body.noteId;
        const image = body.image;

        if (!noteId || !image) {
            return NextResponse.json({ error: "Missing noteId or image" }, { status: 400 });
        }

        // 1. Determine Provider & Model from Settings
        let llmProvider = 'gemini';
        let llmModel = 'gemini-2.0-flash';

        const { data: providerSetting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'anotacoes_llm_provider')
            .single();
        if (providerSetting?.value) llmProvider = providerSetting.value;

        const { data: modelSetting } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'anotacoes_llm_model')
            .single();
        if (modelSetting?.value) llmModel = modelSetting.value;

        const prompt = "Transcreva o texto manuscrito. Use o contexto para corrigir a capitalização (Nomes Próprios, Início de frases) e ortografia, ignorando inconsistências óbvias da caligrafia (ex: corrigir 'mAncELO' para 'Marcelo'). Mantenha a estrutura visual (quebras de linha). Descreva desenhos brevemente entre [colchetes].";

        let text = '';

        // ===========================
        // OPENROUTER PATH
        // ===========================
        if (llmProvider === 'openrouter') {
            const openrouterKey = process.env.OPENROUTER_API_KEY || '';
            if (!openrouterKey) {
                return NextResponse.json({ error: 'OPENROUTER_API_KEY missing' }, { status: 500 });
            }

            let imageUrl = image;
            if (!image.startsWith('data:')) {
                imageUrl = `data:image/jpeg;base64,${image}`;
            }

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${openrouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                },
                body: JSON.stringify({
                    model: llmModel,
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: imageUrl } }
                            ]
                        }
                    ],
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('[BG Transcribe] OpenRouter Error:', response.status, errorBody);
                throw new Error(`OpenRouter error: ${response.status}`);
            }

            const data = await response.json();
            text = data.choices?.[0]?.message?.content || '';

        // ===========================
        // GEMINI PATH
        // ===========================
        } else {
            let apiKey = process.env.GEMINI_API_KEY || '';
            if (!apiKey) {
                const { data: setting } = await supabaseAdmin
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'gemini_key')
                    .single();
                if (setting) apiKey = setting.value;
            }

            if (!apiKey) {
                return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: llmModel });

            const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

            const result = await model.generateContent([
                prompt,
                { inlineData: { data: base64Data, mimeType } },
            ]);

            text = result.response.text();
        }

        // 2. Update the note with transcription result and remove processing tag
        if (text) {
            // Fetch current tags to safely remove the processing tag
            const { data: currentNote } = await supabaseAdmin
                .schema('app_anotacoes')
                .from('notes')
                .select('tags')
                .eq('id', noteId)
                .single();
            
            let newTags = currentNote?.tags || [];
            newTags = newTags.filter((t: string) => 
                t !== 'PROCESSING_TRANSCRIPTION' && 
                t !== 'TRANSCRIPTION_ERROR'
            );
            
            // Add Success Tag
            if (!newTags.includes('TRANSCRIPTION_SUCCESS')) {
                newTags.push('TRANSCRIPTION_SUCCESS');
            }

            const { error: updateError } = await supabaseAdmin
                .schema('app_anotacoes')
                .from('notes')
                .update({ 
                    transcription: text, 
                    tags: newTags,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', noteId);

            if (updateError) {
                console.error('[BG Transcribe] DB Update Error:', updateError);
                throw updateError;
            }
        }

        return NextResponse.json({ success: true, text });

    } catch (error: any) {
        console.error('[BG Transcribe] Error:', error);

        // FAIL-SAFE: Remove processing tag using the scoped noteId
        if (noteId) {
            try {
                const { data: currentNote } = await supabaseAdmin
                    .schema('app_anotacoes')
                    .from('notes')
                    .select('tags')
                    .eq('id', noteId)
                    .single();
                
                let newTags = currentNote?.tags || [];
                
                // Remove processing and success tags, add error tag
                if (newTags.includes('PROCESSING_TRANSCRIPTION') || newTags.includes('TRANSCRIPTION_SUCCESS')) {
                     newTags = newTags.filter((t: string) => 
                        t !== 'PROCESSING_TRANSCRIPTION' && 
                        t !== 'TRANSCRIPTION_SUCCESS'
                     );
                     
                     if (!newTags.includes('TRANSCRIPTION_ERROR')) {
                         newTags.push('TRANSCRIPTION_ERROR');
                     }
                     
                     await supabaseAdmin
                        .schema('app_anotacoes')
                        .from('notes')
                        .update({ tags: newTags })
                        .eq('id', noteId);
                }
            } catch (cleanupError) {
                console.error('[BG Transcribe] Cleanup Error:', cleanupError);
            }
        }

        return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
    }
}
