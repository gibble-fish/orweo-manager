// Entwicklungs-Starter: startet den Vite-Dev-Server, kompiliert Electron
// (Main/Preload) via tsc und startet Electron mit gesetzter VITE_DEV_SERVER_URL.
// Für die reine Verifikation genügt `npm run start` (Produktivpfad).
import { spawn } from "node:child_process";
import { createServer } from "vite";

const PORT = 5199;

async function main() {
  const server = await createServer({ configFile: "vite.config.ts", server: { port: PORT } });
  await server.listen();
  const url = `http://localhost:${PORT}`;
  console.log(`[dev] Vite läuft auf ${url}`);

  // Electron-Main/Preload kompilieren.
  await run("npx", ["tsc", "-p", "tsconfig.electron.json"]);

  const electron = spawn("npx", ["electron", "."], {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, VITE_DEV_SERVER_URL: url },
  });

  electron.on("close", async () => {
    await server.close();
    process.exit(0);
  });
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: true });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
