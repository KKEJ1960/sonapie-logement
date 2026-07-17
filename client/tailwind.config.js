/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sonapie: {
          green: '#147d64',
          ink: '#17202a',
          gold: '#d8a31a',
        },
      },
    },
  },
  plugins: [],
}
