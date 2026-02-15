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

        // 1. Fetch API Key (Gemini)
        apiKey = process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
            const { data: setting } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'gemini_key')
                .single();
            if (setting) apiKey = setting.value;
        }

        // Fetch LLM provider and model from settings
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

        let userId = body.userId;

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

        // Fetch chat history
        let rawHistory: any[] = [];
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
                rawHistory = recentMessages.reverse();
                console.log(`[RAG] Loaded ${rawHistory.length} past messages for context.`);
            }
        }

        let text: string;

        // ===========================
        // OPENROUTER PATH
        // ===========================
        if (llmProvider === 'openrouter') {
            const openrouterKey = process.env.OPENROUTER_API_KEY || '';
            if (!openrouterKey) {
                return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured' }, { status: 500 });
            }

            // Tools no formato OpenAI
            const openaiTools = [
                {
                    type: "function" as const,
                    function: {
                        name: "search_catalog",
                        description: catalogToolDefinition.description,
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "O código da peça para buscar (ex: 'R-025', 'S-305')." }
                            },
                            required: ["query"]
                        }
                    }
                },
                {
                    type: "function" as const,
                    function: {
                        name: "search_internet",
                        description: internetSearchToolDefinition.description,
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "O termo de busca otimizado." }
                            },
                            required: ["query"]
                        }
                    }
                },
                {
                    type: "function" as const,
                    function: {
                        name: "search_notes",
                        description: searchNotesToolDefinition.description,
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "Termo de busca textual." },
                                tag: { type: "string", description: "Nome de uma tag/marcador para filtrar. Opcional." }
                            },
                            required: ["query"]
                        }
                    }
                }
            ];

            // Mensagens no formato OpenAI
            const messages: any[] = [
                { role: "system", content: AGENT_SYSTEM_INSTRUCTION }
            ];

            for (const msg of rawHistory) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }

            messages.push({ role: "user", content: message });

            // Loop de tool calls (máximo 3 iterações)
            let finalText = '';
            for (let i = 0; i < 3; i++) {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${openrouterKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                    },
                    body: JSON.stringify({
                        model: llmModel,
                        messages,
                        tools: openaiTools,
                        tool_choice: "auto",
                    }),
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    console.error('[OpenRouter] API Error:', response.status, errorBody);
                    throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
                }

                const data = await response.json();
                const choice = data.choices?.[0];

                if (!choice) {
                    throw new Error('No response from OpenRouter');
                }

                const assistantMessage = choice.message;

                // Se não tem tool_calls, é a resposta final
                if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
                    finalText = assistantMessage.content || '';
                    break;
                }

                // Processar tool calls
                messages.push(assistantMessage);

                for (const toolCall of assistantMessage.tool_calls) {
                    const fnName = toolCall.function.name;
                    const fnArgs = JSON.parse(toolCall.function.arguments);
                    let toolResult: any;

                    if (fnName === 'search_catalog') {
                        toolResult = await performCatalogSearch(fnArgs.query);
                    } else if (fnName === 'search_internet') {
                        toolResult = await performInternetSearch(fnArgs.query);
                    } else if (fnName === 'search_notes') {
                        toolResult = await performNotesSearch(fnArgs.query, fnArgs.tag);
                    } else {
                        toolResult = { error: `Unknown function: ${fnName}` };
                    }

                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult),
                    });
                }
            }

            text = finalText;

        // ===========================
        // GEMINI PATH (original)
        // ===========================
        } else {
            if (!apiKey) {
                return NextResponse.json({
                    error: 'Configuration Error',
                    details: 'GEMINI_API_KEY not found'
                }, { status: 500 });
            }

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({
                model: llmModel,
                systemInstruction: AGENT_SYSTEM_INSTRUCTION,
                tools: [{ functionDeclarations: [catalogToolDefinition, internetSearchToolDefinition, searchNotesToolDefinition] }]
            });

            // Formatar histórico para Gemini
            let history: any[] = rawHistory.map((msg: any) => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));
            if (history.length > 0 && history[0].role === 'model') {
                history.shift();
            }

            const chat = model.startChat({ history });
            let result = await chat.sendMessage(message);
            let response = result.response;

            // Check if model wants to call a function
            const functionCalls = response.functionCalls();
            if (functionCalls && functionCalls.length > 0) {
                const call = functionCalls[0];

                if (call.name === 'search_catalog') {
                    const args = call.args as any;
                    const toolResult = await performCatalogSearch(args.query);
                    result = await chat.sendMessage([{
                        functionResponse: { name: 'search_catalog', response: toolResult }
                    }]);
                    response = result.response;
                } else if (call.name === 'search_internet') {
                    const args = call.args as any;
                    const toolResult = await performInternetSearch(args.query);
                    result = await chat.sendMessage([{
                        functionResponse: { name: 'search_internet', response: toolResult }
                    }]);
                    response = result.response;
                } else if (call.name === 'search_notes') {
                    const args = call.args as any;
                    const toolResult = await performNotesSearch(args.query, args.tag);
                    result = await chat.sendMessage([{
                        functionResponse: { name: 'search_notes', response: toolResult }
                    }]);
                    response = result.response;
                }
            }

            text = response.text();
        }

        // Save model response
        if (userId) {
            const { data, error } = await (supabaseAdmin as any)
                .schema('app_anotacoes')
                .from('chat_messages')
                .insert({
                    user_id: userId,
                    role: 'model',
                    content: text
                }).select();

            if (error) console.error('[DB] Error saving model message:', error);
            else console.log('[DB] Saved model message ID:', data?.[0]?.id);
        }

        return NextResponse.json({ reply: text });

    } catch (error: any) {
        console.error('LLM API Error:', error);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error.message || 'Unknown error'
        }, { status: 500 });
    }
}
