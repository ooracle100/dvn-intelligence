/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // LayerZero-inspired black theme
        'lz-black': '#000000',
        'lz-dark': '#0a0a0a',
        'lz-gray': {
          900: '#111111',
          800: '#1a1a1a',
          750: '#222222',
          700: '#2a2a2a',
          600: '#3a3a3a',
        }
      }
    },
  },
  plugins: [],
}