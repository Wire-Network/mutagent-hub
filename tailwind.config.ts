
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#78FF00", // Toxic Green
          foreground: "#210223", // Dark Purple
        },
        secondary: {
          DEFAULT: "#210223", // Dark Purple
          foreground: "#78FF00", // Toxic Green
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "#716965", // Gunmetal
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#78FF00", // Toxic Green
          foreground: "#210223", // Dark Purple
        },
        card: {
          DEFAULT: "#210223", // Dark Purple
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["Quantico", "system-ui", "sans-serif"],
        heading: ["Quantico", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'neon': "0 0 5px #78FF00, 0 0 20px #78FF00, 0 0 30px #78FF00",
        'neon-sm': "0 0 2px #78FF00, 0 0 10px #78FF00",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        'glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'glow': 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
