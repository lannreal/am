// Serverless Endpoint: POST /api/generate
// 100% Server-Side Execution (API Key & Endpoints are completely hidden)

const BACKEND_BASE = process.env.AM_BACKEND_URL || "https://secret-member-thanzv2.vercel.app/api";

export default async function handler(req, res) {
  // --- VERCEL SECURITY (ANTI-SCRAPING) ---
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.includes('curl') || ua.includes('python') || ua.includes('postman') || ua.toLowerCase().includes('bot')) {
    return res.status(403).json({ error: 'Access Denied: Anti-Scraping Active' });
  }
  if (req.headers['x-am-pro-signature'] !== 'vault-v3') {
    return res.status(403).json({ error: 'Access Denied: Invalid Signature' });
  }

  // CORS & Methods
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
    // 1. Generate Akun Pro via ThanzV2 Bulk Engine
    const bulkRes = await fetch(`${BACKEND_BASE}/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1 })
    });

    const bulkData = await bulkRes.json();

    if (bulkRes.ok && bulkData.status && bulkData.result && bulkData.result.accounts && bulkData.result.accounts.length > 0) {
      const acc = bulkData.result.accounts[0];
      return res.status(200).json({
        status: true,
        message: "Akun Pro Berhasil Dibuat & Aktif",
        account: {
          email: acc.email,
          package: acc.package || "PRO_1_YEAR",
          duration: acc.duration || "1_year",
          sid: acc.email, // gunakan email sebagai identifier
          created_at: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        }
      });
    } else {
      return res.status(500).json({ 
        status: false, 
        error: bulkData.message || (bulkData.error && bulkData.error.message) || "Gagal membuat akun dari server pusat" 
      });
    }
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message || "Internal server error" });
  }
}
