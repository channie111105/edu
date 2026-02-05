import { SearchFilter } from '../components/OdooSearchBar';

/**
 * Advanced filtering logic similar to Odoo's domain system
 * 
 * Logic:
 * - Filters of SAME field use OR logic
 * - Filters of DIFFERENT fields use AND logic
 * - Group By filters don't affect data filtering (only grouping)
 */

export interface FilterDomain {
    field: string;
    operator: 'equals' | 'contains' | 'in';
    value: string | string[];
}

/**
 * Convert SearchFilters to Domain format
 * Groups filters by field for OR logic within same field
 */
export function buildDomainFromFilters(filters: SearchFilter[]): FilterDomain[] {
    // Only process 'filter' type, ignore 'groupby'
    const filterOnly = filters.filter(f => f.type === 'filter');

    // Group by field
    const grouped = filterOnly.reduce((acc, filter) => {
        if (!acc[filter.field]) {
            acc[filter.field] = [];
        }
        acc[filter.field].push(filter.value);
        return acc;
    }, {} as Record<string, string[]>);

    // Convert to domain format
    return Object.entries(grouped).map(([field, values]) => ({
        field,
        operator: values.length > 1 ? 'in' : (field === 'search' ? 'contains' : 'equals'),
        value: values.length > 1 ? values : values[0]
    }));
}

/**
 * Apply domain filtering to data array
 * @param data - Array of data objects to filter
 * @param domains - Array of filter domains
 * @param getAllFieldsText - Function to get searchable text from an object (for 'search' field)
 */
export function applyDomainFilter<T extends Record<string, any>>(
    data: T[],
    domains: FilterDomain[],
    getAllFieldsText: (item: T) => string
): T[] {
    if (domains.length === 0) return data;

    return data.filter(item => {
        // AND logic between different fields
        return domains.every(domain => {
            const { field, operator, value } = domain;

            // Special case: 'search' field searches across all fields
            if (field === 'search') {
                const searchText = getAllFieldsText(item).toLowerCase();
                if (operator === 'contains') {
                    return searchText.includes(String(value).toLowerCase());
                }
                if (operator === 'in' && Array.isArray(value)) {
                    return value.some(v => searchText.includes(v.toLowerCase()));
                }
            }

            // Normal field filtering
            const itemValue = String(item[field] || '').toLowerCase();

            if (operator === 'equals') {
                return itemValue === String(value).toLowerCase();
            }

            if (operator === 'contains') {
                return itemValue.includes(String(value).toLowerCase());
            }

            if (operator === 'in' && Array.isArray(value)) {
                // OR logic within same field
                return value.some(v => itemValue === v.toLowerCase());
            }

            return false;
        });
    });
}

/**
 * Get Group By fields from filters
 */
export function getGroupByFields(filters: SearchFilter[]): string[] {
    return filters
        .filter(f => f.type === 'groupby')
        .map(f => f.field);
}

/**
 * Group data by specified fields (for Pivot Table)
 * @param data - Data to group
 * @param groupByFields - Fields to group by
 */
export function groupDataByFields<T extends Record<string, any>>(
    data: T[],
    groupByFields: string[]
): Record<string, T[]> {
    if (groupByFields.length === 0) {
        return { 'All': data };
    }

    // Group by first field
    const firstField = groupByFields[0];
    const groups: Record<string, T[]> = {};

    data.forEach(item => {
        const key = String(item[firstField] || 'Chưa xác định');
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
    });

    // If more fields, recursively group within each group
    if (groupByFields.length > 1) {
        const remainingFields = groupByFields.slice(1);
        Object.keys(groups).forEach(key => {
            const subGroups = groupDataByFields(groups[key], remainingFields);
            // Flatten with nested keys
            delete groups[key];
            Object.entries(subGroups).forEach(([subKey, subData]) => {
                groups[`${key} > ${subKey}`] = subData;
            });
        });
    }

    return groups;
}
