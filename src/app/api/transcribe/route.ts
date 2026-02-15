import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
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

        let text = '';

        // ===========================
        // OPENROUTER PATH (Vision)
        // ===========================
        if (llmProvider === 'openrouter') {
            const openrouterKey = process.env.OPENROUTER_API_KEY || '';
            if (!openrouterKey) {
                return NextResponse.json({ error: 'OPENROUTER_API_KEY configuration missing' }, { status: 500 });
            }

            // Ensure image format is data:image/jpeg;base64,...
            // If image is raw base64, add prefix. Assume jpeg for compatibility or try to detect?
            // Usually the frontend sends just base64 or with prefix. The current code assumes base64 with prefix or removes it.
            // Let's normalize it.
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
                                { type: "text", text: "Transcreva o texto manuscrito. Use o contexto para corrigir a capitalização (Nomes Próprios, Início de frases) e ortografia, ignorando inconsistências óbvias da caligrafia (ex: corrigir 'mAncELO' para 'Marcelo'). Mantenha a estrutura visual (quebras de linha). Descreva desenhos brevemente entre [colchetes]." },
                                { type: "image_url", image_url: { url: imageUrl } }
                            ]
                        }
                    ],
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('[OpenRouter Transcribe] API Error:', response.status, errorBody);
                throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();
            const choice = data.choices?.[0];

            if (!choice) {
                throw new Error('No response from OpenRouter');
            }

            text = choice.message?.content || '';

        // ===========================
        // GEMINI PATH (Original SDK)
        // ===========================
        } else {
            // Fetch API key for Gemini
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

            // Init Gemini Client
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: llmModel });

            // Detect Mime Type
            const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/);
            const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";

            // Remove header if present for Google SDK
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

            const result = await model.generateContent([
                "Transcreva o texto manuscrito. Use o contexto para corrigir a capitalização (Nomes Próprios, Início de frases) e ortografia, ignorando inconsistências óbvias da caligrafia (ex: corrigir 'mAncELO' para 'Marcelo'). Mantenha a estrutura visual (quebras de linha). Descreva desenhos brevemente entre [colchetes].",
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    },
                },
            ]);

            text = result.response.text();
        }

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error('Transcription Error:', error);
        return NextResponse.json({ 
            error: error.message || "Failed to transcribe" 
        }, { status: 500 });
    }
}
