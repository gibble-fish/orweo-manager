// Beschafft die nativen Bestandteile NACH einem `npm install --ignore-scripts`:
//  1. Electron-Binary (dessen eigenes Postinstall wurde übersprungen).
//  2. better-sqlite3 gegen die Electron-ABI bauen (nutzt Prebuilds via
//     @electron/rebuild – kein Python/MSVC erforderlich).
//
// Aufruf: `npm run setup`
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, {
      stdio: "inherit",
      shell: true,
      env: { ...process.env, ...extraEnv },
    });
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} -> exit ${code}`)),
    );
  });
}

async function ensureElectronBinary() {
  const distPath = join(root, "node_modules", "electron", "dist");
  if (existsSync(distPath)) {
    console.log("[setup] Electron-Binary bereits vorhanden.");
    return;
  }
  const installScript = join(root, "node_modules", "electron", "install.js");
  if (!existsSync(installScript)) {
    throw new Error("electron/install.js fehlt – ist 'electron' installiert?");
  }
  console.log("[setup] Lade Electron-Binary …");
  await run("node", [JSON.stringify(installScript)]);
}

async function rebuildSqlite() {
  console.log("[setup] Baue better-sqlite3 gegen die Electron-ABI …");
  await run("npx", ["electron-rebuild", "-f", "-w", "better-sqlite3"]);
}

async function main() {
  await ensureElectronBinary();
  await rebuildSqlite();
  console.log("[setup] Fertig. App startklar: npm run start");
}

main().catch((err) => {
  console.error("[setup] Fehlgeschlagen:", err.message);
  process.exit(1);
});
