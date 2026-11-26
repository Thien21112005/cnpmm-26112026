# Bài tập nhóm - Công nghệ Phần mềm Mới (MongoDB & ReactJS)

Repository tổng hợp hai bài tập xây dựng ứng dụng web sử dụng Node.js, MongoDB và ReactJS, được tổ chức tách biệt theo từng module để thuận tiện phát triển song song và chuyển đổi qua lại khi chạy demo hoặc kiểm thử.

Tài liệu đặc tả đề bài: [`doc/BT_DATA.pdf`](doc/BT_DATA.pdf)

## Danh mục bài tập

| Mã bài | Đề tài | Thư mục | Database | Backend Port | Frontend Port | Trạng thái / Phụ trách |
|---|---|---|---|---|---|---|
| Bài 1 | Website quản lý đặt bàn nhà hàng | [`bai1-quan-ly-dat-ban/`](bai1-quan-ly-dat-ban/README.md) | `restaurant_db` | `5001` | `5173` | Thành viên phụ trách Bài 1 |
| Bài 2 | Website quản lý bảo hành và sửa chữa thiết bị điện tử | [`bai2-bao-hanh-sua-chua/`](bai2-bao-hanh-sua-chua/README.md) | `repair_center_db` | `5002` | `5174` | Phụ trách chính (Bài 2) |

---

## Tóm tắt yêu cầu từng bài

### Bài 1: Website quản lý đặt bàn nhà hàng
Chi tiết xem tại [`bai1-quan-ly-dat-ban/README.md`](bai1-quan-ly-dat-ban/README.md).
- **Chức năng chính:** Quản lý bàn ăn (khu vực trong nhà, ngoài trời, phòng VIP; trạng thái Trống / Đã đặt / Đang sử dụng / Đang dọn dẹp), quản lý khách hàng (tìm kiếm theo tên hoặc SĐT, xem lịch sử đặt bàn), quản lý phiếu đặt bàn (tạo phiếu, cập nhật trạng thái, hủy phiếu, lọc theo ngày).
- **MongoDB (`ObjectId` + `populate()`):** 3 collections `tables`, `customers`, `reservations`.
- **ReactJS:** Trang quản lý bàn ăn, trang quản lý khách hàng, trang tạo phiếu đặt bàn, trang danh sách đặt bàn, form thêm/sửa, tìm kiếm và lọc theo ngày và trạng thái.

### Bài 2: Website quản lý bảo hành và sửa chữa thiết bị điện tử
Chi tiết xem tại [`bai2-bao-hanh-sua-chua/README.md`](bai2-bao-hanh-sua-chua/README.md).
- **Chức năng chính:** Quản lý khách hàng (CRUD, tìm theo tên hoặc SĐT), quản lý thiết bị (tiếp nhận, cập nhật, lọc theo loại, lịch sử sửa chữa), quản lý phiếu sửa chữa (ghi lỗi, gán kỹ thuật viên, chi phí dự kiến và thực tế, 5 trạng thái xử lý: Mới tiếp nhận / Đang kiểm tra / Đang sửa chữa / Đã hoàn thành / Đã bàn giao).
- **MongoDB (`ObjectId` + `populate()`):** 4 collections `customers`, `devices`, `technicians`, `repairTickets`.
- **ReactJS:** Trang quản lý khách hàng, trang quản lý thiết bị, trang tiếp nhận thiết bị, trang quản lý phiếu sửa chữa, trang chi tiết phiếu sửa chữa, form cập nhật trạng thái, bộ lọc theo kỹ thuật viên và trạng thái.

---

## Cấu trúc thư mục

```text
BaiTapNhom/
├── doc/
│   └── BT_DATA.pdf                # Tài liệu đặc tả cả 2 bài tập
├── bai1-quan-ly-dat-ban/          # Module Bài 1
│   ├── backend/                   # Node.js + MongoDB API (port 5001)
│   ├── frontend/                  # ReactJS UI (port 5173)
│   └── README.md
├── bai2-bao-hanh-sua-chua/        # Module Bài 2
│   ├── backend/                   # Node.js + MongoDB API (port 5002)
│   ├── frontend/                  # ReactJS UI (port 5174)
│   └── README.md
├── package.json                   # Lệnh chạy và chuyển đổi nhanh giữa Bài 1 và Bài 2
├── .gitignore
└── README.md
```

## Cách chạy và chuyển đổi (swap) giữa 2 bài

Hai bài sử dụng database và cặp cổng độc lập, có thể chạy riêng từng bài hoặc chạy song song cả hai rồi chuyển qua lại trực tiếp trên trình duyệt:

```bash
# Cài đặt dependencies cho từng bài
npm run bai1:install
npm run bai2:install

# Chạy Bài 1 (Backend: 5001 | Frontend: http://localhost:5173)
npm run bai1:be
npm run bai1:fe

# Chạy Bài 2 (Backend: 5002 | Frontend: http://localhost:5174)
npm run bai2:be
npm run bai2:fe
```

Trên giao diện header của mỗi bài có thể đặt nút chuyển nhanh giữa hai ứng dụng (`http://localhost:5173` <-> `http://localhost:5174`) để thuận tiện trình bày và đối chiếu khi báo cáo.

## Quy ước làm việc nhóm

- Mỗi thành viên làm việc trong thư mục bài tương ứng (`bai1-quan-ly-dat-ban/` hoặc `bai2-bao-hanh-sua-chua/`) để hạn chế xung đột Git.
- Không commit `node_modules/`, `.env`, hoặc các thư mục cấu hình công cụ cục bộ (`.agents/`, `skills-lock.json` đã được loại trừ trong `.gitignore`).
