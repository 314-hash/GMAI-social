/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '380px',
      },
      colors: {
        gmai: {
          dark: '#070a12',
          surface: '#0d1322',
          card: '#121a2f',
          cardHover: '#18233f',
          border: 'rgba(0, 240, 255, 0.15)',
          borderHover: 'rgba(0, 240, 255, 0.4)',
          cyan: '#00f0ff',
          cyanGlow: 'rgba(0, 240, 255, 0.35)',
          purple: '#a855f7',
          magenta: '#d946ef',
          gold: '#f59e0b',
          goldGlow: 'rgba(245, 158, 11, 0.35)',
          neonGreen: '#10b981',
          crimson: '#ef4444'
        }
      },
      fontFamily: {
        gaming: ['Orbitron', 'Rajdhani', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'cyan-glow': '0 0 25px rgba(0, 240, 255, 0.25)',
        'cyan-glow-lg': '0 0 40px rgba(0, 240, 255, 0.4)',
        'magenta-glow': '0 0 25px rgba(217, 70, 239, 0.25)',
        'gold-glow': '0 0 25px rgba(245, 158, 11, 0.3)',
        'gaming-panel': '0 8px 32px 0 rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        glow: {
          '0%': { filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 18px rgba(217, 70, 239, 0.7))' }
        }
      }
    },
  },
  plugins: [],
}
