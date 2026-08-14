import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export async function POST(req) {
  try {
    const { transcript } = await req.json();

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({
        parsed_success: false,
        error_code: "AMBIGUOUS_TEXT",
        tts_confirmation: "Không nhận diện được nội dung giọng nói."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    // Check if API key is present and not a dummy string
    const hasValidKey = apiKey && !apiKey.includes('your_gemini') && apiKey.trim().length > 10;

    if (!hasValidKey) {
      // SMART OFFLINE REGEX PARSER FALLBACK
      const lower = transcript.toLowerCase();
      
      // Check for Missing Price
      const hasPrice = lower.includes('nghìn') || lower.includes('ngàn') || lower.includes('k') || lower.includes('trăm') || lower.includes('triệu') || /\d{3,}/.test(lower);
      
      if (!hasPrice) {
        return NextResponse.json({
          parsed_success: false,
          error_code: "MISSING_PRICE",
          type: null,
          category: null,
          item_name: null,
          quantity: null,
          unit: null,
          price_per_unit: null,
          total_amount: null,
          tts_confirmation: "Bạn chưa nói giá tiền cám/thuốc bao nhiêu, xin hãy nói lại kèm số tiền."
        });
      }

      // Determine Transaction Type
      const isExpense = lower.includes('nhập') || lower.includes('mua') || lower.includes('lấy') || lower.includes('chi') || lower.includes('tiêm');
      const type = isExpense ? "EXPENSE" : (lower.includes('bán') || lower.includes('thu') ? "REVENUE" : "EXPENSE");

      // Extract Item & Category
      let category = "CÁM";
      let itemName = "Cám hỗn hợp gia cầm";

      if (lower.includes('3008')) {
        itemName = "Cám 3008 (Gà con)";
        category = "CÁM";
      } else if (lower.includes('thuốc') || lower.includes('vắc') || lower.includes('kháng sinh') || lower.includes('thú y')) {
        category = "THUỐC/VẮC XIN";
        itemName = "Thuốc thú y gia cầm";
      } else if (lower.includes('gà') || lower.includes('thịt') || lower.includes('giống')) {
        category = "BÁN GÀ";
        itemName = "Bán gà thịt";
      } else if (lower.includes('điện') || lower.includes('nước') || lower.includes('trấu')) {
        category = "KHÁC";
        itemName = "Chi phí vận hành";
      }

      // Extract Numbers (Quantity & Price)
      let quantity = 1;
      let price = 50000;
      let unit = "bao";

      if (lower.includes('kg') || lower.includes('ký') || lower.includes('cân')) unit = "kg";
      else if (lower.includes('con')) unit = "con";
      else if (lower.includes('chai') || lower.includes('lọ')) unit = "lọ";

      const qtyMatch = lower.match(/(\d+)\s*(bao|kg|con|chai|lọ|liều)/);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[1], 10);
      }

      const numMatch = lower.match(/(\d+)\s*(nghìn|ngàn|k|trăm|triệu)/);
      if (numMatch) {
        const numVal = parseInt(numMatch[1], 10);
        const unitStr = numMatch[2];
        if (unitStr === 'k' || unitStr === 'nghìn' || unitStr === 'ngàn') price = numVal * 1000;
        else if (unitStr === 'trăm') price = numVal * 100000;
        else if (unitStr === 'triệu') price = numVal * 1000000;
      } else {
        const rawNumMatch = lower.match(/giá\s*(\d+)/);
        if (rawNumMatch) {
          const rawVal = parseInt(rawNumMatch[1], 10);
          price = rawVal < 1000 ? rawVal * 1000 : rawVal;
        }
      }

      const formattedAmountText = (price * quantity).toLocaleString('vi-VN');

      return NextResponse.json({
        parsed_success: true,
        error_code: null,
        type: type,
        category: category,
        item_name: itemName,
        quantity: quantity,
        unit: unit,
        price_per_unit: price,
        total_amount: price * quantity,
        tts_confirmation: `Đã ghi nhận ${type === 'EXPENSE' ? 'chi' : 'thu'} ${formattedAmountText} nghìn tiền ${itemName}.`
      });
    }

    // REAL GEMINI 2.0 FLASH API CALL
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
      systemInstruction: `Bạn là Trợ lý Tài chính Nông nghiệp nghiêm ngặt (ChănNuôi AI).
Nhiệm vụ: Phân tích câu văn giọng nói tiếng Việt địa phương và trích xuất thành giao dịch tài chính JSON.

[QUY TẮC KIỂM TRA ĐẦY ĐỦ THÔNG TIN TÀI CHÍNH - ZERO HALLUCINATION]:
1. Bắt buộc phải có đủ 2 yếu tố: (1) Tên vật tư/gà AND (2) Số tiền kèm đơn vị rõ ràng (k, nghìn, triệu, đồng).
2. NẾU THIẾU GIÁ TIỀN ➔ Đặt parsed_success: false, error_code: "MISSING_PRICE", tts_confirmation: "Bạn chưa nói giá tiền cám/thuốc bao nhiêu, xin hãy nói lại kèm số tiền."
3. NẾU SỐ TIỀN THIẾU ĐƠN VỊ RÕ RÀNG ➔ Đặt parsed_success: false, error_code: "AMBIGUOUS_TEXT", tts_confirmation: "Số tiền chưa rõ là nghìn hay triệu, xin hãy nói rõ đơn vị số tiền."
4. Quy đổi từ ngữ 3 miền rõ ràng:
   - "trăm rưỡi nghìn" = 150000 | "ba trăm rưỡi nghìn" = 350000 | "hai triệu tư" = 2400000 | "5 k" = 5000 | "520 nghìn" = 520000
   - "một chục" = 10 | "hai chục" = 20 | "nửa bao" = 0.5
5. Phân loại type: "EXPENSE" (Chi phí) hoặc "REVENUE" (Doanh thu).

JSON Output Format:
{
  "parsed_success": boolean,
  "error_code": null | "MISSING_PRICE" | "AMBIGUOUS_TEXT",
  "type": "EXPENSE" | "REVENUE" | null,
  "category": "cam" | "giong" | "thuoc" | "ban_ga" | "ban_trung" | "khac" | null,
  "item_name": string | null,
  "quantity": number | null,
  "unit": string | null,
  "price_per_unit": number | null,
  "total_amount": number | null,
  "tts_confirmation": string
}`
    });

    const prompt = `Phân tích câu giọng nói này: "${transcript}"`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let cleaned = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const parsedJson = JSON.parse(cleaned);
    return NextResponse.json(parsedJson);

  } catch (error) {
    console.error("Gemini Voice Parse Error:", error);
    return NextResponse.json({
      parsed_success: false,
      error_code: "SERVER_ERROR",
      tts_confirmation: "Lỗi kết nối Gemini API. Vui lòng kiểm tra lại chìa khóa API Key."
    }, { status: 500 });
  }
}
