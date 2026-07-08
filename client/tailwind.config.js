/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pulse: {
          bg: "#07090c",
          panel: "#0f141a",
          panel2: "#141a22",
          border: "#232b35",
          teal: "#00e6b8",
          teal2: "#00b894",
          amber: "#ffb020",
          red: "#ff4757",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(0, 230, 184, 0.25)",
      },
    },
  },
  plugins: [],
};
