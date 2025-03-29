/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}", // ✅ Next.js 15 App Router
    "./pages/**/*.{js,jsx,ts,tsx,mdx}", // ✅ Pages Router (if used)
    "./components/**/*.{js,jsx,ts,tsx,mdx}", // ✅ Components
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
