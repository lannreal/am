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
    // 1. Generate Custom ZNext Email Address
    const randStr = Math.random().toString(36).substring(2, 8);
    const email = `pro_${Date.now().toString(36)}_${randStr}@znext.bond`;

    // 2. Kirim Magic Link via ThanzV2
    const sendRes = await fetch(`${BACKEND_BASE}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const sendData = await sendRes.json();

    if (!sendRes.ok || sendData.status === false) {
      return res.status(500).json({ 
        status: false, 
        error: sendData.message || "Gagal mengirim link ke server Alight Motion" 
      });
    }

    // 3. Polling Inbox via ThanzV2 API
    let loginUrl = null;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1800));
      try {
        const inboxRes = await fetch(`${BACKEND_BASE}/inbox`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const inboxData = await inboxRes.json();
        if (inboxData.status && inboxData.data && Array.isArray(inboxData.data.messages) && inboxData.data.messages.length > 0) {
          const found = inboxData.data.messages.find(m => m.login_url);
          if (found && found.login_url) {
            loginUrl = found.login_url;
            break;
          }
        }
      } catch (e) {}
    }

    if (!loginUrl) {
      return res.status(408).json({ status: false, error: "Timeout: Link verifikasi belum masuk ke inbox" });
    }

    // 4. Verifikasi & Aktivasi Lisensi Pro 1 Year
    const verifRes = await fetch(`${BACKEND_BASE}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, link: loginUrl })
    });
    const verifData = await verifRes.json();

    if (verifRes.ok && verifData.status !== false) {
      return res.status(200).json({
        status: true,
        message: "Akun Pro Berhasil Dibuat & Aktif (1 Year)",
        account: {
          email: email,
          package: "PRO_1_YEAR",
          duration: "1_year",
          sid: email,
          created_at: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        }
      });
    } else {
      return res.status(500).json({
        status: false,
        error: verifData.message || "Gagal mengaktivasi lisensi Pro"
      });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message || "Internal server error" });
  }
}
