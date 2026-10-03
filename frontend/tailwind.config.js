/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          900: "#0b0f19",
          800: "#111827",
          700: "#1f2937",
          600: "#374151",
        },
        cyan: {
          glow: "#00f2ff",
        },
        teal: {
          glow: "#14b8a6",
        },
        electric: {
          blue: "#3b82f6",
        }
      }
    },
  },
  plugins: [],
}
