// Serverless Endpoint: POST /api/generate
// 100% Server-Side Execution (API Key & Endpoints are completely hidden)

const BACKEND_BASE = process.env.AM_BACKEND_URL || "https://restapidhan.vercel.app/api/am";
const API_KEY = process.env.AM_API_KEY || "freeapikeydhan26";
const GUERRILLA_BASE = "https://api.guerrillamail.com/ajax.php";

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
    // 1. Alokasi Mailbox Tempmail di Server
    const initRes = await fetch(`${GUERRILLA_BASE}?f=get_email_address`);
    const initData = await initRes.json();
    
    if (!initData.email_addr || !initData.sid_token) {
      return res.status(500).json({ status: false, error: "Gagal mengalokasikan tempmail" });
    }

    const email = initData.email_addr;
    const sid = initData.sid_token;

    // 2. Kirim Magic Link ke Backend AM
    const sendUrl = `${BACKEND_BASE}?action=send&apikey=${API_KEY}&email=${encodeURIComponent(email)}`;
    const sendRes = await fetch(sendUrl);
    const sendData = await sendRes.json();

    if (!sendData.status) {
      return res.status(500).json({ status: false, error: sendData.error || sendData.message || "Gagal mengirim link AM" });
    }

    // 3. Polling Email Masuk di Sisi Server
    let verifLink = null;
    for (let i = 0; i < 14; i++) {
      await new Promise(r => setTimeout(r, 2200));
      const checkRes = await fetch(`${GUERRILLA_BASE}?f=check_email&seq=0&sid_token=${sid}`);
      const checkData = await checkRes.json();
      const list = checkData.list || [];

      for (const m of list) {
        if (m.mail_from !== "no-reply@guerrillamail.com") {
          const fetchRes = await fetch(`${GUERRILLA_BASE}?f=fetch_email&email_id=${m.mail_id}&sid_token=${sid}`);
          const fetchData = await fetchRes.json();
          const body = fetchData.mail_body || "";

          const match = body.match(/href=["'](https:\/\/alight[^"'>\s]+)/) ||
                        body.match(/(https:\/\/alight-creative\.firebaseapp\.com\/[^"'>\s]+)/) ||
                        body.match(/href=["'](https:\/\/[^"'>\s]+)/);
          if (match) {
            verifLink = match[1].replace(/&amp;/g, "&");
            break;
          }
        }
      }
      if (verifLink) break;
    }

    if (!verifLink) {
      return res.status(408).json({ status: false, error: "Timeout: Email verifikasi tidak masuk tepat waktu" });
    }

    // 4. Verifikasi Lisensi Pro ke Backend
    const verifUrl = `${BACKEND_BASE}?action=verif&apikey=${API_KEY}&email=${encodeURIComponent(email)}&url=${encodeURIComponent(verifLink)}`;
    const verifRes = await fetch(verifUrl);
    const verifData = await verifRes.json();

    if (verifData.status) {
      return res.status(200).json({
        status: true,
        message: "Akun Pro Berhasil Dibuat & Aktif",
        account: {
          email: email,
          sid: sid,
          created_at: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        }
      });
    } else {
      return res.status(500).json({ status: false, error: verifData.error || verifData.message || "Gagal verifikasi lisensi" });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
