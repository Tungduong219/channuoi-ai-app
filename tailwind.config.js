/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#006b2c",
        "primary-container": "#22c55e",
        "on-primary": "#ffffff",
        "on-primary-container": "#f7fff2",
        "on-primary-fixed-variant": "#005320",
        "primary-fixed": "#7ffc97",
        "primary-fixed-dim": "#62df7d",
        
        "secondary": "#855300",
        "secondary-container": "#fea619",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#684000",
        "secondary-fixed": "#ffddb8",
        "secondary-fixed-dim": "#ffb95f",
        
        "background": "#f4fcf0",
        "surface": "#f8faf6",
        "surface-card": "#ffffff",
        "surface-subtle": "#f0fdf4",
        "surface-bright": "#f4fcf0",
        "surface-hover": "#e8f7ee",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#eff6ea",
        "surface-container": "#e9f0e5",
        "surface-container-high": "#e3eadf",
        "surface-container-highest": "#dde5d9",
        "surface-variant": "#dde5d9",
        "surface-dim": "#d5dcd1",
        
        "on-surface": "#1e293b",
        "on-surface-variant": "#3e4a3d",
        "on-surface-muted": "#64748b",
        "on-background": "#171d16",
        
        "border-subtle": "#e2e8f0",
        "border-focus": "#22c55e",
        "outline": "#6e7b6c",
        "outline-variant": "#bdcaba",
        
        "accent-warm-container": "#fef3c7",
        "danger": "#dc2626",
        "danger-container": "#fee2e2",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "max-width-desktop": "1280px",
        "gutter": "24px",
        "max-width-mobile": "640px",
        "card-padding": "20px",
        "base": "8px",
        "margin-mobile": "16px",
        "bottom-nav": "72px"
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'display-lg-mobile': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'display-lg': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'title-md': ['Inter', 'sans-serif'],
        'title-lg': ['Inter', 'sans-serif'],
        'label-bold': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-lg-mobile': ['30px', { lineHeight: '38px', letterSpacing: '-0.01em', fontWeight: '800' }],
        'body-md': ['15px', { lineHeight: '24px', fontWeight: '400' }],
        'body-lg': ['17px', { lineHeight: '26px', fontWeight: '500' }],
        'display-lg': ['34px', { lineHeight: '42px', letterSpacing: '-0.02em', fontWeight: '800' }],
        'body-sm': ['13px', { lineHeight: '20px', fontWeight: '500' }],
        'title-md': ['19px', { lineHeight: '28px', fontWeight: '700' }],
        'title-lg': ['25px', { lineHeight: '34px', fontWeight: '700' }],
        'label-bold': ['14px', { lineHeight: '20px', fontWeight: '700' }]
      }
    },
  },
  plugins: [],
};
