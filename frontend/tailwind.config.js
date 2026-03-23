/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        mc: {
          green: '#5da831',
          dark: '#1a1a2e',
          darker: '#0f0f1a',
          panel: '#16213e',
          border: '#0f3460',
          accent: '#e94560',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
