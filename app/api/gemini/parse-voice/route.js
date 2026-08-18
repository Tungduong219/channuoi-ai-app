import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Clean text: remove dot separators in currency e.g. "20.000đ" -> "20000 đồng"
function normalizeVietnameseCurrency(text) {
  let cleaned = (text || '').toLowerCase();
  
  cleaned = cleaned.replace(/(\d{1,3})\.(\d{3})\.(\d{3})\s*(?:đ|đồng|vnd)?/gi, '$1$2$3 đồng');
  cleaned = cleaned.replace(/(\d{1,3})\.(\d{3})\s*(?:đ|đồng|vnd)?/gi, '$1$2 đồng');
  cleaned = cleaned.replace(/(\d+)\s*đ\b/gi, '$1 đồng');
  cleaned = cleaned.replace(/(\d+)\s*k\b/gi, '$1 nghìn');

  return cleaned;
}

// Standalone Natural Language Voice Parser with Multi-Flock & Flock Creation Support
function parseOfflineVoice(transcript, availableFlocks = [], isFlockCreationMode = false) {
  const normalized = normalizeVietnameseCurrency(transcript);
  const lower = normalized.trim();
  
  if (!lower) {
    return {
      parsed_success: false,
      error_code: "AMBIGUOUS_TEXT",
      tts_confirmation: "Không nhận diện được nội dung giọng nói."
    };
  }

  // Detect Breed
  let detectedBreed = "Gà Ri";
  if (lower.includes('đông tảo')) detectedBreed = "Gà Đông Tảo";
  else if (lower.includes('mía')) detectedBreed = "Gà Mía";
  else if (lower.includes('ai cập')) detectedBreed = "Gà Ai Cập";
  else if (lower.includes('lai chọi') || lower.includes('chọi')) detectedBreed = "Gà Lai Chọi";
  else if (lower.includes('lương phượng')) detectedBreed = "Gà Lương Phượng";
  else if (lower.includes('tre')) detectedBreed = "Gà Tre";
  else if (lower.includes('ri')) detectedBreed = "Gà Ri";

  // Detect Coop / Location
  let coopLocation = "Chuồng 1";
  const coopMatch = lower.match(/(?:chuồng|khu)\s*([a-zA-Z0-9]+)/i);
  if (coopMatch) {
    coopLocation = `Chuồng ${coopMatch[1].toUpperCase()}`;
  }

  // Detect Quantity (Số con / số lượng)
  let quantity = 1000;
  const qtyMatch = lower.match(/(\d+)\s*(?:con|gà|bao|kg|ký|cân|chai|lọ|liều)/i);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  }

  // Detect Unit Price (Giá / con)
  let unitPrice = 20000;
  if (lower.includes('triệu') || lower.includes('tr')) {
    const trMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)/);
    if (trMatch) {
      unitPrice = parseFloat(trMatch[1].replace(',', '.')) * 1000000;
    }
  } else if (lower.includes('trăm rưỡi')) {
    unitPrice = 150000;
  } else if (lower.includes('hai trăm rưỡi')) {
    unitPrice = 250000;
  } else {
    const priceMatch = lower.match(/(?:giá|hết|mỗi con|1 con|một con)?\s*(\d+)\s*(?:nghìn|ngàn|k|đồng)/i);
    if (priceMatch) {
      const numVal = parseInt(priceMatch[1], 10);
      if (lower.includes('nghìn') || lower.includes('ngàn') || lower.includes('k')) {
        unitPrice = numVal * 1000;
      } else {
        unitPrice = numVal;
      }
    } else {
      const allNumbers = Array.from(lower.matchAll(/\b(\d+)\b/g)).map(m => parseInt(m[1], 10));
      const filtered = allNumbers.filter(n => n !== quantity);
      if (filtered.length > 0) {
        unitPrice = filtered[filtered.length - 1];
        if (unitPrice < 1000 && unitPrice > 0) unitPrice = unitPrice * 1000;
      }
    }
  }

  if (unitPrice === 0) unitPrice = 20000;

  // Detect Target Flock (for normal transaction mode)
  let matchedFlockId = null;
  let matchedFlockName = null;

  if (Array.isArray(availableFlocks) && availableFlocks.length > 0) {
    for (const f of availableFlocks) {
      const fNameLower = (f.flockName || '').toLowerCase();
      const fBreedLower = (f.breed || '').toLowerCase();
      const fCoopLower = (f.coopLocation || '').toLowerCase();

      if (
        (fNameLower && lower.includes(fNameLower)) ||
        (fBreedLower && lower.includes(fBreedLower)) ||
        (fCoopLower && lower.includes(fCoopLower)) ||
        (fBreedLower.includes('đông tảo') && lower.includes('đông tảo')) ||
        (fBreedLower.includes('ri') && (lower.includes('gà ri') || lower.includes('đàn ri'))) ||
        (fBreedLower.includes('mía') && (lower.includes('gà mía') || lower.includes('đàn mía'))) ||
        (fBreedLower.includes('ai cập') && (lower.includes('ai cập') || lower.includes('đẻ trứng')))
      ) {
        matchedFlockId = f.flockId;
        matchedFlockName = f.flockName;
        break;
      }
    }
  }

  const isExpense = lower.includes('nhập') || lower.includes('mua') || lower.includes('lấy') || 
                    lower.includes('chi') || lower.includes('tiêm') || lower.includes('hết') || isFlockCreationMode;
  const type = isExpense ? "EXPENSE" : (lower.includes('bán') || lower.includes('thu') ? "REVENUE" : "EXPENSE");

  let category = isFlockCreationMode ? "giong" : "cam";
  let itemName = isFlockCreationMode ? `Nhập giống ${detectedBreed}` : "Cám hỗn hợp gia cầm";

  if (lower.includes('gà') || lower.includes('thịt') || lower.includes('giống') || lower.includes('con')) {
    if (lower.includes('nhập') || lower.includes('giống') || isExpense) {
      category = "giong";
      itemName = `Nhập giống ${detectedBreed}`;
    } else {
      category = "ban_ga";
      itemName = "Bán gà thịt";
    }
  } else if (lower.includes('thuốc') || lower.includes('vắc') || lower.includes('kháng sinh') || lower.includes('thú y')) {
    category = "thuoc";
    itemName = "Thuốc thú y gia cầm";
  }

  let unit = "con";
  if (lower.includes('bao')) unit = "bao";
  else if (lower.includes('kg') || lower.includes('ký') || lower.includes('cân')) unit = "kg";
  else if (lower.includes('chai') || lower.includes('lọ')) unit = "lọ";
  else if (lower.includes('liều')) unit = "liều";

  const totalAmount = quantity * unitPrice;
  const formattedTotal = totalAmount.toLocaleString('vi-VN');
  const formattedUnit = unitPrice.toLocaleString('vi-VN');

  return {
    parsed_success: true,
    error_code: null,
    type,
    category,
    item_name: itemName,
    quantity,
    unit,
    price_per_unit: unitPrice,
    total_amount: totalAmount,
    matched_flock_id: matchedFlockId,
    matched_flock_name: matchedFlockName,
    // Fields for flock creation
    flock_name: `${coopLocation} - ${detectedBreed}`,
    breed: detectedBreed,
    initial_count: quantity,
    unit_price: unitPrice,
    coop_location: coopLocation,
    purpose: detectedBreed.includes('Ai Cập') ? 'Nuôi đẻ trứng' : 'Nuôi lấy thịt',
    tts_confirmation: `Đã ghi nhận ${detectedBreed} (${quantity} con x ${formattedUnit}đ/con = ${formattedTotal}đ tại ${coopLocation}).`
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
  let availableFlocks = [];
  let isFlockCreationMode = false;

  try {
    const body = await req.json();
    transcript = body.transcript || '';
    availableFlocks = Array.isArray(body.availableFlocks) ? body.availableFlocks : [];
    isFlockCreationMode = !!body.isFlockCreationMode;

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
      return NextResponse.json(parseOfflineVoice(transcript, availableFlocks, isFlockCreationMode));
    }

    const flocksContext = availableFlocks.map(f => `- ID: "${f.flockId}", Tên: "${f.flockName}", Giống: "${f.breed}", Vị trí: "${f.coopLocation || ''}"`).join('\n');

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
    let result = null;

    const systemInstruction = `Bạn là Trợ lý Quản trị Trang trại Gia cầm & Bác sĩ Thú y Thông minh (ChănNuôi AI).
Nhiệm vụ: Phân tích câu nói tiếng Việt địa phương và trích xuất thành giao dịch tài chính hoặc thông tin TẠO ĐÀN GÀ MỚI dạng JSON.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【DANH SÁCH CÁC ĐÀN GÀ HIỆN CÓ】:
${flocksContext || '(Chưa có đàn)'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【QUY TẮC BÓC TÁCH THÔNG TIN TẠO ĐÀN GÀ】:
- Giống gà (breed): "Gà Ri", "Gà Mía", "Gà Đông Tảo", "Gà Ai Cập", "Gà Lai Chọi", "Gà Lương Phượng", "Gà Tre".
- Số lượng con (initial_count / quantity): số con nhập (VD: 1000, 500).
- Đơn giá nhập 1 con (unit_price / price_per_unit): giá 1 con giống (VD: 20000, 22000, 18000).
- Tổng tiền (total_amount): initial_count * unit_price.
- Vị trí chuồng (coop_location): "Chuồng A", "Chuồng 1", "Chuồng 2", v.v.
- Tên đàn (flock_name): Ghép vị trí chuồng và giống (VD: "Chuồng 1 - Gà Đông Tảo").

JSON Output Format:
{
  "parsed_success": boolean,
  "error_code": null | "MISSING_PRICE" | "AMBIGUOUS_TEXT",
  "type": "EXPENSE" | "REVENUE",
  "category": "giong" | "cam" | "thuoc" | "ban_ga" | "khac",
  "item_name": string,
  "quantity": number,
  "unit": string,
  "price_per_unit": number,
  "total_amount": number,
  "matched_flock_id": string | null,
  "matched_flock_name": string | null,
  "flock_name": string,
  "breed": string,
  "initial_count": number,
  "unit_price": number,
  "coop_location": string,
  "purpose": "Nuôi lấy thịt" | "Nuôi đẻ trứng" | "Nuôi gà giống",
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

        const prompt = `Phân tích câu giọng nói này: "${transcript}"`;
        result = await model.generateContent(prompt);
        if (result) break;
      } catch (mErr) {
        console.warn(`Voice model ${modelName} failed:`, mErr.message);
      }
    }

    if (!result) {
      return NextResponse.json(parseOfflineVoice(transcript, availableFlocks, isFlockCreationMode));
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
      return NextResponse.json(parseOfflineVoice(transcript, availableFlocks, isFlockCreationMode));
    }

    if (parsedJson.quantity && parsedJson.price_per_unit && (!parsedJson.total_amount || parsedJson.total_amount === parsedJson.price_per_unit)) {
      if (parsedJson.quantity > 1) {
        parsedJson.total_amount = parsedJson.quantity * parsedJson.price_per_unit;
      }
    }

    if (parsedJson.initial_count && parsedJson.unit_price) {
      parsedJson.total_amount = parsedJson.initial_count * parsedJson.unit_price;
    }

    return NextResponse.json(parsedJson);

  } catch (error) {
    console.error("Gemini Voice Parse Final Catch Error:", error);
    return NextResponse.json(parseOfflineVoice(transcript, availableFlocks, isFlockCreationMode));
  }
}
