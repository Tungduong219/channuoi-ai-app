import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { images } = await req.json();

    // Validate images array: must be 1–8 items
    if (!images || !Array.isArray(images) || images.length === 0 || images.length > 8) {
      return NextResponse.json(
        { error: "Cần 1-8 ảnh hợp lệ." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const hasValidKey = apiKey && !apiKey.includes('your_gemini') && apiKey.startsWith('AIza');

    // Offline mock fallback when no valid API key
    if (!hasValidKey) {
      return NextResponse.json({
        images_analyzed: images.length,
        symptoms_detected: ["Phân màu xanh đọt chuối", "Ủ dột gục đầu", "Mào thâm"],
        suspected_condition: "Nghi ngờ Newcastle (Bệnh Gà Rùa)",
        confidence_note: images.length >= 3 ? "CAO" : "TRUNG BÌNH",
        urgency_level: "CAO",
        action_recommendation: "Cách ly ngay các con gà có triệu chứng. Phun thuốc sát trùng toàn bộ khu vực chuồng nuôi.",
        disclaimer: "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."
      });
    }

    // Build image parts array — dynamic MIME extraction, no hardcoded "image/jpeg"
    const imageParts = images.map((imageBase64) => {
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      return { inlineData: { data: cleanBase64, mimeType } };
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
      systemInstruction: `Bạn là Chuyên gia AI Cảnh báo Sức khỏe Gia cầm tại Việt Nam (ChănNuôi AI).
Nhiệm vụ: Phân tích MỘT TẬP HỢP hình ảnh (1 đến 8 ảnh) của CÙNG MỘT con gà đang có biểu hiện bất thường, do người nuôi tải lên từ nhiều góc độ khác nhau (phân, dáng đứng, mắt, mào, chân...). Trả về dữ liệu dạng JSON có cấu trúc.

[QUY TẮC PHÂN TÍCH ĐA ẢNH]:
1. Coi TẤT CẢ ảnh trong tập hợp là cùng một con gà — tổng hợp thông tin từ mọi ảnh để đưa ra MỘT kết luận chẩn đoán DUY NHẤT, không đánh giá/trả lời riêng lẻ theo từng ảnh.
2. Nếu các ảnh cho tín hiệu mâu thuẫn nhau, ghi nhận CẢ HAI vào symptoms_detected và hạ mức độ chắc chắn của suspected_condition.
3. Nếu chỉ có 1 ảnh duy nhất, vẫn phân tích bình thường nhưng đánh giá "TRUNG BÌNH" cho confidence_note trừ khi triệu chứng cực kỳ rõ ràng.

[QUY TẮC AN TOÀN PHÁP LÝ & HEURISTIC ASSESSMENT]:
4. Liệt kê triệu chứng quan sát được (symptoms_detected): Phân xanh đọt chuối, phân trắng, diều sưng, ủ dột, sưng mặt, xù lông, mắt lờ đờ...
5. Đánh giá dấu hiệu nghi ngờ (suspected_condition): Đưa ra 1-2 bệnh nghi ngờ phổ biến ở VN (Gumboro, Newcastle, Cúm H5N1, Cầu trùng, Tụ huyết trùng).
6. KHÔNG BAO GIỜ KÊ ĐƠN THUỐC CỤ THỂ HOẶC LIỀU LƯỢNG ĐIỀU TRỊ.
7. Hướng dẫn xử lý an toàn sinh học ban đầu (action_recommendation): Cách ly gà bệnh, phun khử trùng chuồng nuôi.
8. Luôn bao gồm disclaimer bắt buộc: "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."

[JSON OUTPUT SCHEMA REQUIRED]:
{
  "images_analyzed": number,
  "symptoms_detected": [string],
  "suspected_condition": string,
  "confidence_note": "CAO" | "TRUNG BÌNH" | "THẤP",
  "urgency_level": "THẤP" | "TRUNG BÌNH" | "CAO" | "KHẨN CẤP",
  "action_recommendation": string,
  "disclaimer": "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."
}`
    });

    // Single Gemini API call with all image parts + prompt
    const result = await model.generateContent([
      `Phân tích triệu chứng gà từ ${images.length} ảnh sau đây (tất cả là cùng một con gà):`,
      ...imageParts
    ]);

    const responseText = result.response.text();

    let cleaned = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleaned);
    // Ensure images_analyzed is always accurate (use actual count, not model guess)
    parsed.images_analyzed = images.length;
    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Gemini Vision API Error:", error);
    return NextResponse.json({
      images_analyzed: 0,
      symptoms_detected: ["Nghi ngờ dấu hiệu bất thường"],
      suspected_condition: "Cần theo dõi thêm",
      confidence_note: "THẤP",
      urgency_level: "TRUNG BÌNH",
      action_recommendation: "Vệ sinh chuồng trại và liên hệ Bác sĩ Thú y địa phương.",
      disclaimer: "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."
    });
  }
}
