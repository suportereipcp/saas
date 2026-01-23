import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { AGENT_SYSTEM_INSTRUCTION } from '@/lib/agent-config';
import { catalogToolDefinition, performCatalogSearch, internetSearchToolDefinition, performInternetSearch, searchNotesToolDefinition, performNotesSearch } from '@/lib/gemini-tools';

export async function POST(req: Request) {
    let apiKey = '';

    try {
        const body = await req.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // 1. Fetch API Key
        apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            const { data: setting } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'gemini_key')
                .single();
            if (setting) apiKey = setting.value;
        }

        if (!apiKey) {
            return NextResponse.json({
                error: 'Configuration Error',
                details: 'GEMINI_API_KEY not found'
            }, { status: 500 });
        }

        // 2. Initialize Gemini with Tools
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: AGENT_SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: [catalogToolDefinition, internetSearchToolDefinition, searchNotesToolDefinition] }]
        });

        // 3. Start chat and send message
        const chat = model.startChat();
        let result = await chat.sendMessage(message);
        let response = result.response;

        // 4. Check if model wants to call a function
        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];

            if (call.name === 'search_catalog') {
                const args = call.args as any;
                const toolResult = await performCatalogSearch(args.query);

                // Send function result back to model
                result = await chat.sendMessage([{
                    functionResponse: {
                        name: 'search_catalog',
                        response: toolResult
                    }
                }]);
                response = result.response;
            } else if (call.name === 'search_internet') {
                const args = call.args as any;
                const toolResult = await performInternetSearch(args.query);

                // Send function result back to model
                result = await chat.sendMessage([{
                    functionResponse: {
                        name: 'search_internet',
                        response: toolResult
                    }
                }]);
                response = result.response;
            }
        } else if (call.name === 'search_notes') {
            const args = call.args as any;
            const toolResult = await performNotesSearch(args.query, args.tag);

            // Send function result back to model
            result = await chat.sendMessage([{
                functionResponse: {
                    name: 'search_notes',
                    response: toolResult
                }
            }]);
            response = result.response;
        }
    }

        const text = response.text();
    return NextResponse.json({ reply: text });

} catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({
        error: 'Internal Server Error',
        details: error.message || 'Unknown error'
    }, { status: 500 });
}
}
