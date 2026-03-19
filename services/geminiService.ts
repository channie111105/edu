import { GoogleGenAI, Type } from "@google/genai";
import { ILead, AIAnalysisResult } from "../types";

// Optional client-side AI support for static deployments.
// Do not embed sensitive production keys in a public static build.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';
let ai: GoogleGenAI | null = null;

export const isGeminiEnabled = Boolean(apiKey);

const getGeminiClient = () => {
  if (!isGeminiEnabled) return null;
  if (!ai) {
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const analyzeLeadWithAI = async (lead: ILead): Promise<AIAnalysisResult | null> => {
  const client = getGeminiClient();
  if (!client) {
    console.warn("Gemini AI is disabled because VITE_GEMINI_API_KEY is not set.");
    return null;
  }

  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Bạn là trợ lý AI cao cấp cho hệ thống EduCRM (ULA).
    Hãy phân tích Lead sau đây để hỗ trợ Sales Rep chốt đơn.
    
    Thông tin Lead:
    - Tên: ${lead.name}
    - Chương trình quan tâm: ${lead.program}
    - Nguồn: ${lead.source}
    - Trạng thái hiện tại: ${lead.status}
    - Ghi chú: ${lead.notes}
    - Thời gian tạo: ${lead.createdAt}

    Hãy trả về kết quả dưới dạng JSON bao gồm:
    1. sentiment: Đánh giá mức độ tiềm năng (Cao/Trung bình/Thấp).
    2. actionableAdvice: Lời khuyên cụ thể cho Sales Rep nên làm gì tiếp theo (ngắn gọn, dưới 50 từ).
    3. suggestedEmail: Một email mẫu ngắn (Tiếng Việt) trang trọng để gửi cho khách hàng này.
    4. score: Điểm số tiềm năng (0-100).
  `;

  try {
    const response = await client.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: { type: Type.STRING },
            actionableAdvice: { type: Type.STRING },
            suggestedEmail: { type: Type.STRING },
            score: { type: Type.INTEGER },
          },
          required: ["sentiment", "actionableAdvice", "suggestedEmail", "score"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AIAnalysisResult;
    }
    return null;

  } catch (error) {
    console.error("Lỗi khi gọi Gemini:", error);
    return null;
  }
};
