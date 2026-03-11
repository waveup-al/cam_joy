import React, { useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Search, Upload, Play, Download, Plus, Trash2, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

// ===== TYPES =====
interface SearchTermRow {
    [key: string]: string;
}

interface SearchTermRule {
    id: string;
    name: string;
    action: "add_negative_exact" | "add_keyword_broad" | "add_keyword_exact" | "add_keyword_phrase";
    conditions: {
        clicksMin?: number;
        clicksMax?: number;
        ordersMin?: number;
        ordersMax?: number;
        acosMax?: number;
        acosMin?: number;
    };
    matchType?: string;
}

interface GeneratedRow {
    action: string;
    searchTerm: string;
    campaignName: string;
    adGroupName: string;
    matchType: string;
    reason: string;
}

// ===== DEFAULT RULES =====
const DEFAULT_RULES: SearchTermRule[] = [
    {
        id: "r1",
        name: "Clicks ≥15, Orders=0 → Negative Exact",
        action: "add_negative_exact",
        conditions: { clicksMin: 15, ordersMax: 0 },
    },
    {
        id: "r2",
        name: "Orders ≥2, Clicks >10, ACOS <30% → Add KW Exact",
        action: "add_keyword_exact",
        conditions: { ordersMin: 2, clicksMin: 10, acosMax: 30 },
    },
];

// ===== HELPERS =====
const parseNum = (v: string | undefined): number => {
    if (!v) return 0;
    return parseFloat(v.toString().replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
};

const resolveCol = (row: SearchTermRow, candidates: string[]): string => {
    for (const c of candidates) {
        if (row[c] !== undefined && row[c] !== "") return row[c];
    }
    return "";
};

const getMetrics = (row: SearchTermRow) => ({
    clicks: parseNum(resolveCol(row, ["Clicks", "clicks"])),
    orders: parseNum(resolveCol(row, ["Orders", "7 Day Total Orders (#)", "7 Day Total Orders"])),
    spend: parseNum(resolveCol(row, ["Spend", "Cost"])),
    sales: parseNum(resolveCol(row, ["Sales", "7 Day Total Sales", "14 Day Total Sales"])),
    acos: parseNum(resolveCol(row, ["ACOS", "ACoS"])) ||
        (() => {
            const spend = parseNum(resolveCol(row, ["Spend"]));
            const sales = parseNum(resolveCol(row, ["Sales", "7 Day Total Sales"]));
            return sales > 0 ? (spend / sales) * 100 : 0;
        })(),
    searchTerm: resolveCol(row, ["Customer Search Term", "Search Term", "Targeting", "Keyword"]),
    campaignName: resolveCol(row, ["Campaign Name", "Campaign"]),
    adGroupName: resolveCol(row, ["Ad Group Name", "Ad Group"]),
});

// ===== MAIN COMPONENT =====
export const SearchTermProcessor: React.FC = () => {
    const [rawData, setRawData] = useState<SearchTermRow[]>([]);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rules, setRules] = useState<SearchTermRule[]>(DEFAULT_RULES);
    const [generated, setGenerated] = useState<GeneratedRow[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lookbackDays, setLookbackDays] = useState(30);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ===== FILE UPLOAD =====
    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);

        if (file.name.endsWith(".csv")) {
            Papa.parse<SearchTermRow>(file, {
                header: true,
                skipEmptyLines: true,
                delimiter: "",
                complete: (r) => { setRawData(r.data); setGenerated([]); },
            });
        } else {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const wb = XLSX.read(evt.target?.result, { type: "array" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }) as SearchTermRow[];
                setRawData(data);
                setGenerated([]);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    // ===== PROCESS RULES =====
    const processRules = () => {
        if (rawData.length === 0) return;
        setIsProcessing(true);

        const results: GeneratedRow[] = [];

        for (const row of rawData) {
            const m = getMetrics(row);
            if (!m.searchTerm) continue;

            for (const rule of rules) {
                const c = rule.conditions;
                let match = true;
                if (c.clicksMin !== undefined && m.clicks < c.clicksMin) match = false;
                if (c.clicksMax !== undefined && m.clicks > c.clicksMax) match = false;
                if (c.ordersMin !== undefined && m.orders < c.ordersMin) match = false;
                if (c.ordersMax !== undefined && m.orders > c.ordersMax) match = false;
                if (c.acosMax !== undefined && m.acos > c.acosMax) match = false;
                if (c.acosMin !== undefined && m.acos < c.acosMin) match = false;

                if (match) {
                    const actionLabels: Record<string, string> = {
                        add_negative_exact: "Negative Exact",
                        add_keyword_broad: "Broad",
                        add_keyword_exact: "Exact",
                        add_keyword_phrase: "Phrase",
                    };
                    results.push({
                        action: rule.action,
                        searchTerm: m.searchTerm,
                        campaignName: m.campaignName,
                        adGroupName: m.adGroupName,
                        matchType: actionLabels[rule.action] || rule.action,
                        reason: rule.name,
                    });
                    break; // chỉ áp dụng rule đầu tiên match
                }
            }
        }

        setGenerated(results);
        setIsProcessing(false);
    };

    // ===== DOWNLOAD (tạo file có thể import vào Amazon Bulk) =====
    const downloadResults = () => {
        if (generated.length === 0) return;

        // Group negative và keyword riêng
        const negatives = generated.filter(r => r.action === "add_negative_exact");
        const keywords = generated.filter(r => r.action.startsWith("add_keyword"));

        const rows = [
            ...negatives.map(r => ({
                "Action": "Add",
                "Campaign Name": r.campaignName,
                "Ad Group Name": r.adGroupName,
                "Keyword": r.searchTerm,
                "Match Type": "Negative Exact",
                "Note (Rule)": r.reason,
            })),
            ...keywords.map(r => ({
                "Action": "Add",
                "Campaign Name": r.campaignName,
                "Ad Group Name": r.adGroupName,
                "Keyword": r.searchTerm,
                "Match Type": r.matchType,
                "Bid": "0.50",
                "Note (Rule)": r.reason,
            })),
        ];

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Search Term Actions");
        XLSX.writeFile(wb, `search_term_actions_${Date.now()}.xlsx`);
    };

    // ===== RULE EDITOR =====
    const addRule = () => {
        const newRule: SearchTermRule = {
            id: Math.random().toString(),
            name: "New Search Term Rule",
            action: "add_negative_exact",
            conditions: { clicksMin: 15, ordersMax: 0 },
        };
        setRules([...rules, newRule]);
    };

    const updateRule = (id: string, patch: Partial<SearchTermRule>) => {
        setRules(rules.map(r => r.id === id ? { ...r, ...patch } : r));
    };

    const updateCondition = (id: string, field: string, val: number | undefined) => {
        setRules(rules.map(r => r.id === id
            ? { ...r, conditions: { ...r.conditions, [field]: val } }
            : r
        ));
    };

    const deleteRule = (id: string) => setRules(rules.filter(r => r.id !== id));

    // ===== STATS =====
    const stats = useMemo(() => ({
        negatives: generated.filter(r => r.action === "add_negative_exact").length,
        keywords: generated.filter(r => r.action.startsWith("add_keyword")).length,
    }), [generated]);

    return (
        <div className="p-8 space-y-8 bg-slate-50 min-h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Search Term Analyzer</h1>
                    <p className="text-slate-500 mt-1">Upload Search Term Report → Tự động tạo Negative KW & Add KW</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Upload + Config */}
                <div className="space-y-6">
                    {/* Upload */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <Upload className="w-5 h-5 text-emerald-500" />
                            1. Upload Search Term Report
                        </h2>
                        <div
                            className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" accept=".csv,.xlsx" onChange={handleUpload} className="hidden" />
                            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-slate-700">{fileName ?? "Click để chọn file"}</p>
                            <p className="text-xs text-slate-500 mt-1">Search Term Report (CSV/XLSX)</p>
                        </div>
                        {rawData.length > 0 && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="font-medium">Đã load {rawData.length} search terms</span>
                                <button onClick={() => { setRawData([]); setFileName(null); setGenerated([]); }} className="ml-auto text-rose-500 hover:text-rose-700">
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="text-xs font-medium text-slate-600">Lookback window:</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="number" min={7} max={90} value={lookbackDays}
                                    onChange={(e) => setLookbackDays(parseInt(e.target.value) || 30)}
                                    className="w-16 border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <span className="text-xs text-slate-500">ngày (thông tin only)</span>
                            </div>
                        </div>
                    </div>

                    {/* Process + Download */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Play className="w-5 h-5 text-blue-500" />
                            2. Chạy & Export
                        </h2>
                        <button
                            onClick={processRules}
                            disabled={rawData.length === 0 || isProcessing}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${rawData.length === 0 ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"}`}
                        >
                            <Play className="w-4 h-4" />
                            Analyze {rawData.length} Search Terms
                        </button>
                        {generated.length > 0 && (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-bold text-rose-700">{stats.negatives}</div>
                                        <div className="text-xs text-rose-600 font-medium">Negative KW</div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-bold text-emerald-700">{stats.keywords}</div>
                                        <div className="text-xs text-emerald-600 font-medium">Add KW</div>
                                    </div>
                                </div>
                                <button
                                    onClick={downloadResults}
                                    className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Actions XLSX
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Rules + Results */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Rules */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Search className="w-5 h-5 text-slate-500" />
                                Rules ({rules.length})
                            </h2>
                            <button onClick={addRule} className="flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-all border border-emerald-200">
                                <Plus className="w-4 h-4" />
                                Thêm Rule
                            </button>
                        </div>
                        <div className="space-y-4">
                            {rules.map((rule) => (
                                <div key={rule.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <input
                                            value={rule.name}
                                            onChange={(e) => updateRule(rule.id, { name: e.target.value })}
                                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                        <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium">Clicks (min)</label>
                                            <input type="number" value={rule.conditions.clicksMin ?? ""} placeholder="–"
                                                onChange={(e) => updateCondition(rule.id, "clicksMin", e.target.value ? +e.target.value : undefined)}
                                                className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium">Orders (max)</label>
                                            <input type="number" value={rule.conditions.ordersMax ?? ""} placeholder="–"
                                                onChange={(e) => updateCondition(rule.id, "ordersMax", e.target.value ? +e.target.value : undefined)}
                                                className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium">Orders (min)</label>
                                            <input type="number" value={rule.conditions.ordersMin ?? ""} placeholder="–"
                                                onChange={(e) => updateCondition(rule.id, "ordersMin", e.target.value ? +e.target.value : undefined)}
                                                className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 font-medium">ACOS max (%)</label>
                                            <input type="number" value={rule.conditions.acosMax ?? ""} placeholder="–"
                                                onChange={(e) => updateCondition(rule.id, "acosMax", e.target.value ? +e.target.value : undefined)}
                                                className="w-full mt-0.5 border border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none bg-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-medium block mb-1">Hành động</label>
                                        <select
                                            value={rule.action}
                                            onChange={(e) => updateRule(rule.id, { action: e.target.value as SearchTermRule["action"] })}
                                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                        >
                                            <option value="add_negative_exact">🚫 Add Negative Exact</option>
                                            <option value="add_keyword_exact">🔑 Add KW — Exact</option>
                                            <option value="add_keyword_phrase">🔑 Add KW — Phrase</option>
                                            <option value="add_keyword_broad">🔑 Add KW — Broad</option>
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Results Table */}
                    {generated.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
                            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-900">Kết quả ({generated.length} actions)</h2>
                                <span className="text-xs text-slate-500">{stats.negatives} negative · {stats.keywords} keyword</span>
                            </div>
                            <div className="overflow-auto max-h-96">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Hành động</th>
                                            <th className="px-4 py-3">Search Term</th>
                                            <th className="px-4 py-3">Campaign / Ad Group</th>
                                            <th className="px-4 py-3">Match Type</th>
                                            <th className="px-4 py-3">Rule</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {generated.map((row, i) => (
                                            <tr key={i} className={`hover:bg-slate-50 ${row.action === "add_negative_exact" ? "bg-rose-50/30" : "bg-emerald-50/20"}`}>
                                                <td className="px-4 py-2.5">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.action === "add_negative_exact" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                                                        {row.action === "add_negative_exact" ? "🚫 Negative" : "🔑 Add KW"}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 font-medium text-slate-900 max-w-[200px] truncate">{row.searchTerm}</td>
                                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                                    <div className="truncate max-w-[150px]">{row.campaignName}</div>
                                                    <div className="truncate max-w-[150px] text-slate-400">{row.adGroupName}</div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">{row.matchType}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[180px] truncate">{row.reason}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {generated.length === 0 && rawData.length > 0 && (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500">Nhấn "Analyze" để xử lý search terms theo rules đã cấu hình</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
