# EduCRM - Tổng Hợp Logic Hệ Thống

> Tài liệu ghi lại toàn bộ logic nghiệp vụ đang có trong codebase EduCRM.

---

## 1. AUTHENTICATION & LOGIN

### 1.1 Đăng nhập bằng Credentials
- **Điều kiện**: `usernameOrEmail` không rỗng VÀ `password` không rỗng
- **Logic tìm user**: Tìm trong `adminUsers` theo `username` hoặc `email` (case-insensitive)
- **Kiểm tra mật khẩu**: So sánh trực tiếp `password === found.password`
- **Kết quả thất bại**:
  - Username rỗng → "Vui lòng nhập tên đăng nhập"
  - Password rỗng → "Vui lòng nhập mật khẩu"
  - Không tìm thấy user → "Tài khoản không tồn tại"
  - Sai mật khẩu → "Mật khẩu không chính xác"
- **Lưu ý**: Logic khóa tài khoản (`accountStatus === 'locked'`) đã bị comment out (tắt)

### 1.2 Đăng nhập nhanh (Demo/Module Selection)
- Tìm `AdminUserRecord` có role phù hợp (ưu tiên user active)
- Nếu không tìm thấy → fallback về user mặc định

### 1.3 Auto-correct Roles sau Login
- Sau khi login thành công, hệ thống tự tính `derivedRoles` từ permission state
- Nếu user KHÔNG phải Admin/Founder → dùng `derivedRoles` (nếu có) thay cho `found.roles`
- Nếu user LÀ Admin/Founder → giữ nguyên roles gốc

### 1.4 Switch Workspace
- Chỉ thay đổi `user.role` hiển thị, giữ nguyên identity và permissions

---

## 2. LEAD MANAGEMENT

### 2.1 Lead Status Flow
```
Mới → Đã phân bổ → Đã nhận → Đang chăm sóc → Đã chuyển đổi
                                    ↓                    ↓
                              Nuôi dưỡng          (Tạo Deal)
                                    ↓
                        Không xác thực / Mất
```

### 2.2 Normalize Lead Status
- Hệ thống normalize mọi status string về 1 trong 8 key chuẩn: `new`, `assigned`, `picked`, `contacted`, `converted`, `nurturing`, `unverified`, `lost`
- Hỗ trợ nhiều alias tiếng Việt và tiếng Anh (VD: "Mới" = "new" = "leadmoi")
- Các DealStage (Won, Contract, New Opp, etc.) đều normalize về `converted`
- Status không nhận diện được → mặc định `new`

### 2.3 Closed Lead Status
- `lost` và `unverified` được coi là trạng thái đóng

### 2.4 Lead Tags
- 3 tag cố định luôn tồn tại: "Gọi lần 1", "Gọi lần 2", "Gọi lần 3"
- Tags legacy (Zalo, Hotline, Facebook, Tiềm năng, Cần tư vấn) bị loại khỏi catalog
- Tags được normalize qua mojibake decoder

### 2.5 Lead Assignment & Notification
- Khi `ownerId` thay đổi → tạo notification cho người nhận mới
- Notification có `dedupeKey` để tránh trùng lặp

### 2.6 Lead Distribution Config
- Mode: luôn là `manual`
- Method: `round_robin` hoặc `weighted`
- Lưu `roundRobinIndex` và `weightedIndex` để track vòng phân bổ

---

## 3. SLA (Service Level Agreement)

### 3.1 SLA Config
- `WARNING_THRESHOLD_MINUTES`: 5 phút
- `DANGER_THRESHOLD_MINUTES`: 30 phút

### 3.2 SLA Warning Types

| Type | Điều kiện | Severity |
|------|-----------|----------|
| `manual_sla` | Lead có `slaStatus` khác 'normal' | danger/warning/info |
| `not_acknowledged` | Lead status = NEW VÀ quá `ackTimeMinutes` (15p) | danger |
| `slow_interaction` | Lead đã nhận nhưng chưa có tương tác đầu tiên quá deadline | warning |
| `neglected_interaction` | Có tương tác nhưng bỏ quên > `maxNeglectTimeHours` (72h) | warning |
| `overdue_appointment` | Lịch hẹn đã quá giờ mà chưa hoàn thành | danger (>60p) / warning |

### 3.3 First Action Deadline (Picked Lead)
- Nếu nhận lead trong giờ hành chính (8h-17h): deadline = pickUpDate + `firstActionTimeMinutes` (120p)
- Nếu nhận ngoài giờ: deadline = 09:00 ngày hôm sau

### 3.4 Lead Reclaim
- Tracking fields: `reclaimedAt`, `reclaimReason`, `reclaimTriggerAt`, `reclaimedFromOwnerId`
- Reasons: `picked_no_action` | `slow_care`
- `clearLeadReclaimTracking()`: xóa tất cả tracking fields

---

## 4. LEAD CONVERSION (Lead → Contact + Deal)

### 4.1 Conversion Modes
- `merge_contact`: Gộp vào Contact cũ (trùng SĐT)
- `create_contact`: Tạo Contact mới
- `no_contact`: Tạo Deal mà không liên kết Contact

### 4.2 Conversion Actions
- `create_opportunity`: Tạo Deal mới
- `merge_existing_opportunity`: Gộp vào Deal đã có

### 4.3 Customer Actions
- `auto`: Tự động merge nếu trùng SĐT (phone > 6 digits)
- `link_existing_customer`: Liên kết Contact có sẵn
- `create_new_customer`: Tạo Contact mới (bỏ qua trùng)
- `no_customer_link`: Không tạo/liên kết Contact

### 4.4 Logic Merge Contact
- Normalize phone (loại bỏ ký tự không phải số)
- Tìm Contact có cùng normalized phone (>6 digits)
- Merge: giữ ID cũ, cập nhật fields có giá trị mới, merge arrays (dealIds, activities, tags)
- Notes: merge unique lines

### 4.5 Logic Tạo Deal
- Stage: nếu lead.status là DealStage hợp lệ → giữ nguyên, nếu không → `NEW_OPP`
- Value: `lead.value` hoặc tổng `productItems.price * quantity`
- Expected close: `lead.expectedClosingDate` hoặc +30 ngày
- Probability: `lead.probability` hoặc 20%

### 4.6 Batch Conversion Preview
- Group leads theo normalized phone
- Nếu phone > 6 digits VÀ có Contact trùng → merge tất cả
- Nếu phone > 6 digits VÀ không có Contact → tạo 1, merge phần còn lại
- Nếu phone ≤ 6 digits → mỗi lead tạo riêng

---

## 5. PIPELINE / DEAL

### 5.1 Pipeline Steps
```
New Opp → Tư vấn chuyên sâu → Gửi lộ trình & Báo giá → Thương thảo → Chốt thành công (Won) → Thất bại (Lost) → After sale
```

### 5.2 Existing Opportunity Options
- Chỉ hiện Deal chưa ở stage: Won, Lost, After Sale
- Sort theo `createdAt` giảm dần

---

## 6. QUOTATION (BÁO GIÁ)

### 6.1 Quotation Status Flow
```
New Quote → Quotation Sent → Sale Confirmed → Sale Order → Locked
```

### 6.2 Confirm Sale
- **Điều kiện**: Quotation tồn tại
- **Kết quả**: Status → `SALE_CONFIRMED`, `contractStatus` → `sale_confirmed`
- Giữ nguyên `transactionStatus` nếu đã có

### 6.3 Lock Quotation
- **Điều kiện**: Status = `SALE_CONFIRMED` hoặc `SALE_ORDER` VÀ `transactionStatus` = `DA_DUYET`
- **Kết quả**: Status → `LOCKED`, tạo Student profiles, link studentId/studentIds
- Tự động tạo Contract liên kết

### 6.4 Unlock Quotation
- **Điều kiện**: Status = `LOCKED`
- **Kết quả**: Status → `SALE_CONFIRMED`, xóa `lockedAt`/`lockedBy`

### 6.5 Cancel Request Flow
- **Gửi yêu cầu hủy**: Status phải là `SALE_CONFIRMED`/`SALE_ORDER` VÀ `transactionStatus` ≠ `DA_DUYET`
- **Duyệt hủy**: `cancelRequestStatus` phải = `CHO_DUYET` → Status về `SENT`, reject pending transactions

### 6.6 Delete Quotation
- **Điều kiện**: Status = `DRAFT` hoặc `SENT` (chưa confirm)
- Cascade delete: transactions + contracts liên quan

### 6.7 Contract Status Derivation
- `LOCKED` → `signed_contract`
- `SALE_CONFIRMED` / `SALE_ORDER` → `sale_confirmed`
- Còn lại → `quotation`

---

## 7. TRANSACTION (GIAO DỊCH DUYỆT THU)

### 7.1 Transaction Status Flow
```
DRAFT → CHO_DUYET → DA_DUYET → (Admin Lock SO)
                  ↘ TU_CHOI
```

### 7.2 Approve Transaction (Kế toán)
- **Điều kiện**: `status` = `CHO_DUYET` VÀ `userRole` phải có
- **Kết quả**: Status → `DA_DUYET`, tạo/cập nhật Actual Transaction (Thu Chi)
- Cập nhật Quotation: `transactionStatus` → `DA_DUYET`

### 7.3 Approve by Admin
- **Điều kiện**: `status` = `DA_DUYET` (kế toán đã xác nhận)
- **Kết quả**: Ghi `adminApprovedAt`/`adminApprovedBy`, tự động Lock Quotation nếu chưa Locked

### 7.4 Reject Transaction
- **Kết quả**: Status → `TU_CHOI`, xóa Actual Transaction liên quan
- Cập nhật Quotation: `transactionStatus` → `TU_CHOI`

### 7.5 Infer Business Group
- Dựa trên `businessGroupHint` hoặc phân tích text (note, studentName, customerId)
- Keywords "dieu chinh", "cong no", "bu tru" → `DIEU_CHINH`
- Keywords "chi", "marketing", "hoa hong", "commission" → `CHI`
- Mặc định → `THU`

---

## 8. ACTUAL TRANSACTIONS (THU CHI THỰC TẾ)

### 8.1 Tạo từ Transaction đã duyệt
- Type: `THU` nếu businessGroup = THU, ngược lại `OUT`
- Status: `RECEIVED` (thu) hoặc `PAID` (chi)
- Cash account: `Tiền mặt` nếu method = TIEN_MAT, ngược lại `STK ngân hàng`

### 8.2 Tạo từ Refund
- Luôn là type `OUT`
- Chỉ sync khi refund status ∈ [`KE_TOAN_XAC_NHAN`, `DA_DUYET`, `DA_THU_CHI`]
- Nếu refund status không đủ điều kiện → xóa actual transaction liên quan

---

## 9. REFUND (HOÀN TIỀN)

### 9.1 Refund Status Flow
```
DRAFT → CHO_DUYET → KE_TOAN_XAC_NHAN → DA_DUYET → DA_THU_CHI
                                                  ↘ TU_CHOI
                                                  ↘ HUY_YEU_CAU
```

### 9.2 Status Normalization
- Nhiều alias được normalize về 5 status chính + TU_CHOI + HUY_YEU_CAU
- VD: `NHAP` = `DRAFT`, `SALE_XAC_NHAN` = `CHO_DUYET`, `CEO_DUYET` = `DA_DUYET`

### 9.3 Sync Logic
- `canRefundSyncToMoneyOut`: chỉ khi status ∈ [`KE_TOAN_XAC_NHAN`, `DA_DUYET`, `DA_THU_CHI`]
- Amount: `approvedAmount` ?? `requestedAmount` (lấy giá trị ≥ 0)
- Cash account: dựa trên `paymentVoucherCode` (PC/TIEN MAT → Tiền mặt)

---

## 10. ENROLLMENT (GHI DANH)

### 10.1 Ensure Student Profile
- Từ Quotation → tạo Student records (1 hoặc nhiều từ lineItems)
- Link `studentId`/`studentIds` vào Quotation

### 10.2 Create Admission
- **Điều kiện bắt buộc**: studentId, classId, campusId
- **Validation**:
  - Student phải tồn tại
  - Không có admission `CHO_DUYET` đang pending
  - Quotation phải ở status `LOCKED`
  - Student phải eligible cho class (`validateStudentClassEligibility`)
- **Kết quả**: Tạo Admission status `CHO_DUYET`, cập nhật Student status → `ADMISSION`

### 10.3 Approve Admission
- **Điều kiện**: Admission status = `CHO_DUYET`, có đủ student/campus/class
- **Validation**: Tìm linked Quotation (LOCKED hoặc SALE_CONFIRMED), validate eligibility
- **Kết quả**:
  - Admission → `DA_DUYET`
  - Student → `ENROLLED`, `enrollmentStatus` = `DA_GHI_DANH`
  - Quotation → `contractStatus` = `enrolled`
  - Thêm student vào class, tạo log

### 10.4 Reject Admission
- **Điều kiện**: Status = `CHO_DUYET`
- **Kết quả**: Status → `TU_CHOI`

### 10.5 Cancel Admission
- **Điều kiện**: Status = `CHO_DUYET`
- **Kết quả**: Admission → `TU_CHOI`, Student → `ADMISSION` + `CHUA_GHI_DANH`

---

## 11. STUDENT MANAGEMENT

### 11.1 Student Status
```
Chưa ghi danh → Đã ghi danh → Bảo lưu / Thôi học / Hoàn thành
```

### 11.2 Student Claims
- Types: `KHONG_CO`, `CHUYEN_LOP`, `TAM_DUNG`, `BAO_LUU`, `HOC_LAI`, `KHAC`
- Status: `KHONG_CO`, `CHO_XU_LY`, `DA_XU_LY`, `TU_CHOI`, `DA_HUY`

### 11.3 Class Student
- Status: `ACTIVE`, `BAO_LUU`, `NGHI_HOC`
- Debt status: `DA_DONG`, `THIEU`, `QUA_HAN`

---

## 12. MEETING (LỊCH HẸN)

### 12.1 Meeting Status Flow
```
Draft → Confirmed → Submitted
     ↘ Cancelled
```

### 12.2 Meeting Types
- Online Interview
- Offline Test
- Consulting

### 12.3 Meeting Notification
- Khi meeting đến giờ (`datetime ≤ now`) VÀ status ≠ Cancelled/Submitted → tạo notification

---

## 13. NOTIFICATION SYSTEM

### 13.1 Types
- `lead_assigned`: Lead được phân bổ/phân bổ lại
- `meeting_due`: Lịch hẹn đến giờ

### 13.2 Deduplication
- Mỗi notification có `dedupeKey` unique
- Nếu đã tồn tại notification cùng `recipientUserId` + `dedupeKey` → không tạo mới

### 13.3 Storage
- Giới hạn 200 notifications
- Sort: unread trước, sau đó theo `createdAt` giảm dần

---

## 14. SYSTEM CONFIGURATION

### 14.1 Dynamic Catalogs
Hệ thống hỗ trợ 18 catalog có thể cấu hình:
- targetCountries, products, campuses, educationLevels
- leadSources, leadChannels, teams, leadPotentials
- provinces, cooperationModules, classrooms, interviewTypes
- documentDepartments, programTypes, programs, levels
- leadTags, lostReasons, leadStatuses

### 14.2 Catalog Normalization
- Loại bỏ duplicate (theo normalized token)
- Sort theo label (locale 'vi')
- Hỗ trợ `inactive` flag (soft delete)
- Hỗ trợ `parentId` (grouping)

### 14.3 Organization Config
- **Branches**: id, name, code, type (Trụ sở chính/Chi nhánh/Online/Đối tác), status
- **Teams**: id, name, code, type (Sale/Marketing/Hồ sơ/Kế toán/CSKH/Admin/Đào tạo), branchId

---

## 15. ROUTING & NAVIGATION

### 15.1 Protected Routes
- Nếu `!isAuthenticated` → redirect `/login`
- `/login` khi đã authenticated → redirect `/`

### 15.2 Lazy Loading
- Tất cả pages được lazy load qua `import.meta.glob`
- Cache component đã load
- Error boundary per route

---

## 16. DATA PERSISTENCE

### 16.1 Storage Strategy
- Toàn bộ data lưu trong `localStorage`
- Mỗi entity có key riêng (VD: `educrm_leads_v2`, `educrm_deals`)
- Event-driven sync qua `CustomEvent` (VD: `educrm:quotations-changed`)

### 16.2 Data Normalization
- Mojibake text decoder cho dữ liệu bị encode sai
- Text repair hardcoded cho một số records cụ thể
- Strip inline storage URLs từ proof files

---

## 17. SALES KPI

### 17.1 KPI Target Structure
- Per period + per owner
- Metrics: `targetRevenue`, `targetContracts`
- Upsert logic: match by `period` + `ownerId`

### 17.2 Sales Teams
- Mỗi team có: branch, productFocus, assignKeywords, members
- Members có: userId, name, role, branch

---

## 18. STUDY ABROAD

### 18.1 Case Status
- `UNPROCESSED` → `PROCESSING` → `DEPARTED`

### 18.2 Service Process Status
```
NEW → UNPROCESSED → PROCESSING → PROCESSED → DEPARTED
                                           ↘ WITHDRAWN / VISA_FAILED / REPROCESSING
```

### 18.3 Case Tracking Fields
- School interview, CMTC, program selection, translation, offer letter
- Embassy appointment, visa status, flight status

---

## 19. TRAINING MODULE

### 19.1 Class Status
- `DRAFT` → `ACTIVE` → `DONE` / `CANCELED`

### 19.2 Attendance
- Status: `PRESENT`, `ABSENT`, `LATE`
- Per session per student

### 19.3 Grading
- Scores: assignment, midterm, final, average
- Rank: A, B, C, D

### 19.4 Teacher Management
- Contract types: Full-time, Part-time, CTV
- Status: ACTIVE, INACTIVE
- Assigned classes tracking

---

## 20. INVOICE / RECEIPT

### 20.1 Invoice Status
- `DRAFT` → `ISSUED` → `SENT_TO_CUSTOMER` / `CANCELLED`

### 20.2 Document Types
- `PAYMENT_RECEIPT` (Phiếu thu)
- `PAYMENT_VOUCHER` (Phiếu chi)
