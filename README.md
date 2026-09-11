# 📅 THỜI KHÓA BIỂU SINH VIÊN (PWA - GITHUB PAGES)

Giao diện cổ điển chuẩn Cream Paper / Navy / Marigold, tự động đọc tất cả file `.ics` có trong thư mục `ics/`.

---

## 📂 CẤU TRÚC THƯ MỤC

```text
pwa/
├── index.html            # Giao diện chính (Giao diện cũ nguyên bản)
├── manifest.json         # Cấu hình PWA (cài lên màn hình chính điện thoại)
├── sw.js                 # Service Worker (xem offline khi mất mạng)
├── css/
│   └── style.css         # Bộ stylesheet cổ điển nguyên bản
├── js/
│   ├── app.js            # Tự động nạp file ics/, điều khiển Dropdown, chuyển chế độ
│   └── ics_parser.js     # Bộ giải mã .ics thuần JS (RFC 5545)
├── ics/
│   ├── files.json        # Danh sách file .ics để web tự động nạp
│   ├── Y2C.ics           # File thời khóa biểu 1
│   └── TKB-QLDT20261.ics # File thời khóa biểu 2
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── apple-touch-icon.png
│   └── favicon.ico
└── README.md
```

---

## 🚀 CÁCH THÊM HOẶC ĐỔI FILE .ICS

Khi bạn có file `.ics` mới:
1. Copy file `.ics` đó vào thư mục `pwa/ics/` (ví dụ `my_tkb.ics`).
2. Mở file `pwa/ics/files.json` và thêm tên file vào:
   ```json
   [
     "my_tkb.ics",
     "Y2C.ics",
     "TKB-QLDT20261.ics"
   ]
   ```
3. Đẩy (push) lên GitHub. Web sẽ tự động xuất hiện file mới trong menu dropdown!

---

## 🌐 ĐƯA LÊN GITHUB PAGES MIỄN PHÍ

1. Tạo một repository mới trên [github.com](https://github.com) (chọn **Public**).
2. Đẩy toàn bộ các file trong thư mục `pwa/` này lên repository.
3. Vào **Settings** -> **Pages** -> Tại **Branch** chọn `main` / `/ (root)` -> Bấm **Save**.
4. Link web sẽ có dạng: `https://<ten-user>.github.io/<ten-repo>/`

---

## 📲 CÀI LÊN ĐIỆN THOẠI

- **iPhone (Safari)**: Mở link -> Bấm nút **Chia sẻ** -> **Thêm vào MH chính**.
- **Android (Chrome)**: Mở link -> Bấm menu 3 chấm -> **Cài đặt ứng dụng** (hoặc Thêm vào màn hình chính).
