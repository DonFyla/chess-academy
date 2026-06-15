/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./**/templates/**/*.html",
  ],
  safelist: [
    "from-purple-500",
    "to-purple-700",
    "from-blue-500",
    "to-blue-700",
    "from-emerald-500",
    "to-emerald-700",
    "from-orange-500",
    "to-orange-700",
    "from-violet-500",
    "to-violet-700",
    "from-pink-500",
    "to-pink-700",
    "bg-purple-100",
    "text-purple-700",
    "bg-blue-100",
    "text-blue-700",
    "bg-emerald-100",
    "text-emerald-700",
    "bg-orange-100",
    "text-orange-700",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F5EFE7",
          100: "#E8DDD0",
          200: "#D4C3B0",
          300: "#BFA58C",
          400: "#A98B6E",
          500: "#8F7057",
          600: "#5E5044",
          700: "#4A3F35",
          800: "#362E27",
          900: "#221D19",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
