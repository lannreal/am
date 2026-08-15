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
  
  if (Math.abs(serverTime - reqTime) > 300000) {
    return res.status(403).json({ error: 'Access Denied: Time Expired/Invalid' });
  }

  const expectedSig = Buffer.from(reqTime + "_am_super_secure_vault_2026").toString('base64').split("").reverse().join("");
  if (signature !== expectedSig) {
    return res.status(403).json({ error: 'Access Denied: Invalid Signature' });
  }

  // --- CLOUDFLARE TURNSTILE VERIFICATION ---
  const turnstileToken = req.headers['x-cf-turnstile-response'];
  if (!turnstileToken) {
    return res.status(403).json({ error: 'Access Denied: Turnstile token missing' });
  }
  
  const tsFormData = new URLSearchParams();
  tsFormData.append('secret', '0x4AAAAAAEQqc7ccVMVc5i4rWuuWs1QHG_M');
  tsFormData.append('response', turnstileToken);
  
  const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: tsFormData
  });
  const tsData = await tsRes.json();
  if (!tsData.success) {
    return res.status(403).json({ error: 'Access Denied: CAPTCHA validation failed' });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-am-pro-signature, x-am-time, x-cf-turnstile-response");

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
      
      let respOk = false;
      let finalData = {};
      
      try {
        const url = `https://api.alwayscodex.my.id/api/am/send?email=${encodeURIComponent(email)}&apikey=mye`;
        const resp = await fetch(url);
        const data = await resp.json();
        
        if (resp.ok && data.success !== false) {
          respOk = true;
          finalData = {
            status: data.success,
            message: data.message || data.error,
            error: data.error,
            source: "alwayscodex"
          };
        } else {
          // Pass the error message down if it exists, otherwise throw
          if(data.error) throw new Error(data.error);
          throw new Error("Primary API returned error");
        }
      } catch (err) {
        console.log("[FALLBACK] Using ThanzV2 API for send due to:", err.message);
        const fbResp = await fetch(`${BACKEND_BASE}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const fbData = await fbResp.json();
        
        respOk = fbResp.ok;
        finalData = {
          status: fbData.status,
          message: fbData.message || fbData.error || err.message, // preserve original error if fallback also fails
          error: fbData.error || err.message,
          source: "thanzv2-fallback"
        };
      }
      
      return res.status(respOk ? 200 : 400).json(finalData);
    } 
    
    else if (action === "verif") {
      if (!email || !url) return res.status(400).json({ status: false, error: "Email dan Link URL wajib diisi" });
      
      let respOk = false;
      let finalData = {};
      
      try {
        const fbUrl = `https://api.alwayscodex.my.id/api/am/verify?email=${encodeURIComponent(email)}&link=${encodeURIComponent(url)}&apikey=mye`;
        const resp = await fetch(fbUrl);
        const data = await resp.json();
        
        if (resp.ok && data.success !== false) {
          respOk = true;
          finalData = {
            status: data.success,
            message: data.message || data.error,
            error: data.error,
            result: data.success ? { type: 'success' } : null,
            source: "alwayscodex"
          };
        } else {
          if(data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
          throw new Error("Primary API returned error");
        }
      } catch (err) {
        console.log("[FALLBACK] Using ThanzV2 API for verif due to:", err.message);
        const fbResp = await fetch(`${BACKEND_BASE}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, link: url })
        });
        const fbData = await fbResp.json();
        
        respOk = fbResp.ok;
        finalData = {
          status: fbData.status,
          message: fbData.message || fbData.error || err.message,
          error: fbData.error || err.message,
          result: fbData.result,
          source: "thanzv2-fallback"
        };
      }
      
      return res.status(respOk ? 200 : 400).json(finalData);
    }

    else {
      return res.status(400).json({ status: false, error: "Aksi tidak valid (gunakan 'send' atau 'verif')" });
    }

  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
}
