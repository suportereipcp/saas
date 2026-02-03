import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

// Initialize API
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateSubtasks = async (productName: string, description: string): Promise<string[]> => {
    try {
        const prompt = `Produto: ${productName}\nDescrição da Alteração: ${description}\n\nGere apenas uma lista JSON de strings com as tarefas. Responda APENAS o JSON.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        if (!text) return [];

        // Clean markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Erro ao gerar subtarefas com Gemini:", error);
        return ["Revisar documentação técnica", "Validar alteração com equipe", "Atualizar desenho técnico"];
    }
};

export const enhanceDescription = async (rawText: string): Promise<string> => {
    try {
        const result = await model.generateContent(`Reescreva a seguinte solicitação de alteração de produto para ser mais profissional, clara e técnica (mantenha em português): ${rawText}`);
        const response = await result.response;
        return response.text() || rawText;
    } catch (error) {
        console.error("Erro no enhanceDescription:", error);
        return rawText;
    }
}
