# CÂY PHÂN QUYỀN HỆ THỐNG EDUCRM & LEAD MANAGEMENT

## 1. Mục đích tài liệu

Tài liệu này tổng hợp `Permission Tree` nghiệp vụ của hệ thống EduCRM & Lead Management, được rút ra từ các màn hình, form và workflow hiện có trong hệ thống. Mục tiêu là:

- Trình bày cho khách hàng một cấu trúc phân quyền rõ ràng, dễ hiểu.
- Làm cơ sở để xây dựng ma trận `Vai trò x Quyền`.
- Làm tài liệu đối chiếu giữa nghiệp vụ và RBAC kỹ thuật khi đưa vào vận hành chính thức.

## 2. Nhóm vai trò tham chiếu

Nhóm vai trò hiện có trong hệ thống và các workflow liên quan bao gồm:

- `Admin / Founder`
- `Marketing`
- `Sales Rep`
- `Sales Leader`
- `Kế toán`
- `Đào tạo`
- `Giáo viên`
- `Du học`
- `Cộng tác viên (B2B)`

## 3. Cây phân quyền nghiệp vụ

| Phân hệ | Chức năng | Quyền hạn chi tiết | Mô tả nghiệp vụ |
|---|---|---|---|
| Marketing | Tiếp nhận Lead | Xem danh sách, xem chi tiết, tạo mới, chỉnh sửa, cập nhật nguồn lead, campaign, tag, mức độ quan tâm, trạng thái ban đầu | Ghi nhận lead từ các kênh đầu vào và chuẩn hóa dữ liệu trước khi đưa vào quy trình xử lý. |
| Marketing | Import Lead hàng loạt | Tải file mẫu, import Excel, xem kết quả import, xử lý lỗi dữ liệu | Hỗ trợ nạp lead số lượng lớn từ event, ads, đối tác và các nguồn offline. |
| Marketing | Quản lý chất lượng dữ liệu Lead | Cập nhật hồ sơ, ghi chú nội bộ, kiểm tra trùng, hợp nhất thông tin; **Chỉ Quản lý/Admin:** xóa lead, xóa hàng loạt, xử lý dedup toàn cục | Đảm bảo lead sạch dữ liệu, tránh trùng lặp và tăng khả năng bàn giao đúng người, đúng thời điểm. |
| Marketing | Phân bổ Lead | Phân bổ thủ công, gán owner, cập nhật mức ưu tiên, chia lại owner; **Chỉ Quản lý/Admin:** phân bổ hàng loạt, override người phụ trách, cấu hình rule phân bổ | Điều phối lead từ Marketing sang Sales theo khu vực, nhóm sản phẩm, năng lực xử lý và SLA. |
| Marketing | SLA và cảnh báo Lead | Xem lead quá hạn, cảnh báo chậm chăm sóc, danh sách ưu tiên; **Chỉ Quản lý/Admin:** cấu hình ngưỡng SLA, rule cảnh báo | Giám sát tốc độ phản hồi và nâng cao tỷ lệ tiếp cận thành công. |
| Marketing | Báo cáo Lead | Xem tổng hợp lead theo nguồn, owner, trạng thái; xuất Excel | Phục vụ vận hành và đánh giá hiệu quả kênh marketing. |
| Sales | Xử lý Lead cá nhân | Xem lead được giao, nhận lead, gọi điện, cập nhật kết quả liên hệ, đổi trạng thái lead, đánh dấu không liên hệ được, đánh dấu mất lead | Quản lý toàn bộ vòng đời lead ở cấp nhân viên kinh doanh. |
| Sales | Chăm sóc và lịch sử tương tác | Tạo log note, ghi chú nội bộ, tạo lịch hẹn, meeting, test, cập nhật next action, lịch sử chăm sóc | Lưu vết đầy đủ hoạt động chăm sóc để đối soát và tái khai thác lead. |
| Sales | Chuyển đổi Lead | Convert `Lead -> Contact -> Deal`, mở cơ hội kinh doanh, đồng bộ thông tin qua pipeline | Chuyển lead đạt điều kiện sang giai đoạn thương mại. |
| Sales | Pipeline / Cơ hội | Xem pipeline, cập nhật stage, xem chi tiết deal, theo dõi khả năng chốt | Quản lý cơ hội kinh doanh từ sau khi convert đến trước khi chốt sale. |
| Sales | Báo giá | Tạo mới, chỉnh sửa, lưu nháp, thêm học phí/phụ phí, cập nhật điều khoản, gửi email, in báo giá | Tạo đề xuất thương mại cho khách hàng trước khi xác nhận giao dịch. |
| Sales | Chốt sale / SO | Confirm sale, tạo SO/hợp đồng, xem preview, in hợp đồng, liên kết ghi danh; **Chỉ Quản lý/Admin:** duyệt giảm giá vượt chính sách, duyệt hủy SO | Chốt giao dịch và tạo đầy đủ hồ sơ để chuyển sang Tài chính và Đào tạo. |
| Sales | Log note sau bán | Thêm ghi chú sau chốt sale, cập nhật nhu cầu, lịch nhắc tái chăm sóc | Hỗ trợ tiếp tục chăm sóc và bán chéo sau khi khách đã giao dịch. |
| Finance | Phiếu đề nghị duyệt giao dịch | Tạo phiếu đề nghị thu/chi, đính kèm minh chứng, xem lịch sử xử lý | Bước kiểm soát trước khi ghi nhận giao dịch tài chính chính thức. |
| Finance | Duyệt giao dịch | Duyệt, từ chối, ghi lý do, hủy duyệt; **Chỉ Kế toán/Quản lý/Admin:** duyệt cấp kế toán; **Chỉ Admin/Founder:** duyệt cấp cuối / mở khóa ngoại lệ | Tách biệt đề nghị giao dịch và phê duyệt giao dịch nhằm giảm rủi ro tài chính. |
| Finance | Phiếu thu / Phiếu chi | Tạo mới, chỉnh sửa, liên kết SO/học viên, in chứng từ, gửi email, cập nhật trạng thái phát hành; **Chỉ Kế toán/Admin:** hủy chứng từ, phát hành chính thức | Quản lý chứng từ thu chi và giao tiếp chứng từ với khách hàng. |
| Finance | Thực thu / Thực chi | Xác nhận đã thu, đã chi, cập nhật phương thức thanh toán, tải lên biên lai/chứng từ, in/xuất dữ liệu | Ghi nhận dòng tiền thực tế sau khi giao dịch đã được phê duyệt. |
| Finance | Công nợ | Xem công nợ theo học viên/SO/kỳ thanh toán, lọc, nhóm, theo dõi đến hạn, quá hạn, xuất Excel | Phục vụ nhắc thu, đối soát và quản lý dư nợ học phí/dịch vụ. |
| Finance | Hoàn tiền | Tạo yêu cầu hoàn tiền, xem lịch sử xử lý, thêm log; `Sales` xác nhận, `Kế toán` thẩm định, **Admin/Founder duyệt cuối**, `Kế toán` xác nhận đã hoàn | Quy trình hoàn tiền nhiều cấp để kiểm soát rủi ro và tránh sai lệch chứng từ. |
| Finance | Đối soát / khóa sổ / tích hợp | Xem log gateway, theo dõi đối soát, cấu hình rule dịch vụ; **Chỉ Admin/Founder:** cấu hình hệ thống, khóa sổ, can thiệp ngoại lệ | Nhóm quyền quản trị tài chính cấp hệ thống. |
| Edu | Hồ sơ học viên | Xem chi tiết, cập nhật thông tin cơ bản, xem lịch sử học, lịch sử giao dịch liên quan, lịch sử claim | Quản lý toàn bộ vòng đời học viên sau khi được chốt sale và ghi danh. |
| Edu | Ghi danh | Tạo phiếu ghi danh từ SO hợp lệ, chọn cơ sở/lớp, thêm ghi chú, hủy ghi danh khi cần | Chuyển giao học viên từ Sales sang vận hành Đào tạo. |
| Edu | Duyệt ghi danh | Xem danh sách chờ duyệt, duyệt, từ chối, ghi lý do; **Chỉ Đào tạo/Quản lý/Admin:** phê duyệt chính thức | Kiểm soát năng lực tiếp nhận học viên vào lớp học. |
| Edu | Quản lý lớp học | Tạo lớp, cập nhật trạng thái lớp, gán giáo viên, thêm học viên vào lớp; **Chỉ Quản lý/Admin:** mở lớp, đóng lớp, điều chuyển lớp đặc biệt | Vận hành cấu trúc lớp và phân bổ nguồn lực đào tạo. |
| Edu | Học vụ lớp | Điểm danh, nhập điểm, ghi chú học tập, cập nhật tiến độ, lưu nhật ký lớp | Theo dõi chất lượng học tập và tình trạng tham gia của học viên. |
| Edu | Chuyển lớp / Tạm dừng / Bảo lưu / Nghỉ học | Tạo yêu cầu, cập nhật trạng thái học viên, ghi lý do; **Chỉ Quản lý Đào tạo/Admin:** duyệt chuyển lớp, duyệt tạm dừng, duyệt bảo lưu | Xử lý các thay đổi học vụ sau khi học viên đã nhập học. |
| Edu | Claim / khiếu nại học vụ | Tạo claim, xử lý claim, hủy claim; **Chỉ Quản lý/Admin:** phê duyệt các trường hợp nhạy cảm, ngoại lệ học vụ | Quản lý phản hồi, khiếu nại và yêu cầu điều chỉnh liên quan đến học vụ. |
| Edu | Giáo viên | Xem danh sách, tạo mới, chỉnh sửa, gán lớp, bỏ gán lớp, ghi chú nội bộ; **Chỉ Quản lý/Admin:** khóa/mở trạng thái giáo viên | Quản lý nguồn lực giảng dạy và tính sẵn sàng của giáo viên. |
| Quản trị hệ thống | Phân quyền và chính sách hệ thống | Xem ma trận quyền, cấu hình rule phân bổ, SLA, discount, audit log; **Chỉ Admin/Founder:** thay đổi chính sách hệ thống, override workflow | Đây là lớp quản trị tổng thể, quy định cách hệ thống vận hành theo role và theo quy trình. |

## 4. Các quyền nhạy cảm nên đánh dấu "Manager/Admin only"

Để trình bày với khách hàng rõ ràng, các quyền sau nên được đánh dấu là quyền nhạy cảm:

- `Phân bổ hàng loạt / chia lại owner hàng loạt`
- `Xóa lead / xóa dữ liệu hàng loạt`
- `Override rule phân bổ lead`
- `Duyệt giảm giá vượt chính sách`
- `Duyệt hủy SO / hợp đồng`
- `Duyệt giao dịch cấp cuối`
- `Hủy chứng từ tài chính`
- `Duyệt hoàn tiền`
- `Duyệt ghi danh`
- `Duyệt chuyển lớp / tạm dừng / bảo lưu`
- `Mở khóa / khóa quy trình ngoại lệ`
- `Thay đổi chính sách hệ thống, pricing, SLA, workflow`

## 5. Tóm tắt hiện trạng logic phân quyền

### 5.1. Điểm mạnh hiện có

- Hệ thống đã hình thành khá đầy đủ luồng nghiệp vụ từ `Lead -> Báo giá / SO -> Tài chính -> Ghi danh -> Lớp học / Học viên`.
- Nhiều quyền nghiệp vụ đã được thể hiện rõ trong UI và workflow, đặc biệt ở các điểm nhạy cảm như duyệt giao dịch, hoàn tiền, duyệt ghi danh và vận hành lớp học.
- Cấu trúc module đã phù hợp để chuyển thành ma trận `Vai trò x Quyền` khi cần chốt phạm vi triển khai.

### 5.2. Hiện trạng cần lưu ý

- Logic phân quyền hiện tại chủ yếu thể hiện theo `màn hình` và `workflow`, chưa hoàn toàn chuẩn hóa thành một lớp RBAC tập trung.
- Một số quyền đang ở mức `hàm ý nghiệp vụ` hoặc `gate cục bộ`, nghĩa là phù hợp để xây dựng tài liệu phân quyền, nhưng cần tiếp tục khóa quyền kỹ thuật ở cấp route, service và action.
- Một số màn phụ trợ hiện vẫn ở mức cấu hình, demo hoặc mô phỏng quy trình; khi chốt production cần xác định rõ màn nào là nghiệp vụ chính thức, màn nào chỉ phục vụ nội bộ.

### 5.3. Kiến nghị trình bày với khách hàng

- Sử dụng bảng trên như `Cây phân quyền nghiệp vụ cấp 1, 2, 3`.
- Bước tiếp theo nên lập thêm `Ma trận Vai trò x Quyền` theo từng nhóm người dùng.
- Nếu đưa vào triển khai thực tế, nên tách rõ 3 lớp kiểm soát:
  - `Quyền xem dữ liệu`
  - `Quyền thao tác / cập nhật`
  - `Quyền duyệt / hủy / override`

## 6. Kết luận

Tài liệu này có thể được dùng làm phiên bản trình client ở mức nghiệp vụ. Nếu cần chuẩn hóa thành tài liệu chính thức cho triển khai, bước tiếp theo là:

1. Chốt danh sách vai trò vận hành.
2. Lập ma trận `Vai trò x Chức năng x Hành động`.
3. Khóa quyền kỹ thuật đồng bộ tại UI, route, API/service và audit log.
