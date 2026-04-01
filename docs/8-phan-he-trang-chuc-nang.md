# 8 Phan He, Trang Va Chuc Nang Theo Code EduCRM

Tai lieu nay tong hop theo code hien tai cua project, chi gom:
- 8 phan he
- Cac trang thuoc tung phan he
- Cac chuc nang chinh tren moi trang

Khong bao gom phan chia vai tro hay ma tran quyen cho tung nhom nguoi dung.

## 1. Marketing & Lead

### Trang: `marketing`
- Xem dashboard marketing
- Xem tong quan hieu qua lead, chien dich va SLA

### Trang: `leads`
- Xem danh sach lead
- Tim kiem lead
- Loc lead
- Nhom du lieu, tuy chinh cot hien thi
- Tao lead moi
- Sua thong tin lead
- Xoa lead
- Xem nhanh lead
- Cap nhat trang thai lead
- Danh dau lead that bai
- Phan bo nhanh lead cho sale
- Xuat Excel
- Mo popup import lead
- Mo popup kiem tra lead trung

### Trang: `leads/import`
- Trang route import lead
- Thuc te chuc nang import dang duoc tich hop trong trang `leads`

### Trang: `leads/batches`
- Xem danh sach dot import lead
- Theo doi batch import

### Trang: `leads/:id`
- Xem chi tiet lead
- Xem thong tin khach hang, lich su, ghi chu, log
- Cap nhat thong tin lead
- Theo doi tien trinh xu ly

### Trang: `leads/:id/sla`
- Xem chi tiet SLA cua lead
- Theo doi canh bao qua han

### Trang: `campaigns`
- Xem danh sach chien dich
- Tim kiem, loc chien dich
- Xem so lieu tong quan chien dich

### Trang: `campaigns/:id`
- Xem chi tiet chien dich
- Xem thong tin, ket qua, lead lien quan

### Trang: `campaigns/:id/evaluation`
- Danh gia hieu qua chien dich
- Xem cac chi so ROI, conversion, chat luong lead

### Trang: `marketing/collaborators`
- Xem danh sach cong tac vien
- Quan ly thong tin cong tac vien

### Trang: `marketing/sla-leads`
- Xem danh sach lead theo SLA
- Loc lead can xu ly gap

## 2. Sales (Deals)

### Trang: `sales/my-leads`
- Xem danh sach lead duoc giao cho ca nhan
- Theo doi lead dang phu trach

### Trang: `sales/my-contacts`
- Xem danh sach contact ca nhan
- Theo doi thong tin lien he dang cham soc

### Trang: `pipeline`
- Xem pipeline kinh doanh
- Tim kiem co hoi
- Loc nang cao
- Nhom du lieu
- Tuy chinh cot hien thi
- Chon khoang thoi gian
- Xem deal theo giai doan
- Mo chi tiet deal

### Trang: `pipeline/:id`
- Xem chi tiet deal
- Goi dien
- Gui email
- Them ghi chu noi bo
- Dat lich hen
- Tao bao gia tu deal
- Chinh sua thong tin hop dong/dat coc
- Upload hop dong da ky
- Upload bill thanh toan
- Gui yeu cau ke toan xac nhan
- Chuyen giai doan deal
- Theo doi activity log

### Trang: `sales/meetings`
- Xem danh sach lich hen va test dau vao
- Tim kiem lich hen
- Tao lich hen
- Sua lich hen
- Xac nhan lich hen
- Nhap ket qua test/meeting
- Huy lich hen

### Trang: `sales/kpis`
- Xem dashboard KPI kinh doanh
- Loc theo thoi gian
- Loc theo co so
- Loc theo team
- Xuat bao cao
- Tao KPI ca nhan
- Luu KPI

## 3. Ghi Danh / Hop Dong

### Trang: `contracts/dashboard`
- Xem dashboard hop dong
- Xem tong quan doanh thu, SO, hop dong, ghi danh

### Trang: `contracts`
- Xem danh sach hoc vien ghi danh
- Tim kiem theo ma hoc vien, SO, chuong trinh, lop
- Loc nang cao
- Nhom du lieu
- Chuyen tab theo trang thai
- Ghi danh hoc vien
- Gan lop
- Duyet ghi danh
- Huy ghi danh
- Xem claim
- Tao claim
- Xu ly claim
- Mo chi tiet hoc vien

### Trang: `contracts/students/:id`
- Xem ho so hoc vien trong phan he ghi danh
- Sua ho so hoc vien
- Xem thong tin SO lien ket
- Ghi danh vao lop
- Chuyen lop
- Tam dung hoc
- Ket thuc lop
- Huy ghi danh
- Tao claim
- Xu ly claim
- Huy claim
- Xem lich su hoc tap, hoc vu va log

### Trang: `contracts/contracts-list`
- Xem danh sach hop dong
- Tim kiem hop dong
- Mo nhanh den SO lien ket
- Xem preview contract

### Trang: `contracts/quotations`
- Xem danh sach bao gia
- Tim kiem bao gia
- Chuyen che do hien thi
- Tao bao gia moi

### Trang: `contracts/quotations/:id`
- Xem chi tiet bao gia
- Tao bao gia moi hoac mo bao gia cu
- Sua thong tin bao gia
- Luu bao gia
- Gui email bao gia
- Xac nhan sale
- Huy bao gia
- Gui yeu cau huy
- Duyet huy
- In bao gia
- Tao phieu duyet thu
- Quan ly chi tiet don hang
- Quan ly thong tin khac
- Quan ly tab contract
- Quan ly thanh toan va cong no
- Chon mau contract
- Luu contract rieng
- Xem preview contract
- Them ghi chu/log kem file

### Trang: `contracts/quotations/:id/contract`
- Xem ban preview contract
- In/xuat noi dung contract

### Trang: `contracts/templates`
- Xem thu vien mau hop dong
- Quan ly template hop dong

### Trang: `contracts/approvals`
- Xem hang doi phe duyet hop dong
- Theo doi ho so cho duyet

### Trang: `students`
- Xem danh sach hoc vien sales view
- Tim kiem hoc vien
- Loc theo trang thai ghi danh
- Thao tac ghi danh nhanh

### Trang: `students/:id`
- Xem ho so hoc vien 360
- Xuat ho so
- Xem lich su
- Xem hoc vu
- Xem claim
- Xem deals
- Xem contracts
- Xem payments
- Tao claim
- Xu ly claim
- Huy claim

### Trang: `enrollment/students`
- Xem danh sach hoc vien cho ghi danh / da ghi danh
- Tim kiem theo ten, ma, so dien thoai
- Chuyen bo loc trang thai
- Tao admission ghi danh

## 4. Education / Training

### Trang: `training/schedule`
- Xem lich bieu dao tao
- Chuyen che do xem lich
- Dieu huong ngay/tuần
- Xem lich thuc te va lich du kien

### Trang: `training/classes`
- Xem danh sach lop
- Tim kiem lop
- Loc nang cao
- Loc theo thoi gian
- Nhom du lieu
- Tuy chinh cot hien thi
- Tao lop moi
- Xem chi tiet lop
- Them hoc vien vao lop
- Luu diem danh
- Luu ghi chu hoc tap
- Them lich su lop
- Theo doi cong no hoc vien trong lop

### Trang: `training/classes/:id/attendance`
- Xem diem danh theo lop
- Chuyen che do xem hom nay/lich su
- Danh dau co mat, di muon, vang
- Nhap ghi chu
- Luu diem danh
- Xuat du lieu

### Trang: `training/classes/:id/grades`
- Xem so diem va danh gia
- Xem bang diem tong hop
- Chuyen che do xem tong quan lop / ca nhan
- Xuat Excel

### Trang: `training/classes/:id/resources`
- Xem tai nguyen va tong quan lop
- Xem thong tin hoc vien, tien do, diem danh
- Xuat Excel diem danh
- Luu diem danh
- Them ghi chu nhan xet hoc vien

### Trang: `training/students/:id/app-progress`
- Xem tien do hoc tren app cua hoc vien
- Theo doi muc do hoan thanh bai hoc

### Trang: `training/teachers`
- Xem danh sach giao vien
- Loc theo trang thai
- Mo chi tiet giao vien
- Tao giao vien moi

### Trang: `training/teachers/:id`
- Xem chi tiet giao vien
- Xem thong tin phu trach va lich day

## 5. Study Abroad

### Trang: `study-abroad`
- Xem dashboard ho so du hoc
- Xem tong quan so luong ho so theo trang thai

### Trang: `study-abroad/cases`
- Xem danh sach ho so du hoc
- Tim kiem ho so
- Tuy chinh cot hien thi
- Them ho so moi
- Mo chi tiet ho so

### Trang: `study-abroad/cases/:id`
- Xem chi tiet ho so du hoc
- Sua thong tin ho so
- Luu ho so
- Cap nhat checklist, timeline, ghi chu
- Theo doi tien trinh ho so
- Chuyen trang thai xu ly

### Trang: `study-abroad/pipeline`
- Xem pipeline ho so du hoc
- Tim kiem ho so
- Loc pipeline
- Mo chi tiet ho so

### Trang: `study-abroad/partners`
- Xem co so du lieu doi tac truong
- Tim kiem doi tac
- Loc nang cao
- Loc theo thoi gian
- Nhom du lieu
- Them doi tac moi
- Xem thong tin chuong trinh cua doi tac

### Trang: `study-abroad/interviews`
- Xem lich phong van
- Tim kiem lich phong van
- Tao lich phong van
- Chinh sua lich phong van
- Huy lich phong van

## 6. Finance

### Trang: `finance/transactions`
- Xem danh sach phieu duyet giao dich
- Tim kiem giao dich
- Loc nang cao
- Loc theo thoi gian
- Nhom du lieu
- Tuy chinh cot hien thi
- Tao phieu duyet
- Duyet giao dich
- Tu choi giao dich
- Hoan duyet
- Xac nhan hoan tat

### Trang: `finance/money-out`
- Xem danh sach thu/chi
- Tim kiem giao dich thu/chi
- Loc va mo chi tiet giao dich
- In giao dich
- Export giao dich
- Theo doi workflow thu/chi
- Tao hoac cap nhat giao dich

### Trang: `finance/invoices`
- Xem danh sach phieu thu / phieu chi
- Tim kiem chung tu
- Loc theo trang thai
- Tao phieu moi
- In phieu
- Gui email phieu
- Cap nhat trang thai phieu
- Huy phieu
- Dinh kem/chinh sua thong tin chung tu

### Trang: `finance/debts`
- Xem danh sach cong no
- Tim kiem cong no
- Loc theo thoi gian
- Loc nang cao
- Nhom du lieu

### Trang: `refunds`
- Xem danh sach yeu cau hoan tien
- Tim kiem yeu cau
- Loc theo trang thai
- Tuy chinh cot hien thi
- Tao yeu cau hoan tien moi
- Xem log note

### Trang: `refunds/:id`
- Xem chi tiet hoan tien
- Theo doi workflow hoan tien
- Them log note
- Duyet hoan
- Chuyen buoc xu ly
- Cap nhat trang thai hoan tien

### Trang: `payment-plans/:id`
- Xem chi tiet ke hoach thanh toan
- Thu tien theo dot
- Mo yeu cau hoan tien
- Gui de nghi hoan tien

### Trang: `finance/transaction/new`
- Ghi nhan giao dich moi
- Nhap so tien, hinh thuc thanh toan
- Upload chung tu
- Luu giao dich

### Trang: `finance/rules`
- Xem cau hinh mapping dich vu
- Them quy tac mapping moi
- Xoa quy tac mapping

### Trang: `finance/gateway-logs`
- Xem nhat ky cong thanh toan
- Tim kiem theo ma giao dich
- Xem chi tiet log

### Trang: `finance/inventory`
- Quan ly kho va POS
- Tim kiem san pham
- Xem lich su nhap/xuat
- Them san pham
- Sua san pham
- Tao giao dich POS

### Trang: `finance/payroll`
- Xem tinh luong va hoa hong
- Dong bo du lieu diem danh

### Trang: `finance/closing`
- Xem ky ke toan
- Khoa so ky ke toan

### Trang: `finance/integration`
- Xem cac tuy chon tich hop ke toan
- Xuat file import Misa
- Xuat bao cao/noi bo

## 7. Library & Docs

### Trang: `library`
- Xem thu vien tai lieu
- Tim kiem van ban
- Loc theo phong ban
- Loc theo danh muc
- Xem danh sach tai lieu
- Xem chi tiet tai lieu
- Xem lich su version
- Tao tai lieu
- Upload tai lieu
- Theo doi trang thai nhap/duyet
- Xem tai lieu thay the/lien quan

## 8. System-Wide / Dieu Huong Chung

Phan he nay khong phai mot module nghiep vu rieng, nhung dang ton tai trong code va anh huong den truy cap he thong.

### Trang: `/`
- Xem trang tong quan chung

### Trang: `/login`
- Dang nhap he thong

### Trang: `/module-selection`
- Chon 1 trong 8 phan he de vao he thong

### Thanh phan layout / dieu huong
- Xem menu theo role
- Chuyen phan he
- Dang xuat
- Xem thong bao

## Ghi chu pham vi

- Danh sach tren duoc tong hop tu router trong [App.tsx](/d:/du%20an/educrm/App.tsx), menu trong [constants.ts](/d:/du%20an/educrm/constants.ts) va hanh vi tren cac page trong thu muc `pages/`.
- Mot so route co ton tai nhung chuc nang thuc te dang duoc nhung trong page khac, vi du import lead.
- Tai lieu nay uu tien muc dich lam bang phan quyen admin, nen mo ta theo muc thao tac nghiep vu thay vi chi tiet component.
