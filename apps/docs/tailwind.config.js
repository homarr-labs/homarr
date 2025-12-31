/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      spacing: {
        '128': '32rem',
      },
      screens: {
        '3xl': '1697px',
      },
    },
  },
  darkMode: ['class', '[data-theme="dark"]'],
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
