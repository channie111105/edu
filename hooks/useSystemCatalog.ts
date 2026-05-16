import { useEffect, useState } from 'react';
import {
  getSystemCatalog,
  SYSTEM_CONFIG_EVENT,
  type SystemCatalogId,
  type SystemCatalogOption,
} from '../utils/systemConfig';
import {
  getBranches,
  getTeams,
  ORG_CONFIG_EVENT,
  type OrgBranch,
  type OrgTeam,
} from '../utils/orgConfig';
import {
  getLostReasons,
  getTags,
} from '../utils/storage';

const TAGS_CHANGED_EVENT = 'educrm:tags-changed';
const LOST_REASONS_CHANGED_EVENT = 'educrm:lost-reasons-changed';

const useEventReactiveValue = <T,>(
  read: () => T,
  events: ReadonlyArray<string>,
): T => {
  const [value, setValue] = useState<T>(read);

  useEffect(() => {
    const sync = () => setValue(read());
    sync();
    events.forEach((eventName) => {
      window.addEventListener(eventName, sync as EventListener);
    });
    window.addEventListener('storage', sync);
    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, sync as EventListener);
      });
      window.removeEventListener('storage', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
};

/**
 * Trả về danh sách option của một catalog trong Cấu hình Dữ liệu.
 * Tự động re-render khi catalog thay đổi (SYSTEM_CONFIG_EVENT, storage).
 */
export const useSystemCatalog = (
  catalogId: SystemCatalogId,
  options: { includeInactive?: boolean } = {},
): SystemCatalogOption[] => {
  const includeInactive = options.includeInactive ?? false;
  return useEventReactiveValue(
    () => getSystemCatalog(catalogId, includeInactive),
    [SYSTEM_CONFIG_EVENT],
  );
};

/**
 * Tương tự useSystemCatalog nhưng trả về mảng `{ value, label }`
 * tiện cho các select đơn giản. Nếu cần parentId/metadata dùng useSystemCatalog.
 */
export const useSystemCatalogOptions = (
  catalogId: SystemCatalogId,
  options: { includeInactive?: boolean } = {},
) => {
  const items = useSystemCatalog(catalogId, options);
  return items.map((item) => ({ value: item.value, label: item.label }));
};

/** Cơ sở từ Cấu hình Tổ chức, mặc định lọc trạng thái đang hoạt động. */
export const useOrgBranches = (
  options: { includeInactive?: boolean } = {},
): OrgBranch[] => {
  const includeInactive = options.includeInactive ?? false;
  return useEventReactiveValue(
    () =>
      includeInactive
        ? getBranches()
        : getBranches().filter((b) => b.status === 'Đang hoạt động'),
    [ORG_CONFIG_EVENT],
  );
};

/** Team từ Cấu hình Tổ chức, có thể lọc theo branchId nếu cần. */
export const useOrgTeams = (
  options: { branchId?: string; includeInactive?: boolean } = {},
): OrgTeam[] => {
  const { branchId, includeInactive = false } = options;
  return useEventReactiveValue(
    () => {
      let teams = getTeams();
      if (!includeInactive) {
        teams = teams.filter((t) => t.status === 'Đang hoạt động');
      }
      if (branchId) {
        teams = teams.filter(
          (t) => t.branchId === branchId || t.branchId === 'all',
        );
      }
      return teams;
    },
    [ORG_CONFIG_EVENT],
  );
};

/** Tag catalog (đã lọc bỏ tag bị ẩn). */
export const useTags = (options: { includeHidden?: boolean } = {}): string[] => {
  const includeHidden = options.includeHidden ?? false;
  return useEventReactiveValue(
    () => getTags({ includeHidden }),
    [TAGS_CHANGED_EVENT],
  );
};

/** Danh sách lý do mất lead. */
export const useLostReasons = (): string[] => {
  return useEventReactiveValue(
    () => getLostReasons(),
    [LOST_REASONS_CHANGED_EVENT],
  );
};

/**
 * Trả về một số tăng mỗi khi catalog hệ thống thay đổi.
 * Dùng làm dependency cho useMemo / useEffect khi component đang import biến tĩnh
 * (LEAD_PRODUCT_OPTIONS, LEAD_SOURCE_OPTIONS...) để buộc re-render lấy giá trị mới.
 */
export const useSystemConfigVersion = (): number => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(SYSTEM_CONFIG_EVENT, bump as EventListener);
    window.addEventListener(ORG_CONFIG_EVENT, bump as EventListener);
    window.addEventListener(TAGS_CHANGED_EVENT, bump as EventListener);
    window.addEventListener(LOST_REASONS_CHANGED_EVENT, bump as EventListener);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener(SYSTEM_CONFIG_EVENT, bump as EventListener);
      window.removeEventListener(ORG_CONFIG_EVENT, bump as EventListener);
      window.removeEventListener(TAGS_CHANGED_EVENT, bump as EventListener);
      window.removeEventListener(LOST_REASONS_CHANGED_EVENT, bump as EventListener);
      window.removeEventListener('storage', bump);
    };
  }, []);
  return version;
};
