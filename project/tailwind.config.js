/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#030303',
        primary: '#FF0000',
        secondary: '#282828',
      },
    },
  },
  plugins: [],
};