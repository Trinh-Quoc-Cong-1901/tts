# 🔧 Hướng dẫn thiết lập Azure TTS để lấy giọng nói thật

## 🎯 Cách lấy Azure TTS Subscription Key

### 1. Tạo Azure Account (Free)
1. Đi tới [Azure Portal](https://portal.azure.com)
2. Tạo account miễn phí (Free tier có 5M ký tự/tháng)

### 2. Tạo Speech Service
1. Trong Azure Portal, tìm "Speech Services"
2. Nhấn "Create" 
3. Chọn:
   - **Resource Group**: Tạo mới hoặc chọn có sẵn
   - **Region**: `East US` (khuyến nghị)
   - **Pricing Tier**: `Free F0` (5M ký tự miễn phí/tháng)
4. Nhấn "Create"

### 3. Lấy API Key
1. Vào Speech Service vừa tạo
2. Vào mục "Keys and Endpoint"
3. Copy **Key 1** hoặc **Key 2**
4. Copy **Region** (ví dụ: eastus)

## ⚙️ Cấu hình ứng dụng

### 1. Tạo file `.env`
```bash
cp .env.example .env
```

### 2. Điền thông tin Azure vào `.env`:
```env
AZURE_TTS_SUBSCRIPTION_KEY=your_key_here
AZURE_TTS_REGION=eastus
USE_AZURE_TTS=true
```

### 3. Restart server:
```bash
npm start
```

## ✅ Kiểm tra hoạt động

Khi server khởi động, bạn sẽ thấy:
- ✅ `Azure TTS initialized` (nếu thiết lập đúng)
- ℹ️ `Using Google TTS fallback` (nếu chưa thiết lập)

## 🎵 Kết quả

- **Có Azure TTS**: Giọng nói thật từ Microsoft (HoaiMy, Adri, Salma...)
- **Không có Azure TTS**: Vẫn chạy được với Google TTS (fallback)

## 💰 Chi phí

- **Free tier**: 5M ký tự/tháng miễn phí
- **Standard**: $4/1M ký tự
- Ứng dụng personal thường không vượt quá free tier