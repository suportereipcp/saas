'use client';

import { useState } from "react";
import { Mic, Send, Bot, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AssistantPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
        { role: 'assistant', content: 'Olá! Sou sua Inteligência Auxiliar. Posso ajudar a resumir suas anotações, encontrar insights nas reuniões passadas ou rascunhar novos planos. O que vamos fazer hoje?' }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInputValue("");

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Failed to fetch response');
            }

            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Desculpe, não consegui processar sua resposta." }]);

        } catch (error: any) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: `Erro: ${error.message || "Tente novamente mais tarde."}` }]);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            // Stop Recording
            setIsRecording(false);
            // Simulate Transcription
            setInputValue("Estou gravando um áudio para testar a transcrição da inteligência artificial...");
        } else {
            // Start Recording
            setIsRecording(true);
            // In a real app, we would request microphone permissions here
            // navigator.mediaDevices.getUserMedia({ audio: true })...
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm shrink-0 flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    <Bot size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Jarvis</h1>
                    <p className="text-xs text-slate-500 font-medium">Sr Donizete, qual a sua dúvida?</p>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                            {msg.role === 'assistant' ? <Bot size={20} /> : <div className="font-bold text-xs">VOCÊ</div>}
                        </div>
                        <div className={`p-5 rounded-2xl shadow-sm border max-w-[80%] ${msg.role === 'assistant'
                            ? 'bg-white border-slate-200 rounded-tl-none text-slate-700'
                            : 'bg-emerald-600 border-emerald-500 rounded-tr-none text-white'
                            }`}>
                            <p className="leading-relaxed text-lg">{msg.content}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="bg-white p-4 border-t border-slate-200 shrink-0">
                <div className="max-w-3xl mx-auto flex gap-3 items-center">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={toggleRecording}
                        className={`h-12 w-12 rounded-full shrink-0 transition-all duration-300 ${isRecording
                            ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse scale-110"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                        title={isRecording ? "Parar Gravação" : "Gravar Áudio"}
                    >
                        <Mic size={24} className={isRecording ? "animate-bounce" : ""} />
                    </Button>
                    <div className="flex-1 relative">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isRecording ? "Ouvindo..." : "Peça um resumo, busque uma anotação..."}
                            className={`h-12 rounded-full pl-6 pr-12 text-lg border-slate-200 bg-slate-50 focus-visible:ring-emerald-500 transition-all ${isRecording ? "border-red-300 bg-red-50 placeholder:text-red-400" : ""}`}
                            disabled={isRecording}
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute right-1 top-1 h-10 w-10 text-emerald-600 hover:bg-emerald-50 rounded-full"
                            onClick={handleSend}
                            disabled={isRecording}
                        >
                            <Send size={20} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
