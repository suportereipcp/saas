import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        // 1. Create Supabase Client (Service Role for RLS Bypass)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: "Server Configuration Error: Supabase URL/Key missing." }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Fetch "gemini_key" from "system_settings" table in "public" schema
        const { data: setting, error: dbError } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'gemini_key')
            .single();

        if (dbError || !setting?.value) {
            console.error("Database Error fetching Gemini API Key:", dbError);
            return NextResponse.json({ error: "Configuration Error: Gemini Key not found in system_settings." }, { status: 500 });
        }

        const apiKey = setting.value;

        // 3. Init Gemini Client
        const genAI = new GoogleGenerativeAI(apiKey);
        // Reverting to 1.5-flash for stability (Free Tier Quota)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Remove header if present (e.g., "data:image/png;base64,")
        const base64Image = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

        const prompt = "Transcreva EXATAMENTE o que está escrito neste manuscrito. Se for um desenho sem texto, descreva brevemente. Se for texto, retorne apenas o texto, sem comentários adicionais. Mantenha a formatação de linhas se possível.";

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: "image/png"
                }
            }
        ]);

        const text = result.response.text();

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error("AI Transcription Error:", error);
        return NextResponse.json({ error: error.message || "Failed to transcribe" }, { status: 500 });
    }
}
