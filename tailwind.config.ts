import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FDF2F2",
          100: "#FBE3E3",
          200: "#F6C6C6",
          300: "#EE9C9C",
          400: "#E26565",
          500: "#B91C1C",
          600: "#A01616",
          700: "#8B1A1A",
          800: "#701515",
          900: "#4B0F0F",
          950: "#2B0808",
        },
        ember: {
          400: "#FB923C",
          500: "#F97316",
          600: "#EA580C",
        },
        cream: "#FFFBF7",
        charcoal: "#1F1A17",
        gold: {
          200: "#FBE3B6",
          300: "#F5C16C",
          400: "#EFAF4A",
          500: "#D99424",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 10px 40px -18px rgba(31, 26, 23, 0.35)",
        lift: "0 18px 50px -20px rgba(139, 26, 26, 0.45)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #8B1A1A 0%, #EA580C 100%)",
        "warm-radial":
          "radial-gradient(circle at top right, rgba(245,193,108,0.22), transparent 55%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        shimmer: "shimmer 1.8s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
