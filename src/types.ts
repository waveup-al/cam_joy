// ===== ENTITY REGISTRY TYPES =====
export interface EditableField {
  key: string;
  label: string;
  type: "number" | "state";
  min?: number;
  max?: number;
  unit?: string;
}

export interface ActionTemplate {
  id: string;
  label: string;
  targetField: string;
  operations: ("increase" | "decrease" | "set" | "tiered_increase" | "boost_best_placement")[];
  supportsPercentage: boolean;
}

export interface ConditionField {
  key: string;
  label: string;
  type: "select" | "text";
  options?: string[];
  group: string;
}

export interface EntityDefinition {
  type: string;
  label: string;
  icon: string;
  level: number;
  description: string;
  parentType?: string;
  editableFields: EditableField[];
  availableActions: ActionTemplate[];
  filterFields: ConditionField[];
}

// ===== RULE TYPES =====
export interface RuleCondition {
  id: string;
  metric: string;
  operator: ">" | "<" | "=" | ">=" | "<=" | "equals" | "not_equals" | "contains" | "not_contains";
  value: number;
  textValue?: string;
}

export interface BudgetTier {
  maxBudget: number;  // nếu budget <= maxBudget thì dùng % này
  increasePercent: number;
}

export interface RuleAction {
  type: "increase" | "decrease" | "set" | "pause" | "enable" | "tiered_increase" | "boost_best_placement";
  targetField: string;
  value?: number;
  unit?: "%" | "$";
  tiers?: BudgetTier[];  // dùng cho tiered_increase
  boostPercent?: number; // dùng cho boost_best_placement
}

export interface Rule {
  id: string;
  name: string;
  entityType: string;
  conditions: RuleCondition[];
  action: RuleAction;
  isActive: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  rules: Rule[];
  reportDays?: number; // số ngày của report (để tính avg daily spend)
}

// ===== DATA TYPES =====
export interface AmazonBulkRow {
  Product: string;
  Entity: string;
  Operation: string;
  "Campaign ID": string;
  "Ad Group ID": string;
  "Portfolio ID": string;
  "Ad ID": string;
  "Keyword ID": string;
  "Product Targeting ID": string;
  "Campaign Name": string;
  "Ad Group Name": string;
  "Campaign Name (Informational only)": string;
  "Ad Group Name (Informational only)": string;
  "Portfolio Name (Informational only)": string;
  "Start Date": string;
  "End Date": string;
  "Targeting Type": string;
  State: string;
  "Campaign State (Informational only)": string;
  "Ad Group State (Informational only)": string;
  "Daily Budget": string;
  SKU: string;
  "ASIN (Informational only)": string;
  "Eligibility Status (Informational only)": string;
  "Reason for Ineligibility (Informational only)": string;
  "Ad Group Default Bid": string;
  "Ad Group Default Bid (Informational only)": string;
  Bid: string;
  "Keyword Text": string;
  "Native Language Keyword": string;
  "Native Language Locale": string;
  "Match Type": string;
  "Bidding Strategy": string;
  Placement: string;
  Percentage: string;
  "Product Targeting Expression": string;
  "Resolved Product Targeting Expression (Informational only)": string;
  "Audience ID": string;
  "Shopper Cohort Percentage": string;
  "Shopper Cohort Type": string;
  "Segment Name": string;
  Sites: string;
  Impressions: string;
  Clicks: string;
  "Click-through Rate": string;
  Spend: string;
  Sales: string;
  Orders: string;
  Units: string;
  "Conversion Rate": string;
  ACOS: string;
  CPC: string;
  ROAS: string;
  [key: string]: string;
}

export interface ProcessedChange {
  rowId: number;
  entityType: string;
  name: string;
  targetField: string;
  oldValue: string;
  newValue: string;
  ruleApplied: string;
  actionDescription: string;
  campaignName: string;
  adGroupName: string;
  validationWarning?: string;
}
