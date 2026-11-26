# Hệ thống Quản lý Bảo hành và Sửa chữa Thiết bị Điện tử

Website quản lý tiếp nhận thiết bị, theo dõi tiến độ bảo hành/sửa chữa, chi phí và phân công kỹ thuật viên cho trung tâm sửa chữa điện thoại và máy tính.

Tài liệu đề bài gốc: [`doc/BT_DATA.pdf`](doc/BT_DATA.pdf) (Bài 2).

## Tổng quan

Trung tâm sửa chữa điện thoại và máy tính tiếp nhận nhiều thiết bị mỗi ngày. Hệ thống hỗ trợ nhân viên quản lý tập trung thông tin khách hàng, thiết bị tiếp nhận, phiếu sửa chữa, chi phí dự kiến/thực tế và lịch sử xử lý của từng thiết bị.

## Yêu cầu chức năng

### 1. Quản lý khách hàng
- Thêm khách hàng mới.
- Cập nhật thông tin khách hàng.
- Xóa khách hàng.
- Tìm kiếm khách hàng theo tên hoặc số điện thoại.

### 2. Quản lý thiết bị
- Tiếp nhận thiết bị mới.
- Cập nhật thông tin thiết bị.
- Xem danh sách thiết bị đã tiếp nhận.
- Lọc thiết bị theo loại thiết bị.
- Xem lịch sử sửa chữa của thiết bị.

Thông tin thiết bị bao gồm:
- Mã thiết bị
- Tên thiết bị
- Loại thiết bị
- Thương hiệu
- Model
- Số serial
- Tình trạng ban đầu
- Khách hàng sở hữu

### 3. Quản lý phiếu sửa chữa
- Tạo phiếu sửa chữa mới.
- Ghi nhận lỗi thiết bị.
- Phân công nhân viên kỹ thuật.
- Nhập chi phí dự kiến và ghi nhận chi phí thực tế.
- Xem lịch sử sửa chữa theo từng thiết bị.
- Cập nhật trạng thái sửa chữa theo luồng:
  1. Mới tiếp nhận
  2. Đang kiểm tra
  3. Đang sửa chữa
  4. Đã hoàn thành
  5. Đã bàn giao

## Thiết kế cơ sở dữ liệu (MongoDB)

Cơ sở dữ liệu sử dụng Mongoose với tham chiếu `ObjectId` và `populate()` giữa 4 collection:

| Collection | Vai trò |
|---|---|
| `customers` | Lưu thông tin khách hàng |
| `devices` | Lưu thông tin thiết bị, tham chiếu tới `customers` |
| `technicians` | Lưu thông tin nhân viên kỹ thuật |
| `repairTickets` | Lưu phiếu sửa chữa, tham chiếu tới `devices` và `technicians` |

Quan hệ dữ liệu:
- Một khách hàng có nhiều thiết bị (`1 - N`).
- Một thiết bị có nhiều phiếu sửa chữa theo thời gian (`1 - N`).
- Một kỹ thuật viên có thể xử lý nhiều phiếu sửa chữa (`1 - N`).

## Giao diện người dùng (ReactJS)

Các màn hình chính theo yêu cầu đề bài:
- Trang quản lý khách hàng
- Trang quản lý thiết bị
- Trang tiếp nhận thiết bị
- Trang quản lý phiếu sửa chữa
- Trang chi tiết phiếu sửa chữa
- Form cập nhật trạng thái sửa chữa
- Bộ lọc phiếu sửa chữa theo kỹ thuật viên và trạng thái

## Cấu trúc dự án

```text
BaiTapNhom/
├── doc/
│   └── BT_DATA.pdf      # Tài liệu đặc tả đề bài
├── .gitignore
└── README.md
```

## Môi trường phát triển

- Công nghệ dự kiến: Node.js, Express, MongoDB (Mongoose), ReactJS (Vite).
- Các tệp cấu hình agent/skills cục bộ (`.agents/`, `skills-lock.json`) được loại trừ trong `.gitignore` để giữ repository gọn và độc lập với môi trường từng thành viên.
