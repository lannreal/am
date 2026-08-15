// Serverless Endpoint: POST /api/catcher
// Mengecek email masuk dari Alight Motion saat user login di HP

const GUERRILLA_BASE = "https://api.guerrillamail.com/ajax.php";

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
    const { sid, ignoreIds = [] } = req.body || {};
    if (!sid) {
      return res.status(400).json({ status: false, error: "Session ID atau Email wajib disertakan" });
    }

    const ignoreSet = new Set(ignoreIds);

    // 1. Cek Inbox via ThanzV2 jika sid berupa email
    if (sid.includes('@')) {
      try {
        const inboxRes = await fetch("https://secret-member-thanzv2.vercel.app/api/inbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: sid })
        });
        const inboxData = await inboxRes.json();
        
        if (inboxData.status && inboxData.data && Array.isArray(inboxData.data.messages)) {
          const messages = inboxData.data.messages;
          const currentIds = messages.map((m, idx) => m.login_url || `msg-${idx}`);

          // Jika ignoreIds kosong (initial call), simpan ID yang ada & jangan langsung return found
          if (ignoreIds.length === 0) {
            return res.status(200).json({
              status: true,
              found: false,
              currentIds: currentIds
            });
          }

          // Cari pesan BARU yang login_url nya belum pernah ada di ignoreSet
          for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            const mId = m.login_url || `msg-${i}`;
            if (m.login_url && !ignoreSet.has(m.login_url) && !ignoreSet.has(mId)) {
              return res.status(200).json({
                status: true,
                found: true,
                link: m.login_url,
                mail_id: mId
              });
            }
          }

          return res.status(200).json({
            status: true,
            found: false,
            currentIds: currentIds
          });
        }
      } catch (e) {}
    }

    // 2. Fallback: Cek Guerrilla Mail jika sid adalah sid_token
    const checkRes = await fetch(`${GUERRILLA_BASE}?f=check_email&seq=0&sid_token=${sid}`);
    const checkData = await checkRes.json();
    const list = checkData.list || [];
    const currentIds = list.map(m => m.mail_id);

    if (ignoreIds.length === 0) {
      return res.status(200).json({
        status: true,
        found: false,
        currentIds: currentIds
      });
    }

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

    return res.status(200).json({
      status: true,
      found: false,
      currentIds: currentIds
    });

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
