import { spawnSync } from "child_process";

export async function initOllama() {
  console.log("Checking Ollama installation and service...");

  // Check if `ollama` binary is available
  const which = spawnSync("which", ["ollama"]);

  if (which.status !== 0) {
    console.error(
      "Ollama não encontrado. Por favor instale o Ollama: https://ollama.com"
    );
    process.exit(1);
  }

  const path = which.stdout.toString().trim();
  console.log("Found ollama at", path);

  // Check systemd service status
  const isActive = spawnSync("systemctl", ["is-active", "--quiet", "ollama"]);

  if (isActive.status === 0) {
    console.log("Ollama service is active");
    return;
  }

  console.log("Ollama service is not active. Attempting to start it via systemd...");

  const start = spawnSync("systemctl", ["start", "ollama"]);

  if (start.status === 0) {
    // re-check
    const nowActive = spawnSync("systemctl", ["is-active", "--quiet", "ollama"]);
    if (nowActive.status === 0) {
      console.log("Ollama service started successfully");
      return;
    }
  }

  console.error(
    "Falha ao iniciar o serviço Ollama. Verifique os logs do systemd: sudo journalctl -u ollama -xe"
  );
  process.exit(1);
}
