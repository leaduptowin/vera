import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0f1118',
        panel: '#181b26',
        ink: '#e5e7eb',
        muted: '#9ca3af',
        line: 'rgba(255,255,255,0.075)',
        accent: '#4f8cff',
        violet: '#b066ff',
        paper: '#d8d5cc',
      },
      fontFamily: {
        sans: ['Inter', '"SF Pro Text"', '"PingFang SC"', '"Microsoft YaHei"', '"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Menlo', '"PingFang SC"', '"Microsoft YaHei"', 'monospace'],
      },
      boxShadow: {
        station: '0 18px 48px rgba(0,0,0,0.22)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.38' },
        },
        caret: {
          '0%, 45%': { opacity: '1' },
          '46%, 100%': { opacity: '0.16' },
        },
      },
      animation: {
        'fade-up': 'fade-up 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
        'soft-pulse': 'soft-pulse 2.4s ease-in-out infinite',
        caret: 'caret 1s steps(1, end) infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
