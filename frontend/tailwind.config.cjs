/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#302b18",
        muted: "#716e60",
        line: "#e7e1ca",
        yellow: {
          DEFAULT: "#ffd21a",
          soft: "#fff7d6"
        },
        brand: "#765900",
        success: "#2f856c"
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Manrope", "sans-serif"]
      },
      maxWidth: {
        shell: "1440px"
      }
    }
  },
  plugins: []
};
