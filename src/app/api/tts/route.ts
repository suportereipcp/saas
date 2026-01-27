
import { NextResponse } from 'next/server';

// Helper to get params from URL or Body
async function getParams(req: Request) {
    if (req.method === 'GET') {
        const { searchParams } = new URL(req.url);
        return {
            text: searchParams.get('text'),
            voice: searchParams.get('voice'),
            speed: searchParams.get('speed')
        };
    }
    return await req.json();
}

export async function GET(req: Request) {
    return handleTTS(req);
}

export async function POST(req: Request) {
    return handleTTS(req);
}

async function handleTTS(req: Request) {
    try {
        const { text, voice, speed } = await getParams(req);

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        let baseUrl = process.env.KOKORO_BASE_URL;
        const apiKey = process.env.KOKORO_API_KEY;

        if (!baseUrl) {
             return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
        }

        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        const endpoint = `${baseUrl}/audio/speech`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'model_q8f16',
                input: text,
                voice: voice || 'pm_alex', 
                response_format: 'mp3',
                speed: parseFloat(speed as string) || 1.2
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Kokoro TTS Error (${response.status}):`, errorText);
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        // STREAMING RESPONSE: Pass the upstream stream directly to the client
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': 'audio/mpeg',
                // Optional: 'Transfer-Encoding': 'chunked' is automatic usually
            },
        });

    } catch (error: any) {
        console.error("TTS Proxy Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
