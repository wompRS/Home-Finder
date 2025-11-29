const forms = require('@tailwindcss/forms');
const typography = require('@tailwindcss/typography');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        charcoal: '#0f172a',
        slate: '#1f2937',
        mint: '#34d399',
        mintSoft: '#a7f3d0',
        sand: '#e5e7eb'
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 10px 40px rgba(15, 23, 42, 0.24)'
      },
      backgroundImage: {
        hero: 'radial-gradient(circle at 20% 20%, rgba(52, 211, 153, 0.1), transparent 25%), radial-gradient(circle at 80% 30%, rgba(167, 243, 208, 0.08), transparent 30%)'
      }
    }
  },
  plugins: [forms, typography]
};