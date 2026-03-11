import { EntityDefinition, RuleAction, ConditionField } from "../types";

// Shared condition fields available to all entities (via Informational columns)
const SHARED_FILTER_FIELDS: ConditionField[] = [
    { key: "Campaign Name (Informational only)", label: "Campaign Name chứa", type: "text", group: "🔍 Entity Filters" },
    { key: "Ad Group Name (Informational only)", label: "Ad Group Name chứa", type: "text", group: "🔍 Entity Filters" },
];

export const ENTITY_REGISTRY: EntityDefinition[] = [
    {
        type: "Campaign",
        label: "Campaign",
        icon: "🏢",
        level: 1,
        description: "Ngân sách, chiến lược đấu giá, trạng thái",
        parentType: undefined,
        editableFields: [
            { key: "Daily Budget", label: "Daily Budget", type: "number", min: 1, max: 999999, unit: "$" },
            { key: "State", label: "Trạng thái", type: "state" },
        ],
        availableActions: [
            {
                id: "adjust_budget",
                label: "Budget",
                targetField: "Daily Budget",
                operations: ["increase", "decrease", "set"],
                supportsPercentage: true,
            },
            {
                id: "tiered_budget",
                label: "Budget (theo tầng)",
                targetField: "Daily Budget",
                operations: ["tiered_increase"],
                supportsPercentage: false,
            },
        ],
        filterFields: [
            { key: "Targeting Type", label: "Targeting Type", type: "select", options: ["Manual", "Auto"], group: "🔍 Entity Filters" },
            { key: "Bidding Strategy", label: "Bidding Strategy", type: "select", options: ["Dynamic bids - down only", "Dynamic bids - up and down", "Fixed bids"], group: "🔍 Entity Filters" },
            { key: "Campaign Name", label: "Campaign Name chứa", type: "text", group: "🔍 Entity Filters" },
        ],
    },
    {
        type: "Bidding Adjustment",
        label: "Bidding Adjustment",
        icon: "📍",
        level: 1.1,
        description: "Phần trăm đặt giá theo vị trí hiển thị (Placement)",
        parentType: "Campaign",
        editableFields: [
            { key: "Percentage", label: "Placement %", type: "number", min: 0, max: 900, unit: "%" },
        ],
        availableActions: [
            {
                id: "adjust_placement",
                label: "Placement %",
                targetField: "Percentage",
                operations: ["increase", "decrease", "set"],
                supportsPercentage: false,
            },
            {
                id: "boost_best_placement",
                label: "Boost placement tốt nhất",
                targetField: "Percentage",
                operations: ["boost_best_placement"],
                supportsPercentage: false,
            },
        ],
        filterFields: [
            { key: "Placement", label: "Placement", type: "select", options: ["Placement Top", "Placement Product Page", "Placement Rest Of Search", "Placement Amazon Business"], group: "🔍 Entity Filters" },
            ...SHARED_FILTER_FIELDS,
        ],
    },
    {
        type: "Ad Group",
        label: "Ad Group",
        icon: "📦",
        level: 2,
        description: "Nhóm quảng cáo, bid mặc định",
        parentType: "Campaign",
        editableFields: [
            { key: "Ad Group Default Bid", label: "Default Bid", type: "number", min: 0.02, max: 999.99, unit: "$" },
            { key: "State", label: "Trạng thái", type: "state" },
        ],
        availableActions: [
            {
                id: "adjust_default_bid",
                label: "Default Bid",
                targetField: "Ad Group Default Bid",
                operations: ["increase", "decrease", "set"],
                supportsPercentage: true,
            },
        ],
        filterFields: [
            ...SHARED_FILTER_FIELDS,
        ],
    },
    {
        type: "Product Ad",
        label: "Product Ad",
        icon: "🛒️",
        level: 3,
        description: "Sản phẩm (SKU) hiển thị quảng cáo",
        parentType: "Ad Group",
        editableFields: [
            { key: "State", label: "Trạng thái", type: "state" },
        ],
        availableActions: [],
        filterFields: [
            { key: "SKU", label: "SKU chứa", type: "text", group: "🔍 Entity Filters" },
            ...SHARED_FILTER_FIELDS,
        ],
    },
    {
        type: "Keyword",
        label: "Keyword",
        icon: "🔑",
        level: 4,
        description: "Từ khóa kích hoạt quảng cáo, giá thầu",
        parentType: "Ad Group",
        editableFields: [
            { key: "Bid", label: "Keyword Bid", type: "number", min: 0.02, max: 999.99, unit: "$" },
            { key: "State", label: "Trạng thái", type: "state" },
        ],
        availableActions: [
            {
                id: "adjust_bid",
                label: "Bid",
                targetField: "Bid",
                operations: ["increase", "decrease", "set"],
                supportsPercentage: true,
            },
        ],
        filterFields: [
            { key: "Match Type", label: "Match Type", type: "select", options: ["Broad", "Phrase", "Exact"], group: "🔍 Entity Filters" },
            { key: "Keyword Text", label: "Keyword chứa", type: "text", group: "🔍 Entity Filters" },
            ...SHARED_FILTER_FIELDS,
        ],
    },
    {
        type: "Product Targeting",
        label: "Product Targeting",
        icon: "🎯",
        level: 4,
        description: "Nhắm mục tiêu ASIN/Category đối thủ",
        parentType: "Ad Group",
        editableFields: [
            { key: "Bid", label: "Targeting Bid", type: "number", min: 0.02, max: 999.99, unit: "$" },
            { key: "State", label: "Trạng thái", type: "state" },
        ],
        availableActions: [
            {
                id: "adjust_bid",
                label: "Bid",
                targetField: "Bid",
                operations: ["increase", "decrease", "set"],
                supportsPercentage: true,
            },
        ],
        filterFields: [
            ...SHARED_FILTER_FIELDS,
        ],
    },
    {
        type: "Negative Keyword",
        label: "Negative Keyword",
        icon: "🚫",
        level: 4.1,
        description: "Chặn từ khóa không liên quan",
        parentType: "Ad Group",
        editableFields: [
            { key: "State", label: "Trạng thái", type: "state" },
        ],
        availableActions: [],
        filterFields: [
            { key: "Match Type", label: "Match Type", type: "select", options: ["Negative Exact", "Negative Phrase"], group: "🔍 Entity Filters" },
            ...SHARED_FILTER_FIELDS,
        ],
    },
    {
        type: "Negative Product Targeting",
        label: "Neg. Product Targeting",
        icon: "🚫",
        level: 4.1,
        description: "Chặn ASIN đối thủ quá mạnh",
        parentType: "Ad Group",
        editableFields: [
            { key: "State", label: "Trạng thái", type: "state" },
        ],
        availableActions: [],
        filterFields: [
            ...SHARED_FILTER_FIELDS,
        ],
    },
];

// ===== UTILITY FUNCTIONS =====

/** Get all child entity types of a given parent */
export function getChildEntities(parentType: string): EntityDefinition[] {
    return ENTITY_REGISTRY.filter((e) => e.parentType === parentType);
}

/** Get entity hierarchy as a tree-like structure */
export function getEntityHierarchy(): { root: EntityDefinition; children: EntityDefinition[] }[] {
    const roots = ENTITY_REGISTRY.filter((e) => !e.parentType);
    return roots.map((root) => ({
        root,
        children: ENTITY_REGISTRY.filter((e) => e.parentType === root.type),
    }));
}

export function getEntityDef(entityType: string): EntityDefinition | undefined {
    return ENTITY_REGISTRY.find(
        (e) => e.type.toLowerCase() === entityType.toLowerCase(),
    );
}

export interface ActionOption {
    label: string;
    type: RuleAction["type"];
    targetField: string;
    needsValue: boolean;
}

export function getActionOptions(entityType: string): ActionOption[] {
    const entityDef = getEntityDef(entityType);
    if (!entityDef) return [];

    const options: ActionOption[] = [];

    for (const action of entityDef.availableActions) {
        for (const op of action.operations) {
            if (op === "tiered_increase") {
                options.push({
                    label: `📈 Tăng Budget (theo tầng)`,
                    type: "tiered_increase" as any,
                    targetField: action.targetField,
                    needsValue: false,
                });
                continue;
            }
            if (op === "boost_best_placement") {
                options.push({
                    label: `🎯 Boost Placement tốt nhất`,
                    type: "boost_best_placement" as any,
                    targetField: action.targetField,
                    needsValue: false,
                });
                continue;
            }
            const opLabels: Record<string, string> = {
                increase: `📈 Tăng ${action.label}`,
                decrease: `📉 Giảm ${action.label}`,
                set: `💲 Đặt ${action.label}`,
            };
            options.push({
                label: opLabels[op] || op,
                type: op as RuleAction["type"],
                targetField: action.targetField,
                needsValue: true,
            });
        }
    }

    if (entityDef.editableFields.some((f) => f.type === "state")) {
        options.push({ label: "⏸ Tạm dừng (Pause)", type: "pause", targetField: "State", needsValue: false });
        options.push({ label: "▶ Kích hoạt (Enable)", type: "enable", targetField: "State", needsValue: false });
    }

    return options;
}

export function getDefaultAction(entityType: string): RuleAction {
    const options = getActionOptions(entityType);
    if (options.length > 0 && options[0].needsValue) {
        return { type: options[0].type, targetField: options[0].targetField, value: 10, unit: "%" };
    }
    if (options.length > 0) {
        return { type: options[0].type, targetField: options[0].targetField };
    }
    return { type: "pause", targetField: "State" };
}

export function migrateRuleAction(action: any): RuleAction {
    if (action.targetField) return action;

    const migrations: Record<string, { type: RuleAction["type"]; targetField: string }> = {
        increase_bid: { type: "increase", targetField: "Bid" },
        decrease_bid: { type: "decrease", targetField: "Bid" },
        set_bid: { type: "set", targetField: "Bid" },
        pause: { type: "pause", targetField: "State" },
        enable: { type: "enable", targetField: "State" },
    };

    const migrated = migrations[action.type];
    if (migrated) {
        return { ...migrated, value: action.value, unit: action.unit };
    }
    return action;
}

export function getActionDisplayText(action: RuleAction): string {
    if (action.type === "pause") return "⏸ Pause";
    if (action.type === "enable") return "▶ Enable";
    if (action.type === "tiered_increase") {
        const tiersStr = (action.tiers || [])
            .map(t => `≤$${t.maxBudget}:+${t.increasePercent}%`)
            .join(", ");
        return `📈 Budget tiếp tầng (${tiersStr || "chưa cấu hình"})`;
    }
    if (action.type === "boost_best_placement") {
        return `🎯 Boost best placement +${action.boostPercent ?? 15}%`;
    }

    const opSymbols: Record<string, string> = { increase: "↑", decrease: "↓", set: "=" };
    const symbol = opSymbols[action.type] || "";
    const fieldLabel = action.targetField === "Ad Group Default Bid" ? "Default Bid" : action.targetField;
    const valueStr = action.value !== undefined ? `${action.value}${action.unit || ""}` : "";

    return `${symbol} ${fieldLabel} ${action.type === "set" ? "" : action.type === "increase" ? "+" : "-"}${valueStr}`.trim();
}

/** Get all condition fields for an entity (entity-specific filters) */
export function getConditionFields(entityType: string): ConditionField[] {
    const entityDef = getEntityDef(entityType);
    return entityDef?.filterFields || [];
}

/** Check if a metric key is a text-based condition */
export function isTextCondition(metric: string, entityType: string): ConditionField | undefined {
    const fields = getConditionFields(entityType);
    return fields.find((f) => f.key === metric);
}

/** All text-based operator options */
export const TEXT_OPERATORS = [
    { value: "equals", label: "bằng" },
    { value: "not_equals", label: "khác" },
    { value: "contains", label: "chứa" },
    { value: "not_contains", label: "không chứa" },
] as const;

/** All numeric operator options */
export const NUMERIC_OPERATORS = [
    { value: ">", label: ">" },
    { value: "<", label: "<" },
    { value: "=", label: "=" },
    { value: ">=", label: ">=" },
    { value: "<=", label: "<=" },
] as const;

/** Required conditions that should auto-add when entity type is selected */
export function getRequiredConditions(entityType: string): { metric: string; operator: string; textValue: string }[] {
    const map: Record<string, { metric: string; operator: string; textValue: string }[]> = {
        "Bidding Adjustment": [
            { metric: "Placement", operator: "equals", textValue: "Placement Top" },
        ],
        "Keyword": [
            { metric: "Match Type", operator: "equals", textValue: "Broad" },
        ],
        "Negative Keyword": [
            { metric: "Match Type", operator: "equals", textValue: "Negative Exact" },
        ],
    };
    return map[entityType] || [];
}
