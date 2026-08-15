// Serverless Endpoint: POST /api/manual
// Proxy untuk mengirim dan memverifikasi email pribadi kustom

const BACKEND_BASE = process.env.AM_BACKEND_URL || "https://restapidhan.vercel.app/api/am";
const API_KEY = process.env.AM_API_KEY || "freeapikeydhan26";

export default async function handler(req, res) {
  // --- VERCEL SECURITY (ANTI-SCRAPING) ---
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.includes('curl') || ua.includes('python') || ua.includes('postman') || ua.toLowerCase().includes('bot')) {
    return res.status(403).json({ error: 'Access Denied: Anti-Scraping Active' });
  }
  if (req.headers['x-am-pro-signature'] !== 'vault-v3') {
    return res.status(403).json({ error: 'Access Denied: Invalid Signature' });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-am-pro-signature");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ status: false, error: "Method not allowed" });
  }

  try {
    const { action, email, url } = req.body || {};

    if (action === "send") {
      if (!email) return res.status(400).json({ status: false, error: "Email wajib diisi" });
      const targetUrl = `${BACKEND_BASE}?action=send&apikey=${API_KEY}&email=${encodeURIComponent(email)}`;
      const resp = await fetch(targetUrl);
      const data = await resp.json();
      return res.status(resp.ok ? 200 : 400).json(data);
    } 
    
    else if (action === "verif") {
      if (!email || !url) return res.status(400).json({ status: false, error: "Email dan Link URL wajib diisi" });
      const targetUrl = `${BACKEND_BASE}?action=verif&apikey=${API_KEY}&email=${encodeURIComponent(email)}&url=${encodeURIComponent(url)}`;
      const resp = await fetch(targetUrl);
      const data = await resp.json();
      return res.status(resp.ok ? 200 : 400).json(data);
    }

    else {
      return res.status(400).json({ status: false, error: "Aksi tidak valid (gunakan 'send' atau 'verif')" });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
