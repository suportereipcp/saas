
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        let baseUrl = process.env.KOKORO_BASE_URL;
        const apiKey = process.env.KOKORO_API_KEY;

        if (!baseUrl) {
            console.error("KOKORO_BASE_URL not configured");
            return NextResponse.json({ error: 'TTS Configuration Error: Missing Base URL' }, { status: 500 });
        }

        // Normalize URL: Remove trailing slash if present
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        // Construct endpoint. 
        // User confirmed base is .../api/v1, so we append /audio/speech
        const endpoint = `${baseUrl}/audio/speech`;
        
        console.log(`TTS: Calling Endpoint: ${endpoint}`); // Debug Log

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'model_q8f16',
                input: text,
                voice: 'pf_dora', // Brazilian Portuguese Voice
                response_format: 'mp3',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Kokoro TTS Upstream Error (${response.status}):`, errorText);
            return NextResponse.json({ 
                error: `TTS Provider Error: ${response.status}`, 
                details: errorText 
            }, { status: response.status });
        }

        const modalBlob = await response.blob();
        return new NextResponse(modalBlob, {
            headers: { 'Content-Type': 'audio/mpeg' },
        });

    } catch (error: any) {
        console.error("TTS Proxy Internal Error:", error);
        // Log the text that caused the crash if possible (scope issue, but error message usually enough)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
