// api/index.js — Vercel Serverless Handler
// Importa o requestHandler do server.js e o expõe como função serverless
const handler = require("./server");

module.exports = handler;
