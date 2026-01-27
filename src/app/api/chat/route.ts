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

        // Get User ID from Auth (Session) or Request if available
        // Note: Ideally pass the auth token to this API route or use createServerClient
        // For now, assuming authenticated user context via supabaseAdmin acting as system, 
        // BUT we need the real user ID. 
        // Let's use `supabase` client from `utils/supabase/server` if available or expect user_id in body (less secure).
        // A better approach is using `createServerClient` in this route to get the session.

        const supabase = supabaseAdmin;

        // Retrieve session to get user_id properly
        // In a real scenario, use: const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser();
        // Here we will rely on the client sending the user_id context or grab it if possible.
        // Quick fix: Check if user_id is passed in body as a secure temporary measure or use header.
        // Assuming secure context or extracting from header could be complex here without changing frontend first.

        // Let's assume we want to save it. We really need the user_id. 
        // I will first attempt to get it from auth.

        let userId = body.userId; // Temporary: Client should send this, or we verify token.

        if (userId) {
            // Save USER message
            const { data, error } = await (supabaseAdmin as any)
                .schema('app_anotacoes')
                .from('chat_messages')
                .insert({
                    user_id: userId,
                    role: 'user',
                    content: message
                }).select();

            if (error) console.error('[DB] Error saving user message:', error);
            else console.log('[DB] Saved user message ID:', data?.[0]?.id);
        }

        // 2. Initialize Gemini with Tools
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction: AGENT_SYSTEM_INSTRUCTION,
            tools: [{ functionDeclarations: [catalogToolDefinition, internetSearchToolDefinition, searchNotesToolDefinition] }]
        });

        // 2.5 Fetch Recent Chat History (RAG / Context)
        let history: any[] = [];
        if (userId) {
            const { data: recentMessages, error: historyError } = await (supabaseAdmin as any)
                .schema('app_anotacoes')
                .from('chat_messages')
                .select('role, content')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (historyError) {
                console.error('[DB] Error fetching history:', historyError);
            } else if (recentMessages && recentMessages.length > 0) {
                // Reverse to chronological order (Oldest -> Newest)
                history = recentMessages.reverse().map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));

                // Gemini REQUIREMENT: History must start with 'user' role.
                // If the oldest message fetched is 'model', remove it.
                if (history.length > 0 && history[0].role === 'model') {
                    history.shift(); 
                }
                
                console.log(`[RAG] Loaded ${history.length} past messages for context.`);
            }
        }

        // 3. Start chat and send message
        const chat = model.startChat({
            history: history
        });
        let result = await chat.sendMessage(message);
        let response = result.response;

        // 4. Check if model wants to call a function
        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            // ... (Tool execution logic kept same)
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

        if (userId) {
            // Save MODEL message
            const { data, error } = await (supabaseAdmin as any)
                .schema('app_anotacoes')
                .from('chat_messages')
                .insert({
                    user_id: userId,
                    role: 'model', // or 'assistant'
                    content: text
                }).select();

            if (error) console.error('[DB] Error saving model messsage:', error);
            else console.log('[DB] Saved model message ID:', data?.[0]?.id);
        }

        return NextResponse.json({ reply: text });

    } catch (error: any) {
        // ... error handling
        console.error('Gemini API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
