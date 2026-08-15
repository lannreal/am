// Serverless Endpoint: POST /api/manual
// Proxy untuk mengirim dan memverifikasi email pribadi kustom

const BACKEND_BASE = process.env.AM_BACKEND_URL || "https://secret-member-thanzv2.vercel.app/api";

export default async function handler(req, res) {
  // --- VERCEL SECURITY (ANTI-SCRAPING) ---
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.includes('curl') || ua.includes('python') || ua.includes('postman') || ua.toLowerCase().includes('bot') || ua.includes('wget')) {
    return res.status(403).json({ error: 'Access Denied: Anti-Scraping Active' });
  }

  const reqTime = parseInt(req.headers['x-am-time'] || '0', 10);
  const signature = req.headers['x-am-pro-signature'] || '';
  const serverTime = Date.now();
  
  if (Math.abs(serverTime - reqTime) > 60000) {
    return res.status(403).json({ error: 'Access Denied: Time Expired/Invalid' });
  }

  const expectedSig = Buffer.from(reqTime + "_am_super_secure_vault_2026").toString('base64').split("").reverse().join("");
  if (signature !== expectedSig) {
    return res.status(403).json({ error: 'Access Denied: Invalid Signature' });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-am-pro-signature, x-am-time");

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
      const resp = await fetch(`${BACKEND_BASE}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await resp.json();
      return res.status(resp.ok && data.status !== false ? 200 : 400).json(data);
    } 
    
    else if (action === "verif") {
      if (!email || !url) return res.status(400).json({ status: false, error: "Email dan Link URL wajib diisi" });
      const resp = await fetch(`${BACKEND_BASE}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, link: url })
      });
      const data = await resp.json();
      return res.status(resp.ok && data.status !== false ? 200 : 400).json(data);
    }

    else {
      return res.status(400).json({ status: false, error: "Aksi tidak valid (gunakan 'send' atau 'verif')" });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
