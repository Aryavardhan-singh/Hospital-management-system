/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "#0f172a",
          border: "#1e293b",
          muted: "#475569",
          active: "#4f46e5",
        },
        canvas: "#f8fafc",
        brand: {
          DEFAULT: "#4f46e5",
          hover: "#4338ca",
          light: "#eef2ff",
          dark: "#3730a3",
        },
        status: {
          good: "#10b981",
          warning: "#f59e0b",
          critical: "#f43f5e",
          info: "#3b82f6",
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card-soft': '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        'indigo-active': '0 10px 15px -3px rgba(79, 70, 229, 0.35), 0 4px 6px -4px rgba(79, 70, 229, 0.25)',
      },
    },
  },
  plugins: [],
}
