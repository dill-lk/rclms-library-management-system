/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Compatibility aliases used by older views; the UI now presents an indigo / teal system.
        maroon: {
          50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 300: '#a5b4fc', 400: '#818cf8',
          500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 800: '#3730a3', 900: '#312e81', 950: '#1e1b4b',
        },
        gold: {
          50: '#ecfeff', 100: '#cffafe', 200: '#a5f3fc', 300: '#67e8f9', 400: '#22d3ee',
          500: '#06b6d4', 600: '#0891b2', 700: '#0e7490', 800: '#155e75', 900: '#164e63',
        },
        lotus: {
          50: '#fff8fc', 100: '#fdebf5', 200: '#f5b5d2', 300: '#ed8fba', 400: '#e56aa3', 500: '#d94b8d',
        },
        institutional: {
          bg: '#F3F6FB', card: '#FFFFFF', text: '#172033', subtext: '#52637A', border: '#DCE4EE',
          darkBg: '#0D1522', darkCard: '#141F2E', darkBorder: '#2B3A4E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
        sinhala: ['"Noto Sans Sinhala"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 12px rgba(15, 23, 42, 0.03)',
        card: '0 8px 24px -12px rgba(15, 23, 42, 0.18)',
        elevated: '0 24px 60px -28px rgba(15, 23, 42, 0.36)',
        crest: '0 4px 18px rgba(79, 70, 229, 0.12)',
      },
    },
  },
  plugins: [],
};
