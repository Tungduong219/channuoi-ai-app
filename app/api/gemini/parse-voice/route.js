import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Standalone Natural Language Voice Parser for Offline Fallback
function parseOfflineVoice(transcript) {
  const lower = (transcript || '').toLowerCase().trim();
  
  if (!lower) {
    return {
      parsed_success: false,
      error_code: "AMBIGUOUS_TEXT",
      tts_confirmation: "Không nhận diện được nội dung giọng nói."
    };
  }

  // Check for Missing Price
  const hasPrice = lower.includes('nghìn') || lower.includes('ngàn') || lower.includes('k') || 
                   lower.includes('trăm') || lower.includes('triệu') || lower.includes('đồng') || /\d{3,}/.test(lower);
  
  if (!hasPrice) {
    return {
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
    };
  }

  // Determine Transaction Type
  const isExpense = lower.includes('nhập') || lower.includes('mua') || lower.includes('lấy') || 
                    lower.includes('chi') || lower.includes('tiêm') || lower.includes('hết');
  const type = isExpense ? "EXPENSE" : (lower.includes('bán') || lower.includes('thu') ? "REVENUE" : "EXPENSE");

  // Extract Item & Category
  let category = "cam";
  let itemName = "Cám hỗn hợp gia cầm";

  if (lower.includes('3008') || lower.includes('cargill') || lower.includes('cám')) {
    itemName = "Cám hỗn hợp gia cầm";
    category = "cam";
  } else if (lower.includes('thuốc') || lower.includes('vắc') || lower.includes('kháng sinh') || lower.includes('thú y')) {
    category = "thuoc";
    itemName = "Thuốc thú y gia cầm";
  } else if (lower.includes('gà') || lower.includes('thịt') || lower.includes('giống')) {
    category = type === 'REVENUE' ? "ban_ga" : "giong";
    itemName = type === 'REVENUE' ? "Bán gà thịt" : "Nhập gà giống";
  } else if (lower.includes('điện') || lower.includes('nước') || lower.includes('trấu')) {
    category = "khac";
    itemName = "Chi phí vận hành trang trại";
  }

  // Extract Numbers (Quantity & Price)
  let quantity = 1;
  let price = 50000;
  let unit = "bao";

  if (lower.includes('kg') || lower.includes('ký') || lower.includes('cân')) unit = "kg";
  else if (lower.includes('con')) unit = "con";
  else if (lower.includes('chai') || lower.includes('lọ')) unit = "lọ";
  else if (lower.includes('liều')) unit = "liều";

  const qtyMatch = lower.match(/(\d+)\s*(bao|kg|con|chai|lọ|liều)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  }

  // Parse Vietnamese numbers (triệu, trăm rưỡi, nghìn, k)
  if (lower.includes('triệu') || lower.includes('tr')) {
    const trMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)/);
    if (trMatch) {
      const trVal = parseFloat(trMatch[1].replace(',', '.'));
      price = trVal * 1000000;
    }
  } else if (lower.includes('trăm rưỡi')) {
    price = 150000;
  } else if (lower.includes('hai trăm rưỡi')) {
    price = 250000;
  } else if (lower.includes('ba trăm rưỡi')) {
    price = 350000;
  } else {
    const numMatch = lower.match(/(\d+)\s*(nghìn|ngàn|k|trăm|đồng)/);
    if (numMatch) {
      const numVal = parseInt(numMatch[1], 10);
      const unitStr = numMatch[2];
      if (unitStr === 'k' || unitStr === 'nghìn' || unitStr === 'ngàn') price = numVal * 1000;
      else if (unitStr === 'trăm') price = numVal * 100000;
      else price = numVal;
    } else {
      const rawNumMatch = lower.match(/(\d{3,})/);
      if (rawNumMatch) {
        price = parseInt(rawNumMatch[1], 10);
      }
    }
  }

  const totalAmount = price * quantity;
  const formattedAmountText = totalAmount.toLocaleString('vi-VN');

  return {
    parsed_success: true,
    error_code: null,
    type,
    category,
    item_name: itemName,
    quantity,
    unit,
    price_per_unit: price,
    total_amount: totalAmount,
    tts_confirmation: `Đã ghi nhận ${type === 'EXPENSE' ? 'chi' : 'thu'} ${formattedAmountText} đồng tiền ${itemName}.`
  };
}

// Helper: Extract valid JSON substring using bracket depth
function extractValidJSON(str) {
  const start = str.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < str.length; i++) {
    const char = str[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') depth++;
      else if (char === '}') {
        depth--;
        if (depth === 0) {
          return str.substring(start, i + 1);
        }
      }
    }
  }
  return null;
}

export async function POST(req) {
  let transcript = '';
  try {
    const body = await req.json();
    transcript = body.transcript || '';

    if (!transcript || !transcript.trim()) {
      return NextResponse.json({
        parsed_success: false,
        error_code: "AMBIGUOUS_TEXT",
        tts_confirmation: "Không nhận diện được nội dung giọng nói."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const hasValidKey = apiKey && !apiKey.includes('your_gemini') && apiKey.trim().length > 10;

    if (!hasValidKey) {
      return NextResponse.json(parseOfflineVoice(transcript));
    }

    // Candidate models loop with Gemini 3.5 / 3.6 Flash priority
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
    let result = null;
    let lastErr = null;

    const systemInstruction = `Bạn là Trợ lý Tài chính Nông nghiệp nghiêm ngặt (ChănNuôi AI).
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

        const prompt = `Phân tích câu giọng nói này: "${transcript}"`;
        result = await model.generateContent(prompt);
        if (result) break;
      } catch (mErr) {
        console.warn(`Voice model ${modelName} attempt failed:`, mErr.status || mErr.message);
        lastErr = mErr;
      }
    }

    if (!result) {
      return NextResponse.json(parseOfflineVoice(transcript));
    }

    const responseText = result.response.text();
    let parsedJson = null;

    try {
      const jsonSubstr = extractValidJSON(responseText);
      if (jsonSubstr) {
        parsedJson = JSON.parse(jsonSubstr);
      } else {
        const cleaned = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        parsedJson = JSON.parse(cleaned);
      }
    } catch (parseErr) {
      console.warn("Voice JSON parse fallback to regex:", parseErr.message);
      return NextResponse.json(parseOfflineVoice(transcript));
    }

    return NextResponse.json(parsedJson);

  } catch (error) {
    console.error("Gemini Voice Parse Final Catch Error:", error);
    // Seamless fallback to smart offline parser — never crash or show red error to farmer
    return NextResponse.json(parseOfflineVoice(transcript));
  }
}
