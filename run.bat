@echo off
title AM Pro Studio — Secure Backend Proxy
color 0B
echo ========================================================
echo        AM PRO STUDIO — SECURE BACKEND PROXY
echo        100%% Zero-Leak: API Key & Endpoints Safe
echo ========================================================
echo.
echo Memulai server backend proxy...
echo Membuka peramban di http://localhost:3000 ...
start http://localhost:3000
echo.
node server.js
pause
