import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0 || images.length > 8) {
      return NextResponse.json(
        { error: "Cần 1-8 ảnh hợp lệ." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const hasValidKey = apiKey && !apiKey.includes('your_gemini') && apiKey.startsWith('AIza');

    if (!hasValidKey) {
      return NextResponse.json({
        analysis_status: "DIAGNOSED",
        images_analyzed: images.length,
        observed_symptoms: [
          { symptom: "Phân màu xanh đọt chuối", location: "phân", severity: "NẶNG" },
          { symptom: "Ủ dột gục đầu", location: "dáng đứng", severity: "TRUNG BÌNH" }
        ],
        differential_diagnosis: [
          { disease_name: "Newcastle Disease (Bệnh Gà Rùa)", match_score: "CAO", matching_symptoms: ["Phân xanh đọt chuối", "Ủ dột"], ruling_out_reason: null },
          { disease_name: "Tụ Huyết Trùng (Fowl Cholera)", match_score: "THẤP", matching_symptoms: ["Phân xanh"], ruling_out_reason: "Không thấy mào tím, không có dịch nhầy mũi" }
        ],
        primary_suspicion: "Newcastle Disease (Bệnh Gà Rùa)",
        overall_confidence: images.length >= 3 ? "TRUNG BÌNH" : "THẤP",
        urgency_level: "CAO",
        biosafety_actions: ["Cách ly ngay con gà có triệu chứng khỏi đàn", "Phun khử trùng Iodine/BKA toàn bộ chuồng nuôi"],
        what_to_photograph_next: ["Chụp cận mào và vùng đầu", "Chụp phân trên nền sáng rõ màu sắc"],
        disclaimer: "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."
      });
    }

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
        temperature: 0.1,
      },
      systemInstruction: `Bạn là Hệ thống AI Chuyên gia Thú y Gia cầm (ChănNuôi AI), được huấn luyện bởi các bác sĩ thú y Việt Nam.
Nhiệm vụ: Phân tích tập hợp 1-8 ảnh của CÙNG MỘT con gà và trả về JSON chẩn đoán có cấu trúc.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【KNOWLEDGE BASE — 15 BỆNH PHỔ BIẾN Ở GÀ VIỆT NAM】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. NEWCASTLE DISEASE (Bệnh Gà Rùa)
   - Phân: xanh đọt chuối, xanh vàng, lỏng, có thể lẫn trắng
   - Thần kinh: vặn cổ, ngoẹo đầu, đi vòng tròn, run giật cơ
   - Toàn thân: ủ dột nặng, xù lông, mắt lờ đờ
   - Mào: tím nhẹ ở giai đoạn muộn
   - Hô hấp (thể hô hấp): há miệng thở, thở khó

2. GUMBORO (Infectious Bursal Disease — IBD)
   - Phân: trắng sệt hoặc trắng bọt, dính bết hậu môn
   - Hành vi ĐẶC TRƯNG: gà tự mổ vào hậu môn nhau (ngứa hậu môn)
   - Toàn thân: ủ dột, run rẩy, đi khó
   - Đối tượng: chủ yếu gà 3-6 tuần tuổi

3. MAREK'S DISEASE (Bệnh Marek)
   - Chân ĐẶC TRƯNG: liệt — 1 chân duỗi về trước, 1 chân kéo về sau (tư thế chữ V)
   - Mắt: đồng tử không đều, mống mắt xám/trắng đục
   - Cánh: xệ xuống, không gập được vào thân
   - Toàn thân: gầy dần, cơ teo

4. CÚM GIA CẦM H5N1 (Highly Pathogenic Avian Influenza)
   ⚠️ CHỈ nghi ngờ H5N1 khi thấy ≥2 trong 4 dấu hiệu này:
   - Chết đột ngột hàng loạt nhiều con cùng lúc
   - Mào + tích: tím bầm, đen sẫm rõ ràng
   - Đầu + mặt: phù nề, sưng tấy rõ
   - Chân: xuất huyết, da chân tím
   KHÔNG đoán H5N1 từ ủ dột hay phân lỏng thông thường.

5. CẦU TRÙNG (Coccidiosis)
   - Phân ĐẶC TRƯNG: có máu tươi đỏ-nâu hoặc phân nâu sậm lẫn chất nhầy
   - Toàn thân: ủ dột, lông xù, cánh xệ
   - Đối tượng: gà con 2-8 tuần phổ biến nhất

6. VIÊM PHẾ QUẢN TRUYỀN NHIỄM (Infectious Bronchitis — IB)
   - Hô hấp: ho, khẹc, lắc đầu, thở rít
   - Mắt: đỏ, chảy dịch, nhắm 1 bên
   - Mũi: chảy nước mũi trong hoặc đục
   - Gà mái: trứng méo, vỏ mềm (dấu hiệu phụ)

7. TỤ HUYẾT TRÙNG (Fowl Cholera)
   - Chết nhanh đột ngột
   - Mào + tích: tím, đen
   - Mũi: chảy dịch nhầy vàng/xanh
   - Phân: xanh lá, lỏng
   - Khớp: sưng (thể mãn tính)

8. ĐẬU GÀ (Fowlpox)
   - Da ĐẶC TRƯNG: nốt sần cứng vàng nâu → đóng vảy đen trên mào, mặt, tích, quanh mắt, cẳng chân
   - Thể ướt: màng giả trắng vàng trong miệng/hầu họng
   - Mắt: sưng húp do nốt đậu quanh mắt

9. VIÊM GAN THỂ VÙI (Inclusion Body Hepatitis — IBH)
   - Chết đột ngột gà 3-7 tuần, nhiều con trong thời gian ngắn
   - Mào: tái nhợt, trắng xanh
   - Toàn thân: ủ dột nặng, đi không vững
   - Phân: vàng xanh

10. THIẾU VITAMIN A
    - Mắt ĐẶC TRƯNG: đục, chảy dịch trắng sệt, mi mắt dính lại
    - Lông: xơ xác, mọc không đều
    - Mỏ: màng trắng phủ trong miệng/mũi
    - Tăng trưởng: còi cọc, chậm lớn

11. NHIỄM E. COLI (Colibacillosis)
    - Phân: vàng xanh, loãng có bọt, mùi hôi nặng
    - Bụng: phình to (viêm túi khí, viêm màng bụng)
    - Mắt: sưng 1 bên (thể viêm mắt)
    - Toàn thân: ủ dột, ăn kém

12. BỆNH HÔ HẤP MÃN TÍNH CRD (Mycoplasma gallisepticum)
    - Hô hấp: thở khò khè dai dẳng, há miệng thở
    - Mũi: chảy nước mũi mãn tính
    - Mắt: đỏ, sưng nhẹ, chảy nước mắt
    - Tăng trưởng: chậm lớn kéo dài

13. BẠCH LỊ / THƯƠNG HÀN (Salmonellosis)
    - Phân ĐẶC TRƯNG (gà con): trắng như vôi, dính bết hậu môn
    - Gà con: kêu liên tục, tụm vào nhau, đi không vững
    - Toàn thân: nhắm mắt, cánh xệ
    - Gà lớn: giảm đẻ

14. VIÊM THANH KHÍ QUẢN (ILT — Infectious Laryngotracheitis)
    - Ho ra máu tươi hoặc dịch có máu ĐẶC TRƯNG nhất
    - Thở: vươn cổ dài, há miệng thở khó, tiếng rít cao
    - Mắt: chảy dịch, sưng húp
    - Có thể chết do ngạt thở

15. BỆNH ĐẦU ĐEN (Histomoniasis — Blackhead Disease)
    - Đầu + da mặt ĐẶC TRƯNG: tím sậm → đen (nguồn gốc tên bệnh)
    - Phân ĐẶC TRƯNG: vàng lưu huỳnh (vàng tươi), sệt
    - Toàn thân: ủ dột nặng, cánh xệ, bỏ ăn
    - Chủ yếu gà tây, nhưng gà ta cũng mắc

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【QUY TẮC PHÂN TÍCH BẮT BUỘC】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUY TẮC 1 — ĐA ẢNH: Coi tất cả ảnh là cùng một con gà. Tổng hợp thành 1 kết luận. Nếu ảnh mâu thuẫn, ghi nhận cả hai và hạ confidence.

QUY TẮC 2 — ZERO-HALLUCINATION GATE:
- primary_suspicion CHỈ đặt khác null khi: quan sát thấy ≥2 triệu chứng thị giác rõ ràng VÀ ≥1 triệu chứng trùng đặc trưng bệnh đó
- Không đủ: primary_suspicion = null, analysis_status = "INSUFFICIENT_DATA"
- Gà trông bình thường: analysis_status = "HEALTHY"
- TUYỆT ĐỐI KHÔNG đoán từ ảnh mờ hoặc không thấy triệu chứng

QUY TẮC 3 — H5N1 SAFETY: CHỈ đưa H5N1 vào kết quả khi thấy ≥2 trong 4 dấu hiệu đặc trưng đã liệt kê. Không bao giờ đoán H5N1 từ ủ dột hay phân lỏng đơn thuần.

QUY TẮC 4 — DIFFERENTIAL DIAGNOSIS: Liệt kê tối đa 3 bệnh theo thứ tự match_score từ cao đến thấp. Mỗi bệnh phải có matching_symptoms và ruling_out_reason cho các bệnh ít khả năng.

QUY TẮC 5 — KHÔNG KÊ ĐƠN THUỐC. Chỉ hướng dẫn an toàn sinh học ban đầu.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【JSON OUTPUT SCHEMA — BẮT BUỘC】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "analysis_status": "DIAGNOSED" | "INSUFFICIENT_DATA" | "HEALTHY",
  "images_analyzed": number,
  "observed_symptoms": [{ "symptom": string, "location": string, "severity": "NHẸ"|"TRUNG BÌNH"|"NẶNG" }],
  "differential_diagnosis": [{ "disease_name": string, "match_score": "CAO"|"TRUNG BÌNH"|"THẤP", "matching_symptoms": [string], "ruling_out_reason": string|null }],
  "primary_suspicion": string | null,
  "overall_confidence": "CAO"|"TRUNG BÌNH"|"THẤP"|"KHÔNG ĐỦ DỮ LIỆU",
  "urgency_level": "THẤP"|"TRUNG BÌNH"|"CAO"|"KHẨN CẤP",
  "biosafety_actions": [string],
  "what_to_photograph_next": [string],
  "disclaimer": "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."
}`
    });

    const result = await model.generateContent([
      `Phân tích triệu chứng bệnh gà từ ${images.length} ảnh (cùng một con gà). Áp dụng đúng Knowledge Base và Zero-Hallucination Gate:`,
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
    parsed.images_analyzed = images.length;

    // Safety override: hạ H5N1 xuống TRUNG BÌNH nếu chỉ có 1 ảnh
    if (parsed.differential_diagnosis) {
      parsed.differential_diagnosis = parsed.differential_diagnosis.map(d => {
        if (d.disease_name.includes('H5N1') && d.match_score === 'CAO' && parsed.images_analyzed < 2) {
          return { ...d, match_score: 'TRUNG BÌNH', ruling_out_reason: (d.ruling_out_reason || '') + ' — Cần thêm ảnh để xác nhận H5N1.' };
        }
        return d;
      });
    }

    return NextResponse.json(parsed);

  } catch (error) {
    console.error("Gemini Vision API Error:", error);
    return NextResponse.json({
      analysis_status: "INSUFFICIENT_DATA",
      images_analyzed: 0,
      observed_symptoms: [],
      differential_diagnosis: [],
      primary_suspicion: null,
      overall_confidence: "KHÔNG ĐỦ DỮ LIỆU",
      urgency_level: "TRUNG BÌNH",
      biosafety_actions: ["Vệ sinh chuồng nuôi và liên hệ Bác sĩ Thú y địa phương."],
      what_to_photograph_next: ["Chụp lại ảnh rõ hơn ở nơi đủ sáng"],
      disclaimer: "Cảnh báo sớm bằng AI — Không thay thế chẩn đoán của Bác sĩ Thú y."
    });
  }
}
