import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Customer, formatCustomerLabel, searchCustomers } from '../services/customer.service';

interface CustomerSelectProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  disabled?: boolean;
  placeholder?: string;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Tìm theo tên/SĐT/email/mã...'
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState(value ? formatCustomerLabel(value) : '');
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value) {
      setQuery(formatCustomerLabel(value));
    } else {
      setQuery('');
    }
  }, [value?.id]);

  useEffect(() => {
    const onOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  useEffect(() => {
    if (!open || !query.trim()) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const result = await searchCustomers(query.trim());
        if (!cancelled) setItems(result);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  const showEmpty = useMemo(
    () => open && !loading && query.trim().length > 0 && items.length === 0,
    [open, loading, query, items.length]
  );

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        ) : (
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        )}
        <input
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            onChange(null);
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-xs text-slate-500">Đang tải khách hàng...</div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange(item);
                setQuery(formatCustomerLabel(item));
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
            >
              <div className="text-sm font-semibold text-slate-800">{item.full_name}</div>
              <div className="text-xs text-slate-500">
                {[item.code, item.phone, item.email].filter(Boolean).join(' • ')}
              </div>
            </button>
          ))}
          {showEmpty && (
            <div className="px-3 py-2 text-xs text-slate-400">Không tìm thấy khách hàng</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSelect;
