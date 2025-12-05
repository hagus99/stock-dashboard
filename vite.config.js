import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/stock-dashboard/", // 예: '/stock-dashboard/' (앞뒤로 슬래시 필수)
});
