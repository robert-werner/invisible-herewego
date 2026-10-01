const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const { server } = require("./server");

function request(port, method, requestPath) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: "127.0.0.1", port, method, path: requestPath },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => (body += chunk));
        response.on("end", () => resolve({ status: response.statusCode, body }));
      },
    );
    request.on("error", reject);
    request.end();
  });
}

test("serves the microfrontend", async () => {
  const runningServer = server.listen(0, "127.0.0.1");
  await new Promise((resolve) => runningServer.once("listening", resolve));

  try {
    const response = await request(runningServer.address().port, "GET", "/");
    assert.equal(response.status, 200);
    assert.match(response.body, /Generated API key/);
    assert.match(response.body, /GENERATE/);
  } finally {
    await new Promise((resolve) => runningServer.close(resolve));
  }
});

test("reports health", async () => {
  const runningServer = server.listen(0, "127.0.0.1");
  await new Promise((resolve) => runningServer.once("listening", resolve));

  try {
    const response = await request(
      runningServer.address().port,
      "GET",
      "/api/health",
    );
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(response.body), { ok: true });
  } finally {
    await new Promise((resolve) => runningServer.close(resolve));
  }
});
