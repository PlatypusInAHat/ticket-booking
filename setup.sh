#!/usr/bin/env bash

# Script cài đặt nhanh cho ứng dụng Đặt Vé Online

echo "╔════════════════════════════════════════╗"
echo "║   🎟️  Ticket Booking App Setup       ║"
echo "║   Ứng dụng Đặt Vé Online             ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa được cài đặt"
    echo "📥 Vui lòng cài đặt Node.js từ https://nodejs.org/"
    exit 1
fi

echo " Node.js: $(node -v)"
echo " npm: $(npm -v)"
echo ""

# Cài đặt Backend
echo "📦 Cài đặt Backend..."
cd backend

if [ ! -f .env ]; then
    echo "📝 Tạo file .env..."
    cp .env.example .env
    echo "⚠️  Vui lòng chỉnh sửa file .env với các thông tin của bạn"
fi

npm install

echo " Backend cài đặt xong!"
echo ""

# Cài đặt Frontend
echo "📦 Cài đặt Frontend..."
cd ../frontend
npm install

echo " Frontend cài đặt xong!"
echo ""

echo "╔════════════════════════════════════════╗"
echo "║    Cài đặt hoàn tất!                 ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📝 Hướng dẫn chạy ứng dụng:"
echo ""
echo "1️⃣  Cửa sổ Terminal 1 - Backend:"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "2️⃣  Cửa sổ Terminal 2 - Frontend:"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "3️⃣  Mở browser tại http://localhost:3000"
echo ""
echo "📚 Chi tiết: Xem file SETUP.md"
