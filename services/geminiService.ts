import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema definition for the AI response
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    severity: {
      type: Type.INTEGER,
      description: "Nível de gravidade da emergência de 1 (Baixo) a 5 (Crítico/Vida em risco).",
    },
    category: {
      type: Type.STRING,
      description: "Categoria curta do incidente (ex: Roubo, Incêndio, Acidente Doméstico, Agressão).",
    },
    suggestedAction: {
      type: Type.STRING,
      description: "Ação recomendada imediata para o operador ou cidadão (máximo 10 palavras).",
    },
    summary: {
      type: Type.STRING,
      description: "Resumo muito breve do relato para visualização rápida no painel.",
    }
  },
  required: ["severity", "category", "suggestedAction", "summary"],
};

export const analyzeEmergency = async (description: string, type: string): Promise<AIAnalysis> => {
  try {
    const prompt = `Analise o seguinte relato de emergência enviado por um cidadão para um sistema de despacho (${type}). Texto do relato: "${description}". Classifique a gravidade, categorize e sugira uma ação. Responda em Português.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIAnalysis;
  } catch (error) {
    console.error("Erro na análise de IA:", error);
    // Fallback if AI fails
    return {
      severity: 3,
      category: "Não classificado",
      suggestedAction: "Verificar manualmente",
      summary: description.substring(0, 50) + "..."
    };
  }
};