/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        library: {
          bg: '#0B0A08',
          surface: '#141311',
          main: '#E7E5E4',
          muted: '#A8A29E',
          action: '#E7E5E4',
          actionInk: '#0B0A08',
          border: '#2B2922',
          white: '#FFFFFF',
        },
        // Compatibility aliases use only the supplied palette values.
        maroon: {
          50: '#FFFFFF', 100: '#E7E5E4', 200: '#A8A29E', 300: '#2B2922', 400: '#141311',
          500: '#0B0A08', 600: '#0B0A08', 700: '#E7E5E4', 800: '#141311', 900: '#0B0A08', 950: '#0B0A08',
        },
        gold: {
          50: '#FFFFFF', 100: '#E7E5E4', 200: '#A8A29E', 300: '#2B2922', 400: '#E7E5E4',
          500: '#E7E5E4', 600: '#A8A29E', 700: '#2B2922', 800: '#141311', 900: '#0B0A08',
        },
        lotus: {
          50: '#FFFFFF', 100: '#E7E5E4', 200: '#A8A29E', 300: '#2B2922', 400: '#141311', 500: '#0B0A08',
        },
        institutional: {
          bg: '#0B0A08', card: '#141311', text: '#E7E5E4', subtext: '#A8A29E', border: '#2B2922',
          darkBg: '#0B0A08', darkCard: '#141311', darkBorder: '#2B2922',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Calibri', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'Calibri', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: ['Merriweather', 'Georgia', 'serif'],
        sinhala: ['"Noto Sans Sinhala"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        codes: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,.36), 0 8px 20px rgba(0,0,0,.24)',
        card: '0 12px 32px rgba(0,0,0,.36)',
        elevated: '0 24px 64px rgba(0,0,0,.5)',
        crest: '0 4px 18px rgba(231,229,228,.08)',
      },
    },
  },
  plugins: [],
};
