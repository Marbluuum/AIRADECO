/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FDFAF6',
          100: '#F5F0E8',
          200: '#EDE8DF',
          300: '#E0D9CE',
        },
        gold: {
          300: '#D4BC9A',
          400: '#C4A882',
          500: '#B8956A',
          600: '#A07850',
          700: '#8A6340',
        },
        dark: {
          900: '#0D0D0D',
          800: '#1A1A1A',
          700: '#2A2A2A',
          600: '#3A3A3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

