import { GoogleGenAI } from "@google/genai";
import { CardData, Language } from "../types";

const getSystemInstruction = (lang: Language) => {
  if (lang === Language.KR) {
    return "당신은 전문적인 직업 상담사입니다. 사용자가 선택한 직업 카드를 바탕으로 그들의 흥미 유형(RIASEC)을 분석하고, 적합한 진로 방향을 구체적이고 따뜻한 어조로 제안해주세요.";
  }
  return "You are a professional career counselor. Based on the career cards selected by the user, analyze their interest type (RIASEC) and suggest suitable career paths in a specific and encouraging tone.";
};

export const analyzeCareerPath = async (
  selectedCards: CardData[],
  language: Language
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using 'keyword' from the new schema
    const cardList = selectedCards
      .map(c => c.keyword)
      .join(", ");

    const prompt = language === Language.KR
      ? `사용자가 다음 키워드(직업 관련 흥미)에 관심을 보였습니다: ${cardList}. 이들의 공통적인 특성을 분석하고, 이 사용자에게 추천할 만한 직업 3가지와 그 이유를 설명해주세요.`
      : `The user showed interest in the following keywords: ${cardList}. Analyze the common characteristics of these choices and recommend 3 suitable careers with reasons.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(language),
        temperature: 0.7,
      }
    });

    return response.text || (language === Language.KR ? "분석 결과를 생성할 수 없습니다." : "Could not generate analysis.");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return language === Language.KR 
      ? "분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." 
      : "An error occurred during analysis. Please try again later.";
  }
};
