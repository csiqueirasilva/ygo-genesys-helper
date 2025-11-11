/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        grotesk: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#03060f',
        panel: '#050812',
        accent: '#36e5ff',
        accentSecondary: '#4f7dff',
      },
      boxShadow: {
        panel: '0 20px 50px rgba(0,0,0,0.45)',
      },
    },
  },
  plugins: [],
};
