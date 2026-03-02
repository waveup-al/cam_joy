# Hướng dẫn Khởi chạy Server Local cho Auto Joy (via Antigravity)

Tài liệu này cung cấp các cách nhanh chóng để khởi chạy dự án Auto Joy trên máy tính cá nhân của bạn.

---

## ⚡ Cách 1: Khởi chạy nhanh qua Antigravity (Khuyên dùng)

Bạn có thể sử dụng sức mạnh của Antigravity để quản lý server chỉ bằng vài câu lệnh đơn giản:

### 1. Sử dụng Slash Commands
Nhập trực tiếp vào khung chat của Antigravity:
- `/preview start` — Khởi chạy server local.
- `/preview status` — Kiểm tra trạng thái server đang chạy.
- `/preview stop` — Dừng server đang chạy.

### 2. Yêu cầu trực tiếp bằng ngôn ngữ tự nhiên
Bạn chỉ cần yêu cầu:
- *"Antigravity, hãy khởi chạy server local cho tôi."*
- *"Kiểm tra xem server có đang chạy không."*
- *"Reset lại server."*

---

## 🛠️ Cách 2: Khởi chạy thủ công qua Terminal

Nếu bạn muốn tự tay thao tác qua terminal (PowerShell hoặc Command Prompt), hãy làm theo các bước sau:

### Bước 1: Di chuyển vào thư mục dự án
Mở Terminal và chuyển đến đúng thư mục chứa `package.json`:
```bash
cd "C:\Users\Hi\Downloads\auto camp\auto_joy-main"
```

### Bước 2: Cài đặt thư viện (nếu là lần đầu)
```bash
npm install
```

### Bước 3: Cài đặt biến môi trường
Đảm bảo bạn đã có file `.env.local` với nội dung:
```text
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

### Bước 4: Khởi chạy Server
```bash
npm run dev
```

---

## 🌐 Truy cập Ứng dụng

Sau khi khởi chạy thành công, ứng dụng sẽ khả dụng tại:
👉 **[http://localhost:3000/](http://localhost:3000/)**

---

## 📜 Các lệnh hữu ích khác
- `npm run build`: Xây dựng bản production.
- `npm run preview`: Xem trước bản production.
- `npm run lint`: Kiểm tra lỗi code TypeScript.

---
*Lưu ý: Nếu bạn gặp bất kỳ lỗi nào, hãy hỏi ngay Antigravity để được hỗ trợ sửa lỗi tự động.*

