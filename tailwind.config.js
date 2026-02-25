/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'primary': ['"PP Neue Montreal"', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.65rem',
        'sm': '0.75rem',
        'base': '0.85rem',
        'lg': '1rem',
      },
      colors: {
        'muted': '#666666',
      },
      spacing: {
        'header': '60px',
        'page': '1.5rem',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '300ms',
        'slow': '500ms',
      },
      aspectRatio: {
        '3/4': '3 / 4',
      },
    },
  },
  plugins: [],
}
