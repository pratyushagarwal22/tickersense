import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f7ff",
          100: "#e7eeff",
          200: "#cddbff",
          300: "#a9c2ff",
          400: "#7aa0ff",
          500: "#4f7cff",
          600: "#315cff",
          700: "#2747eb",
          800: "#263cc0",
          900: "#283795",
        },
      },
      boxShadow: {
        soft: "0 10px 30px rgba(2, 6, 23, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
