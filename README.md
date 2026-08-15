# 🛡️ AM Pro Studio — Secure Backend Proxy & Web App

Aplikasi web **Alight Motion Pro Generator & Login Catcher** dengan arsitektur **Zero-Leak Backend Proxy**.

---

## 🔒 Fitur Keamanan (Zero-Leak)
- **Tidak ada API Key di sisi klien / browser:** Seluruh kredensial API dan URL backend pihak ketiga tersimpan di sisi server (`api/generate.js`, `api/catcher.js`, `api/manual.js`).
- **Network Tab Bersih:** Saat pengguna membuka *Inspect Element $\rightarrow$ Network Tab*, hanya terlihat request lokal ke domain Anda sendiri (`/api/generate`, `/api/catcher`, `/api/manual`).
- **Bebas Masalah CORS:** Seluruh komunikasi eksternal diproses di sisi backend Node.js.

---

## 📁 Struktur Proyek (`am-pro-studio/`)

```
am-pro-studio/
├── api/
│   ├── generate.js    # Serverless/Proxy: Auto Create + Verify Lisensi Pro
│   ├── catcher.js     # Serverless/Proxy: Menangkap email masuk login HP
│   └── manual.js      # Serverless/Proxy: Kirim & verif email kustom
├── public/
│   └── index.html     # Frontend UI Modern (Glassmorphism & Animasi)
├── server.js          # Standalone Node.js Server (0.0.0.0 HOST & PORT Ready)
├── package.json       # Metadata & NPM scripts
├── railway.json       # Konfigurasi deploy Railway (Nixpacks & Healthcheck)
├── Procfile           # Konfigurasi start Railway
├── Dockerfile         # Docker Image opsi Railway
├── vercel.json        # Konfigurasi deploy Vercel
├── run.bat            # Launcher cepat Windows (Double Click)
└── README.md          # Dokumentasi proyek
```

---

## 🚂 Cara Deploy ke Railway (Langkah Demi Langkah)

1. Upload / Push folder **`am-pro-studio`** ke repositori GitHub Anda.
2. Buka [**Railway Dashboard**](https://railway.com) $\rightarrow$ Klik **New Project** $\rightarrow$ **Deploy from GitHub repo**.
3. Pilih repositori Anda.
4. Railway akan otomatis mendeteksi konfigurasi `railway.json` / `package.json` dan melakukan build.
5. Setelah status deploy menjadi **Success**:
   - Masuk ke tab **Settings** pada project Anda di Railway.
   - Pada bagian **Networking**, klik **Generate Domain** (misal: `am-pro-production.up.railway.app`).
6. *(Opsional - Environment Variables)*:
   - Jika ingin mengubah API Key / Endpoint sewaktu-waktu tanpa edit kode, tambahkan di tab **Variables**:
     - `AM_API_KEY`: `freeapikeydhan26`
     - `AM_BACKEND_URL`: `https://restapidhan.vercel.app/api/am`
7. Buka link domain Railway Anda di browser. Selamat menikmati web AM Pro yang aman dan anti bocor! 🎉

---

## 💻 Cara Menjalankan Secara Lokal (Offline di PC)

* **Cara Cepat:** Klik dua kali file [**`run.bat`**](file:///C:/Users/MUHAMMAD%20LANDO/UPLOAD%20PROJECT%20TO%20GIHUB/LIVE/am-pro-studio/run.bat).
* **Terminal / CMD:**
  ```bash
  cd am-pro-studio
  node server.js
  ```
  Buka peramban di `http://localhost:3000`.
