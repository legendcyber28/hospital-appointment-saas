import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50:"#eef7ff",100:"#d9edff",500:"#0e84e8",600:"#0a6fd1",700:"#0859aa" },
      },
    },
  },
  plugins: [],
} satisfies Config;
