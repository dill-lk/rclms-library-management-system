/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        maroon: {
          50: '#fff5f4', 100: '#ffe6e3', 200: '#ffcbc5', 300: '#f7a59b', 400: '#e77569',
          500: '#cf5145', 600: '#ae382f', 700: '#8f2925', 800: '#76201f', 900: '#611d1d', 950: '#350d10',
        },
        gold: {
          50: '#fffaf0', 100: '#fff1d3', 200: '#fce1a2', 300: '#f4cc6f', 400: '#e7b64e',
          500: '#ce982d', 600: '#a97620', 700: '#80551d', 800: '#65431d', 900: '#55391d',
        },
        lotus: {
          50: '#fff8fc', 100: '#fdebf5', 200: '#f5b5d2', 300: '#ed8fba', 400: '#e56aa3', 500: '#d94b8d',
        },
        institutional: {
          bg: '#F7F4EF', card: '#FFFFFF', text: '#2D201F', subtext: '#645552', border: '#E7DDD4',
          darkBg: '#171312', darkCard: '#211B19', darkBorder: '#453733',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
        sinhala: ['"Noto Sans Sinhala"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(48, 29, 23, 0.06), 0 1px 2px 0 rgba(48, 29, 23, 0.03)',
        'card': '0 4px 10px -3px rgba(48, 29, 23, 0.09), 0 2px 4px -2px rgba(48, 29, 23, 0.05)',
        'elevated': '0 18px 40px -20px rgba(48, 29, 23, 0.32)',
        'crest': '0 0 25px rgba(139, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
