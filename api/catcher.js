// Serverless Endpoint: POST /api/catcher
// Mengecek email masuk dari Alight Motion saat user login di HP

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
    const { sid, ignoreIds = [] } = req.body || {};
    if (!sid) {
      return res.status(400).json({ status: false, error: "Session ID (sid) wajib disertakan" });
    }

    const checkRes = await fetch(`${GUERRILLA_BASE}?f=check_email&seq=0&sid_token=${sid}`);
    const checkData = await checkRes.json();
    const list = checkData.list || [];

    const ignoreSet = new Set(ignoreIds);

    for (const m of list) {
      if (!ignoreSet.has(m.mail_id) && m.mail_from !== "no-reply@guerrillamail.com") {
        const fetchRes = await fetch(`${GUERRILLA_BASE}?f=fetch_email&email_id=${m.mail_id}&sid_token=${sid}`);
        const fetchData = await fetchRes.json();
        const body = fetchData.mail_body || "";

        const match = body.match(/href=["'](https:\/\/alight[^"'>\s]+)/) ||
                      body.match(/(https:\/\/alight-creative\.firebaseapp\.com\/[^"'>\s]+)/) ||
                      body.match(/href=["'](https:\/\/[^"'>\s]+)/);

        if (match) {
          const link = match[1].replace(/&amp;/g, "&");
          return res.status(200).json({
            status: true,
            found: true,
            link: link,
            mail_id: m.mail_id
          });
        }
      }
    }

    // Jika belum ada email baru masuk
    const currentIds = list.map(m => m.mail_id);
    return res.status(200).json({
      status: true,
      found: false,
      currentIds: currentIds
    });

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
