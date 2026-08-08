# ChănNuôi AI — Ứng dụng Trợ lý Chăn nuôi Gia cầm Thông minh

> 🏆 Dự án tham dự cuộc thi **AI Riser Vietnam 2026**  
> Deadline nộp bài: **30/08/2026**

---

## 🌟 Giới thiệu

**ChănNuôi AI** là ứng dụng PWA (Progressive Web App) giúp nông dân chăn nuôi gia cầm Việt Nam:

- 🎙️ **Ghi thu chi bằng giọng nói** — Nói tự nhiên, AI phân tích tức thì
- 📸 **Chẩn đoán bệnh gà qua ảnh** — Gemini Vision phân tích đa ảnh (1–8 ảnh)
- 🛡️ **Lịch tiêm vắc-xin AI sinh** — Tự động tạo lịch theo giống gà
- 📊 **Dashboard tài chính Realtime** — Con cái xem từ xa qua Cloud Firestore
- 📍 **Giá thị trường & Bản đồ ổ dịch** — Tích hợp Google Grounding + Maps

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 App Router, Tailwind CSS |
| **AI** | Gemini 2.0 Flash (Voice, Vision, Vaccine, Market) |
| **Database** | Cloud Firestore (Realtime sync) |
| **PWA** | Web Manifest, Service Worker |
| **Deploy** | Google Cloud Run |

---

## 🚀 Cài đặt & Chạy thử

```bash
# 1. Clone repository
git clone https://github.com/Tungduong219/channuoi-ai-app.git
cd channuoi-ai-app

# 2. Cài đặt dependencies
npm install

# 3. Tạo file .env.local (xem .env.example)
cp .env.example .env.local
# Điền GEMINI_API_KEY và Firebase config vào .env.local

# 4. Chạy dev server
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000**

---

## 🔑 Cấu hình môi trường

Tạo file `.env.local` với nội dung:

```env
# Gemini API Key (Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

---

## 📁 Cấu trúc dự án

```
channuoi-ai-app/
├── app/
│   ├── api/gemini/
│   │   ├── analyze-vision/    # Gemini Vision (1–8 ảnh)
│   │   ├── generate-vaccine/  # Smart Vaccine Schedule
│   │   └── parse-voice/       # Voice-to-Finance Parser
│   ├── globals.css
│   ├── layout.jsx
│   └── page.jsx               # Main app (8 screens)
├── components/
│   ├── BottomNav.jsx          # 5-Tab Navigation + FAB Mic
│   ├── MicModal.jsx           # Voice recording modal
│   └── TopBar.jsx             # P&L Widget header
├── lib/
│   ├── canvasQualityCheck.js  # Image quality gatekeeper (<10ms)
│   ├── firebase.js            # Firestore init
│   └── imageCompressor.js     # Client-side compression
└── public/
    ├── manifest.json          # PWA config
    └── icons/
```

---

## 📋 Lộ trình phát triển

- [x] **Phase 1** — Concept & UI/UX Design
- [x] **Phase 2** — Prompt Engineering & AI Studio Testing
- [x] **Phase 3** — MVP Development (Gemini API + Firestore)
- [ ] **Phase 4** — Deploy Google Cloud Run
- [ ] **Phase 5** — Video Demo & LinkedIn Campaign

---

## 👤 Tác giả

**Tùng Dương** — dotungduong2194@gmail.com  
GitHub: [@Tungduong219](https://github.com/Tungduong219)

---

*#AIRiserVietnam #BuildwithGoogleAI*
