# Requirements Document

## Introduction

Tính năng "Lọc gói dịch vụ theo thị trường" xác định cách hệ thống EduCRM lọc và hiển thị các gói dịch vụ (Service Package) dựa trên thị trường mục tiêu được chọn trong quy trình tạo đơn hàng/báo giá. Gói dịch vụ lấy nội dung lộ trình đóng phí từ cấu hình Admin, và hệ thống sử dụng trường `country` trong cấu hình gói để đưa ra danh sách gói phù hợp với thị trường đã chọn.

## Glossary

- **Hệ_Thống_Đơn_Hàng**: Module tạo và quản lý đơn hàng/báo giá trong EduCRM (UnifiedLeadDrawer)
- **Trang_Quản_Trị_Tài_Chính**: Trang cấu hình gói dịch vụ dành cho Admin (AdminFinancialConfig)
- **Gói_Dịch_Vụ**: Đối tượng ServicePackage chứa thông tin tên, giá, quốc gia, chương trình, và lộ trình đóng phí
- **Thị_Trường_Mục_Tiêu**: Quốc gia đích mà khách hàng hướng tới (ví dụ: "Trung Quốc", "Đức")
- **Lộ_Trình_Đóng_Phí**: Cấu hình các đợt thanh toán (roadmap) gắn liền với mỗi gói dịch vụ, bao gồm tên đợt, phần trăm, và điều kiện
- **Danh_Mục_Mặc_Định**: Bảng ORDER_LINE_CATALOG hardcoded, dùng làm fallback khi không có gói Admin
- **Trạng_Thái_Áp_Dụng**: Trạng thái "Đang áp dụng" hoặc "active" cho biết gói dịch vụ đang được sử dụng

## Requirements

### Requirement 1: Cấu hình gói dịch vụ với lộ trình đóng phí

**User Story:** Là một Admin tài chính, tôi muốn cấu hình gói dịch vụ kèm lộ trình đóng phí, để nhân viên kinh doanh có thể sử dụng thông tin chính xác khi tạo báo giá.

#### Acceptance Criteria

1. THE Trang_Quản_Trị_Tài_Chính SHALL cho phép tạo Gói_Dịch_Vụ với các trường bắt buộc: tên (tối đa 150 ký tự, không được để trống), giá (số dương từ 1 đến 9.999.999.999), quốc gia, loại chương trình, và lộ trình đóng phí
2. THE Trang_Quản_Trị_Tài_Chính SHALL yêu cầu mỗi Gói_Dịch_Vụ có ít nhất 1 và tối đa 10 bước trong lộ trình đóng phí, mỗi bước gồm tên bước (không được để trống), phần trăm (số nguyên từ 1 đến 100), và điều kiện thanh toán (không được để trống)
3. THE Trang_Quản_Trị_Tài_Chính SHALL đảm bảo tổng phần trăm các bước trong lộ trình đóng phí bằng đúng 100%
4. IF Admin nhấn lưu Gói_Dịch_Vụ mà tổng phần trăm các bước khác 100% hoặc có trường bắt buộc để trống, THEN THE Trang_Quản_Trị_Tài_Chính SHALL hiển thị thông báo lỗi chỉ rõ trường không hợp lệ và không lưu gói
5. THE Trang_Quản_Trị_Tài_Chính SHALL lưu trữ Gói_Dịch_Vụ vào localStorage với key "educrm_admin_financial_course_packages_v1"
6. WHEN Admin cập nhật trạng thái Gói_Dịch_Vụ thành "Ngừng áp dụng", THE Trang_Quản_Trị_Tài_Chính SHALL giữ lại gói trong hệ thống nhưng ẩn khỏi danh sách chọn ở form đơn hàng

### Requirement 2: Lọc gói dịch vụ theo thị trường mục tiêu

**User Story:** Là một nhân viên kinh doanh, tôi muốn chỉ thấy các gói dịch vụ phù hợp với thị trường mục tiêu đã chọn, để tránh chọn nhầm gói không đúng quốc gia.

#### Acceptance Criteria

1. WHEN nhân viên chọn Thị_Trường_Mục_Tiêu trong form tạo đơn hàng, THE Hệ_Thống_Đơn_Hàng SHALL chỉ hiển thị các Gói_Dịch_Vụ có trường country khớp với Thị_Trường_Mục_Tiêu đã chọn
2. WHILE hiển thị danh sách Gói_Dịch_Vụ đã lọc theo Thị_Trường_Mục_Tiêu, THE Hệ_Thống_Đơn_Hàng SHALL chỉ bao gồm các gói có Trạng_Thái_Áp_Dụng là "Đang áp dụng" hoặc "active"
3. WHEN nhân viên thay đổi Thị_Trường_Mục_Tiêu, THE Hệ_Thống_Đơn_Hàng SHALL xóa giá trị gói dịch vụ đã chọn trước đó và reset các trường phụ thuộc về giá trị mặc định (servicePackage thành rỗng, productId thành undefined, productName thành rỗng, courseName thành rỗng, programs thành mảng rỗng, classId thành rỗng, unitPrice thành 0)
4. THE Hệ_Thống_Đơn_Hàng SHALL hiển thị danh sách gói dịch vụ không trùng lặp tên (loại bỏ các mục có cùng giá trị name, chỉ giữ lại một mục duy nhất cho mỗi tên)
5. IF chưa chọn Thị_Trường_Mục_Tiêu (giá trị rỗng), THEN THE Hệ_Thống_Đơn_Hàng SHALL hiển thị danh sách gói dịch vụ rỗng và không cho phép chọn gói dịch vụ
6. WHEN nhân viên chọn Thị_Trường_Mục_Tiêu, THE Hệ_Thống_Đơn_Hàng SHALL hiển thị danh sách gói dịch vụ đã lọc trong vòng 1 giây kể từ thời điểm chọn

### Requirement 3: Ưu tiên nguồn dữ liệu gói dịch vụ

**User Story:** Là một quản lý, tôi muốn hệ thống ưu tiên sử dụng gói dịch vụ do Admin cấu hình thay vì dữ liệu hardcoded, để đảm bảo thông tin luôn cập nhật theo chính sách mới.

#### Acceptance Criteria

1. WHEN có ít nhất một Gói_Dịch_Vụ với Trạng_Thái_Áp_Dụng "Đang áp dụng" hoặc "active" được cấu hình từ Trang_Quản_Trị_Tài_Chính cho thị trường đã chọn, THE Hệ_Thống_Đơn_Hàng SHALL chỉ hiển thị danh sách gói từ Admin và không truy vấn Danh_Mục_Mặc_Định
2. WHEN không có Gói_Dịch_Vụ nào với Trạng_Thái_Áp_Dụng "Đang áp dụng" hoặc "active" từ Admin cho thị trường đã chọn, THE Hệ_Thống_Đơn_Hàng SHALL sử dụng toàn bộ danh sách gói từ Danh_Mục_Mặc_Định (ORDER_LINE_CATALOG) khớp thị trường đó
3. THE Hệ_Thống_Đơn_Hàng SHALL không trộn lẫn dữ liệu từ Admin và Danh_Mục_Mặc_Định cho cùng một thị trường: tại mọi thời điểm, danh sách gói hiển thị cho một thị trường chỉ đến từ đúng một nguồn duy nhất
4. IF dữ liệu localStorage của Gói_Dịch_Vụ Admin không thể parse được (JSON không hợp lệ), THEN THE Hệ_Thống_Đơn_Hàng SHALL sử dụng danh sách gói mặc định nội bộ (DEFAULT_SERVICE_PACKAGES) thay vì hiển thị lỗi cho người dùng

### Requirement 4: Hiển thị lộ trình đóng phí từ gói dịch vụ

**User Story:** Là một nhân viên kinh doanh, tôi muốn xem lộ trình đóng phí tự động khi chọn gói dịch vụ, để tư vấn chính xác cho khách hàng về các đợt thanh toán.

#### Acceptance Criteria

1. WHEN nhân viên chọn một Gói_Dịch_Vụ từ Admin, THE Hệ_Thống_Đơn_Hàng SHALL hiển thị Lộ_Trình_Đóng_Phí được cấu hình trong gói đó dưới dạng bảng gồm các cột: "Đợt thu", "Điều kiện đóng", "Số tiền", với mỗi đợt hiển thị tên đợt (installmentLabel), điều kiện thanh toán (condition), và số tiền tính từ percent của đợt đó
2. WHEN nhân viên chọn một gói từ Danh_Mục_Mặc_Định, THE Hệ_Thống_Đơn_Hàng SHALL sử dụng hàm resolveServicePaymentPlan với tham số (market, servicePackage, totalAmount) để tính lộ trình đóng phí và hiển thị kết quả dưới cùng định dạng bảng như gói Admin
3. WHEN Hệ_Thống_Đơn_Hàng tính số tiền mỗi đợt, THE Hệ_Thống_Đơn_Hàng SHALL nhân tỷ lệ (ratio) của đợt đó với tổng giá trị đơn hàng đã làm tròn đến số nguyên (VNĐ), trong đó tổng giá trị đơn hàng được tính bằng đơn giá nhân (1 - phần trăm chiết khấu / 100)
4. THE Hệ_Thống_Đơn_Hàng SHALL đảm bảo tổng số tiền các đợt bằng đúng tổng giá trị đơn hàng bằng cách gán đợt cuối cùng nhận phần dư (totalAmount - tổng các đợt trước)
5. WHEN giá trị đơn hàng thay đổi (đơn giá hoặc phần trăm chiết khấu), THE Hệ_Thống_Đơn_Hàng SHALL tự động tính lại và cập nhật số tiền trong tất cả các đợt của lộ trình đóng phí mà không cần nhân viên thao tác thêm
6. IF nhân viên chưa chọn thị trường hoặc gói dịch vụ, hoặc không tìm thấy cấu hình lộ trình phù hợp, THEN THE Hệ_Thống_Đơn_Hàng SHALL hiển thị thông báo hướng dẫn "Chọn thị trường và gói dịch vụ để xem lộ trình đóng phí" thay vì bảng lộ trình
7. IF tổng giá trị đơn hàng bằng 0 hoặc âm, THEN THE Hệ_Thống_Đơn_Hàng SHALL hiển thị lộ trình đóng phí với số tiền mỗi đợt là 0

### Requirement 5: Tự động điền thông tin từ gói dịch vụ

**User Story:** Là một nhân viên kinh doanh, tôi muốn hệ thống tự động điền giá và chương trình khi chọn gói dịch vụ, để giảm thao tác nhập liệu thủ công và tránh sai sót.

#### Acceptance Criteria

1. WHEN nhân viên chọn một Gói_Dịch_Vụ từ Admin, THE Hệ_Thống_Đơn_Hàng SHALL tự động điền giá mặc định từ trường price của gói vào trường unitPrice, đồng thời gán productId bằng id của gói và productName bằng name của gói
2. WHEN nhân viên chọn một Gói_Dịch_Vụ từ Admin, THE Hệ_Thống_Đơn_Hàng SHALL tự động điền danh sách chương trình từ trường programs của gói vào trường programs của order line
3. WHEN nhân viên chọn một Gói_Dịch_Vụ từ Admin, THE Hệ_Thống_Đơn_Hàng SHALL xác định loại dịch vụ (serviceType) dựa trên trường type của gói: "Du học" thành "StudyAbroad", "Combo" thành "Combo", còn lại thành "Training"
4. WHEN nhân viên chọn gói từ Danh_Mục_Mặc_Định, THE Hệ_Thống_Đơn_Hàng SHALL tự động điền giá mặc định từ trường defaultPrice của catalog, gán productId từ catalog.id và productName từ catalog.product
5. WHEN nhân viên thay đổi gói dịch vụ (chọn gói khác), THE Hệ_Thống_Đơn_Hàng SHALL xóa các trường phụ thuộc (courseName, classId) và cập nhật lại giá, programs, serviceType theo gói mới

### Requirement 6: Xử lý trường hợp không có dữ liệu

**User Story:** Là một nhân viên kinh doanh, tôi muốn hệ thống xử lý mượt mà khi không có gói dịch vụ nào khả dụng, để tôi biết cần liên hệ Admin cấu hình thêm.

#### Acceptance Criteria

1. IF không có Gói_Dịch_Vụ nào có trạng thái "Đang áp dụng" từ Admin VÀ không có mục nào trong Danh_Mục_Mặc_Định cho thị trường đã chọn, THEN THE Hệ_Thống_Đơn_Hàng SHALL hiển thị dropdown gói dịch vụ với 0 mục chọn được (chỉ hiện placeholder "-- Chọn gói dịch vụ --")
2. IF nhân viên đã chọn thị trường và gói dịch vụ nhưng không tìm thấy lộ trình đóng phí tương ứng trong cấu hình Admin lẫn Danh_Mục_Mặc_Định, THEN THE Hệ_Thống_Đơn_Hàng SHALL hiển thị thông báo placeholder "Chọn thị trường và gói dịch vụ để xem lộ trình đóng phí" tại vùng lộ trình đóng phí thay vì bảng lộ trình
3. IF tất cả Gói_Dịch_Vụ từ Admin cho thị trường đã chọn đều có trạng thái "Ngừng áp dụng", THEN THE Hệ_Thống_Đơn_Hàng SHALL hiển thị danh sách gói dịch vụ từ Danh_Mục_Mặc_Định thay cho danh sách Admin
