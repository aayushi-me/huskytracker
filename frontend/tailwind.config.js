/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 🎨 Color System (HuskyTrack Theme)
      colors: {
        primary: "#4A1D96",    // Deep Husky Purple
        secondary: "#7C3AED",  // Light Purple Accent
        accent: "#C084FC",     // Soft Highlight Purple
        background: "#F8F9FF", // Subtle App Background
        dark: "#1E1E1E",       // Text / Dark mode base

        // Optional global neutral palette
        light: "#F7FAFC",
        muted: "#718096",
        danger: "#E53E3E",
        success: "#38A169",
        info: "#3182CE",
      },

      // 🔤 Typography
      fontFamily: {
        primary: ["Inter", "sans-serif"],
      },

      // 🟣 Border Radius Tokens
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },

      // 🌫 Shadow Tokens
      boxShadow: {
        soft: "0px 4px 12px rgba(0,0,0,0.08)",   // for cards
        card: "0px 4px 12px rgba(0,0,0,0.08)",    // alias
        modal: "0px 10px 30px rgba(0,0,0,0.15)",  // modal popup
      },

      // ✨ Animations
      keyframes: {
        fadeIn: {
          "0%": { opacity: 0, transform: "translateY(10px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
      },
      animation: {
      scaleIn: "scaleIn 0.25s ease-out",
      slideIn: "slideIn 0.35s ease-out",
      },
      keyframes: {
      scaleIn: {
        "0%": { transform: "scale(0.8)", opacity: 0 },
        "100%": { transform: "scale(1)", opacity: 1 },
      },
      slideIn: {
        "0%": { transform: "translateX(20px)", opacity: 0 },
        "100%": { transform: "translateX(0)", opacity: 1 },
      },
      },
    },
  },
  plugins: [],
};
