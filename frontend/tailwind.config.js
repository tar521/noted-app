/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Fraunces', 'serif'],
      },
      colors: {
        surface: {
          0: '#0f0f11',
          1: '#17171a',
          2: '#1e1e23',
          3: '#26262d',
          4: '#2e2e37',
        },
        accent: {
          DEFAULT: '#a78bfa',
          dim: '#7c5cbf',
          glow: 'rgba(167, 139, 250, 0.15)',
        },
        ink: {
          DEFAULT: '#e8e8f0',
          muted: '#9090a8',
          faint: '#55556a',
        },
        priority: {
          urgent: '#ef4444',
          high: '#f87171',
          medium: '#fb923c',
          low: '#4ade80',
          backlog: '#94a3b8',
        }
      }
    },
  },
  plugins: [],
}
