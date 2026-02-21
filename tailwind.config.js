/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "fire-red": "#e70000",
        "royal-purple": "#2a075b",
        "incinerator-green": "#91e643",
        "ice-blue": "#a8c8df",
        "peach-pink": "#c5698b",
        "night-black": "#0a0a0a",
        "bright-white": "#f5f5f5",
        cream: "#d9c2a3",
        "forest-green": "#2b501d",
      },
      backgroundColor: {
        dark: "var(--bg-dark)",
      },
    },
  },
  plugins: [],
};
