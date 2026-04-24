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

const { readDB, writeDB } = require("./db");

function parseBody(req) {
  if (req.body) {
    return Promise.resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
  }
  return new Promise((resolve) => {
    let body = "";
    req.on("data", chunk => body += chunk.toString());
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const requestHandler = async (req, res) => {
  const urlPath  = req.url.split("?")[0];

  // ── API Routes ────────────────────────────────────────────────
  if (urlPath.startsWith("/api/")) {
    const db = readDB();

    if (req.method === "POST" && urlPath === "/api/login") {
      const body = await parseBody(req);
      const user = db.users.find(u => u.email === body.email && u.password === body.password);
      if (user) {
        // Obter dashboards permitidos
        const userDashIds = db.permissions[user.id] || [];
        const allowedDashboards = user.isAdmin 
          ? db.dashboards 
          : db.dashboards.filter(d => userDashIds.includes(d.id));
        
        const { password, ...safeUser } = user;
        return sendJSON(res, 200, { user: safeUser, dashboards: allowedDashboards });
      }
      return sendJSON(res, 401, { error: "Credenciais inválidas" });
    }

    if (req.method === "GET" && urlPath === "/api/users") {
      const safeUsers = db.users.map(({ password, ...u }) => u);
      return sendJSON(res, 200, safeUsers);
    }

    if (req.method === "POST" && urlPath === "/api/users") {
      const body = await parseBody(req);
      const newId = Date.now();
      const newUser = { id: newId, ...body, isAdmin: false };
      db.users.push(newUser);
      db.permissions[newId] = [];
      writeDB(db);
      const { password, ...safeUser } = newUser;
      return sendJSON(res, 201, safeUser);
    }

    if (req.method === "DELETE" && urlPath.startsWith("/api/users/")) {
      const id = parseInt(urlPath.split("/").pop(), 10);
      db.users = db.users.filter(u => u.id !== id);
      delete db.permissions[id];
      writeDB(db);
      return sendJSON(res, 200, { success: true });
    }

    if (req.method === "GET" && urlPath === "/api/dashboards") {
      return sendJSON(res, 200, db.dashboards);
    }
    
    if (req.method === "POST" && urlPath === "/api/dashboards") {
      const body = await parseBody(req);
      const newDash = { id: Date.now(), ...body };
      db.dashboards.unshift(newDash);
      // Give access to admins
      db.users.filter(u => u.isAdmin).forEach(u => {
        if (!db.permissions[u.id]) db.permissions[u.id] = [];
        db.permissions[u.id].push(newDash.id);
      });
      writeDB(db);
      return sendJSON(res, 201, newDash);
    }

    if (req.method === "DELETE" && urlPath.startsWith("/api/dashboards/")) {
      const id = parseInt(urlPath.split("/").pop(), 10);
      db.dashboards = db.dashboards.filter(d => d.id !== id);
      // remover das permissoes
      for (const uid in db.permissions) {
        db.permissions[uid] = db.permissions[uid].filter(dashId => dashId !== id);
      }
      writeDB(db);
      return sendJSON(res, 200, { success: true });
    }

    if (req.method === "GET" && urlPath.startsWith("/api/permissions/")) {
      const userId = parseInt(urlPath.split("/").pop(), 10);
      return sendJSON(res, 200, db.permissions[userId] || []);
    }

    if (req.method === "POST" && urlPath === "/api/permissions") {
      const body = await parseBody(req); // { userId, dashboardIds }
      if (body.userId) {
        db.permissions[body.userId] = body.dashboardIds || [];
        writeDB(db);
        return sendJSON(res, 200, { success: true });
      }
      return sendJSON(res, 400, { error: "userId required" });
    }

    return sendJSON(res, 404, { error: "Not Found" });
  }

  // ── Static Files ──────────────────────────────────────────────
  const staticPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(PUBLIC_DIR, staticPath);

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

if (require.main === module) {
  const httpServer = http.createServer(requestHandler);
  httpServer.listen(PORT, () => {
    process.stderr.write(`[PortalBi] HTTP server running at http://localhost:${PORT}\n`);
  });
}

module.exports = requestHandler;

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
