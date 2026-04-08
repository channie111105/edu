# Business Logic Audit

Tài liệu này mô tả logic nghiệp vụ đang chạy thực tế trong codebase hiện tại.

Phạm vi:
- Chỉ ghi nhận logic đang tồn tại trong code.
- Tách rõ phần nào là logic thật, phần nào chỉ là UI/mock.
- Ưu tiên luồng MKT/Lead/Sales trước, sau đó nối sang Quotation/SO, Finance, Enrollment, Training, Study Abroad.

Nguồn chính:
- `utils/storage.ts`
- `utils/leadStatus.ts`
- `utils/phone.ts`
- `utils/slaUtils.ts`
- `utils/leadSla.ts`
- `utils/leadLogs.ts`
- `pages/Leads.tsx`
- `pages/MyLeads.tsx`
- `pages/LeadDetails.tsx`
- `pages/SalesLeadQuickProcess.tsx`
- `components/UnifiedLeadDrawer.tsx`
- `services/financeFlow.service.ts`
- `services/enrollmentFlow.service.ts`
- `services/refundFlow.service.ts`
- `services/studyAbroadCases.local.ts`
- `pages/TrainingClassList.tsx`
- `pages/SalesMeetings.tsx`

## 1. Tổng quan hệ thống

### 1.1. Kiến trúc dữ liệu hiện tại
- Hệ thống đang chạy theo mô hình frontend-local-first.
- Dữ liệu chính được lưu vào `localStorage`, không thấy backend thật cho các luồng cốt lõi.
- Event bus nội bộ dùng `window.dispatchEvent(...)` để đồng bộ UI sau khi ghi dữ liệu.

### 1.2. Các storage key chính
- `educrm_leads_v2`
- `educrm_deals`
- `educrm_contacts`
- `educrm_contracts_cleaned`
- `educrm_quotations`
- `educrm_transactions`
- `educrm_students`
- `educrm_student_claims`
- `educrm_admissions`
- `educrm_class_students`
- `educrm_student_scores`
- `educrm_training_classes`
- `educrm_class_sessions`
- `educrm_attendance`
- `educrm_study_notes`
- `educrm_teachers`
- `educrm_log_notes`
- `educrm_meetings`
- `educrm_actual_transactions`
- `educrm_actual_transaction_logs`
- `educrm_refunds`
- `educrm_refund_logs`
- `educrm_invoices`
- `educrm_collaborators`
- `educrm_tags`
- `educrm_lost_reasons`
- `educrm_sales_kpis`
- `educrm_sales_teams`
- `educrm_lead_distribution_config`

### 1.3. Seed và migration
- `initializeData()` dùng version `v15`.
- Khi version lệch, hệ thống reset nhiều cụm dữ liệu về seed mặc định.
- Sau seed, hệ thống luôn cố giữ 3 case demo:
- Lead demo bị thu hồi.
- Lead demo chăm sóc hôm nay.
- Case demo kích hoạt từng lần thu.
- Migration đang chạy cho:
- text/mojibake
- enrollment data
- quotation-student links
- transaction consistency
- compact attachment
- class-student consistency
- training-class normalization

### 1.4. Auth và permission
- Login hiện là demo switch role.
- `hasPermission()` trả `true` cho mọi user đã đăng nhập.
- Kết luận:
- có route guard ở mức đã đăng nhập/chưa đăng nhập
- không có RBAC cứng thực sự cho hành động nghiệp vụ

### 1.5. Điểm thiết kế quan trọng
- `lead.status` đang bị dùng chung cho cả `LeadStatus` và `DealStage`.
- `ownerId` đang lưu không nhất quán:
- có chỗ là user id (`u1`, `u2`)
- có chỗ là user name (`Sarah Miller`)

## 2. Chuẩn hóa trạng thái lead

### 2.1. Bộ trạng thái chuẩn
- `new`
- `assigned`
- `picked`
- `contacted`
- `converted`
- `nurturing`
- `unverified`
- `lost`

### 2.2. Các giá trị được normalize
- `qualified`, `đạt chuẩn` => `converted`
- `won`, `contract`, `new opp`, `proposal`, `negotiation`, `document collection`, `after sale` => `converted`
- `disqualified`, `unreachable`, `không đạt`, `không xác thực` => `unverified`
- `mất`, `thất bại` => `lost`

### 2.3. Hệ quả
- Nhiều chỗ trên UI nhìn là lead status, nhưng thực chất đang chứa deal stage.
- Các bộ lọc và logic đóng/mở lead phụ thuộc mạnh vào normalize key hơn là raw value.

## 3. Module MKT / Lead

### 3.1. Nguồn logic thật
- `pages/Leads.tsx`
- `pages/MyLeads.tsx`
- `pages/LeadDetails.tsx`
- `pages/SalesLeadQuickProcess.tsx`
- `components/UnifiedLeadDrawer.tsx`
- `utils/storage.ts`
- `utils/phone.ts`
- `utils/leadLogs.ts`
- `utils/slaUtils.ts`
- `utils/leadSla.ts`

### 3.2. Validate SĐT
- Phone được normalize bằng cách bỏ toàn bộ ký tự không phải số.
- Rule hợp lệ:
- đúng 10 chữ số
- bắt đầu bằng `0`
- Regex thực tế là `^0\d{9}$`

### 3.3. Import Excel ở màn Leads

#### 3.3.1. Mapping cột
- `Họ và tên` => `name`
- `Số điện thoại` => `phone`
- `Email` => `email`
- `Quốc gia mục tiêu` => `targetCountry`
- `Cơ sở` => `company`
- `Nguồn` => `source`
- `Chiến dịch` => `campaign`
- `Ghi chú` => `notes`
- `Chương trình` => `program`

#### 3.3.2. Trường bắt buộc
- `name`
- `phone`
- `targetCountry`

#### 3.3.3. Rule validate khi import
- Nếu trường bắt buộc rỗng => lỗi.
- Email chỉ check có chứa `@`.
- Phone phải đúng format 10 số và bắt đầu bằng `0`.
- Row lỗi được ghi với số dòng thật trong Excel là `index + 2`.

#### 3.3.4. Data được tạo sau import
- `id = l-import-*`
- `phone` đã normalize
- `status = NEW`
- `ownerId = ''`
- `studentInfo.targetCountry = targetCountry`
- `marketingData.campaign = campaign từ file hoặc tên batch import`
- `marketingData.tags = tags chọn ở modal + tag row nếu có`
- `score = 10`
- `slaStatus = normal`
- `createdAt`, `lastActivityDate`, `lastInteraction` = thời điểm import

#### 3.3.5. Điều hệ thống chưa làm
- Không tự phân bổ lead sau import.
- Không merge trùng khi import.
- Không auto gắn owner.

### 3.4. Tạo lead thủ công ở màn Leads

#### 3.4.1. Rule validate chính
- Bắt buộc có tên.
- Bắt buộc có SĐT.
- SĐT phải đúng format.
- Bắt buộc có `targetCountry`.
- Nếu status là closed (`lost` hoặc `unverified`) thì bắt buộc có lý do.
- Nếu chọn `Lý do khác` thì bắt buộc nhập text cụ thể.

#### 3.4.2. Data được ghi
- `ownerId = salesperson`
- `company = campus resolve từ form`
- `targetCountry`
- `educationLevel`, `dob`, `identityCard`, `address`, `city`, `district`, `ward`
- guardian fields nếu title imply guardian relation
- `studentInfo`
- `marketingData.tags`, `campaign`, `channel`, `market`, `region`
- `status` được convert qua `toLeadStatusValue(...)`
- `score = 10`
- `slaStatus = normal`

#### 3.4.3. Log và audit khi tạo
- Thêm activity log `Tạo lead`.
- Thêm audit log `lead_created`.

### 3.5. Edit lead
- Edit ở Leads và Drawer đều validate lại:
- tên
- phone
- targetCountry
- close reason nếu status đóng
- Mỗi lần save form chi tiết đều sinh audit log theo field thay đổi.
- Các field có diff được ghi audit khá kỹ:
- name
- phone
- email
- source
- ownerId
- status
- targetCountry
- educationLevel
- dob
- identityCard
- identityDate
- identityPlace
- address
- city
- district
- ward
- notes
- studentInfo.languageLevel
- studentInfo.financialStatus
- internalNotes.*
- marketingData.*
- referredBy
- lostReason

### 3.6. Lý do đóng lead

#### 3.6.1. Bộ lý do `unverified`
- `Sai số`
- `Trùng`
- `Không xác thực`
- `Rác / bot / test`
- `Ngoài phạm vi phục vụ`
- `Không đủ điều kiện tối thiểu đầu vào`
- `Lý do khác`

#### 3.6.2. Bộ lý do `lost`
- `Không đủ tài chính`
- `Không đủ điều kiện hồ sơ`
- `Khách từ chối`
- `Chọn đơn vị khác`
- `Hoãn vô thời hạn`
- `Không còn nhu cầu`
- `Lý do khác`

#### 3.6.3. Rule normalize lý do
- Các lý do cũ/alias sẽ bị map về label chuẩn nếu match token.
- Khi đổi status từ closed sang non-closed, state lý do đóng được clear.

### 3.7. Tag lead

#### 3.7.1. Tag cố định
- `Gọi lần 1`
- `Gọi lần 2`
- `Gọi lần 3`

#### 3.7.2. Alias normalize
- `goilan1`, `dagoilan1` => `Gọi lần 1`
- `goilan2`, `dagoilan2` => `Gọi lần 2`
- `goilan3`, `dagoilan3` => `Gọi lần 3`

#### 3.7.3. Tag hệ cũ bị loại khỏi catalog chuẩn
- `Zalo`
- `Hotline`
- `Facebook`
- `Tiềm năng`
- `Cần tư vấn`

### 3.8. Chống trùng lead

#### 3.8.1. Logic thật đang chạy
- Tại Leads, hệ thống chỉ group phát hiện lead trùng theo số điện thoại normalize.
- Chỉ xét những số điện thoại hợp lệ.
- Chỉ hiển thị những nhóm có hơn 1 lead.
- Lead `lost` bị loại khỏi group duplicate.
- Trong nhóm, lead được sort theo `createdAt` tăng dần.

#### 3.8.2. Logic chưa có
- Không có auto-merge lead thật.
- Không có rule persistence dedup cho lead.

#### 3.8.3. Màn mock
- `pages/DuplicateDetection.tsx` là mock data.
- `pages/AdminDedupRules.tsx` là mock config UI.

### 3.9. Chống trùng contact
- Đây là dedup thật.
- Khi `addContact`, hệ thống normalize phone.
- Nếu đã có contact cùng phone và số đó dài hơn 6 ký tự:
- merge vào contact cũ
- giữ `id` cũ
- gộp `dealIds`
- gộp `activities`
- update `updatedAt`
- Nếu không có thì tạo contact mới.

### 3.10. Phân bổ lead

#### 3.10.1. Trạng thái hiện tại
- Hệ thống hiện chỉ còn `manual`.
- `LeadDistributionMode = 'manual'`.
- `saveLeadDistributionConfig(...)` luôn force `mode = manual`.
- `AdminAutomationRules` cũng hiển thị rõ là auto distribution đã bị bỏ.

#### 3.10.2. Bulk assign ở Leads
- Người dùng nhập số lượng lead cho từng sales rep.
- Tổng số phân bổ phải đúng bằng số lead đã chọn.
- Hệ thống build mảng owner tuần tự theo số lượng đã nhập.
- Mỗi lead được set:
- `ownerId = rep.id`
- `status = ASSIGNED`
- thêm activity `Phân bổ Lead` hoặc `Chia lại Lead`
- thêm audit `lead_assigned` hoặc `lead_reassigned`

#### 3.10.3. Single assign ở Drawer
- Set:
- `status = ASSIGNED`
- `ownerId = targetUser.name`
- Đây là điểm không nhất quán với bulk assign ở Leads, nơi `ownerId` là `rep.id`.

#### 3.10.4. Bulk handover ở MyLeads
- Prompt nhập text người nhận.
- Set:
- `ownerId = text nhập`
- `status = ASSIGNED`
- clear reclaim tracking

#### 3.10.5. Notification khi phân bổ
- Nếu owner thay đổi sang non-empty owner thì tạo notification `lead_assigned`.
- Recipient được lấy trực tiếp từ `ownerId`.
- Nếu `ownerId` là tên thay vì user id thì notification logic sẽ không ổn định.

### 3.11. Pickup / gọi điện / nhật ký / chăm sóc

#### 3.11.1. Pickup
- Pickup set:
- `status = PICKED`
- `pickUpDate = now`
- clear reclaim tracking
- Tính SLA pickup:
- nếu nhận trong 15 phút từ `createdAt` => đạt
- quá 15 phút => vi phạm
- Ở `MyLeads`, sales rep pickup thì owner về `user.id`.
- Ở `UnifiedLeadDrawer`, pickup lại set owner về `user.name`.

#### 3.11.2. Gọi điện
- Nếu lead đang `NEW/ASSIGNED/PICKED`:
- auto chuyển `status = CONTACTED`
- update `lastInteraction`
- Nếu lead đang ở trạng thái khác:
- chỉ update `lastInteraction`
- Sau đó mở `tel:<phone>`.

#### 3.11.3. Ghi log tư vấn
- `addLog(...)` ở Drawer:
- chống duplicate nếu cùng `type + content` trong cùng 1 phút
- với note/message/activity/meeting đều update `lastInteraction`
- nếu lead còn `NEW/ASSIGNED/PICKED` thì auto đẩy sang `CONTACTED`
- log luôn đi kèm audit

#### 3.11.4. Scheduled activity
- Activity có thể được tạo với `status = scheduled` và `datetime`.
- Khi complete activity:
- activity cũ được mark `completed`
- thêm note `Kết quả hoạt động`
- sau đó auto mở prompt tạo lịch tiếp theo

### 3.12. SLA và reclaim

#### 3.12.1. Default SLA config
- `ackTimeMinutes = 15`
- `firstActionTimeMinutes = 120`
- `maxNeglectTimeHours = 72`

#### 3.12.2. Loại cảnh báo SLA
- `manual_sla`
- `not_acknowledged`
- `slow_interaction`
- `neglected_interaction`
- `overdue_appointment`

#### 3.12.3. Rule cụ thể
- Lead mới chưa nhận quá 15 phút => `not_acknowledged`
- Lead đã tạo/picked nhưng chưa có tương tác user thực sau deadline => `slow_interaction`
- Lead đã có tương tác nhưng bỏ quá 72 giờ chưa chăm lại => `neglected_interaction`
- Scheduled activity quá giờ => `overdue_appointment`
- Nếu `lead.slaStatus !== normal` thì ưu tiên cảnh báo `manual_sla`

#### 3.12.4. Deadline cho lead đã pick
- Nếu pick trong giờ hành chính 08:00-17:00:
- deadline = `pickUpDate + 120 phút`
- Nếu pick ngoài giờ:
- deadline = 09:00 sáng hôm sau

#### 3.12.5. Reclaim tracking
- Lead có các field:
- `reclaimedAt`
- `reclaimReason`
- `reclaimTriggerAt`
- `reclaimedFromOwnerId`
- Khi pickup hoặc assign lại, các field reclaim này bị clear.

### 3.13. Convert lead

#### 3.13.1. Rule convert cơ bản
- Tạo contact từ lead qua `convertLeadToContact(...)`.
- Contact giữ marketing data, notes, identity, guardian, education, source.
- Khi kéo activities sang contact/deal:
- bỏ activity type `activity`
- bỏ activity có `status = scheduled`

#### 3.13.2. Tạo deal khi convert
- Nếu `lead.status` đang là một `DealStage` hợp lệ thì deal stage lấy theo status hiện tại.
- Nếu không thì stage mặc định = `NEW_OPP`.
- `value` lấy từ:
- `lead.value`
- hoặc tổng `productItems.price * quantity`
- `ownerId` lấy từ `lead.ownerId` hoặc current user
- activities từ lead được map:
- `message` => `chat`
- `system` => `note`

#### 3.13.3. Bất nhất rất lớn giữa các màn
- `pages/Leads.tsx`: convert xong xóa lead.
- `pages/SalesLeadQuickProcess.tsx`: convert xong xóa lead.
- `pages/MyLeads.tsx`: convert xong giữ lead, set `CONVERTED`.
- `pages/LeadDetails.tsx`: convert xong giữ lead, set `CONVERTED`.
- `UnifiedLeadDrawer`: convert phụ thuộc callback từ màn cha.

#### 3.13.4. Kết luận
- Hệ thống chưa có một định nghĩa thống nhất cho câu hỏi:
- sau khi convert thì lead còn tồn tại hay không

## 4. Module Sales / Pipeline / Drawer / Quotation / Contract

### 4.1. Gate đổi trạng thái trong Drawer

#### 4.1.1. Từ lead sang `converted`
- Bắt buộc có:
- `dob`
- `educationLevel`
- Ít nhất 1 activity loại `note` hoặc `activity`

#### 4.1.2. Vào các stage nâng cao
- Các stage bị chặn nếu chưa có quotation line:
- `NEGOTIATION`
- `CONTRACT`
- `DOCUMENT_COLLECTION`
- `WON`

#### 4.1.3. Rule bổ sung cho du học/combo
- Nếu quotation line có text chứa `du học` thì bắt buộc lead có `targetCountry`.

#### 4.1.4. Rule discount
- Nếu stage là `CONTRACT` hoặc `WON`
- và tổng discount > 0
- thì bắt buộc có `discountReason`

#### 4.1.5. Rule `WON`
- quotation line phải có
- `calculatedTotal > 0`

### 4.2. Loss / disqualified
- `handleDisqualifiedAction()` set về `UNVERIFIED`.
- `handleLossAction()` bắt buộc chọn lý do.
- Nếu lý do là `Lý do khác` thì phải có `customLossReason`.
- Khi save loss:
- `status = LOST`
- `lostReason = finalReason`
- thêm activity log
- thêm audit log

### 4.3. Quotation popup trong Drawer

#### 4.3.1. Dữ liệu line item
- Mỗi line item lưu:
- `productId`
- `name`
- `quantity`
- `unitPrice`
- `discount`
- `total`
- `studentName`
- `studentDob`
- `targetMarket`
- `servicePackage`
- `programs`
- `classId`
- `className`
- `additionalInfo`

#### 4.3.2. Rule bắt buộc khi lưu line item
- `studentName`
- `targetMarket`
- `servicePackage`

#### 4.3.3. Filter theo thị trường và gói dịch vụ
- Service package chỉ hiện theo market đang chọn.
- Product chỉ hiện theo `market + servicePackage`.
- Program options lấy union từ catalog tương ứng.

#### 4.3.4. Filter lớp học
- Chỉ lấy class `ACTIVE`.
- Nếu market = `Đức` thì class phải match language Đức/German.
- Nếu market khác đang xử lý chủ yếu match Trung/Chinese.
- Nếu đã chọn programs thì class phải chứa token program trong code/name/level.

#### 4.3.5. Giá trị tiền
- `subtotal = tổng giá dòng trước discount adjustment`
- `line discount amount = subtotal - net total`
- `finalAmount = net total - discountAdjustment`
- `discount` trên quotation = discount dòng + discount adjustment

#### 4.3.6. Service type suy ra
- line đầu có `servicePackage = Du học` => `StudyAbroad`
- `Combo` => `Combo`
- `Đào tạo` => `Training`
- nếu không thì dùng giá trị trên form quotation

#### 4.3.7. Log quotation
- Mỗi lần upsert quotation đều thêm `IQuotationLogNote`.
- `logNotes` còn merge thêm lịch sử lead activities.

#### 4.3.8. Action khả dụng
- Lưu draft quotation
- Tạo quotation
- Confirm thành sale order ngay từ popup
- Hủy thao tác
- In

#### 4.3.9. Đồng bộ về lead
- Sau khi tạo quotation:
- `lead.productItems`
- `lead.discount`
- `lead.paymentRoadmap`
- được sync ngược từ popup state

### 4.4. Tạo hợp đồng
- `handleCreateContract()` bắt buộc có:
- `identityCard`
- `identityDate`
- `identityPlace`
- `address`
- `paymentRoadmap`
- Hợp đồng tạo ra có:
- `status = DRAFT`
- `dealId = lead.id`
- `customerName = lead.name`
- `totalValue = lead.value`
- Sau khi tạo:
- auto add Contract Manager vào followers nếu chưa có
- thêm log bàn giao
- thêm message notification nội bộ
- lưu `contractCode` lên lead

### 4.5. Pipeline
- Drag-drop pipeline hiện update trực tiếp `deal.stage`.
- `CONTRACT` và `DOCUMENT_COLLECTION` được bucket vào cột sau-sale ở UI.
- Drawer trong pipeline dùng model lead-like để edit đồng thời lead/contact/deal.
- Đồng bộ trạng thái lost từ deal sang lead đã bị tắt chủ động.

## 5. Module Meetings

### 5.1. Tạo meeting
- Tạo từ lead/detail/drawer sẽ ra meeting `DRAFT`.
- Có các field chính:
- `leadId`
- `leadName`
- `leadPhone`
- `salesPersonId`
- `datetime`
- `type`
- `status`

### 5.2. Confirm / cancel / result
- Chỉ `DRAFT` mới confirm được.
- `DRAFT` hoặc `CONFIRMED` có thể cancel.
- Submit result sẽ:
- set `status = SUBMITTED`
- lưu `result`
- lưu `feedback`
- ghi ngược 1 activity log vào lead với title `KẾT QUẢ TEST: <score>`

### 5.3. Teacher assignment
- Có check conflict giáo viên qua helper `hasTeacherConflict(...)`.
- Nếu conflict vẫn cảnh báo nhưng vẫn update assignment.

### 5.4. Notification
- Nếu meeting đã tới giờ và chưa `CANCELLED/SUBMITTED` thì tạo notification `meeting_due`.

## 6. Module Finance / SO / Transaction / Actual Money / Refund

### 6.1. Confirm sale
- `confirmSale(quotationId, userId)`:
- quotation phải tồn tại
- set `status = SALE_CONFIRMED`
- set `contractStatus = sale_confirmed`
- set `saleConfirmedAt`, `confirmDate`, `saleConfirmedBy`
- nếu quotation đã có `transactionStatus = CHO_DUYET/DA_DUYET` thì giữ, nếu không thì `NONE`

### 6.2. Duyệt transaction ở kế toán
- `approveTransaction(...)` chỉ chạy khi transaction đang `CHO_DUYET`.
- Sau khi duyệt:
- transaction => `DA_DUYET`
- tạo hoặc update `IActualTransaction`
- quotation.transactionStatus => `DA_DUYET`

### 6.3. Duyệt SO ở admin
- `approveTransactionByAdmin(...)` chỉ chạy khi transaction đang `DA_DUYET`.
- Nếu quotation chưa lock thì gọi `lockQuotationAfterAccounting(...)`.
- Sau đó transaction được ghi `adminApprovedAt`, `adminApprovedBy`.

### 6.4. Lock SO
- `lockQuotationAfterAccounting(...)` chỉ cho lock khi:
- quotation đang `SALE_CONFIRMED`
- quotation.transactionStatus = `DA_DUYET`
- Khi lock:
- tạo/đảm bảo student profile từ quotation
- set quotation `LOCKED`
- set `lockedAt`, `lockedBy`
- gắn `studentId`, `studentIds`
- giữ/điều chỉnh `contractStatus`
- upsert linked contract từ quotation

### 6.5. Unlock SO
- Chỉ unlock được từ `LOCKED`.
- Sau unlock:
- quotation về `SALE_CONFIRMED`
- transactionStatus giữ `DA_DUYET`
- `contractStatus = sale_confirmed`

### 6.6. Từ chối transaction
- `rejectTransaction(...)`:
- set transaction `TU_CHOI`
- clear các mốc approve
- xóa actual transaction liên quan
- quotation.transactionStatus => `TU_CHOI`

### 6.7. Yêu cầu hủy SO
- `requestQuotationCancelApproval(...)` chỉ cho gửi khi:
- quotation đang `SALE_CONFIRMED` hoặc `SALE_ORDER`
- quotation.transactionStatus chưa phải `DA_DUYET`
- chưa có request pending trước đó
- Sau khi gửi:
- `cancelRequestStatus = CHO_DUYET`

### 6.8. Duyệt hủy SO
- `approveQuotationCancelApproval(...)` chỉ cho duyệt khi request đang `CHO_DUYET`.
- Khi duyệt:
- reject các transaction pending (`CHO_DUYET`) của quotation đó
- quotation về `SENT`
- clear sale-confirm fields
- `contractStatus = quotation`
- `transactionStatus` được tính lại theo trạng thái thực

### 6.9. Actual transaction

#### 6.9.1. Cách suy luận nhóm nghiệp vụ
- Nếu note có `điều chỉnh`, `công nợ`, `bù trừ`, `hủy khoản thu` => `DIEU_CHINH`
- Nếu note có `chi`, `marketing`, `mkt`, `hoa hồng`, `commission`, `vận hành`, `công tác` => `CHI`
- Còn lại => `THU`

#### 6.9.2. Mapping sang actual money
- `THU` => actual transaction type `IN`, status `RECEIVED`
- `CHI` hoặc `DIEU_CHINH` => type `OUT`, status `PAID`

### 6.10. Refund

#### 6.10.1. Refund flow chuẩn
- `DRAFT`
- `CHO_DUYET`
- `KE_TOAN_XAC_NHAN`
- `DA_DUYET`
- `DA_THU_CHI`

#### 6.10.2. Normalize từ trạng thái cũ
- `NHAP` => `DRAFT`
- `SALE_XAC_NHAN` => `CHO_DUYET`
- `KE_TOAN_KIEM_TRA` => `KE_TOAN_XAC_NHAN`
- `CEO_DUYET` => `DA_DUYET`
- `DA_HOAN` => `DA_THU_CHI`

#### 6.10.3. Validate form refund
- `paidAmount > 0`
- `requestedAmount > 0`
- `requestedAmount <= paidAmount`
- `approvedAmount <= requestedAmount`
- `refundBasis` bắt buộc

#### 6.10.4. Sync sang Money Out
- Chỉ sync khi status là:
- `KE_TOAN_XAC_NHAN`
- `DA_DUYET`
- `DA_THU_CHI`
- Tạo actual transaction type `OUT`.
- Amount lấy theo:
- `approvedAmount` nếu có
- không thì `requestedAmount`

#### 6.10.5. Sync ngược từ actual transaction
- Nếu actual transaction xác nhận đã chi thì refund có thể bị mark `DA_THU_CHI`.

## 7. Module Students / Enrollment

### 7.1. Tạo student từ quotation
- Quotation có thể sinh 1 hoặc nhiều student draft.
- Ưu tiên match student cũ theo:
- cùng quotation + cùng line item
- nếu không có, cùng quotation + normalized name + dob
- Nếu student đã enrolled thì giữ class/campus.
- Nếu chưa thì mặc định:
- `status = ADMISSION`
- `enrollmentStatus = CHUA_GHI_DANH`

### 7.2. Tạo admission
- Bắt buộc có:
- `studentId`
- `classId`
- `campusId`
- Chặn nếu student đã có admission `CHO_DUYET`.
- Chỉ tạo admission từ quotation `LOCKED`.
- Nếu chưa truyền `quotationId`, hệ thống tự dò quotation `LOCKED` gắn với student.
- Trước khi tạo phải pass class eligibility.
- Sau khi tạo:
- admission `CHO_DUYET`
- student chuyển sang `ADMISSION`, `CHUA_GHI_DANH`
- thêm log ở student và quotation

### 7.3. Approve admission
- Chỉ approve được admission `CHO_DUYET`.
- Re-validate class eligibility.
- Sau khi approve:
- admission => `DA_DUYET`
- student => `ENROLLED`, `DA_GHI_DANH`
- quotation.contractStatus => `enrolled`
- add student vào class
- thêm class log
- thêm student log

### 7.4. Reject / cancel admission
- Chỉ xử lý được từ `CHO_DUYET`.
- Reject:
- admission => `TU_CHOI`
- ghi log student
- Cancel:
- admission => `TU_CHOI`
- reset student về `ADMISSION`, `CHUA_GHI_DANH`

## 8. Module Training

### 8.1. Eligibility học viên vào lớp
- Hệ thống rút token chương trình từ:
- quotation linked của student
- text `student.level`
- token lớp lấy từ `class.level` và `class.code`
- Nếu class không có token chương trình rõ ràng => pass.
- Nếu có token => student phải match ít nhất 1 token.

### 8.2. Tạo lớp
- Bắt buộc:
- mã lớp
- ngày bắt đầu
- ngày kết thúc
- end > start
- ít nhất 1 ngày học
- có time slot
- nếu promote học viên từ lớp cũ thì tất cả học viên được chọn phải pass eligibility

### 8.3. Seed buổi học
- Nếu class có đủ `studyDays + startDate + endDate`:
- hệ thống generate buổi theo các weekday khớp
- Nếu không:
- fallback tạo 5-10 buổi theo phân bổ khoảng thời gian

### 8.4. Gán giáo viên
- Nếu tạo lớp có `teacherId`:
- class được add vào `teacher.assignedClassIds`

### 8.5. Add student vào lớp
- Chặn nếu đã tồn tại cặp `classId + studentId`.
- Validate eligibility trước khi thêm.
- Khi thêm:
- tạo mặc định 2 debt term
- term 1 sau 7 ngày
- term 2 sau 30 ngày
- mỗi term 5.000.000
- tự tính `debtStatus`, `totalDebt`, `nearestDueDate`

### 8.6. Transfer lớp
- Lớp đích phải khác lớp nguồn.
- Học viên phải đang tồn tại ở lớp nguồn.
- Phải pass eligibility ở lớp đích.
- Debt summary được carry sang lớp mới.

### 8.7. Attendance
- Không cho sửa nếu class `DONE/CANCELED`.
- Không cho sửa nếu session date không phải hôm nay.
- Ghi attendance là auto-save từng ô.
- Nếu tất cả buổi đều mark `isHeld` và mọi học viên đều có attendance cho tất cả các buổi đã học:
- class auto chuyển sang `DONE`

### 8.8. Study note
- Note được upsert theo `classId + studentId + sessionId`.
- UI chặn lưu note rỗng.
- Nếu session không phải hôm nay thì coi là khóa chỉnh sửa.

### 8.9. Debt
- `markDebtTermPaid(...)` mark kỳ nợ là `PAID`.
- Sau đó hệ thống recompute:
- debtTerms
- totalDebt
- nearestDueDate
- debtStatus

### 8.10. Score
- Average = trung bình `assignment + midterm + final`, làm tròn 1 chữ số.
- Rank:
- `A` nếu `>= 8.5`
- `B` nếu `>= 7`
- `C` nếu `>= 5.5`
- `D` nếu thấp hơn

## 9. Module Study Abroad

### 9.1. Bản chất dữ liệu
- Không có bảng case du học riêng.
- Danh sách case được tổng hợp động từ:
- quotations
- leads
- students
- admissions
- invoices
- transactions

### 9.2. Điều kiện để xuất hiện thành case
- quotation phải ở trạng thái `LOCKED`
- quotation phải match dịch vụ du học/combo du học

### 9.3. Suy luận country / program / package
- Country suy từ token như:
- `duc`, `germany`, `ger` => `Đức`
- `uc`, `australia`, `aus` => `Úc`
- `canada`, `korea`, `japan`, `china`...
- Program suy từ token:
- `du_hoc_nghe`
- `dai_hoc`
- `thac_si`
- `he_tieng`
- `combo`
- Package cũng suy từ token context.

### 9.4. Suy luận stage case
- admission `DA_DUYET` => `Đã ghi danh`
- admission `CHO_DUYET` => `Chờ ghi danh`
- admission `TU_CHOI` => `Từ chối ghi danh`
- `contractStatus = enrolled` => `Đang học`
- `contractStatus = signed_contract` => `Đã ký hợp đồng`
- `contractStatus = sale_confirmed` => `Chờ khóa SO`
- còn lại => `Đang xử lý hồ sơ`

### 9.5. Invoice status
- Nếu transaction linked đã `DA_DUYET` => coi như `PAID`
- Nếu có invoice hoặc `needInvoice` => `HAS_INVOICE`
- Nếu không => `UNPAID`

### 9.6. Update case
- `updateStudyAbroadCase(...)` chỉ update được lên quotation `LOCKED`.
- Khi stage thay đổi:
- update `stageUpdatedAt`
- prepend 1 log note mô tả các trạng thái changed
- Đồng thời update vài field cơ bản của student linked.
- Bắn event refresh:
- `educrm_cases_updated`
- `educrm:study-abroad-cases-changed`

### 9.7. Update internal note và stage
- `updateStudyAbroadCaseInternalNote(...)` là logic thật.
- `updateStudyAbroadCaseStage(...)` là logic thật.
- Cả hai đều prepend log note.

## 10. Màn hình thật và màn hình mock

### 10.1. Logic thật
- Leads
- MyLeads
- LeadDetails
- SalesLeadQuickProcess
- UnifiedLeadDrawer
- Pipeline
- QuotationDetails
- FinanceTransactions
- FinanceRefunds
- Students / Enrollment flow
- TrainingClassList
- SalesMeetings
- StudyAbroadCase pages
- Collaborators

### 10.2. Mock hoặc bán mock
- `pages/DuplicateDetection.tsx`
- `pages/AdminDedupRules.tsx`
- `pages/Campaigns.tsx`
- `pages/CampaignDetails.tsx` chủ yếu là local UI riêng màn campaign, không phải flow lead trung tâm
- nhiều trang admin builder/config khác

## 11. Rủi ro và bất nhất lớn

### 11.1. Phân quyền chưa thật
- `hasPermission()` luôn `true`.
- Không thể tin hoàn toàn vào role gating hiện tại.

### 11.2. `ownerId` không nhất quán
- Có luồng lưu `u1/u2`.
- Có luồng lưu `Sarah Miller`.
- Ảnh hưởng:
- filter theo owner
- notification recipient
- thống kê
- đồng bộ liên phân hệ

### 11.3. Convert lead không thống nhất
- Có màn xóa lead.
- Có màn giữ lead.
- Có nguy cơ lệch dashboard, duplicate, pipeline reconciliation.

### 11.4. `lead.status` bị dùng lẫn lead stage và deal stage
- Làm cho nhiều màn phải normalize/if-else phức tạp.
- Đây là nguồn rủi ro logic lớn nhất ở tầng nghiệp vụ.

### 11.5. Dedup lead chưa thật
- Chỉ detect theo phone ở UI.
- Không có rule merge lead thực sự.
- Merge thật hiện nằm ở contact.

### 11.6. Admin automation cũ dễ gây hiểu nhầm
- UI còn dấu vết round robin / weighted.
- Nhưng thực tế hệ thống đã force manual-only.

## 12. Kết luận ngắn

Hệ thống hiện đang có xương sống nghiệp vụ thật ở các cụm sau:
- Lead lifecycle
- Assignment / pickup / call / SLA
- Convert sang contact + deal
- Quotation / sale confirm / transaction / lock SO
- Student / admission / class enrollment
- Training attendance / debt / scores
- Study abroad case synthesis

Những phần cần lưu ý nhất nếu tiếp tục phát triển:
- tách bạch `lead.status` và `deal.stage`
- chuẩn hóa `ownerId`
- thống nhất định nghĩa sau convert lead
- quyết định rõ dedup lead là detect-only hay merge thật
- nếu làm backend, phải port các rule trong tài liệu này trước rồi mới refactor UI
