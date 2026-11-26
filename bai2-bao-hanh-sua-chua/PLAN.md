# Bài 2 — Website Quản lý Bảo hành & Sửa chữa Thiết bị Điện tử — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` + `ponytail` for backend implementation, and `impeccable` + `emil-design-eng` + `web-design-guidelines` for frontend UI work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng hoàn chỉnh ứng dụng fullstack quản lý bảo hành và sửa chữa thiết bị điện tử (khách hàng, thiết bị, kỹ thuật viên, phiếu sửa chữa theo 5 trạng thái và lịch sử sửa chữa từng thiết bị) bám sát 100% đặc tả `doc/BT_DATA.pdf` (trang 2–4).

**Architecture:** Tách 2 phần độc lập trong `bai2-bao-hanh-sua-chua/`: `backend/` chạy Node.js + Express + Mongoose trên cổng `5002` kết nối MongoDB `repair_center_db` (4 collections dùng `ObjectId` + `populate()`), và `frontend/` chạy ReactJS (Vite + React Router) trên cổng `5174` gọi REST API qua `src/services/api.js` (có chế độ fallback dữ liệu mẫu localStorage khi backend chưa bật để demo UI ngay).

**Tech Stack:** Node.js 24, Express 4/5, Mongoose 8, MongoDB (`repair_center_db`), React 19, Vite 6, React Router DOM 7, Lucide React.

**Spec:** [`../doc/BT_DATA.pdf`](../doc/BT_DATA.pdf) (trang 2–4) và [`README.md`](README.md).

## Global Constraints

- **Database name:** `repair_center_db` (MongoDB).
- **Exact 4 Collections:** `customers`, `devices`, `technicians`, `repairTickets`.
- **Mandatory relations:** Dùng `mongoose.Schema.Types.ObjectId` và `.populate()` khi trả dữ liệu liên kết (`device -> customer`, `repairTicket -> device -> customer`, `repairTicket -> technician`).
- **Exact 8 device fields:** Mã thiết bị (`deviceCode`), Tên thiết bị (`name`), Loại thiết bị (`deviceType`), Thương hiệu (`brand`), Model (`model`), Số serial (`serialNumber`), Tình trạng ban đầu (`initialCondition`), Khách hàng sở hữu (`customerId`).
- **Exact 5 repair ticket statuses:** `Mới tiếp nhận`, `Đang kiểm tra`, `Đang sửa chữa`, `Đã hoàn thành`, `Đã bàn giao`.
- **Exact 5+ ReactJS views/features:** Trang quản lý khách hàng, Trang quản lý thiết bị, Trang tiếp nhận thiết bị, Trang quản lý phiếu sửa chữa, Trang chi tiết phiếu sửa chữa, Form cập nhật trạng thái sửa chữa, Bộ lọc theo kỹ thuật viên và trạng thái.
- **Ports:** Backend `5002`, Frontend `5174`, có nút chuyển nhanh sang Bài 1 (`http://localhost:5173`).
- **Scope boundary:** Chỉ sửa trong `bai2-bao-hanh-sua-chua/`; không chạm `bai1-quan-ly-dat-ban/`; giữ `.agents/` và `skills-lock.json` ngoài git.

## Review Focus

1. **Xóa khách hàng đang có thiết bị:** `DELETE /api/customers/:id` phải kiểm tra `Device.exists({ customerId })` — nếu còn thiết bị liên kết, trả `409 Conflict` kèm số lượng thiết bị thay vì để lại thiết bị mồ côi (`customerId` null khi populate).
2. **Trùng mã thiết bị hoặc số serial:** `deviceCode` và `serialNumber` đánh `unique: true` ở MongoDB; middleware bắt lỗi `E11000` trả `409 Conflict` ghi rõ trường bị trùng thay vì `500 Internal Server Error`.
3. **Chi phí âm hoặc sai kiểu:** `estimatedCost` và `actualCost` bắt buộc là số `>= 0` (VND); không cho phép `NaN`, chuỗi chữ, hoặc giá trị âm khi tạo phiếu / cập nhật trạng thái.
4. **ObjectId sai định dạng & bản ghi không tồn tại:** Tham số `:id` không hợp lệ (`!mongoose.isValidObjectId(id)`) trả `400 Bad Request`; ID hợp lệ nhưng không tồn tại trả `404 Not Found`.
5. **Chuyển sang `Đã hoàn thành` / `Đã bàn giao` nhưng quên chi phí thực tế:** UI tự gợi ý điền `actualCost = estimatedCost` nếu đang trống/0 và nhắc người dùng xác nhận; backend lưu đầy đủ `statusHistory[]` mỗi khi đổi trạng thái để theo dõi tiến độ.

---

## Cấu trúc thư mục mục tiêu

```text
bai2-bao-hanh-sua-chua/
├── PLAN.md
├── README.md
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── server.js                  # Entry point, kết nối DB và listen :5002
│   │   ├── app.js                     # Express app, CORS, JSON parser, routes, error handler
│   │   ├── config/db.js               # mongoose.connect(MONGO_URI)
│   │   ├── constants/repair.js        # DEVICE_TYPES, TICKET_STATUSES enum dùng chung
│   │   ├── models/
│   │   │   ├── Customer.js            # collection: customers
│   │   │   ├── Device.js              # collection: devices (ref Customer)
│   │   │   ├── Technician.js          # collection: technicians
│   │   │   └── RepairTicket.js        # collection: repairTickets (ref Device, Technician)
│   │   ├── controllers/
│   │   │   ├── customerController.js
│   │   │   ├── deviceController.js
│   │   │   ├── technicianController.js
│   │   │   └── ticketController.js
│   │   ├── routes/
│   │   │   ├── customerRoutes.js
│   │   │   ├── deviceRoutes.js
│   │   │   ├── technicianRoutes.js
│   │   │   └── ticketRoutes.js
│   │   ├── middleware/
│   │   │   └── errorHandler.js        # Chuẩn hóa CastError, ValidationError, E11000
│   │   └── seed/
│   │       └── seedData.js            # Script tạo dữ liệu mẫu đầy đủ quan hệ
│   └── tests/
│       └── smoke.test.js              # Node built-in test runner kiểm tra API & Review Focus
└── frontend/
    ├── package.json
    ├── vite.config.js                 # port 5174, proxy /api -> http://localhost:5002
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                    # BrowserRouter + routes + ToastProvider
        ├── index.css                  # Design tokens (Operate mode), typography, transitions
        ├── constants/repair.js        # 5 trạng thái, loại thiết bị, formatVND, formatDate
        ├── data/mockData.js           # Dữ liệu mẫu thực tế (khách hàng, thiết bị, KTV, phiếu)
        ├── services/repairStore.js    # API client (/api/*) + auto fallback localStorage
        ├── components/
        │   ├── AppLayout.jsx          # Sidebar cố định + Topbar + nút chuyển Bài 1 (:5173)
        │   ├── StatusBadge.jsx        # Huy hiệu 5 trạng thái sửa chữa
        │   ├── Drawer.jsx             # Slide-over drawer (Escape, backdrop, focus)
        │   ├── Toast.jsx              # Thông báo thao tác (aria-live)
        │   ├── EmptyState.jsx         # Trạng thái rỗng có nút hành động
        │   └── DeviceHistoryDrawer.jsx # Xem lịch sử sửa chữa của từng thiết bị
        └── pages/
            ├── TicketsPage.jsx        # Trang quản lý phiếu sửa chữa + lọc KTV & trạng thái
            ├── TicketDetailPage.jsx   # Trang chi tiết phiếu + Form cập nhật trạng thái & chi phí
            ├── IntakePage.jsx         # Trang tiếp nhận thiết bị (+ tạo nhanh KH & phiếu sửa)
            ├── DevicesPage.jsx        # Trang quản lý thiết bị + lọc loại + sửa + lịch sử sửa chữa
            ├── CustomersPage.jsx      # Trang quản lý khách hàng (CRUD + tìm tên/SĐT)
            └── TechniciansPage.jsx    # Danh sách & tải công việc kỹ thuật viên
```

---

## Thiết kế Database MongoDB (`repair_center_db`)

### 1. `customers` (`Customer`)
| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | `ObjectId` | PK | Tự sinh |
| `fullName` | `String` | required, trim | Họ tên khách hàng |
| `phone` | `String` | required, trim, index | SĐT tìm kiếm nhanh |
| `email` | `String` | trim, default `""` | Email liên hệ |
| `address` | `String` | trim, default `""` | Địa chỉ |
| `note` | `String` | trim, default `""` | Ghi chú thêm |
| `createdAt`, `updatedAt` | `Date` | `timestamps: true` | Tự quản lý |

### 2. `devices` (`Device`)
| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | `ObjectId` | PK | Tự sinh |
| `deviceCode` | `String` | required, unique, trim | Mã thiết bị (`TB-2026-001`) |
| `name` | `String` | required, trim | Tên thiết bị |
| `deviceType` | `String` | required, enum | `Điện thoại` \| `Laptop` \| `Máy tính bàn` \| `Máy tính bảng` \| `Khác` |
| `brand` | `String` | required, trim | Thương hiệu (`Apple`, `Dell`, `Samsung`...) |
| `model` | `String` | required, trim | Model (`A3106`, `XPS 13 9340`...) |
| `serialNumber` | `String` | required, unique, trim | Số serial / IMEI |
| `initialCondition` | `String` | required, trim | Tình trạng ban đầu khi tiếp nhận |
| `customerId` | `ObjectId` | required, ref: `'Customer'`, index | Khách hàng sở hữu |
| `createdAt`, `updatedAt` | `Date` | `timestamps: true` | Ngày tiếp nhận |

### 3. `technicians` (`Technician`)
| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | `ObjectId` | PK | Tự sinh |
| `code` | `String` | required, unique, trim | Mã KTV (`KTV-01`) |
| `fullName` | `String` | required, trim | Họ tên kỹ thuật viên |
| `phone` | `String` | required, trim | SĐT nội bộ |
| `specialty` | `String` | trim, default `"Tổng hợp"` | Chuyên môn (`Điện thoại`, `Laptop & Mainboard`, `MacBook`...) |
| `active` | `Boolean` | default `true` | Đang làm việc |

### 4. `repairTickets` (`RepairTicket`, khai báo `{ collection: 'repairTickets' }`)
| Trường | Kiểu | Ràng buộc | Ghi chú |
|---|---|---|---|
| `_id` | `ObjectId` | PK | Tự sinh |
| `ticketCode` | `String` | required, unique, trim | Mã phiếu (`PSC-2026-001`) |
| `deviceId` | `ObjectId` | required, ref: `'Device'`, index | Thiết bị sửa chữa |
| `technicianId` | `ObjectId` | required, ref: `'Technician'`, index | Kỹ thuật viên phụ trách |
| `issueDescription` | `String` | required, trim | Lỗi thiết bị ghi nhận |
| `diagnosisNotes` | `String` | trim, default `""` | Chẩn đoán / kết quả xử lý |
| `estimatedCost` | `Number` | required, min `0`, default `0` | Chi phí dự kiến (VND) |
| `actualCost` | `Number` | min `0`, default `0` | Chi phí thực tế (VND) |
| `status` | `String` | required, enum, default `'Mới tiếp nhận'` | 1 trong 5 trạng thái quy định |
| `receivedAt` | `Date` | default `Date.now` | Ngày lập phiếu |
| `completedAt` | `Date` | default `null` | Tự set khi chuyển `Đã hoàn thành` |
| `deliveredAt` | `Date` | default `null` | Tự set khi chuyển `Đã bàn giao` |
| `statusHistory` | `Array<{ status, note, updatedAt }>` | default 1 mục đầu tiên | Nhật ký tiến độ xử lý |
| `createdAt`, `updatedAt` | `Date` | `timestamps: true` | Tự quản lý |

---

## Hợp đồng REST API (`http://localhost:5002/api`)

| Nhóm | Method & Endpoint | Query / Body | Populate & Kết quả |
|---|---|---|---|
| Health | `GET /api/health` | — | `{ ok: true, db: 'repair_center_db' }` |
| Customers | `GET /api/customers` | `?search=` (regex không phân biệt hoa thường theo `fullName` hoặc `phone`) | Danh sách KH + `deviceCount` |
| Customers | `GET /api/customers/:id` | — | Chi tiết KH + danh sách thiết bị của KH |
| Customers | `POST /api/customers` | `{ fullName, phone, email, address, note }` | `201` + customer |
| Customers | `PUT /api/customers/:id` | `{ fullName, phone, email, address, note }` | `200` + customer |
| Customers | `DELETE /api/customers/:id` | — | `409` nếu còn thiết bị; `200` nếu xóa thành công |
| Devices | `GET /api/devices` | `?deviceType=&search=&customerId=` | `.populate('customerId', 'fullName phone')` + `ticketCount` + trạng thái phiếu gần nhất |
| Devices | `GET /api/devices/:id` | — | Device `.populate('customerId')` |
| Devices | `GET /api/devices/:id/history` | — | Device `.populate('customerId')` + mảng `repairTickets` `.populate('technicianId')` sort `receivedAt: -1` |
| Devices | `POST /api/devices` | 8 trường thiết bị (+ optional `createTicket` hoặc frontend gọi tiếp `POST /api/tickets`) | `201` + device populated |
| Devices | `PUT /api/devices/:id` | Cập nhật thông tin thiết bị | `200` + device populated |
| Technicians | `GET /api/technicians` | `?active=true` | Danh sách KTV + số phiếu đang xử lý (`activeTicketCount`) |
| Technicians | `POST /api/technicians` | `{ code, fullName, phone, specialty }` | `201` + technician |
| Tickets | `GET /api/tickets` | `?technicianId=&status=&deviceId=&search=` | `.populate({ path: 'deviceId', populate: { path: 'customerId' } }).populate('technicianId')` sort `createdAt: -1` |
| Tickets | `GET /api/tickets/:id` | — | Ticket populated đầy đủ + `deviceHistory` (các phiếu khác cùng `deviceId`) |
| Tickets | `POST /api/tickets` | `{ ticketCode?, deviceId, technicianId, issueDescription, estimatedCost, diagnosisNotes? }` | `201` + ticket populated, khởi tạo `status: 'Mới tiếp nhận'` và `statusHistory[0]` |
| Tickets | `PATCH /api/tickets/:id/status` | `{ status, actualCost?, diagnosisNotes?, technicianId?, note? }` | Cập nhật trạng thái, chi phí thực tế, ghi thêm mục `statusHistory`, set `completedAt`/`deliveredAt` nếu khớp |
| Tickets | `PUT /api/tickets/:id` | Cập nhật toàn bộ thông tin phiếu | `200` + ticket populated |

---

## Kế hoạch triển khai theo từng Task

### Task 1: Khởi tạo Backend & Kết nối MongoDB (`repair_center_db`)

**Files:**
- Create: `bai2-bao-hanh-sua-chua/backend/package.json`
- Create: `bai2-bao-hanh-sua-chua/backend/.env.example`
- Create: `bai2-bao-hanh-sua-chua/backend/src/config/db.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/constants/repair.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/middleware/errorHandler.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/app.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/server.js`

**Interfaces:**
- Produces: `connectDB(uri: string) => Promise<void>`, `DEVICE_TYPES: readonly string[]`, `TICKET_STATUSES: readonly string[]`, `errorHandler(err, req, res, next)`, `createApp() => Express`.

- [ ] **Step 1:** Tạo `package.json` (`type: "module"`, deps: `express`, `mongoose`, `cors`, `dotenv`; scripts: `dev: "node --watch src/server.js"`, `start: "node src/server.js"`, `seed: "node src/seed/seedData.js"`, `test: "node --test tests/*.test.js"`).
- [ ] **Step 2:** Tạo `.env.example` với `PORT=5002`, `MONGO_URI=mongodb://127.0.0.1:27017/repair_center_db`, `CLIENT_ORIGIN=http://localhost:5174`.
- [ ] **Step 3:** Tạo `src/constants/repair.js` chứa đúng 5 trạng thái (`Mới tiếp nhận`, `Đang kiểm tra`, `Đang sửa chữa`, `Đã hoàn thành`, `Đã bàn giao`) và 5 loại thiết bị (`Điện thoại`, `Laptop`, `Máy tính bàn`, `Máy tính bảng`, `Khác`).
- [ ] **Step 4:** Tạo `src/middleware/errorHandler.js` map `CastError` -> `400`, `ValidationError` -> `400`, `err.code === 11000` -> `409` kèm tên field trùng.
- [ ] **Step 5:** Tạo `src/app.js` + `src/server.js` với `GET /api/health`.
- [ ] **Step 6:** Chạy `npm --prefix bai2-bao-hanh-sua-chua/backend install` và kiểm tra `GET http://localhost:5002/api/health` trả `200`.

### Task 2: Tạo 4 Mongoose Models & Script Seed dữ liệu mẫu

**Files:**
- Create: `bai2-bao-hanh-sua-chua/backend/src/models/Customer.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/models/Device.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/models/Technician.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/models/RepairTicket.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/seed/seedData.js`

**Interfaces:**
- Consumes: `DEVICE_TYPES`, `TICKET_STATUSES` from `src/constants/repair.js`.
- Produces: Mongoose models `Customer`, `Device`, `Technician`, `RepairTicket` (collection name `repairTickets`).

- [ ] **Step 1:** Implement 4 schema theo đúng bảng Thiết kế Database phía trên, có `ObjectId` ref rõ ràng (`customerId -> Customer`, `deviceId -> Device`, `technicianId -> Technician`).
- [ ] **Step 2:** Implement `src/seed/seedData.js` idempotent (chỉ seed hoặc hỗ trợ `--reset`) tạo 6 khách hàng, 4 kỹ thuật viên, 8 thiết bị và 10 phiếu sửa chữa trải đủ cả 5 trạng thái (trong đó ít nhất 2 thiết bị có từ 2 phiếu trở lên để demo rõ lịch sử sửa chữa).
- [ ] **Step 3:** Chạy `npm --prefix bai2-bao-hanh-sua-chua/backend run seed` và verify số document trong 4 collections `customers`, `devices`, `technicians`, `repairTickets`.

### Task 3: API Quản lý Khách hàng & Kỹ thuật viên

**Files:**
- Create: `bai2-bao-hanh-sua-chua/backend/src/controllers/customerController.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/routes/customerRoutes.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/controllers/technicianController.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/routes/technicianRoutes.js`
- Modify: `bai2-bao-hanh-sua-chua/backend/src/app.js`

**Interfaces:**
- Consumes: `Customer`, `Device`, `Technician`, `RepairTicket`.
- Produces: `/api/customers` (`GET`, `GET /:id`, `POST`, `PUT /:id`, `DELETE /:id`), `/api/technicians` (`GET`, `POST`).

- [ ] **Step 1:** Implement `GET /api/customers?search=` tìm kiếm regex không phân biệt hoa thường theo `fullName` hoặc `phone`, đính kèm `deviceCount`.
- [ ] **Step 2:** Implement `POST /api/customers`, `PUT /api/customers/:id`, và `DELETE /api/customers/:id` (kiểm tra `Device.countDocuments({ customerId: id })` -> nếu `> 0` trả `409 Conflict`).
- [ ] **Step 3:** Implement `GET /api/technicians` đính kèm `activeTicketCount` (phiếu khác `Đã bàn giao`) và `POST /api/technicians`.
- [ ] **Step 4:** Mount routes vào `app.js` và test CRUD + search + guard xóa khách hàng đang có thiết bị.

### Task 4: API Quản lý Thiết bị & Lịch sử Sửa chữa

**Files:**
- Create: `bai2-bao-hanh-sua-chua/backend/src/controllers/deviceController.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/routes/deviceRoutes.js`
- Modify: `bai2-bao-hanh-sua-chua/backend/src/app.js`

**Interfaces:**
- Consumes: `Device`, `Customer`, `RepairTicket`.
- Produces: `/api/devices` (`GET`, `GET /:id`, `GET /:id/history`, `POST`, `PUT /:id`).

- [ ] **Step 1:** Implement `GET /api/devices?deviceType=&search=&customerId=` dùng `.populate('customerId', 'fullName phone email')` và gắn tổng số phiếu sửa chữa của mỗi thiết bị.
- [ ] **Step 2:** Implement `POST /api/devices` (tự sinh `deviceCode` dạng `TB-YYYY-NNN` nếu client để trống, kiểm tra `Customer.exists({ _id: customerId })` trả `404` nếu khách không tồn tại, trả device đã populate).
- [ ] **Step 3:** Implement `PUT /api/devices/:id` và `GET /api/devices/:id/history` (trả `device` populated + `tickets` đã `.populate('technicianId', 'code fullName specialty')` sort `receivedAt: -1`).
- [ ] **Step 4:** Test tiếp nhận thiết bị, trùng serial trả `409`, lọc theo `deviceType`, và xem lịch sử sửa chữa.

### Task 5: API Quản lý Phiếu sửa chữa & Cập nhật Trạng thái

**Files:**
- Create: `bai2-bao-hanh-sua-chua/backend/src/controllers/ticketController.js`
- Create: `bai2-bao-hanh-sua-chua/backend/src/routes/ticketRoutes.js`
- Create: `bai2-bao-hanh-sua-chua/backend/tests/smoke.test.js`
- Modify: `bai2-bao-hanh-sua-chua/backend/src/app.js`

**Interfaces:**
- Consumes: `RepairTicket`, `Device`, `Technician`, `TICKET_STATUSES`.
- Produces: `/api/tickets` (`GET`, `GET /:id`, `POST`, `PUT /:id`, `PATCH /:id/status`).

- [ ] **Step 1:** Implement `GET /api/tickets?technicianId=&status=&deviceId=&search=` dùng nested populate `deviceId` (kèm `customerId`) và `technicianId`.
- [ ] **Step 2:** Implement `GET /api/tickets/:id` trả về ticket populated đầy đủ cùng `deviceHistory` (toàn bộ phiếu của `ticket.deviceId` để hiển thị lịch sử ngay trong trang chi tiết).
- [ ] **Step 3:** Implement `POST /api/tickets` validate `deviceId`, `technicianId`, `estimatedCost >= 0`, tự sinh `ticketCode` dạng `PSC-YYYY-NNN`, khởi tạo `status: 'Mới tiếp nhận'` và bản ghi `statusHistory` đầu tiên.
- [ ] **Step 4:** Implement `PATCH /api/tickets/:id/status` validate `status` thuộc 5 enum, `actualCost >= 0`, push vào `statusHistory`, cập nhật `completedAt`/`deliveredAt`, trả ticket populated.
- [ ] **Step 5:** Viết `tests/smoke.test.js` kiểm tra đủ 5 điểm trong **Review Focus** và chạy `npm --prefix bai2-bao-hanh-sua-chua/backend test`.

### Task 6: Khởi tạo Frontend ReactJS & Design System (`Operate` Mode)

**Files:**
- Create: `bai2-bao-hanh-sua-chua/frontend/package.json`
- Create: `bai2-bao-hanh-sua-chua/frontend/vite.config.js`
- Create: `bai2-bao-hanh-sua-chua/frontend/index.html`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/index.css`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/constants/repair.js`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/data/mockData.js`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/services/repairStore.js`

**Interfaces:**
- Produces: `repairStore` (`getCustomers`, `createCustomer`, `updateCustomer`, `deleteCustomer`, `getDevices`, `createDevice`, `updateDevice`, `getDeviceHistory`, `getTechnicians`, `createTechnician`, `getTickets`, `getTicketById`, `createTicket`, `updateTicketStatus`, `getMode`, `resetDemoData`).

- [x] **Step 1:** Tạo `package.json` (`react`, `react-dom`, `react-router-dom`, `lucide-react`, `vite`, `@vitejs/plugin-react`), cấu hình `vite.config.js` chạy cổng `5174` và proxy `/api` sang `http://localhost:5002`.
- [x] **Step 2:** Thiết lập `index.html` (font `Be Vietnam Pro` + `JetBrains Mono`) và `src/index.css` (palette sáng kiểu bàn kỹ thuật, token 5 trạng thái, custom easing, focus ring, tabular-nums, `prefers-reduced-motion`).
- [x] **Step 3:** Tạo `repairStore.js` hỗ trợ gọi REST API `/api/*` và tự động fallback sang dữ liệu mẫu thực tế trong `localStorage` khi backend `:5002` chưa chạy.

### Task 7: Xây dựng toàn bộ 5+ màn hình ReactJS & Thành phần dùng chung

**Files:**
- Create: `bai2-bao-hanh-sua-chua/frontend/src/components/AppLayout.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/components/StatusBadge.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/components/Drawer.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/components/Toast.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/components/EmptyState.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/components/DeviceHistoryDrawer.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/pages/TicketsPage.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/pages/TicketDetailPage.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/pages/IntakePage.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/pages/DevicesPage.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/pages/CustomersPage.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/pages/TechniciansPage.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/App.jsx`
- Create: `bai2-bao-hanh-sua-chua/frontend/src/main.jsx`

- [x] **Step 1:** Xây `AppLayout` với sidebar 5 mục (`Phiếu sửa chữa`, `Tiếp nhận thiết bị`, `Thiết bị`, `Khách hàng`, `Kỹ thuật viên`), nút chuyển nhanh `Bài 1 (:5173)`, hiển thị nguồn dữ liệu (`API :5002` / `Demo cục bộ`) và responsive mobile drawer.
- [x] **Step 2:** Xây `TicketsPage` (dải bộ đếm 5 trạng thái bấm lọc nhanh, bộ lọc theo kỹ thuật viên + trạng thái + tìm kiếm, bảng danh sách phiếu, drawer tạo phiếu sửa chữa mới).
- [x] **Step 3:** Xây `TicketDetailPage` (tiến trình 5 bước, thông tin thiết bị & khách hàng, bảng đối chiếu chi phí dự kiến vs thực tế, **Form cập nhật trạng thái sửa chữa + chi phí thực tế + ghi chú chẩn đoán**, nhật ký trạng thái và lịch sử các phiếu trước của cùng thiết bị).
- [x] **Step 4:** Xây `IntakePage` (tiếp nhận thiết bị đủ 8 trường, chọn khách có sẵn hoặc tạo nhanh khách hàng ngay trên form, tùy chọn mở luôn phiếu sửa chữa trong 1 lần bấm).
- [x] **Step 5:** Xây `DevicesPage` (danh sách thiết bị, lọc theo loại thiết bị, tìm kiếm theo mã/serial/tên/chủ sở hữu, cập nhật thiết bị, mở `DeviceHistoryDrawer` xem lịch sử sửa chữa từng thiết bị).
- [x] **Step 6:** Xây `CustomersPage` (CRUD khách hàng, tìm theo tên hoặc SĐT, chặn xóa khi khách còn thiết bị) và `TechniciansPage` (xem tải công việc và thêm kỹ thuật viên).

### Task 8: Kiểm thử tích hợp End-to-End & Audit UI

- [ ] **Step 1:** Chạy `npm --prefix bai2-bao-hanh-sua-chua/frontend run build` xác nhận không có lỗi JSX/CSS/import.
- [ ] **Step 2:** Chạy song song `npm run bai2:be` và `npm run bai2:fe`, xác nhận UI tự chuyển sang chế độ `API :5002` và mọi thao tác (Tiếp nhận thiết bị -> Tạo phiếu -> Lọc KTV/Trạng thái -> Cập nhật 5 trạng thái & chi phí thực tế -> Xem lịch sử thiết bị -> CRUD khách hàng) lưu bền vững vào MongoDB `repair_center_db`.
- [ ] **Step 3:** Kiểm tra responsive desktop (`1280px`) & mobile (`390px`), điều hướng bàn phím (Tab/Escape), tương phản chữ và thông báo lỗi validation.

