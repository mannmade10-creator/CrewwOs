/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        eng: "#00D4FF",
        sales: "#FF6B35",
        mktg: "#A855F7",
        ops: "#10B981",
      },
    },
  },
  plugins: [],
};
