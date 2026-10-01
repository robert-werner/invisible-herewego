const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const PYTHON_SCRIPT = path.join(ROOT, "main.py");
const GENERATE_TIMEOUT_MS = 45_000;

function pythonCommand() {
  const configured = process.env.PYTHON_BIN;
  if (configured) return configured;

  const virtualenvPython = path.join(
    ROOT,
    process.platform === "win32" ? ".venv/Scripts/python.exe" : ".venv/bin/python",
  );

  return fs.existsSync(virtualenvPython)
    ? virtualenvPython
    : process.platform === "win32"
      ? "python"
      : "python3";
}

function generateApiKey() {
  return new Promise((resolve, reject) => {
    const child = spawn(pythonCommand(), [PYTHON_SCRIPT], {
      cwd: ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      finish(reject, new Error(`Could not start the generator: ${error.message}`));
    });
    child.on("close", (code) => {
      const apiKey = stdout.trim().split(/\s+/)[0];
      if (code === 0 && apiKey) {
        finish(resolve, apiKey);
        return;
      }

      const reason = stderr.trim() || `Generator exited with code ${code}`;
      finish(reject, new Error(reason));
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finish(reject, new Error("Generation timed out. Please try again."));
    }, GENERATE_TIMEOUT_MS);
  });
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
  });
  response.end(body);
}

function serveIndex(response) {
  fs.readFile(path.join(PUBLIC_DIR, "index.html"), (error, content) => {
    if (error) {
      sendJson(response, 500, { error: "The frontend could not be loaded." });
      return;
    }
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/") {
    serveIndex(response);
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && request.url === "/api/generate") {
    try {
      const apiKey = await generateApiKey();
      sendJson(response, 200, { apiKey });
    } catch (error) {
      console.error(error);
      sendJson(response, 502, {
        error: "The API key could not be generated. Check the generator logs and try again.",
      });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found." });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`HERE WeGo key generator: http://${HOST}:${PORT}`);
  });
}

module.exports = {
  GENERATE_TIMEOUT_MS,
  generateApiKey,
  server,
};
