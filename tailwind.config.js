/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        figtree: ['Figtree', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        canvas: {
          bg: '#0D1117',
          surface: '#161B22',
          border: '#21262D',
          hover: '#1C2128',
        },
        sidebar: {
          bg: '#FAF9F7',
          surface: '#FFFFFF',
          border: '#E8E6E1',
          muted: '#9B9691',
        },
        amber: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        marker: {
          blue: '#3B82F6',
          blueDark: '#1D4ED8',
          bluePale: '#DBEAFE',
        }
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-in': 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        }
      },
      boxShadow: {
        'canvas': '0 0 0 1px #21262D, 0 4px 24px rgba(0,0,0,0.6)',
        'marker': '0 0 0 3px rgba(59,130,246,0.3), 0 2px 8px rgba(59,130,246,0.4)',
        'amber-glow': '0 0 20px rgba(245,158,11,0.15)',
        'field-card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }
    },
  },
  plugins: [],
}
