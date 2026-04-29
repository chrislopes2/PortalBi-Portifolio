// api/index.js — Vercel Serverless Handler
const handler = require("./server");

module.exports = async (req, res) => {
  try {
    await handler(req, res);
  } catch (err) {
    res.setHeader("Content-Type", "application/json");
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "TopLevelError", message: err.message, stack: err.stack }));
  }
};
