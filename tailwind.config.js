/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00695C",    // Teal Đậm
        secondary: "#26A69A",  // Teal Vừa
        accent: "#FF8F00",     // Cam Hổ Phách
        bgApp: "#F0FAF9",      // Bạc Hà Nhạt
        surface: "#FFFFFF",    // Trắng Tinh
        textPrimary: "#1A2332",// Than Chì (Contrast AAA)
        statusGreen: "#2E7D32",// Xanh LÃI
        statusRed: "#C62828",  // Đỏ LỖ
      },
      fontFamily: {
        sans: ['Be Vietnam Pro', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
