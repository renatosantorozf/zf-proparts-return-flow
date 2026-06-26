/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        zf: {
          blue: '#0057B7',
          'blue-dark': '#003D8F',
          'blue-light': '#E8F0FB',
        },
        status: {
          green:  '#16a34a',
          yellow: '#ca8a04',
          red:    '#dc2626',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
