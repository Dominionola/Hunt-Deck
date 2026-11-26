// Isolated development server for the opt-in HTTP integration. No production build.
import { createServer } from "node:http";
import next from "next";

async function main() {
  if (process.env.HUNTDECK_RUN_HTTP_TESTS !== "1") throw new Error("Opt-in required.");
  const port = Number(process.env.HUNTDECK_HTTP_PORT);
  const dir = process.env.HUNTDECK_HTTP_ROOT;
  if (!Number.isInteger(port) || !dir?.startsWith(".local-services/http-app-")) throw new Error("Isolated HTTP configuration required.");
  const app = next({ dev: true, dir, hostname: "localhost", port, webpack: true });
  const handler = app.getRequestHandler();
  await app.prepare();
  createServer((request, response) => { void handler(request, response); }).listen(port, "127.0.0.1");
}
main().catch((error: unknown) => {
  let message = error instanceof Error ? error.message : "Unknown startup failure.";
  for (const [name, value] of Object.entries(process.env)) {
    if (/KEY|TOKEN|PASSWORD|URL/.test(name) && value && value.length > 5) message = message.replaceAll(value, "[redacted]");
  }
  console.error(`Isolated HTTP server could not start: ${message}`);
  process.exit(1);
});
