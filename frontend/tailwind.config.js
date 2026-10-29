/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#F7931A', // Bitcoin Orange
          hover: '#E07D09',
          light: '#FDEFD9',
          glow: 'rgba(247, 147, 26, 0.35)',
        },
        dark: {
          bg: '#0a0d14',
          card: '#121722',
          border: '#1f2737',
          input: '#171e2c',
          text: '#f1f5f9',
          muted: '#8e9bb0'
        },
        success: '#10B981',
        danger: '#EF4444',
        bch: '#0AC18E',
        pusd: '#10b981',
        polygon: '#8247E5',
      },
      boxShadow: {
        'btc-glow': '0 0 30px rgba(247, 147, 26, 0.25)',
        'btc-glow-lg': '0 0 60px rgba(247, 147, 26, 0.35)',
        'card-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
