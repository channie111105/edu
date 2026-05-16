# EduCRM - Logic Phân Quyền (RBAC)

> Tài liệu chi tiết về hệ thống phân quyền Role-Based Access Control trong EduCRM.

---

## 1. TỔNG QUAN HỆ THỐNG PHÂN QUYỀN

### 1.1 Kiến trúc
- **Model**: RBAC (Role-Based Access Control) với Scope-based permissions
- **Storage**: localStorage (`educrm_admin_permissions_v2`)
- **Cấu trúc**: Permission Group → Section → Permission → Scope

### 1.2 Trạng thái hiện tại (QUAN TRỌNG)
> ⚠️ **Hiện tại tất cả permission checks đều return `true`** (đã gỡ bỏ hạn chế).
> - `checkPermission()` → luôn return `true`
> - `getPermissionScope()` → luôn return `'global'`
> - `hasGroupAccess()` → luôn return `true`
> - `deriveRolesFromPermissionState()` → luôn return tất cả roles (8 phân hệ)
>
> Hệ thống RBAC đã được thiết kế đầy đủ nhưng đang ở chế độ "mở toàn quyền".

---

## 2. CÁC VAI TRÒ (ROLES)

### 2.1 User Roles (Enum)
| Role | Giá trị | Mô tả |
|------|---------|--------|
| ADMIN | 'Admin' | Quản trị hệ thống |
| FOUNDER | 'Founder' | CEO/Người sáng lập |
| MARKETING | 'Marketing' | Nhân viên Marketing |
| SALES_REP | 'Sales Rep' | Nhân viên kinh doanh |
| SALES_LEADER | 'Sales Leader' | Trưởng nhóm kinh doanh |
| ACCOUNTANT | 'Kế toán' | Kế toán |
| TRAINING | 'Đào tạo' | Quản lý đào tạo |
| TEACHER | 'Giáo viên' | Giáo viên |
| LIBRARY | 'Thư viện' | Thư viện |
| STUDY_ABROAD | 'Du học' | Chuyên viên du học |
| AGENT | 'Cộng tác viên (B2B)' | Cộng tác viên |

### 2.2 System Roles (Permission Roles)
| ID | Label | Mô tả | Mapped UserRoles |
|----|-------|--------|-----------------|
| sales | Sale | Khai thác lead, chăm sóc contact, pipeline cá nhân | SALES_REP |
| salesLeader | Sale leader | Quản lý đội sale, pipeline, hiệu suất đội nhóm | SALES_LEADER |
| branchDirector | GĐCN | Quản trị theo cơ sở | ADMIN |
| marketing | MKTer | Vận hành lead đầu vào, campaign cá nhân | MARKETING |
| marketingLeader | MKT leader | Vận hành chiến dịch, CTV, SLA | MARKETING |
| customerCare | CSKH | Theo dõi trải nghiệm lead, hỗ trợ sale | (không map) |
| trainingManager | QLĐT | Điều phối lớp, lịch học, giáo viên | TRAINING |
| studyAbroadManager | QLHS | Quản lý hồ sơ, tiến độ, phỏng vấn du học | STUDY_ABROAD |
| accountant | Kế toán | Giao dịch, thu chi, công nợ, hoàn tiền | ACCOUNTANT |
| ceo | CEO | Phê duyệt liên phòng ban cấp điều hành | FOUNDER |
| admin | Admin | Toàn quyền hệ thống, workflow, override | ADMIN |

---

## 3. PERMISSION SCOPES (PHẠM VI QUYỀN)

### 3.1 Các mức Scope
| Scope | Label | Trọng số | Ý nghĩa |
|-------|-------|----------|----------|
| `none` | Không | 0 | Không có quyền |
| `personal` | Cá nhân | 1 | Chỉ dữ liệu của mình |
| `team` | Đội nhóm | 2 | Dữ liệu trong team |
| `branch` | Cơ sở | 3 | Dữ liệu trong chi nhánh |
| `global` | Tổng | 4 | Toàn bộ hệ thống |

### 3.2 Default Scope theo Role
| Role | admin group | marketing | sales | enrollment | training | studyAbroad | finance | library |
|------|-------------|-----------|-------|------------|----------|-------------|---------|---------|
| admin | global | global | global | global | global | global | global | global |
| ceo | global | global | global | global | global | global | global | global |
| branchDirector | branch | branch | branch | branch | branch | branch | branch | branch |
| salesLeader | none | none | team | team | none | none | none | team |
| sales | none | none | personal | personal | none | none | none | personal |
| marketingLeader | none | team | none | none | none | none | none | team |
| marketing | none | personal | none | none | none | none | none | team |
| customerCare | none | personal | personal | personal | none | none | none | none |
| trainingManager | none | none | none | branch | branch | none | none | branch |
| accountant | none | none | none | branch | none | none | branch | branch |
| studyAbroadManager | none | none | none | none | none | branch | none | branch |

---

## 4. PERMISSION GROUPS (NHÓM QUYỀN)

### 4.1 Marketing (MKT)

#### Chiến dịch (campaign)
| Permission | Label |
|-----------|-------|
| search | Xem/lọc/search |
| create | Tạo chiến dịch, QR |
| edit | Sửa |
| delete | Xóa |
| import | Thêm/import lead |
| export | Xuất data |

#### Cộng tác viên (collaborator)
| Permission | Label |
|-----------|-------|
| search | Xem/lọc/search |
| status | Sửa/Cập nhật trạng thái |
| delete | Xóa |
| create | Thêm |
| export | Xuất excel |

#### DS SLA (sla)
| Permission | Label |
|-----------|-------|
| search | Xem/lọc/search |
| claim | Nhận |
| process | Xử lý |
| reassign | Phân bổ lại |
| settings | Cài đặt SLA |

---

### 4.2 Sales (Sale)

#### Dashboard
| Permission | Label |
|-----------|-------|
| view | Xem |
| filter | Lọc |

#### My Leads (myLeads)
| Permission | Label |
|-----------|-------|
| create | Tạo |
| view | Xem/lọc/tìm kiếm |
| edit | Sửa |
| delete | Xóa |
| pick | Tiếp nhận |
| process | Xử lý data |

#### My Contact (myContacts)
| Permission | Label |
|-----------|-------|
| create | Tạo |
| view | Xem, tìm kiếm, lọc |
| edit | Sửa |
| delete | Xóa |

#### Pipeline
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| process | Xử lý data |
| assign | Phân bổ |
| delete | Xóa |

#### KPIs
| Permission | Label |
|-----------|-------|
| view | Xem/lọc |
| create | Tạo |
| edit | Sửa |
| export | Xuất báo cáo |

#### Lịch hẹn (meeting)
| Permission | Label |
|-----------|-------|
| create | Tạo |
| confirm | Confirm/cancel |
| submit | Submit |

---

### 4.3 Ghi danh (Enrollment)

#### Dashboard
| Permission | Label |
|-----------|-------|
| view | Xem |
| filter | Lọc |

#### Báo giá (quotation)
| Permission | Label |
|-----------|-------|
| draft | Tạo/sửa (chỉ sửa khi ở draft) |
| view | Xem |
| search | Tìm kiếm |
| stop | Dừng |
| debt | Kích hoạt công nợ (lần thu) |
| delete | Xóa |

#### Hợp đồng (contract)
| Permission | Label |
|-----------|-------|
| attach | Tải chứng từ |
| view | Xem/lọc/tìm kiếm |
| print | In |
| edit | Sửa |

#### Học viên (student)
| Permission | Label |
|-----------|-------|
| view | Xem/tìm kiếm/lọc |
| claim | Tạo claim/Hủy |
| edit | Sửa thông tin học viên |
| processClaim | Xử lý claim |
| enroll | Ghi danh |
| transfer | Chuyển lớp |
| approve | Duyệt ghi danh |

---

### 4.4 Đào tạo (Training)

#### Lịch biểu (schedule)
| Permission | Label |
|-----------|-------|
| view | Xem |
| filter | Lọc |
| createClass | Tạo lớp |

#### Quản lý lớp (class)
| Permission | Label |
|-----------|-------|
| view | Xem |
| addStudent | Thêm học viên |
| export | Xuất excel |
| attendance | Điểm danh |
| note | Note ghi chú |
| score | Cập nhật điểm |
| log | Log note |
| status | Đổi trạng thái |

#### Giáo viên (teacher)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| create | Tạo |
| edit | Sửa/đổi trạng thái/attach |
| assign | Gán lớp |

---

### 4.5 Du học (Study Abroad)

#### Dashboard
| Permission | Label |
|-----------|-------|
| view | Xem |
| filter | Lọc |

#### Danh sách hồ sơ (caseList)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| create | Tạo |
| edit | Sửa |

#### Tiến độ (progress)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| action | Thao tác |

#### Lịch phỏng vấn (interview)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| create | Tạo |
| edit | Sửa |
| delete | Xóa |

#### Đối tác trường (partner)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| create | Tạo |
| edit | Sửa |
| delete | Xóa |

---

### 4.6 Kế toán (Finance)

#### Dashboard
| Permission | Label |
|-----------|-------|
| view | Xem |
| filter | Lọc |

#### Duyệt giao dịch (approval)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| create | Tạo |
| submit | Trình duyệt |
| accountantConfirm | Kế toán xác nhận |
| ceoConfirm | CEO duyệt |
| edit | Sửa |

#### Thu chi (cashflow)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| confirm | Xác nhận thu chi |
| attach | Attach chứng từ |

#### Công nợ (debt)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |

#### Phiếu thu chi (receipt)
| Permission | Label |
|-----------|-------|
| edit | Sửa |
| print | In |

#### Hoàn tiền (refund)
| Permission | Label |
|-----------|-------|
| view | Xem/lọc/tìm kiếm |
| create | Tạo |
| submit | Trình duyệt |
| accountantConfirm | Kế toán xác nhận |
| ceoConfirm | CEO duyệt |
| edit | Sửa |

---

### 4.7 Thư viện (Library)

#### Chung (common)
| Permission | Label |
|-----------|-------|
| view | Xem |
| filter | Lọc |
| create | Tạo |

---

### 4.8 Admin

#### Hệ thống (system)
| Permission | Label |
|-----------|-------|
| view | Hệ thống |
| personalConfig | Cấu hình (sửa giá, tạo thủ công...) |
| createUser | Tạo user |
| createRole | Tạo role + tick quyền |
| toggleUser | Tick trạng thái users |
| delete | Xóa |
| edit | Sửa |

---

## 5. NAVIGATION ACCESS CONTROL

### 5.1 Menu Items theo Role

| Menu | Roles được truy cập |
|------|---------------------|
| Tổng quan (/) | Admin, Founder, Sales Rep, Marketing, Accountant, Study Abroad, Agent |
| Quản lý Người dùng | Admin |
| Cấu hình Dữ liệu | Admin |
| Cấu hình Tổ chức | Admin |
| Tự động hóa (Rule) | Admin |
| Chính sách & Lộ trình Phí | Admin |
| Nhật ký Hệ thống | Admin |
| Phân quyền (RBAC) | Admin |
| Thư viện & Quy trình | Admin, Founder, Library, Teacher |
| Tổng quan (Contracts) | Sales Leader |
| Báo giá | Sales Leader |
| Hợp đồng | Sales Leader |
| Học viên (Students) | Founder |
| Học viên (Contracts) | Sales Leader |
| Cơ hội (Leads) | Marketing, Founder |
| Chiến dịch | Marketing |
| Cộng tác viên | Marketing |
| Danh sách Lead (SLA) | Marketing |
| My Leads | Sales Rep, Sales Leader |
| My Contacts | Sales Rep |
| Pipeline | Sales Rep, Sales Leader |
| KPIs & Mục tiêu | Sales Rep |
| Lịch hẹn (Test/Visit) | Sales Rep, Founder |
| Lịch biểu | Training |
| Quản lý lớp | Training |
| Giáo viên | Training |
| Danh sách hồ sơ (DH) | Study Abroad |
| Tiến độ (DH) | Study Abroad |
| Lịch Phỏng vấn (DH) | Study Abroad |
| Đối tác Trường | Study Abroad |
| Duyệt Giao dịch | Accountant, Founder |
| Thu Chi (Transactions) | Accountant, Founder |
| Công nợ | Accountant, Founder |
| Phiếu thu / Phiếu chi | Accountant |
| Hoàn tiền | Accountant, Founder |
| Báo cáo | Founder, Marketing |
| Cấu hình | Founder |

---

## 6. PERMISSION CHECK LOGIC (usePermission Hook)

### 6.1 API
```typescript
const { can, scope, hasGroup, cannot } = usePermission();

// Kiểm tra quyền
can('marketing', 'campaign', 'create')  // → boolean

// Lấy scope
scope('sales', 'myLeads', 'view')  // → PermissionScope

// Kiểm tra group access
hasGroup('finance')  // → boolean

// Disable UI element
cannot('admin', 'system', 'delete')  // → boolean (ngược can)
```

### 6.2 Permission Key Format
```
{sectionId}.{permissionId}
```
VD: `campaign.create`, `myLeads.view`, `system.createUser`

### 6.3 Legacy hasPermission
```typescript
hasPermission([UserRole.ADMIN, UserRole.FOUNDER])
// → true nếu user.role nằm trong danh sách
```

---

## 7. USER MANAGEMENT

### 7.1 Admin User Record
| Field | Type | Mô tả |
|-------|------|--------|
| id | string | ID unique |
| name | string | Họ tên |
| email | string | Email |
| username | string | Tên đăng nhập |
| role | UserRole | Role chính |
| roles | UserRole[] | Danh sách roles |
| department | string | Phòng ban |
| branch | string | Chi nhánh |
| team | string | Team |
| managerId | string? | ID quản lý trực tiếp |
| accountStatus | 'active' \| 'locked' | Trạng thái tài khoản |
| contractType | string | Loại hợp đồng |
| employmentStatus | string | Trạng thái làm việc |
| permissionRoleId | string? | ID role phân quyền |
| password | string? | Mật khẩu |

### 7.2 Account Status
- `active`: Hoạt động (có thể đăng nhập)
- `locked`: Tạm khóa (hiện tại logic khóa đã bị tắt)

### 7.3 Contract Types
- `official`: Chính thức
- `probation`: Thử việc
- `collaborator`: CTV
- `intern`: Thực tập sinh
- `part_time`: Part time

### 7.4 Employment Status
- `working`: Đang làm
- `paused`: Tạm nghỉ
- `resigned`: Nghỉ việc

### 7.5 Root Admin
- Username: `admin@abc`, Password: `123456`
- Luôn được đảm bảo tồn tại (hardcoded check)

---

## 8. PERMISSION ROLE MANAGEMENT

### 8.1 Tạo Role mới
- ID được generate từ `username` hoặc `label` (kebab-case)
- Đảm bảo unique bằng suffix số (VD: `custom-role-2`)
- Custom roles có `isSystem: false`

### 8.2 Build Base Permissions
- System roles: dùng `getDefaultScope()` cho từng group
- Custom roles: tất cả scope = `none`

### 8.3 Permission Settings Snapshot
```typescript
{
  roles: PermissionRoleRecord[],      // Danh sách roles
  permissions: {                       // Permissions per role
    [roleId]: {                        // GroupPermissionState
      [groupId]: {                     // Record<permissionKey, scope>
        "campaign.create": "global",
        "campaign.edit": "team",
        ...
      }
    }
  }
}
```

### 8.4 Normalize & Persist
- Load: `localStorage` → normalize (merge system roles, validate scopes) → return
- Save: normalize → `localStorage` → emit event `educrm:admin-permissions-changed`
- Luôn đảm bảo 11 system roles tồn tại (thêm nếu thiếu)

---

## 9. GROUP → ROLE MAPPING

Ánh xạ từ Permission Group sang UserRole cho Module Selection:

| Group ID | UserRole |
|----------|----------|
| marketing | MARKETING |
| sales | SALES_REP |
| enrollment | SALES_LEADER |
| training | TRAINING |
| studyAbroad | STUDY_ABROAD |
| finance | ACCOUNTANT |
| library | LIBRARY |
| admin | ADMIN |

---

## 10. LOGIC PHÂN QUYỀN TRONG BUSINESS FLOWS

### 10.1 Transaction Approval
- **Kế toán xác nhận**: Cần `userRole` (bất kỳ role nào có quyền)
- **Admin duyệt SO**: Cần `userRole`, transaction phải ở `DA_DUYET`
- **Reject**: Cần `userRole`

### 10.2 Refund Flow
- **Tạo**: Sale/Kế toán
- **Trình duyệt**: Sale xác nhận
- **KT xác nhận**: Kế toán
- **CEO duyệt**: CEO/Admin
- **Xác nhận thu chi**: Kế toán

### 10.3 Enrollment Approval
- **Tạo admission**: Sale (createdBy)
- **Duyệt admission**: Training (approvedBy = 'training')
- **Từ chối**: Training (rejectedBy = 'training')

### 10.4 Quotation Cancel
- **Gửi yêu cầu hủy**: Kế toán
- **Duyệt hủy**: Admin

---

## 11. ĐỀ XUẤT CẢI THIỆN

### 11.1 Vấn đề hiện tại
1. ❌ Permission checks đang return `true` cho tất cả → không có kiểm soát thực tế
2. ❌ `deriveRolesFromPermissionState` return tất cả roles → mọi user thấy 8 phân hệ
3. ❌ Account lock check bị comment out → không thể khóa tài khoản
4. ❌ Password lưu plaintext trong localStorage
5. ❌ Không có session/token management (chỉ state React)

### 11.2 Đề xuất kích hoạt lại RBAC
1. Bỏ hardcode `return true` trong `checkPermission`, `getPermissionScope`, `hasGroupAccess`
2. Khôi phục logic gốc:
   ```typescript
   checkPermission(groupId, sectionId, permissionId) {
     if (user.role === UserRole.ADMIN || user.role === UserRole.FOUNDER) return true;
     const key = getPermissionKey(sectionId, permissionId);
     const scope = permissionState[groupId]?.[key] || 'none';
     return scope !== 'none';
   }
   ```
3. Khôi phục `deriveRolesFromPermissionState` để chỉ return roles có ít nhất 1 permission active
4. Bật lại account lock check
5. Thêm scope-based data filtering trong các list/query functions
