import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// The app prerenders its pages at build time and fetches data from the browser,
// so the default in-memory cache is enough. Add an R2 incremental cache here if
// server-side rendering or ISR is introduced.
export default defineCloudflareConfig({});
