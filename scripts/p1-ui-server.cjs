// Dedicated frontend test server. Never used by the application's start script.
const http = require("node:http");
const path = require("node:path");
const next = require("next");

const app = next({ dev: false, dir: path.join(__dirname, "../apps/frontend") });
app.prepare().then(() => {
  const handler = app.getRequestHandler();
  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/__p1_test_shutdown" && req.headers["x-p1-test"] === "shutdown") {
      res.writeHead(200).end("ok");
      // Let the response flush, then close Next and any keep-alive connections.
      setTimeout(() => {
        server.closeAllConnections();
        server.close();
        app.close().finally(() => process.exit(0));
        setTimeout(() => process.exit(0), 1500).unref();
      }, 50);
      return;
    }
    handler(req, res);
  });
  // Accessible only on loopback, with no backend or production API connection.
  server.listen(3100, "127.0.0.1");
}).catch(error => {
  console.error(error);
  process.exit(1);
});
