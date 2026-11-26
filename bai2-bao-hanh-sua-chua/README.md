# Bài 2: Website Quản lý Bảo hành và Sửa chữa Thiết bị Điện tử

Thuộc bộ bài tập nhóm môn Công nghệ Phần mềm Mới. Đặc tả gốc: [`../doc/BT_DATA.pdf`](../doc/BT_DATA.pdf) (trang 2-4).

## Yêu cầu chức năng

### A. Quản lý khách hàng
1. Thêm khách hàng.
2. Cập nhật thông tin khách hàng.
3. Xóa khách hàng.
4. Tìm kiếm theo tên hoặc số điện thoại.

### B. Quản lý thiết bị
1. Tiếp nhận thiết bị mới.
2. Cập nhật thông tin thiết bị.
3. Xem danh sách thiết bị đã tiếp nhận.
4. Lọc theo loại thiết bị.
5. Xem lịch sử sửa chữa.

Thông tin thiết bị gồm: mã thiết bị, tên thiết bị, loại thiết bị, thương hiệu, model, số serial, tình trạng ban đầu, khách hàng sở hữu.

### C. Quản lý phiếu sửa chữa
1. Tạo phiếu sửa chữa.
2. Ghi nhận lỗi thiết bị.
3. Chọn nhân viên kỹ thuật.
4. Nhập chi phí dự kiến và ghi nhận chi phí thực tế.
5. Cập nhật trạng thái sửa chữa:
   - Mới tiếp nhận
   - Đang kiểm tra
   - Đang sửa chữa
   - Đã hoàn thành
   - Đã bàn giao
6. Xem lịch sử sửa chữa của từng thiết bị.

## Cơ sở dữ liệu MongoDB

Database mặc định: `repair_center_db` (`ObjectId` + `populate()`).

- `customers`: thông tin khách hàng.
- `devices`: thông tin thiết bị, tham chiếu tới `customers`.
- `technicians`: thông tin nhân viên kỹ thuật.
- `repairTickets`: phiếu sửa chữa, tham chiếu tới `devices` và `technicians`.

Quan hệ:
- Một khách hàng có nhiều thiết bị.
- Một thiết bị có nhiều phiếu sửa chữa theo thời gian.
- Một kỹ thuật viên có thể xử lý nhiều phiếu sửa chữa.

## Giao diện ReactJS

- Trang quản lý khách hàng.
- Trang quản lý thiết bị.
- Trang tiếp nhận thiết bị.
- Trang quản lý phiếu sửa chữa.
- Trang chi tiết phiếu sửa chữa.
- Form cập nhật trạng thái sửa chữa.
- Bộ lọc theo kỹ thuật viên và trạng thái.

## Cấu hình cổng mặc định

- Backend: `http://localhost:5002`
- Frontend: `http://localhost:5174`
