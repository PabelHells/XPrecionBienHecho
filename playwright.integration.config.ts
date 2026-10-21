import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testDir: "./tests/integration",
  use: { ...base.use, baseURL: "http://127.0.0.1:5175" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5175",
    url: "http://127.0.0.1:5175",
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: "https://fixture.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test_fixture_only",
    },
  },
});
