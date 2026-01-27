'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import { Mic, Send, Bot, Sparkles, Search, X, ImageIcon, Volume2, VolumeX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

// Helper para renderizar conteúdo com links, imagens clicáveis e formatação
function MessageContent({ content, onImageClick }: { content: string, onImageClick: (url: string) => void }) {
    // First, parse **bold** text and URLs
    const parseContent = (text: string): React.ReactNode[] => {
        const result: React.ReactNode[] = [];
        let key = 0;

        // Pattern for Markdown links [text](url), **bold**, and raw URLs
        const combinedPattern = /\[([^\]]+)\]\((https?:\/\/[^\s<>\)]+)\)|(\*\*[^*]+\*\*)|(https?:\/\/[^\s<>"]+)/gi;
        let lastIndex = 0;
        let match;

        while ((match = combinedPattern.exec(text)) !== null) {
            // Add text before this match
            if (match.index > lastIndex) {
                result.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
            }

            if (match[1] && match[2]) {
                // Markdown Link: [text](url)
                const linkText = match[1];
                const url = match[2];
                const isImage = /\.(?:jpg|jpeg|png|webp|gif)/i.test(url) || linkText.toLowerCase().includes('imagem');

                if (isImage) {
                    result.push(
                        <button
                            key={key++}
                            onClick={() => onImageClick(url)}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 underline font-medium"
                        >
                            <ImageIcon size={16} className="shrink-0" />
                            {linkText}
                        </button>
                    );
                } else {
                    result.push(
                        <a
                            key={key++}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-800 underline"
                        >
                            {linkText}
                        </a>
                    );
                }
            } else if (match[3]) {
                // Bold text: **text**
                const boldText = match[3].slice(2, -2);
                result.push(<strong key={key++} className="font-semibold text-slate-800">{boldText}</strong>);
            } else if (match[4]) {
                // Raw URL (fallback)
                const url = match[4];
                const isImage = /\.(?:jpg|jpeg|png|webp|gif)/i.test(url);

                if (isImage) {
                    result.push(
                        <button
                            key={key++}
                            onClick={() => onImageClick(url)}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 underline font-medium"
                        >
                            <ImageIcon size={16} className="shrink-0" />
                            Ver imagem
                        </button>
                    );
                } else {
                    const displayUrl = url.length > 50 ? url.slice(0, 47) + '...' : url;
                    result.push(
                        <a
                            key={key++}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-600 hover:text-emerald-800 underline"
                        >
                            {displayUrl}
                        </a>
                    );
                }
            }

            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            result.push(<span key={key++}>{text.slice(lastIndex)}</span>);
        }

        return result;
    };

    // Split by newlines to create better structure
    const lines = content.split('\n');

    return (
        <div className="space-y-1">
            {lines.map((line, idx) => {
                if (!line.trim()) return <div key={idx} className="h-2" />; // Empty line = spacing

                // Check if line starts with emoji (info label)
                const emojiMatch = line.match(/^(📷|🔢|⚖️|📦|📋|🔧|⚠️|💡|🚗|🏭|🔗|•)\s*/);

                if (emojiMatch) {
                    return (
                        <div key={idx} className="flex items-start gap-2">
                            <span className="shrink-0">{emojiMatch[1]}</span>
                            <span>{parseContent(line.slice(emojiMatch[0].length))}</span>
                        </div>
                    );
                }

                return <div key={idx}>{parseContent(line)}</div>;
            })}
        </div>
    );
}


export default function AssistantPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'model', content: string }[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Busca no histórico
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Image popup
    const [imagePopupUrl, setImagePopupUrl] = useState<string | null>(null);

    // Mensagens filtradas baseadas na busca
    const filteredMessages = useMemo(() => {
        if (!searchQuery.trim()) return messages;
        const query = searchQuery.toLowerCase();
        return messages.filter(msg =>
            msg.content.toLowerCase().includes(query)
        );
    }, [messages, searchQuery]);

    // Auto-scroll logic
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        // Use timeout to ensure DOM is updated
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [filteredMessages, isLoading]); // Scroll on new messages or loading state change

    // Initial Load: Get User & History
    useEffect(() => {
        const init = async () => {
            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);

                // 2. Fetch History (last 200)
                const { data: history, error } = await (supabase as any)
                    .schema('app_anotacoes')
                    .from('chat_messages')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (history) {
                    // Reverse to show oldest first
                    const formattedHistory = history.reverse().map((msg: any) => ({
                        role: (msg.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
                        content: msg.content
                    }));
                    setMessages(formattedHistory);
                }
            }
        };

        init();
    }, []);

    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

    // TTS Helper
    const speakText = (text: string) => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel(); // Stop previous
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'pt-BR';
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;
        if (!userId) {
            console.error("User not authenticated");
            return;
        }

        const userMessage = inputValue;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInputValue("");
        setIsLoading(true);

        // Fechar busca ao enviar nova mensagem
        if (isSearchOpen) {
            setIsSearchOpen(false);
            setSearchQuery("");
        }

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    userId: userId
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || 'Failed to fetch response');
            }

            const data = await res.json();
            const reply = data.reply || "Desculpe, não consegui processar sua resposta.";
            
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);

            if (isVoiceEnabled) {
                speakText(reply);
            }

        } catch (error: any) {
            console.error("Chat Error:", error);
            const errorMsg = `Erro: ${error.message || "Tente novamente mais tarde."}`;
            setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
            
            if (isVoiceEnabled) {
                speakText("Ocorreu um erro ao processar sua mensagem.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Voice to Text Logic
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'pt-BR';
                
                // Silence detection timer
                let silenceTimer: NodeJS.Timeout;

                const resetSilenceTimer = () => {
                    clearTimeout(silenceTimer);
                    silenceTimer = setTimeout(() => {
                        recognition.stop();
                        setIsRecording(false);
                    }, 2500); // 2.5 seconds of silence = Stop
                };

                recognition.onstart = () => {
                   resetSilenceTimer();
                };

                recognition.onresult = (event: any) => {
                    resetSilenceTimer(); // Reset timer on speech detected
                    
                    let interimTranscript = '';
                    let finalTranscript = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    
                    if (finalTranscript) {
                         setInputValue(prev => prev + (prev ? ' ' : '') + finalTranscript);
                    }
                };

                recognition.onerror = (event: any) => {
                    console.error("Speech recognition error", event.error);
                    setIsRecording(false);
                    
                    if (event.error === 'not-allowed') {
                        alert("Permissão de microfone negada. Por favor, verifique as configurações do seu navegador e permita o acesso ao microfone.");
                    } else if (event.error === 'no-speech') {
                        // Ignore no-speech errors (common if user pauses)
                    } else {
                        alert("Erro no reconhecimento de voz: " + event.error);
                    }
                };

                recognition.onend = () => {
                    // Only auto-restart if we wanted to keep recording? 
                    // Usually we let it stop if silence or user stopped.
                    setIsRecording(false);
                };

                recognitionRef.current = recognition;
            }
        }
    }, []);

    const toggleRecording = async () => {
        if (!recognitionRef.current) {
            alert("Seu navegador não suporta reconhecimento de voz ou permissão negada.");
            return;
        }

        if (isRecording) {
            recognitionRef.current.stop();
            setIsRecording(false);
        } else {
            try {
                // EXPLICITLY REQUEST PERMISSION FIRST
                // This forces the browser popup to appear if not already granted/denied
                await navigator.mediaDevices.getUserMedia({ audio: true });

                recognitionRef.current.start();
                setIsRecording(true);
            } catch (err: any) {
                console.error("Failed to start recording or permission denied:", err);
                setIsRecording(false);

                if (err.name === 'NotFoundError' || err.message?.includes('device not found')) {
                    alert("Nenhum microfone encontrado. Verifique se o seu dispositivo possui um microfone conectado.");
                } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    alert("Acesso ao microfone negado. Por favor, permita o acesso na barra de endereços do navegador.");
                } else {
                    alert("Erro ao acessar o microfone: " + (err.message || "Erro desconhecido"));
                }
            }
        }
    };

    const [isInputFocused, setIsInputFocused] = useState(false);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm shrink-0 flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    <Bot size={20} />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-slate-800">Jarvis</h1>
                    <p className="text-xs text-slate-500 font-medium">Sr Donizete, qual a sua dúvida?</p>
                </div>

                {/* Botão de Voz (TTS) */}
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                        const newState = !isVoiceEnabled;
                        setIsVoiceEnabled(newState);
                        if (!newState) {
                            window.speechSynthesis?.cancel(); // Silence immediately if turning off
                        }
                    }}
                    className={`h-10 w-10 rounded-full ${isVoiceEnabled ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    title={isVoiceEnabled ? "Desativar resposta por voz" : "Ativar resposta por voz"}
                >
                    {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </Button>

                {/* Botão de Busca */}
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                        setIsSearchOpen(!isSearchOpen);
                        if (isSearchOpen) setSearchQuery("");
                    }}
                    className={`h-10 w-10 rounded-full ${isSearchOpen ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    title="Buscar no histórico"
                >
                    {isSearchOpen ? <X size={20} /> : <Search size={20} />}
                </Button>
            </div>

            {/* Barra de Busca (Expandida) */}
            {isSearchOpen && (
                <div className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm">
                    <div className="max-w-3xl mx-auto relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar nas conversas..."
                            className="h-10 pl-11 pr-4 rounded-full border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
                            autoFocus
                        />
                        {searchQuery && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                {filteredMessages.length} resultado(s)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {filteredMessages.length === 0 && !isLoading && (
                    <div className="text-center text-slate-400 mt-10">
                        <Sparkles size={48} className="mx-auto mb-4 opacity-20" />
                        <p>{searchQuery ? "Nenhum resultado encontrado..." : "Inicie uma nova conversa..."}</p>
                    </div>
                )}

                {filteredMessages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${msg.role === 'assistant' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
                            {msg.role === 'assistant' ? <Bot size={20} /> : <div className="font-bold text-xs">VOCÊ</div>}
                        </div>
                        <div className={`p-5 rounded-2xl shadow-sm border max-w-[80%] overflow-hidden ${msg.role === 'assistant'
                            ? 'bg-white border-slate-200 rounded-tl-none text-slate-700'
                            : 'bg-emerald-600 border-emerald-500 rounded-tr-none text-white'
                            }`}>
                            <div className="leading-relaxed text-lg break-words">
                                {msg.role === 'assistant' ? (
                                    <MessageContent
                                        content={msg.content}
                                        onImageClick={(url) => setImagePopupUrl(url)}
                                    />
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex gap-4 max-w-3xl mx-auto">
                        <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                            <Bot size={20} />
                        </div>
                        <div className="p-5 rounded-2xl shadow-sm border bg-white border-slate-200 rounded-tl-none text-slate-700 flex items-center gap-1">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                )}

                {/* Scroll Anchor */}
                <div ref={messagesEndRef} />
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
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            placeholder={isInputFocused ? "" : (isRecording ? "Ouvindo..." : "Peça um resumo, busque uma anotação...")}
                            className={`h-12 rounded-full pl-6 pr-12 text-lg md:text-lg placeholder:text-lg border-slate-200 bg-slate-50 focus-visible:ring-emerald-500 transition-all ${isRecording ? "border-red-300 bg-red-50 placeholder:text-red-400" : ""}`}
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

            {/* Image Popup Modal */}
            <Dialog open={!!imagePopupUrl} onOpenChange={() => setImagePopupUrl(null)}>
                <DialogContent className="max-w-4xl p-2 bg-white">
                    <DialogTitle className="sr-only">Foto do produto</DialogTitle>
                    {imagePopupUrl && (
                        <img
                            src={imagePopupUrl}
                            alt="Foto do produto"
                            className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
