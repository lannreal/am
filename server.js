// Standalone Local & Production HTTP Server (Zero Dependencies)
// Cocok untuk Localhost, Railway, Render, VPS, & Docker

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Railway and other cloud hosts automatically supply process.env.PORT
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0'; // Bind ke 0.0.0.0 agar bisa diakses public di Railway

// Import Serverless Route Handlers
import handleGenerate from './api/generate.js';
import handleCatcher from './api/catcher.js';
import handleManual from './api/manual.js';

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function adaptResponse(res) {
  return {
    setHeader: (name, value) => res.setHeader(name, value),
    status: (code) => {
      res.statusCode = code;
      return {
        json: (data) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        },
        end: () => res.end()
      };
    }
  };
}

// --- SUPER DUPER ANTI-SCRAPING & RATE LIMITING ---
const rateLimits = new Map();

function isScraperOrSpam(req) {
  // 1. Cek User-Agent (Anti-bot dasar)
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.includes('curl') || ua.includes('python') || ua.includes('postman') || ua.toLowerCase().includes('bot') || ua.includes('wget')) {
    return true;
  }

  // 2. Cek Custom Header (Dynamic Time-based Signature)
  const reqTime = parseInt(req.headers['x-am-time'] || '0', 10);
  const signature = req.headers['x-am-pro-signature'] || '';
  
  // Waktu request tidak boleh lebih dari 60 detik (mencegah replay attack)
  const serverTime = Date.now();
  if (Math.abs(serverTime - reqTime) > 60000) {
    console.log(`[SECURITY] Blocked Request - Time Expired/Invalid`);
    return true;
  }

  // Validasi signature (Time + Secret -> Base64 -> Reverse)
  // Ini bikin scraper manual / python kebingungan karena butuh logic JS
  const expectedSig = Buffer.from(reqTime + "_am_super_secure_vault_2026").toString('base64').split("").reverse().join("");
  if (signature !== expectedSig) {
    console.log(`[SECURITY] Blocked Request - Invalid Signature`);
    return true;
  }

  // 3. Rate Limiting (Maks 10 request per IP per menit) - Lebih ketat
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const record = rateLimits.get(ip) || { count: 0, startTime: serverTime };
  
  if (serverTime - record.startTime > 60000) { // Reset tiap menit
    record.count = 1;
    record.startTime = serverTime;
  } else {
    record.count++;
  }
  rateLimits.set(ip, record);

  if (record.count > 10) {
    console.log(`[SECURITY] Blocked IP ${ip} - Rate Limit Exceeded`);
    return true; 
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health check endpoint (Railway requirement)
  if (pathname === '/health' || pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  }

  // --- CORS OPTIONS PREFLIGHT ---
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-am-pro-signature, x-am-time, x-cf-turnstile-response'
    });
    return res.end();
  }

  // --- API SECURITY CHECK ---
  if (pathname.startsWith('/api/')) {
    if (isScraperOrSpam(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ 
        status: false, 
        error: 'Access Denied: Anti-Scraping Protection Active / Rate Limit Exceeded' 
      }));
    }
  }

  // 1. API Route: /api/generate
  if (pathname === '/api/generate') {
    const body = await parseBody(req);
    req.body = body;
    return handleGenerate(req, adaptResponse(res));
  }

  // 2. API Route: /api/catcher
  if (pathname === '/api/catcher') {
    const body = await parseBody(req);
    req.body = body;
    return handleCatcher(req, adaptResponse(res));
  }

  // 3. API Route: /api/manual
  if (pathname === '/api/manual') {
    const body = await parseBody(req);
    req.body = body;
    return handleManual(req, adaptResponse(res));
  }

  // 4. Static Files
  // CEGAH KEBOCORAN SOURCE CODE: Hanya izinkan index.html (karena tidak ada aset eksternal)
  if (pathname !== '/' && pathname !== '/index.html') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden: Access to this file is blocked for security reasons.');
  }

  let filePath = path.join(__dirname, 'index.html');

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('500 Internal Server Error');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end(content);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`  AmPremGenerator — SECURE BACKEND PROXY SERVER       `);
  console.log(`  100% Zero-Leak: API Key & Endpoints Terlindungi   `);
  console.log(`====================================================`);
  console.log(`  ➜ Server listening on: http://${HOST}:${PORT}`);
  console.log(`  ➜ Railway Ready: YES (Healthcheck at /health)      `);
  console.log(`====================================================`);
});
