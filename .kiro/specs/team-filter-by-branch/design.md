# Tài liệu Thiết kế

## Tổng quan

Thiết kế giải pháp lọc danh sách Team theo Cơ sở đã chọn trong form tạo/sửa người dùng. Giải pháp sửa đổi logic tính toán `teamOptions` trong `AdminUserManagement.tsx` để phụ thuộc vào `formData.branch`, đồng thời thêm logic reset team khi thay đổi cơ sở.

## Kiến trúc

### Các thành phần bị ảnh hưởng

1. **`pages/AdminUserManagement.tsx`** - File chính cần sửa đổi:
   - `teamOptions` useMemo: Thêm logic lọc theo branch
   - `handleFormFieldChange`: Thêm logic reset team khi đổi branch

### Luồng dữ liệu

```
formData.branch (tên cơ sở, ví dụ: "Cơ sở 1")
    │
    ▼
getBranches() → tìm branch có name === formData.branch → lấy branch.id
    │
    ▼
getTeams().filter(team =>
    team.status === 'Đang hoạt động'
    AND (
        selectedBranchId rỗng                    → hiển thị tất cả
        OR team.branchId === selectedBranchId    → team thuộc cơ sở
        OR team.branchId === 'all'               → team toàn hệ thống
    )
)
    │
    ▼
teamOptions (danh sách dropdown)
```

## Chi tiết thiết kế

### 1. Sửa đổi `teamOptions` useMemo

**Hiện tại:**
```typescript
const teamOptions = useMemo(
  () =>
    getTeams()
      .filter((t) => t.status === 'Đang hoạt động')
      .map((t) => ({
        value: t.name,
        label: t.name,
      })),
  [orgVersion]
);
```

**Sau khi sửa:**
```typescript
const teamOptions = useMemo(() => {
  const teams = getTeams().filter((t) => t.status === 'Đang hoạt động');
  
  if (!formData.branch) {
    return teams.map((t) => ({ value: t.name, label: t.name }));
  }

  const selectedBranch = getBranches().find((b) => b.name === formData.branch);
  const selectedBranchId = selectedBranch?.id;

  if (!selectedBranchId) {
    return teams.map((t) => ({ value: t.name, label: t.name }));
  }

  return teams
    .filter((t) => t.branchId === selectedBranchId || t.branchId === 'all')
    .map((t) => ({ value: t.name, label: t.name }));
}, [orgVersion, formData.branch]);
```

**Thay đổi chính:**
- Thêm `formData.branch` vào dependency array của useMemo
- Thêm logic ánh xạ tên cơ sở → ID cơ sở qua `getBranches().find()`
- Thêm điều kiện lọc: `branchId === selectedBranchId || branchId === 'all'`
- Nếu chưa chọn cơ sở hoặc không tìm thấy branch → hiển thị tất cả

### 2. Sửa đổi `handleFormFieldChange` để reset team

**Hiện tại:**
```typescript
const handleFormFieldChange = <K extends keyof AdminUserFormData>(field: K, value: AdminUserFormData[K]) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};
```

**Sau khi sửa:**
```typescript
const handleFormFieldChange = <K extends keyof AdminUserFormData>(field: K, value: AdminUserFormData[K]) => {
  setFormData((prev) => {
    const next = { ...prev, [field]: value };

    // Reset team khi thay đổi cơ sở nếu team hiện tại không thuộc cơ sở mới
    if (field === 'branch') {
      const newBranchName = value as string;
      const currentTeamName = prev.team;

      if (currentTeamName && newBranchName) {
        const selectedBranch = getBranches().find((b) => b.name === newBranchName);
        const currentTeam = getTeams().find((t) => t.name === currentTeamName);

        if (selectedBranch && currentTeam) {
          const belongsToNewBranch =
            currentTeam.branchId === selectedBranch.id || currentTeam.branchId === 'all';
          if (!belongsToNewBranch) {
            next.team = '';
          }
        }
      }
    }

    return next;
  });
};
```

**Thay đổi chính:**
- Khi `field === 'branch'`, kiểm tra team hiện tại có thuộc cơ sở mới không
- Nếu team không thuộc cơ sở mới VÀ không phải team toàn hệ thống → reset `team` về `''`
- Nếu team thuộc cơ sở mới HOẶC là team toàn hệ thống → giữ nguyên

## Thuộc tính đúng đắn (Correctness Properties)

### Property 1: Tất cả team trong kết quả lọc thuộc cơ sở đã chọn hoặc toàn hệ thống

- **Loại:** Invariant
- **Mô tả:** Với mọi cơ sở được chọn (không rỗng), mọi team trong `teamOptions` phải có `branchId === selectedBranchId` hoặc `branchId === 'all'`
- **Liên kết:** Yêu cầu 1, Tiêu chí 1.1 và 1.2

### Property 2: Team toàn hệ thống luôn xuất hiện trong kết quả

- **Loại:** Invariant
- **Mô tả:** Với mọi cơ sở được chọn, tất cả team đang hoạt động có `branchId === 'all'` phải xuất hiện trong `teamOptions`
- **Liên kết:** Yêu cầu 1, Tiêu chí 1.2

### Property 3: Reset team đúng khi đổi cơ sở

- **Loại:** Metamorphic
- **Mô tả:** Với mọi cặp (currentTeam, newBranch): nếu `currentTeam.branchId !== newBranch.id` VÀ `currentTeam.branchId !== 'all'` thì sau khi đổi branch, `formData.team === ''`
- **Liên kết:** Yêu cầu 2, Tiêu chí 2.1

### Property 4: Giữ nguyên team hợp lệ khi đổi cơ sở

- **Loại:** Metamorphic
- **Mô tả:** Với mọi cặp (currentTeam, newBranch): nếu `currentTeam.branchId === newBranch.id` HOẶC `currentTeam.branchId === 'all'` thì sau khi đổi branch, `formData.team` giữ nguyên giá trị cũ
- **Liên kết:** Yêu cầu 2, Tiêu chí 2.2 và 2.3

### Property 5: Chỉ team đang hoạt động xuất hiện trong kết quả

- **Loại:** Invariant
- **Mô tả:** Với mọi cấu hình, mọi team trong `teamOptions` phải có `status === 'Đang hoạt động'`
- **Liên kết:** Yêu cầu 3, Tiêu chí 3.1

## Xử lý trường hợp biên

| Trường hợp | Hành vi |
|---|---|
| Chưa chọn cơ sở (formData.branch rỗng) | Hiển thị tất cả team đang hoạt động |
| Cơ sở không tìm thấy trong danh sách | Hiển thị tất cả team đang hoạt động (fallback an toàn) |
| Không có team nào thuộc cơ sở đã chọn | Chỉ hiển thị team toàn hệ thống |
| Không có team toàn hệ thống | Chỉ hiển thị team thuộc cơ sở đã chọn |
| Đổi cơ sở khi team rỗng | Không cần reset, giữ nguyên rỗng |

## Phạm vi thay đổi

- **File duy nhất cần sửa:** `pages/AdminUserManagement.tsx`
- **Không cần thay đổi:** Interface, API, data model, hoặc các component khác
- **Không có breaking change:** Logic hiện tại chỉ được mở rộng, không bị xóa
