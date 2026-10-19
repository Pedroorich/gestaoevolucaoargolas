import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#111111",
          orange: "#FF7A00",
          blue: "#1565C0",
          surface: "#F5F5F7",
        },
      },
      fontSize: {
        body: ["1.125rem", { lineHeight: "1.75rem" }], // 18px para acessibilidade +50
      },
      minHeight: {
        touch: "48px",
      },
    },
  },
  plugins: [],
};
export default config;
