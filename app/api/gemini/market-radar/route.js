import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Fallback cache if search is offline or API quota exhausted
const FALLBACK_MARKET_DATA = {
  market_overview: {
    reported_date: new Date().toLocaleDateString('vi-VN'),
    data_source: "Hiệp hội Chăn nuôi Gia cầm Việt Nam (Tổng hợp)",
    trend_summary: "Giá gà thịt duy trì ổn định tại cả 3 miền, sức mua thị trường ổn định.",
    regions: [
      { region: "Miền Bắc", chicken_price_per_kg: 56000, price_change: "+1.000", egg_price: 2400, sample_locations: "Bắc Giang, Phú Thọ, Hà Nội" },
      { region: "Miền Trung", chicken_price_per_kg: 54000, price_change: "0", egg_price: 2300, sample_locations: "Thanh Hóa, Nghệ An, Bình Định" },
      { region: "Miền Nam", chicken_price_per_kg: 53000, price_change: "-500", egg_price: 2200, sample_locations: "Đồng Nai, Bình Dương, Tiền Giang" }
    ],
    feed_prices: [
      { feed_type: "Cám hỗn hợp gà thịt vỗ béo (Bao 25kg)", average_price_per_bag: 365000, unit_price_per_kg: 14600 },
      { feed_type: "Cám gà con giai đoạn 1 (Bao 25kg)", average_price_per_bag: 385000, unit_price_per_kg: 15400 }
    ]
  },
  disease_radar_alerts: [
    {
      province: "Bắc Giang",
      pathogen: "Cúm gia cầm A/H5N1",
      reported_date: new Date().toLocaleDateString('vi-VN'),
      summary: "Tình hình an toàn dịch bệnh được kiểm soát tốt, các hộ chăn nuôi tăng cường tiêu độc khử trùng chuồng trại.",
      risk_level: "THẤP",
      source: "Chi cục Chăn nuôi & Thú y"
    },
    {
      province: "Đồng Nai",
      pathogen: "Cúm gia cầm & Dịch tả gà (NDV)",
      reported_date: new Date().toLocaleDateString('vi-VN'),
      summary: "Khuyến cáo các trang trại tiêm phòng vắc-xin đầy đủ do thời tiết chuyển mùa ẩm ướt.",
      risk_level: "TRUNG BÌNH",
      source: "Báo Nông Nghiệp VN"
    }
  ],
  is_live_grounded: false
};

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const hasValidKey = apiKey && !apiKey.includes('your_gemini') && apiKey.trim().length > 10;

  if (!hasValidKey) {
    return NextResponse.json(FALLBACK_MARKET_DATA);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];

    // ──────────────────────────────────────────────────────────────────────────
    // BƯỚC 1: GOOGLE SEARCH GROUNDING — Thu thập dữ liệu web thô (3 miền trong 1 lượt)
    // ──────────────────────────────────────────────────────────────────────────
    const searchPrompt = `Hãy tìm kiếm thông tin mới nhất trên mạng internet tại Việt Nam về:
1. Giá gà thịt hôm nay (gà ri lai, gà mía, gà trắng công nghiệp) xuất chuồng tại 3 miền Bắc, Trung, Nam.
2. Giá trứng gà và giá bao cám chăn nuôi gia cầm (25kg/bao).
3. Tin tức các ổ dịch cúm gia cầm A/H5N1 hoặc dịch tả gia cầm mới nhất tại các tỉnh thành Việt Nam gần đây.
Ưu tiên tổng hợp từ nguồn Báo Nông Nghiệp Việt Nam (nongnghiep.vn), Hiệp hội Chăn nuôi Gia cầm, Cục Thú Y (cucthuy.gov.vn), 2lua.vn.
Tóm tắt ngắn gọn các số liệu giá, ngày công bố thông tin, và nguồn tin tìm được.`;

    let rawSearchResult = '';
    for (const modelName of candidateModels) {
      try {
        const searchModel = genAI.getGenerativeModel({
          model: modelName,
          tools: [{ googleSearch: {} }]
        });
        const step1Result = await searchModel.generateContent(searchPrompt);
        rawSearchResult = step1Result.response.text();
        if (rawSearchResult && rawSearchResult.trim().length > 50) break;
      } catch (searchErr) {
        console.warn(`[Market Grounding Step 1 (${modelName}) Warning]:`, searchErr.message);
      }
    }

    if (!rawSearchResult || rawSearchResult.trim().length < 50) {
      return NextResponse.json(FALLBACK_MARKET_DATA);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // BƯỚC 2: STRUCTURED JSON PARSER (Không bật Tool) — Ép thành JSON chuẩn
    // ──────────────────────────────────────────────────────────────────────────
    const jsonPrompt = `Hãy chuyển đổi nội dung thu thập được sau đây thành cấu trúc JSON chuẩn:
${rawSearchResult}

Output Schema:
{
  "market_overview": {
    "reported_date": string,
    "data_source": string,
    "trend_summary": string,
    "regions": [
      {
        "region": "Miền Bắc" | "Miền Trung" | "Miền Nam",
        "chicken_price_per_kg": number,
        "price_change": string,
        "egg_price": number,
        "sample_locations": string
      }
    ],
    "feed_prices": [
      {
        "feed_type": string,
        "average_price_per_bag": number,
        "unit_price_per_kg": number
      }
    ]
  },
  "disease_radar_alerts": [
    {
      "province": string,
      "pathogen": string,
      "reported_date": string,
      "summary": string,
      "risk_level": "THẤP" | "TRUNG BÌNH" | "CAO",
      "source": string
    }
  ]
}`;

    let parsedData = null;
    for (const modelName of candidateModels) {
      try {
        const jsonModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
          systemInstruction: `Bạn là trợ lý trích xuất dữ liệu thị trường và dịch tễ nông nghiệp Việt Nam.
Nhiệm vụ: Trích xuất thông tin từ văn bản báo cáo tìm kiếm được thành JSON cấu trúc chuẩn.
Tuân thủ nghiêm ngặt:
- reported_date: ngày thực tế của tin tức/bài báo (VD: "28/08/2026"), không tự bịa.
- data_source: tên trang báo/tổ chức xuất bản (VD: "Báo Nông Nghiệp Việt Nam", "Hiệp hội Gia Cầm VN").
- regions: đủ 3 miền Bắc, Trung, Nam.
- disease_radar_alerts: tóm tắt 2-3 tin dịch bệnh ngắn gọn, không sao chép nguyên văn vi phạm bản quyền.`
        });

        const step2Result = await jsonModel.generateContent(jsonPrompt);
        const jsonText = step2Result.response.text();
        parsedData = JSON.parse(jsonText);
        if (parsedData && parsedData.market_overview) break;
      } catch (jsonErr) {
        console.warn(`[Market Grounding Step 2 (${modelName}) Warning]:`, jsonErr.message);
      }
    }

    if (!parsedData) {
      return NextResponse.json(FALLBACK_MARKET_DATA);
    }

    return NextResponse.json({
      ...parsedData,
      is_live_grounded: true,
      fetched_at: new Date().toISOString()
    });

  } catch (err) {
    console.error('[Market Radar API Error]:', err);
    return NextResponse.json(FALLBACK_MARKET_DATA);
  }
}
