
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ExtractedItem {
  calculo: string;
  listNumber?: string;
  productName: string;
  quantity: number;
  blastedTime: string; // ISO or relative string
}

export const parseImportData = async (rawText: string): Promise<ExtractedItem[]> => {
  if (!rawText.trim()) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analise o seguinte texto de entrada que representa um relatório de peças jateadas. 
      Extraia os dados estruturados. 
      
      IMPORTANTE: 
      1. Procure por um número identificador chamado "Cálculo", "Lote", "OP", "Ordem" ou um código numérico do item. Mapeie para 'calculo'.
      2. Procure por um número de "Lista", "Romaneio", "Remessa" ou "Relação". Mapeie para 'listNumber'.
      
      Se a hora não tiver data, assuma a data de hoje: ${new Date().toISOString()}.
      
      Texto:
      ${rawText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              calculo: {
                type: Type.STRING,
                description: "Número do Cálculo, Lote ou OP",
              },
              listNumber: {
                type: Type.STRING,
                description: "Número da Lista ou Romaneio (opcional)",
                nullable: true
              },
              productName: {
                type: Type.STRING,
                description: "Nome do produto ou código identificador",
              },
              quantity: {
                type: Type.NUMBER,
                description: "Quantidade de peças",
              },
              blastedTime: {
                type: Type.STRING,
                description: "Data e hora do jateamento em formato ISO 8601",
              },
            },
            required: ["calculo", "productName", "quantity", "blastedTime"],
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as ExtractedItem[];
    }
    return [];
  } catch (error) {
    console.error("Erro ao processar dados com Gemini:", error);
    throw new Error("Falha na inteligência artificial ao processar o arquivo.");
  }
};
