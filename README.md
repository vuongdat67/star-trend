# 🌟 GitHub & HuggingFace Stars, Trending & AI Pulse Hub

Hệ thống quản lý kho tri thức mã nguồn mở cá nhân, theo dõi các dự án thịnh hành nhất thế giới trên **GitHub & Hugging Face** theo thời gian thực, và cập nhật bản tin nghiên cứu AI hàng ngày.

Giao diện được thiết kế theo phong cách tối giản chuẩn **`taste-skill` / Minimalist UI**, tích hợp bố cục 2 cột chuẩn **TiniX (`repo.tinix.ai`)** và thanh danh mục lọc động **Splunk-style Fields Sidebar**.

---

## ✨ Tính Năng Nổi Bật

### 1. 🐙 GitHub & 🤗 Hugging Face Dual Source
* Chuyển đổi linh hoạt giữa **GitHub Repositories** và **Hugging Face Trending Models / Datasets**.
* Tự động hiển thị huy hiệu trạng thái: `Top 1 Trending`, `🔥 Hottest Trend`, `✨ New Project`, `⭐ Star Magnet`, `⚖️ So sánh`.
* Biểu đồ **Sparkline Momentum** trực quan hóa đà tăng trưởng của dự án.

### 2. ⚡ Realtime Momentum Ticker (Băng Rôn Đầu Trang)
* Thanh băng rôn chạy ngang tự động cập nhật các dự án bùng nổ hôm nay kèm mức tăng sao (`🔥 #1 THU-MAIC/OpenMAIC (+907 stars today)` • `⚡ #2 scientific-agent-skills (+1.1k today)`...).
* Tự động tạm dừng khi rê chuột để người dùng tiện bấm vào xem.

### 3. 📂 Cột Phải Splunk-Style Fields Sidebar (Danh Mục & Chủ Đề Hot)
* **Danh mục (Domains)**: Tự động phân loại kèm số lượng repo thực tế (`AI, LLMs & Agents`, `Developer Tools & CLI`, `Security & Reverse Eng`, `Learning & Tutorials`, `Web & Fullstack`, `Systems & Low-level`...).
* **Chủ đề Hot (Topics Cloud)**: Đám mây hơn 420+ hashtag động từ dữ liệu thật, có nút **"+ Xem thêm topics"** để mở rộng/thu gọn.

### 4. 🤖 AI & Tech Pulse (Tin Tức AI Miễn Phí Không Cần API)
* Tự động tổng hợp các bài báo nghiên cứu hot nhất từ **Hugging Face Daily Papers** và tin tức / mô hình mới từ **Anthropic (Claude Code)**, **DeepSeek**, **OpenAI**, **MCP**.

### 5. 🌓 Hỗ Trợ Đầy Đủ Dark / Light Mode & Infinite Scroll
* Chuyển đổi Dark / Light mode mượt mà với 1 nút bấm (lưu tự động vào `localStorage`).
* Cuộn vô hạn (Infinite Scroll) mượt mà, loại bỏ việc bấm phân trang 1, 2, 3 thủ công.

---

## 🏗️ Cấu Trúc Mã Nguồn Module Hóa (Modular Architecture)

```
e:\repo\
├── .github/
│   └── workflows/
│       └── auto_sync.yml            # Workflow tự động đồng bộ hàng ngày trên GitHub Actions
├── .gitignore                       # File cấu hình Git chuẩn cho dự án Public
├── README.md                        # Tài liệu hướng dẫn sử dụng
├── run_app.bat                      # Phím tắt 1-click khởi chạy trên Windows
├── app.py                           # Server Entry Point tinh gọn
│
├── services/                        # Các module dịch vụ backend chuyên biệt
│   ├── __init__.py
│   ├── stars_service.py             # Quản lý 612+ repo đã star & ghi chú cá nhân
│   ├── github_trending_service.py   # Scraper GitHub Trending (3 tầng dự phòng chống lỗi)
│   ├── huggingface_service.py       # Scraper Hugging Face Trending Models & Datasets
│   ├── ai_pulse_service.py          # Cào tin tức AI & bài báo nghiên cứu miễn phí
│   ├── stats_service.py             # Tính toán phân cụm Splunk Fields & Thống kê
│   ├── export_service.py            # Xuất file Markdown (theo Ngôn ngữ, Topic, Timeline) & CSV
│   └── sync_all.py                  # Script đồng bộ tổng lực cho GitHub Actions
│
├── data/                            # Thư mục lưu trữ dữ liệu cache
│   ├── stars.json                   # Cache danh sách starred repos
│   ├── notes.json                   # Ghi chú & Bookmark cá nhân
│   ├── trending_github.json         # Cache GitHub Trending
│   ├── trending_hf.json             # Cache Hugging Face Trending
│   └── ai_pulse.json                # Cache tin tức AI
│
└── static/                          # Giao diện Web SPA
    ├── index.html                   # HTML5 layout chuẩn TiniX & Splunk Fields
    ├── css/
    │   └── style.css                # CSS Design System (Minimalist, Dark/Light Mode)
    └── js/
        ├── app.js                   # Client Coordinator quản lý state, search, filter
        └── charts.js                # Biểu đồ thống kê thích ứng Dark/Light theme
```

---

## 🚀 Hướng Dẫn Sử Dụng & Khởi Chạy

### 1. Khởi chạy Local trên máy (1-Click)
Double-click vào file:
```
run_app.bat
```
Hoặc mở terminal chạy:
```powershell
python app.py
```
Trình duyệt sẽ mở tại địa chỉ: **`http://localhost:5000`**.

### 2. Đưa lên GitHub Public & Kích Hoạt Auto Sync Hàng Ngày
Khi bạn sẵn sàng đưa dự án lên GitHub:

1. Khởi tạo Git và commit:
```bash
git init
git add .
git commit -m "feat: initial commit for GitHub Stars & Trending Hub"
git branch -M main
```

2. Tạo một repository mới trên tài khoản GitHub của bạn (ví dụ: `my-stars`) và push lên:
```bash
git remote add origin https://github.com/vuongdat67/my-stars.git
git push -u origin main
```

3. **Workflow GitHub Actions (`.github/workflows/auto_sync.yml`)** sẽ tự động kích hoạt mỗi ngày vào lúc 00:00 UTC để:
   * Tải các sao mới nhất từ tài khoản `@vuongdat67`.
   * Cào dữ liệu Trending và tin tức AI mới nhất.
   * Cập nhật lại toàn bộ file `github_stars.md`, `github_stars_by_topic.md`, `github_stars_timeline.md`, `github_stars.csv`.
   * Tự động commit & push thẳng lên repository của bạn hoàn toàn miễn phí.
