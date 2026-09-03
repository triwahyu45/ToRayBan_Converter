# 🕶️ ToRayBan_Converter

> **Transform any video or photo into authentic Ray-Ban Meta Smart Glasses format (1376×1840 vertical MOV with QuickTime atom reconstruction & EXIF injection) directly in your browser.**

🌐 **Live Web Application:** [https://triwahyu45.github.io/ToRayBan_Converter/](https://triwahyu45.github.io/ToRayBan_Converter/)

[![Deploy to GitHub Pages](https://github.com/triwahyu45/ToRayBan_Converter/actions/workflows/deploy.yml/badge.svg)](https://github.com/triwahyu45/ToRayBan_Converter/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14_Static_Export-black.svg?logo=next.js)](https://nextjs.org/)
[![WebAssembly FFmpeg](https://img.shields.io/badge/FFmpeg-WebAssembly_Client--Side-violet.svg)](https://ffmpegwasm.netlify.app/)
[![Privacy: 100% Client-Side](https://img.shields.io/badge/Privacy-100%25_Client--Side-cyan.svg)](#privacy)

---

## 📖 About The Project

**ToRayBan_Converter** is a client-side modern web utility built with **Next.js**, **React**, **TypeScript**, and **Tailwind CSS**. It solves a unique problem: converting standard smartphone/camera videos and photos into the exact structural profile produced by **Ray-Ban Meta Smart Glasses (Gen 2)**.

By reconstructing the low-level **QuickTime .MOV atom container** (typ, 	apt, mvhd 48000, moov.meta keys/ilst) and formatting media to the native **1376 × 1840 aspect ratio**, output videos are recognized by platforms like Instagram as authentic smart glasses footage, unlocking interactive features such as **Instagram Spin View** without needing the physical glasses!

For photos, it injects genuine **Luxottica / Meta View EXIF and TIFF metadata tags** (Make: Luxottica, Model: Ray-Ban Meta Smart Glasses, Software: Meta View 1.0, Focal Length: 2.2mm f/2.2).

---

## 🚀 Live Demo

Experience the converter directly in your browser:
👉 **[https://triwahyu45.github.io/ToRayBan_Converter/](https://triwahyu45.github.io/ToRayBan_Converter/)**

---

## ✨ Key Features

- 🎬 **QuickTime MOV Atom Synthesizer**: Rebuilds binary QuickTime atom hierarchies based on the reverse-engineered metaspin specification to trigger Instagram Spin View.
- 📸 **Pure Client-Side EXIF Injector**: Directly injects Ray-Ban Meta EXIF & TIFF tags into JPEG images without external servers.
- 📐 **Interactive 1376×1840 Crop Viewport**: Real-time canvas pan/zoom, rule-of-thirds grid, and Instagram Safe-Zone overlays (prevents key visual elements from being blocked by reels/stories buttons).
- 🔒 **100% Client-Side Privacy**: All processing runs locally inside your browser using WebAssembly. No photos or videos are ever uploaded to any third-party server.
- 📱 **Lossless Mobile Transfer Guide**: Step-by-step instructions on transferring the generated .MOV to iPhone via **AirDrop** or Android via **USB/QuickShare** without triggering WhatsApp/Telegram re-compression.

---

## 🛠️ Local Development & Quick Start

1. **Clone repository:**
   `ash
   git clone https://github.com/triwahyu45/ToRayBan_Converter.git
   cd ToRayBan_Converter
   `

2. **Install dependencies:**
   `ash
   npm install
   `

3. **Start local development server:**
   `ash
   npm run dev
   `
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build production static export:**
   `ash
   npm run build
   `

---

## 📜 License

Distributed under the MIT License. Created by [Tri Wahyu Handoyo](https://github.com/triwahyu45).
