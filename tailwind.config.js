/** @type {import('tailwindcss').Config} */
export default {
  // Drawer / responsive shell: keep these even if a minifier splits dynamic class strings.
  safelist: [
    "translate-x-0",
    "-translate-x-full",
    "max-lg:-translate-x-full",
    "lg:translate-x-0",
    "lg:ml-64",
    "lg:hidden",
  ],
  content: [
    "./index.html",
    "./App.{js,ts,jsx,tsx}",
    "./app.{js,ts,jsx,tsx}",
    "./Auth.{js,ts,jsx,tsx}",
    "./index.{js,ts,jsx,tsx}",
    "./supabase.{js,ts,jsx,tsx}",
    "./types.{js,ts,jsx,tsx}",
    "./geminiService.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

