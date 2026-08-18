import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Clean text: remove dot separators in currency e.g. "20.000đ" -> "20000 đồng"
function normalizeVietnameseCurrency(text) {
  let cleaned = (text || '').toLowerCase();
  
  // Replace currency with dots e.g. "20.000đ", "1.750.000đ"
  cleaned = cleaned.replace(/(\d{1,3})\.(\d{3})\.(\d{3})\s*(?:đ|đồng|vnd)?/gi, '$1$2$3 đồng');
  cleaned = cleaned.replace(/(\d{1,3})\.(\d{3})\s*(?:đ|đồng|vnd)?/gi, '$1$2 đồng');
  cleaned = cleaned.replace(/(\d+)\s*đ\b/gi, '$1 đồng');
  cleaned = cleaned.replace(/(\d+)\s*k\b/gi, '$1 nghìn');

  return cleaned;
}

// Standalone Natural Language Voice Parser with Exact Mathematical Multiplication
function parseOfflineVoice(transcript) {
  const normalized = normalizeVietnameseCurrency(transcript);
  const lower = normalized.trim();
  
  if (!lower) {
    return {
      parsed_success: false,
      error_code: "AMBIGUOUS_TEXT",
      tts_confirmation: "Không nhận diện được nội dung giọng nói."
    };
  }

  // Check for Missing Price
  const hasPrice = lower.includes('nghìn') || lower.includes('ngàn') || lower.includes('k') || 
                   lower.includes('trăm') || lower.includes('triệu') || lower.includes('đồng') || 
                   lower.includes('giá') || /\d{3,}/.test(lower);
  
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

  if (lower.includes('gà') || lower.includes('thịt') || lower.includes('giống') || lower.includes('con')) {
    if (lower.includes('nhập') || lower.includes('giống') || isExpense) {
      category = "giong";
      itemName = "Nhập gà giống";
    } else {
      category = "ban_ga";
      itemName = "Bán gà thịt";
    }
  } else if (lower.includes('3008') || lower.includes('cargill') || lower.includes('cám')) {
    itemName = "Cám hỗn hợp gia cầm";
    category = "cam";
  } else if (lower.includes('thuốc') || lower.includes('vắc') || lower.includes('kháng sinh') || lower.includes('thú y')) {
    category = "thuoc";
    itemName = "Thuốc thú y gia cầm";
  } else if (lower.includes('điện') || lower.includes('nước') || lower.includes('trấu')) {
    category = "khac";
    itemName = "Chi phí vận hành trang trại";
  }

  // Extract Unit & Quantity
  let quantity = 1;
  let unit = "bao";

  if (lower.includes('kg') || lower.includes('ký') || lower.includes('cân')) unit = "kg";
  else if (lower.includes('con')) unit = "con";
  else if (lower.includes('chai') || lower.includes('lọ')) unit = "lọ";
  else if (lower.includes('liều')) unit = "liều";

  const qtyMatch = lower.match(/(\d+)\s*(?:con|bao|kg|ký|cân|chai|lọ|liều)/);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  }

  // Extract Price: Check whether Unit Price (giá X / con) or Total Price (hết X triệu / tổng X)
  let isUnitPrice = lower.includes('một con') || lower.includes('1 con') || 
                    lower.includes('một bao') || lower.includes('1 bao') || 
                    lower.includes('một kg') || lower.includes('1 kg') || 
                    lower.includes('một ký') || lower.includes('1 ký') ||
                    lower.includes('giá') || lower.includes('/con') || lower.includes('/kg');

  let rawPrice = 0;

  // 1. Check for million (triệu / tr)
  if (lower.includes('triệu') || lower.includes('tr')) {
    const trMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)/);
    if (trMatch) {
      const trVal = parseFloat(trMatch[1].replace(',', '.'));
      rawPrice = trVal * 1000000;
    }
  } 
  // 2. Check for hundred thousand phrases
  else if (lower.includes('trăm rưỡi')) {
    rawPrice = 150000;
  } else if (lower.includes('hai trăm rưỡi')) {
    rawPrice = 250000;
  } else if (lower.includes('ba trăm rưỡi')) {
    rawPrice = 350000;
  } 
  // 3. Match explicit number with unit (nghìn, ngàn, k, đồng)
  else {
    const priceMatch = lower.match(/(?:giá|hết|thu|chi|về)?\s*(\d+)\s*(?:nghìn|ngàn|k|đồng)/i);
    if (priceMatch) {
      const numVal = parseInt(priceMatch[1], 10);
      if (lower.includes('nghìn') || lower.includes('ngàn') || lower.includes('k')) {
        rawPrice = numVal * 1000;
      } else {
        rawPrice = numVal;
      }
    } else {
      // Find numbers excluding quantity
      const allNumbers = Array.from(lower.matchAll(/\b(\d+)\b/g)).map(m => parseInt(m[1], 10));
      const filtered = allNumbers.filter(n => n !== quantity);
      if (filtered.length > 0) {
        rawPrice = filtered[filtered.length - 1];
        if (rawPrice < 1000 && rawPrice > 0) rawPrice = rawPrice * 1000;
      }
    }
  }

  if (rawPrice === 0) {
    rawPrice = 20000; // sensible default
  }

  let pricePerUnit = rawPrice;
  let totalAmount = rawPrice;

  if (isUnitPrice && quantity > 1) {
    pricePerUnit = rawPrice;
    totalAmount = pricePerUnit * quantity;
  } else if (!isUnitPrice && quantity > 1 && rawPrice > 100000) {
    // If total amount was stated e.g. "mua 5 bao cám hết 1 triệu 750"
    totalAmount = rawPrice;
    pricePerUnit = Math.round(totalAmount / quantity);
  } else {
    totalAmount = rawPrice * quantity;
    pricePerUnit = rawPrice;
  }

  const formattedTotal = totalAmount.toLocaleString('vi-VN');
  const formattedUnit = pricePerUnit.toLocaleString('vi-VN');

  return {
    parsed_success: true,
    error_code: null,
    type,
    category,
    item_name: itemName,
    quantity,
    unit,
    price_per_unit: pricePerUnit,
    total_amount: totalAmount,
    tts_confirmation: `Đã ghi nhận ${type === 'EXPENSE' ? 'chi' : 'thu'} ${formattedTotal} đồng tiền ${itemName} (${quantity} ${unit} x ${formattedUnit}đ/${unit}).`
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

    const systemInstruction = `Bạn là Trợ lý Kế toán & Quản trị Trang trại Gia cầm Thông minh (ChănNuôi AI).
Nhiệm vụ: Phân tích câu nói tiếng Việt địa phương và trích xuất thành giao dịch tài chính JSON với TOÁN HỌC CHÍNH XÁC 100%.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【QUY TẮC TÍNH TOÁN TOÁN HỌC BẮT BUỘC】:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PHÂN BIỆT ĐƠN GIÁ (PRICE PER UNIT) VÀ TỔNG TIỀN (TOTAL AMOUNT):
   - NẾU người dùng nói "X [con/bao/kg] giá Y [đ/nghìn/k] một [con/bao/kg]":
     ➔ quantity = X
     ➔ price_per_unit = Y
     ➔ total_amount = X * Y
     *VÍ DỤ:* "nhập gà 1000 con giá 20.000đ một con" ➔ quantity: 1000, unit: "con", price_per_unit: 20000, total_amount: 20000000 (20 triệu).
     *VÍ DỤ:* "bán 100 kg gà giá 54 nghìn một cân" ➔ quantity: 100, unit: "kg", price_per_unit: 54000, total_amount: 5400000.
   
   - NẾU người dùng nói "mua X bao cám hết Y triệu/nghìn":
     ➔ quantity = X
     ➔ total_amount = Y
     ➔ price_per_unit = Y / X
     *VÍ DỤ:* "mua 5 bao cám hết 1 triệu 750 nghìn" ➔ quantity: 5, unit: "bao", total_amount: 1750000, price_per_unit: 350000.

2. QUY ĐỔI SỐ TIỀN & ĐƠN VỊ TIẾNG VIỆT:
   - "20.000đ", "20k", "20 ngàn", "20 nghìn" = 20000
   - "trăm rưỡi" = 150000 | "hai trăm rưỡi" = 250000 | "ba trăm rưỡi" = 350000
   - "1 triệu 750 nghìn" = 1750000 | "5 triệu tư" = 5400000 | "20 triệu" = 20000000

3. PHÂN LOẠI LOẠI GIAO DỊCH (TYPE):
   - "EXPENSE" (Chi phí): Nhập gà, mua cám, mua thuốc, trả tiền điện nước.
   - "REVENUE" (Doanh thu): Bán gà, bán trứng, bán phân gà.

JSON Output Format:
{
  "parsed_success": boolean,
  "error_code": null | "MISSING_PRICE" | "AMBIGUOUS_TEXT",
  "type": "EXPENSE" | "REVENUE" | null,
  "category": "giong" | "cam" | "thuoc" | "ban_ga" | "ban_trung" | "khac" | null,
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
            temperature: 0.05,
          },
          systemInstruction
        });

        const prompt = `Phân tích câu giọng nói này và tính toán số tiền chính xác: "${transcript}"`;
        result = await model.generateContent(prompt);
        if (result) break;
      } catch (mErr) {
        console.warn(`Voice model ${modelName} failed:`, mErr.message);
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

    // Safety verification: if quantity and price_per_unit exist but total_amount is wrong
    if (parsedJson.quantity && parsedJson.price_per_unit && (!parsedJson.total_amount || parsedJson.total_amount === parsedJson.price_per_unit)) {
      if (parsedJson.quantity > 1) {
        parsedJson.total_amount = parsedJson.quantity * parsedJson.price_per_unit;
      }
    }

    return NextResponse.json(parsedJson);

  } catch (error) {
    console.error("Gemini Voice Parse Final Catch Error:", error);
    return NextResponse.json(parseOfflineVoice(transcript));
  }
}
