#!/usr/bin/env node
// index.js — PortalBi: MCP Server (stdio) + HTTP Server (static files)

const readline = require("readline");
const http = require("http");
const fs = require("fs");
const path = require("path");

// ── HTTP Static Server ────────────────────────────────────────

const PUBLIC_DIR = path.join(__dirname, "..");
const PORT = process.env.PORT || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

const supabase = require("./supabase");

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
  const urlPath = req.url.split("?")[0];

  // ── API Routes ────────────────────────────────────────────────
  if (urlPath.startsWith("/api/")) {
    
    // Login
    if (req.method === "POST" && urlPath === "/api/login") {
      const body = await parseBody(req);
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', body.email)
        .eq('password', body.password)
        .maybeSingle();

      if (user) {
        // Buscar dashboards permitidos
        let dashboards = [];
        if (user.is_admin) {
          const { data: allDashboards } = await supabase.from('dashboards').select('*').order('created_at', { ascending: false });
          dashboards = allDashboards || [];
        } else {
          const { data: userPerms } = await supabase.from('permissions').select('dashboard_id').eq('user_id', user.id);
          const dashIds = (userPerms || []).map(p => p.dashboard_id);
          if (dashIds.length > 0) {
             const { data: permittedDashboards } = await supabase.from('dashboards').select('*').in('id', dashIds);
             dashboards = permittedDashboards || [];
          }
        }

        return sendJSON(res, 200, {
          success: true,
          user: { id: user.id, name: user.name, email: user.email, area: user.area, isAdmin: user.is_admin },
          dashboards: dashboards
        });
      }
      return sendJSON(res, 401, { success: false, message: "Credenciais inválidas" });
    }

    // Listar Usuários
    if (req.method === "GET" && urlPath === "/api/users") {
      const { data: users } = await supabase.from('users').select('id, name, email, area, is_admin').order('name');
      const mapped = (users || []).map(u => ({ ...u, isAdmin: u.is_admin }));
      return sendJSON(res, 200, mapped);
    }

    // Criar Usuário
    if (req.method === "POST" && urlPath === "/api/users") {
      const body = await parseBody(req);
      const { data: newUser, error } = await supabase
        .from('users')
        .insert([{ 
          name: body.name, 
          email: body.email, 
          password: body.password, 
          area: body.area, 
          is_admin: false 
        }])
        .select()
        .single();
      
      if (error) return sendJSON(res, 400, { error: error.message });
      return sendJSON(res, 201, { ...newUser, isAdmin: newUser.is_admin });
    }

    // Deletar Usuário
    if (req.method === "DELETE" && urlPath.startsWith("/api/users/")) {
      const id = urlPath.split("/").pop();
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) return sendJSON(res, 400, { error: error.message });
      return sendJSON(res, 200, { success: true });
    }

    // Listar Dashboards
    if (req.method === "GET" && urlPath === "/api/dashboards") {
      const { data: dashboards } = await supabase.from('dashboards').select('*').order('created_at', { ascending: false });
      const mapped = (dashboards || []).map(d => ({ ...d, cat: d.category, desc: d.description, date: d.date_label, color: d.colors }));
      return sendJSON(res, 200, mapped);
    }
    
    // Criar Dashboard
    if (req.method === "POST" && urlPath === "/api/dashboards") {
      const body = await parseBody(req);
      const { data: newDash, error } = await supabase
        .from('dashboards')
        .insert([{ 
          title: body.title, 
          category: body.cat, 
          description: body.desc, 
          date_label: body.date, 
          colors: body.color, 
          embed_url: body.embedUrl 
        }])
        .select()
        .single();

      if (error) return sendJSON(res, 400, { error: error.message });
      return sendJSON(res, 201, { ...newDash, cat: newDash.category, desc: newDash.description, date: newDash.date_label, color: newDash.colors });
    }

    // Deletar Dashboard
    if (req.method === "DELETE" && urlPath.startsWith("/api/dashboards/")) {
      const id = urlPath.split("/").pop();
      const { error } = await supabase.from('dashboards').delete().eq('id', id);
      if (error) return sendJSON(res, 400, { error: error.message });
      return sendJSON(res, 200, { success: true });
    }

    // Listar Permissões de um Usuário
    if (req.method === "GET" && urlPath.startsWith("/api/permissions/")) {
      const userId = urlPath.split("/").pop();
      const { data: perms } = await supabase.from('permissions').select('dashboard_id').eq('user_id', userId);
      return sendJSON(res, 200, (perms || []).map(p => p.dashboard_id));
    }

    // Atualizar Permissões
    if (req.method === "POST" && urlPath === "/api/permissions") {
      const body = await parseBody(req);
      if (!body.userId) return sendJSON(res, 400, { error: "userId required" });
      await supabase.from('permissions').delete().eq('user_id', body.userId);
      if (body.dashboardIds && body.dashboardIds.length > 0) {
        const rows = body.dashboardIds.map(dId => ({ user_id: body.userId, dashboard_id: dId }));
        const { error } = await supabase.from('permissions').insert(rows);
        if (error) return sendJSON(res, 400, { error: error.message });
      }
      return sendJSON(res, 200, { success: true });
    }

    return sendJSON(res, 404, { error: "Not Found" });
  }

  // ── Static Files ──────────────────────────────────────────────
  const filePath = path.join(PUBLIC_DIR, urlPath === "/" ? "index.html" : urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath);
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
};

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
  "notifications/initialized"() { },
  "tools/list"(id) { sendResult(id, { tools: [] }); },
  "resources/list"(id) { sendResult(id, { resources: [] }); },
  ping(id) { sendResult(id, {}); },
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
