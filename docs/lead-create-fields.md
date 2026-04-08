# BANG TRUONG TAO LEAD (AS-IS THEO CODE)

## 1) Nguon tham chieu
- `pages/Leads.tsx`
- `utils/leadCreateForm.ts`
- `components/LeadStudentInfoTab.tsx`
- `components/LeadDrawerProfileForm.tsx`
- `components/UnifiedLeadDrawer.tsx`
- `types.ts`
- `utils/leadStatus.ts`
- `utils/phone.ts`

Tai lieu nay mo ta:
- Field nao dang hien thi o modal tao lead hien tai trong `pages/Leads.tsx`
- Field nao he thong tu sinh khi save
- Field nao co trong model/profile form nhung chua mo o modal tao lead hien tai

## 2) Rule validate khi TAO lead hien tai

| Field | Form key | Bat buoc | Rule / format |
|---|---|---:|---|
| Ten khach hang | `name` | Co | Chuoi khong rong |
| So dien thoai | `phone` | Co | He thong bo het ky tu khong phai so, sau do phai match `0xxxxxxxxx` |
| Quoc gia muc tieu | `targetCountry` | Co | Chon 1 gia tri trong danh sach quoc gia muc tieu |
| Ly do dong lead | `lossReason` | Co dieu kien | Bat buoc khi `status` la `lost` hoac `unverified` |
| Ly do chi tiet | `lossReasonCustom` | Co dieu kien | Bat buoc khi `lossReason` = `Ly do khac` |

Ghi chu:
- `phone` duoc normalize thanh chi con chu so truoc khi luu.
- `status` duoc luu ve gia tri enum/display, khong luu key thuan tuy nhu `new` hay `contacted`.

## 3) Bang field dang hien thi o modal tao lead hien tai

| Nhom | UI label | Form key | Kieu | Input | Required | Format / example | Luu vao |
|---|---|---|---|---|---:|---|---|
| Co ban | Danh xung / quan he | `title` | `string` | `select` | Khong | `Hoc sinh`, `Bo`, `Me`, `Nguoi than` | `lead.title`, dung de suy ra guardian |
| Co ban | Mo ta / Ten khach hang | `name` | `string` | `text` | Co | `Nguyen Van A` | `lead.name` |
| Co ban | Quoc gia muc tieu | `targetCountry` | `string` | `select` | Co | `Duc`, `Uc`, `Nhat Ban`, `Han Quoc`, `Trung Quoc`, `Canada`, `My`, `Khac` | `lead.targetCountry`, `lead.studentInfo.targetCountry` |
| Dia chi | So nha / Duong | `street` | `string` | `text` | Khong | `12 Nguyen Trai` | `lead.address` va raw `lead.street` |
| Dia chi | Tinh / TP | `province` | `string` | `text` | Khong | `Ha Noi` | `lead.city` va raw `lead.province` |
| Dia chi | Quan / Huyen | `city` | `string` | `text` | Khong | `Cau Giay` | `lead.district` va raw `lead.city` |
| Dia chi | Phuong / Xa | `ward` | `string` | `text` | Khong | `Dich Vong` | `lead.ward` va raw `lead.ward` |
| San pham | San pham | `product` | `string` | `select` | Khong | `Tieng Duc`, `Du hoc Duc`, `Du hoc Nghe`, `XKLD` | `lead.product`; co the anh huong `lead.program` neu nam trong tap gia tri hop le |
| San pham | Co so | `market` | `string` | `select` | Khong | `Vinh`, `Ha Noi`, `TP. HCM`, `Online` | `lead.company`, `lead.marketingData.market` |
| Lien he | Dien thoai | `phone` | `string` | `text` | Co | `0912345678` | `lead.phone` |
| Lien he | Email | `email` | `string` | `text` | Khong | `a@example.com` | `lead.email` |
| Phan cong | Phu trach | `salesperson` | `string` | `select` | Khong | `u2` | `lead.ownerId` |
| Trang thai | Trang thai | `status` | `string` | `select` | Khong | `new`, `assigned`, `picked`, `contacted`, `converted`, `nurturing`, `unverified`, `lost` | `lead.status` sau khi normalize qua `toLeadStatusValue(...)` |
| Trang thai | Ly do | `lossReason` | `string` | `select` | Co dieu kien | Phu thuoc `status` dong lead | `lead.lostReason` |
| Trang thai | Chi tiet ly do | `lossReasonCustom` | `string` | `textarea` | Co dieu kien | `Sai so`, `Khong co nhu cau` | Gop vao `lead.lostReason` neu chon `Ly do khac` |
| Phan loai | Tags | `tags` | `string[]` | `multi-select` | Khong | `["Hot", "Referral"]` | `lead.marketingData.tags` |
| Ghi chu | Ghi chu noi bo | `notes` | `string` | `textarea` | Khong | `Da goi lan 1` | `lead.notes` |
| Hoc vien | Ho ten hoc vien | `studentName` | `string` | `text` | Khong | `Nguyen Van B` | `lead.studentInfo.studentName` |
| Hoc vien | Ngay sinh | `studentDob` | `string` | `date` | Khong | `2026-04-08` | `lead.dob`, `lead.studentInfo.dob` |
| Hoc vien | CCCD hoc vien | `studentIdentityCard` | `string` | `text` | Khong | `012345678901` | `lead.identityCard`, `lead.studentInfo.identityCard` |
| Hoc vien | SDT hoc vien | `studentPhone` | `string` | `text` | Khong | `0987654321` | `lead.studentInfo.studentPhone` |
| Hoc vien | Ten truong | `studentSchool` | `string` | `text` | Khong | `THPT Chuyen A` | `lead.studentInfo.school` |
| Hoc vien | Trinh do hoc van | `studentEducationLevel` | `string` | `select` | Khong | `THPT`, `Cao dang`, `Dai hoc` | `lead.educationLevel`, `lead.studentInfo.educationLevel` |
| Marketing | Chien dich | `campaign` | `string` | `text` | Khong | `Summer 2026` | `lead.marketingData.campaign` |
| Marketing | Nguon | `source` | `string` | `select` | Khong | `hotline`, `facebook`, `google`, `referral` | `lead.source` |
| Marketing | Kenh | `channel` | `string` | `select` | Khong | Theo `LEAD_CHANNEL_OPTIONS` | `lead.marketingData.channel`, `lead.marketingData.medium` |
| Marketing | Nguoi gioi thieu | `referredBy` | `string` | `text` | Khong | `CTV A` | `lead.referredBy` |

## 4) Field he thong tu sinh khi save

| Field | Kieu | Gia tri / format | Ghi chu |
|---|---|---|---|
| `id` | `string` | `l-{timestamp}` | Sinh tu dong |
| `createdAt` | `string` | ISO datetime, vi du `2026-04-08T10:30:00.000Z` | Sinh tu dong |
| `lastInteraction` | `string` | ISO datetime | Ban dau = `createdAt` |
| `lastActivityDate` | `string` | ISO datetime | Ban dau = `createdAt` |
| `score` | `number` | `10` | Gia tri mac dinh |
| `slaStatus` | `string` | `normal` | Gia tri mac dinh |
| `guardianName` | `string?` | Lay tu `name` | Chi set khi `title` la guardian, khong phai `Hoc sinh` |
| `guardianPhone` | `string?` | Lay tu `phone` da normalize | Chi set khi `title` la guardian |
| `guardianRelation` | `string?` | `Bo`, `Me`, `Nguoi than` | Suy ra tu `title` |
| `studentInfo.parentName` | `string?` | Lay tu `name` | Chi set khi lead dang nhap theo guardian |
| `studentInfo.parentPhone` | `string?` | Lay tu `phone` da normalize | Chi set khi lead dang nhap theo guardian |
| `program` | `string` | Mac dinh tu `newLeadData.program` hoac override boi `product` | Hien tai modal tao khong cho sua truc tiep `program` |

## 5) Field co trong model / profile form nhung CHUA mo o modal tao lead hien tai

Nhung field duoi day co trong `LeadCreateFormData` va/hoac `LeadDrawerProfileForm`, nhung modal tao lead dang hien tai trong `pages/Leads.tsx` chua render:

| UI label | Form key | Kieu | Input | Format / example | Luu vao canonical |
|---|---|---|---|---|---|
| GPA / Diem ngoai ngu | `studentLanguageLevel` | `string` | `text` | `GPA 7.5 - IELTS 6.0` | `lead.studentInfo.languageLevel` |
| Ngay cap | `identityDate` | `string` | `date` | `2026-04-08` | `lead.identityDate` |
| Noi cap | `identityPlace` | `string` | `text` | `Cong an TP Ha Noi` | `lead.identityPlace` |
| Thoi gian du kien tham gia | `expectedStart` | `string` | `text` | `06/2026` | `lead.internalNotes.expectedStart` |
| Y kien bo me | `parentOpinion` | `string` | `text` | `Can them tu van` | `lead.internalNotes.parentOpinion` |
| Tai chinh | `financial` | `string` | `text` | `Du / Thieu / Can ho tro` | `lead.internalNotes.financial` va `lead.studentInfo.financialStatus` |
| Muc do tiem nang | `potential` | `string` | `select` | `Nong`, `Tiem nang`, `Tham khao` | `lead.internalNotes.potential` |
| Nguon data (profile form) | `source` | `string` | `select` | `facebook`, `hotline` | `lead.source` |
| Dia chi thuong tru full | `street` | `string` | `text` | Day du dia chi | `lead.address` |
| Ngay tao lead | `createdAtDisplay` | `string` | `readonly` | Localized datetime | Chi display, khong save |
| Ngay assign | `assignedAtDisplay` | `string` | `readonly` | Localized datetime | Chi display, khong save |

## 6) Catalog option dang dung

### 6.1 Trang thai lead form
- `new`
- `assigned`
- `picked`
- `contacted`
- `converted`
- `nurturing`
- `unverified`
- `lost`

### 6.2 Quan he / danh xung
- `Hoc sinh`
- `Bo`
- `Me`
- `Nguoi than`

### 6.3 Quoc gia muc tieu
- `Duc`
- `Uc`
- `Nhat Ban`
- `Han Quoc`
- `Trung Quoc`
- `Canada`
- `My`
- `Khac`

### 6.4 Trinh do hoc van
- `THCS`
- `THPT`
- `Trung cap`
- `Cao dang`
- `Dai hoc`
- `Sau Dai hoc`

## 7) Cac lech mapping can luu y

- Modal tao lead hien tai va profile/edit form chua dong nhat 100%.
- `company` dang la field fallback trong `resolveLeadCampus(...)`, nhung modal tao hien tai khong render field nay; thuc te nguon co so dang di qua `market`.
- Khi create, `lead.company` duoc gan bang gia tri `market` (campus). Trong khi `marketingData.region` lai lay tu `company`; vi `company` khong hien tren modal tao, truong nay thuong rong.
- `product` chi override `lead.program` neu nam trong mot tap gia tri hop le. Neu chon gia tri khac, `lead.program` se giu mac dinh cua form.
- `status` tren form la key nhu `new`, `lost`; khi luu no duoc doi qua gia tri enum/display bang `toLeadStatusValue(...)`.
- `referredBy` dang duoc su dung rong rai o UI, nhung nhieu cho doc bang `(lead as any).referredBy`, nghia la field nay dang duoc dung theo kieu "soft schema".
- `expectedStart`, `parentOpinion`, `financial`, `potential` duoc map canonical vao `internalNotes` trong `UnifiedLeadDrawer`, nhung luong create o `pages/Leads.tsx` chua dung mapping nay.

## 8) Goi y neu can chuan hoa tiep

Neu muon, buoc tiep theo nen lam 1 trong 2 huong:
- Chuan hoa 1 file schema duy nhat cho Lead create/update, sinh ra form va validate tu cung 1 nguon.
- Tach ro `form field` va `stored field`, sau do viet bang mapping 1-1 de tranh cac field raw nhu `province`, `city`, `market`, `company` bi dung lech nghia.
