/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'slideInUp': 'slideInUp 0.4s ease-out forwards',
        'slideInRight': 'slideInRight 0.4s ease-out forwards',
      },
      transitionDuration: {
        '0': '0ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
      }
    },
  },
  plugins: [],
} 