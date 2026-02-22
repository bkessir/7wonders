/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        card: {
          brown: '#92400e',
          grey: '#6b7280',
          blue: '#1d4ed8',
          yellow: '#d97706',
          red: '#b91c1c',
          green: '#15803d',
          purple: '#7e22ce',
        }
      }
    },
  },
  plugins: [],
}
