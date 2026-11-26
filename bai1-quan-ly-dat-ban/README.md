# Bài 1: Website Quản lý Đặt bàn Nhà hàng

Thuộc bộ bài tập nhóm môn Công nghệ Phần mềm Mới. Đặc tả gốc: [`../doc/BT_DATA.pdf`](../doc/BT_DATA.pdf) (trang 1-2).

## Yêu cầu chức năng

### A. Quản lý bàn ăn
1. Thêm bàn ăn mới.
2. Chỉnh sửa thông tin bàn.
3. Xóa bàn.
4. Hiển thị danh sách bàn.
5. Phân loại bàn theo khu vực (Trong nhà, Ngoài trời, Phòng VIP).
6. Cập nhật trạng thái bàn: Trống, Đã đặt, Đang sử dụng, Đang dọn dẹp.

### B. Quản lý khách hàng
1. Thêm khách hàng.
2. Chỉnh sửa thông tin khách hàng.
3. Tìm kiếm khách hàng theo tên hoặc số điện thoại.
4. Xem lịch sử đặt bàn.

### C. Quản lý đặt bàn
1. Tạo phiếu đặt bàn (chọn khách hàng, ngày giờ đặt, số lượng người, bàn muốn đặt).
2. Cập nhật trạng thái đặt bàn.
3. Hủy phiếu đặt bàn.
4. Xem danh sách đặt bàn theo ngày.

## Cơ sở dữ liệu MongoDB

Database mặc định: `restaurant_db` (`ObjectId` + `populate()`).

- `tables`: thông tin bàn ăn, khu vực, sức chứa, trạng thái.
- `customers`: thông tin khách hàng.
- `reservations`: phiếu đặt bàn tham chiếu tới `customers` và `tables`.

Quan hệ:
- Một khách hàng có nhiều phiếu đặt bàn.
- Một bàn có thể xuất hiện trong nhiều phiếu đặt bàn ở các thời điểm khác nhau.
- Mỗi phiếu đặt bàn tham chiếu đến khách hàng và bàn ăn.

## Giao diện ReactJS

- Trang quản lý bàn ăn.
- Trang quản lý khách hàng.
- Trang tạo phiếu đặt bàn.
- Trang danh sách đặt bàn.
- Form thêm và chỉnh sửa dữ liệu.
- Tìm kiếm và lọc đặt bàn theo ngày, trạng thái.

## Cấu hình cổng mặc định

- Backend: `http://localhost:5001`
- Frontend: `http://localhost:5173`

