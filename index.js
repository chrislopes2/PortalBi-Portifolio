#!/usr/bin/env node
// index.js — PortalBi: MCP Server (stdio) + HTTP Server (static files)

const readline = require("readline");
const http     = require("http");
const fs       = require("fs");
const path     = require("path");

// ── HTTP Static Server ────────────────────────────────────────

const PUBLIC_DIR = path.join(__dirname, "public");
const PORT       = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".ico":  "image/x-icon",
  ".json": "application/json",
  ".woff2":"font/woff2",
};

const httpServer = http.createServer((req, res) => {
  const urlPath  = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(PUBLIC_DIR, urlPath.split("?")[0]);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

httpServer.listen(PORT, () => {
  process.stderr.write(`[PortalBi] HTTP server running at http://localhost:${PORT}\n`);
});

// ── MCP stdio Transport ───────────────────────────────────────

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}
function sendResult(id, result) { send({ jsonrpc: "2.0", id, result }); }
function sendError(id, code, message) { send({ jsonrpc: "2.0", id, error: { code, message } }); }

const handlers = {
  initialize(id) {
    sendResult(id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "portalbi-mcp", version: "1.0.0" },
      capabilities: { tools: {}, resources: {} },
    });
  },
  "notifications/initialized"() {},
  "tools/list"(id)     { sendResult(id, { tools: [] }); },
  "resources/list"(id) { sendResult(id, { resources: [] }); },
  ping(id)             { sendResult(id, {}); },
};

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try { msg = JSON.parse(trimmed); }
  catch { sendError(null, -32700, "Parse error"); return; }

  const { id, method, params } = msg;
  const handler = handlers[method];

  if (handler) {
    try { handler(id, params ?? {}); }
    catch (err) { sendError(id ?? null, -32603, String(err.message)); }
  } else if (id !== undefined) {
    sendError(id, -32601, `Method not found: ${method}`);
  }
});

rl.on("close", () => process.exit(0));
process.stdin.resume();
