import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(req) {
  try {
    const { breed, startDate } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // Fallback if no API key for local offline testing
    if (!apiKey || apiKey.includes('your_gemini')) {
      return NextResponse.json({
        breed: breed || "Gà Ri",
        schedule: [
          { day_age: 1, disease_name: "Marek", vaccine_type: "Marek rỉ mắt", method: "Tiêm dưới da cổ", is_mandatory: true, notes: "Thực hiện tại lò ươm" },
          { day_age: 7, disease_name: "Gumboro (Mũi 1)", vaccine_type: "Gumboro A78", method: "Nhỏ mắt/mũi", is_mandatory: true, notes: "Nhỏ vào buổi sáng mát" },
          { day_age: 14, disease_name: "Cúm H5N1", vaccine_type: "Re-6/H5N1", method: "Tiêm dưới da cổ", is_mandatory: true, notes: "Bắt buộc theo khuyến cáo thú y" },
          { day_age: 21, disease_name: "Gumboro (Mũi 2)", vaccine_type: "Gumboro Lio", method: "Cho uống", is_mandatory: true, notes: "Pha nước sạch uống trong 2h" },
          { day_age: 45, disease_name: "Tụ huyết trùng", vaccine_type: "Tụ huyết trùng keo phèn", method: "Tiêm bắp đùi", is_mandatory: false, notes: "Nhắc lại trước mùa mưa" }
        ]
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
    let result = null;

    const systemInstruction = `Bạn là Bác sĩ Thú y chuyên về Lịch phòng bệnh Gia cầm tại Việt Nam.
Nhiệm vụ: Dựa vào thông tin giống gà và ngày bắt đầu nuôi, sinh ra Lịch tiêm vắc-xin cá nhân hóa chuẩn theo ngày tuổi dạng JSON.

JSON Output Format:
{
  "breed": string,
  "schedule": [
    {
      "day_age": number,
      "disease_name": string,
      "vaccine_type": string,
      "method": "Nhỏ mắt/mũi" | "Cho uống" | "Tiêm dưới da cổ" | "Tiêm bắp đùi",
      "is_mandatory": boolean,
      "notes": string
    }
  ]
}`;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
          systemInstruction
        });

        const prompt = `Sinh lịch vắc-xin chuẩn cho giống gà: ${breed || 'Gà Ri'}, ngày thả giống: ${startDate || 'Hôm nay'}`;
        result = await model.generateContent(prompt);
        if (result) break;
      } catch (mErr) {
        console.warn(`Vaccine model ${modelName} failed:`, mErr.message);
      }
    }

    if (!result) {
      throw new Error("Mọi mô hình tạo lịch vắc-xin đều bận.");
    }

    const responseText = result.response.text();
    let cleaned = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    return NextResponse.json(JSON.parse(cleaned));

  } catch (error) {
    console.error("Gemini Vaccine API Error:", error);
    return NextResponse.json({
      breed: "Gà Ri",
      schedule: [
        { day_age: 1, disease_name: "Marek", vaccine_type: "Marek", method: "Tiêm dưới da cổ", is_mandatory: true, notes: "Thực hiện tại lò" },
        { day_age: 14, disease_name: "Cúm H5N1", vaccine_type: "Re-6", method: "Tiêm dưới da cổ", is_mandatory: true, notes: "Tiêm vào buổi sáng" }
      ]
    });
  }
}
