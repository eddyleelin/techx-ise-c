import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%) scale(0.5)', opacity: '0' },
          '70%': { transform: 'translateX(10%) scale(1.1)' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' }
        }
      },
      animation: {
        slideIn: 'slideIn 0.5s ease-out'
      }
    },
  },
  plugins: [],
} satisfies Config;
