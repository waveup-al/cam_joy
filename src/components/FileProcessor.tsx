import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useAppContext } from "../AppContext";
import { AmazonBulkRow, ProcessedChange } from "../types";
import { getEntityDef, getActionDisplayText } from "../lib/entityRegistry";
import { validateActionValue, computeActionValue } from "../lib/entityValidation";
import {
  UploadCloud,
  Play,
  Download,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Users,
  ChevronDown,
  Search,
} from "lucide-react";

const MIN_BID = 0.02;
const MAX_BID = 999.99;
const clampBid = (bid: number) => Math.max(MIN_BID, Math.min(MAX_BID, bid));

type DecimalSeparator = "." | ",";

const detectDecimalSeparator = (rows: AmazonBulkRow[]): DecimalSeparator => {
  for (const row of rows.slice(0, 50)) {
    const bid = row.Bid || row["Ad Group Default Bid"] || "";
    if (bid.includes(",") && !bid.includes(".")) return ",";
    if (bid.includes(".") && !bid.includes(",")) return ".";
  }
  return ".";
};

const formatBid = (value: number, separator: DecimalSeparator): string => {
  const clamped = clampBid(value);
  const str = clamped.toFixed(2);
  return separator === "," ? str.replace(".", ",") : str;
};

interface DetectedOwner {
  name: string;
  count: number;
}

const extractOwner = (portfolioName: string): string => {
  if (!portfolioName || portfolioName.trim() === "") return "";
  const firstToken = portfolioName.trim().split(/\s+/)[0];
  return firstToken || "";
};

export const FileProcessor: React.FC = () => {
  const {
    projects,
    rawData,
    setRawData,
    processedData,
    setProcessedData,
    changes,
    setChanges,
  } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [decimalSep, setDecimalSep] = useState<DecimalSeparator>(".");
  const [selectedOwner, setSelectedOwner] = useState<string>("All");
  const [customOwnerInput, setCustomOwnerInput] = useState<string>("");
  const [useCustomOwner, setUseCustomOwner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [reportDays, setReportDays] = useState<number>(7);

  // Auto-detect owners from Portfolio Name column
  const detectedOwners = useMemo<DetectedOwner[]>(() => {
    if (rawData.length === 0) return [];
    const ownerMap = new Map<string, number>();
    for (const row of rawData) {
      const portfolio = row["Portfolio Name (Informational only)"] || "";
      const owner = extractOwner(portfolio);
      if (owner) {
        ownerMap.set(owner, (ownerMap.get(owner) || 0) + 1);
      }
    }
    return Array.from(ownerMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [rawData]);

  // Get the active owner filter value
  const activeOwnerFilter = useCustomOwner ? customOwnerInput.trim() : selectedOwner;

  // Count rows matching current owner filter
  const filteredRowCount = useMemo(() => {
    if (!activeOwnerFilter || activeOwnerFilter === "All") return rawData.length;
    return rawData.filter(row => {
      const portfolio = row["Portfolio Name (Informational only)"] || "";
      const owner = extractOwner(portfolio);
      return owner.toLowerCase() === activeOwnerFilter.toLowerCase();
    }).length;
  }, [rawData, activeOwnerFilter]);

  const handleClear = () => {
    cancelRef.current = true;
    setRawData([]);
    setProcessedData([]);
    setChanges([]);
    setFileName(null);
    setIsProcessing(false);
    setProcessProgress(0);
    setSelectedOwner("All");
    setCustomOwnerInput("");
    setUseCustomOwner(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    if (file.name.endsWith(".csv")) {
      Papa.parse<AmazonBulkRow>(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: "", // auto-detect: TAB (US), semicolon (EU), comma
        complete: (results) => {
          const sep = detectDecimalSeparator(results.data);
          setDecimalSep(sep);
          if (results.data.length > 0) {
            const cols = Object.keys(results.data[0]);
            setDetectedColumns(cols);
            console.log("[Joy camp] Detected CSV columns:", cols);
          }
          setRawData(results.data);
          setProcessedData([]);
          setChanges([]);
          setIsProcessing(false);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert("Failed to parse file. Please ensure it is a valid CSV.");
          setIsProcessing(false);
        },
      });
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target?.result;
          if (!buffer) throw new Error("File read returned empty result");

          const wb = XLSX.read(buffer, {
            type: "array",
            cellStyles: false,
            cellDates: false,
          });

          let wsname =
            wb.SheetNames.find((n) =>
              n.toLowerCase().includes("sponsored products")
            ) || wb.SheetNames[0];
          const ws = wb.Sheets[wsname];

          if (!ws) throw new Error(`Sheet "${wsname}" not found`);

          const data = XLSX.utils.sheet_to_json(ws, {
            defval: "",
            raw: false,
          }) as AmazonBulkRow[];

          // Amazon bulk files may have metadata header rows — filter them out
          const filtered = data.filter(
            (row) => row.Entity && row.Entity.trim() !== ""
          );

          const finalData = filtered.length > 0 ? filtered : data;

          const sep = detectDecimalSeparator(finalData);
          setDecimalSep(sep);
          if (finalData.length > 0) {
            const cols = Object.keys(finalData[0]);
            setDetectedColumns(cols);
            console.log("[Joy camp] Detected Excel columns:", cols);
            console.log("[Joy camp] Sample row (first Keyword):", finalData.find(r => r.Entity === "Keyword"));
          }
          setRawData(finalData);
          setProcessedData([]);
          setChanges([]);
          setIsProcessing(false);
        } catch (error) {
          console.error("Error parsing Excel:", error);
          alert(
            `Failed to parse Excel file: ${error instanceof Error ? error.message : "Unknown error"}. Check console for details.`,
          );
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        console.error("FileReader error:", reader.error);
        alert("Failed to read file. The file may be too large or corrupted.");
        setIsProcessing(false);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const parseNumber = (val: string | undefined): number => {
    if (!val) return 0;
    const cleaned = val.toString().replace(/[^\d.,-]/g, "");
    const normalized = cleaned.replace(",", ".");
    return parseFloat(normalized) || 0;
  };

  // Flexible column matching: find the best column for a given metric
  const METRIC_COLUMN_MAP: Record<string, string[]> = {
    "ACOS": ["ACOS", "ACoS", "Acos"],
    "Spend": ["Spend", "Cost"],
    "7d Spend": ["7 Day Total Spend", "7d Spend", "Spend"],
    "30d Spend": ["30 Day Total Spend", "30d Spend", "Spend"],
    "Sales": ["Sales", "7 Day Total Sales", "Total Sales"],
    "7d Sales": ["7 Day Total Sales", "7d Sales", "Sales"],
    "30d Sales": ["30 Day Total Sales", "30d Sales", "Sales"],
    "Clicks": ["Clicks"],
    "7d Clicks": ["7 Day Total Clicks", "7d Clicks", "Clicks"],
    "Impressions": ["Impressions"],
    "Orders": ["Orders", "7 Day Total Orders (#)", "7 Day Total Orders"],
    "7d Orders": ["7 Day Total Orders (#)", "7 Day Total Orders", "7d Orders", "Orders"],
    "30d Orders": ["30 Day Total Orders (#)", "30 Day Total Orders", "30d Orders", "Orders"],
    "CPC": ["CPC", "Cost Per Click"],
    "ROAS": ["ROAS", "Return on Ad Spend"],
    "Conversion Rate": ["Conversion Rate", "CVR"],
    "Click-through Rate": ["Click-through Rate", "CTR", "Click-Thru Rate"],
    "Units": ["Units", "Total Units"],
  };

  // Derived metrics: computed from combinations of columns
  const resolveDerivedMetric = (row: AmazonBulkRow, metric: string): number | null => {
    const p = (v: string | undefined) => parseNumber(v);
    switch (metric) {
      case "Spend % of Budget": {
        const budget = p(row["Daily Budget"]);
        if (!budget) return null;
        return (p(row["Spend"]) / budget) * 100;
      }
      case "Spend % of Budget (7d)": {
        const budget = p(row["Daily Budget"]);
        if (!budget) return null;
        const spend7d = p(row["7 Day Total Spend"] || row["7d Spend"] || row["Spend"]);
        return (spend7d / (budget * 7)) * 100;
      }
      case "Avg Daily Spend": {
        const days = reportDays > 0 ? reportDays : 7;
        return p(row["Spend"]) / days;
      }
      default:
        return null;
    }
  };

  const resolveColumnValue = (row: AmazonBulkRow, metric: string): number => {
    // 0. Check derived metrics first
    const derived = resolveDerivedMetric(row, metric);
    if (derived !== null) return derived;

    // 1. Try exact match from our map
    const candidates = METRIC_COLUMN_MAP[metric];
    if (candidates) {
      for (const col of candidates) {
        if (row[col] !== undefined && row[col] !== "") {
          return parseNumber(row[col]);
        }
      }
    }

    // 2. Try exact match on metric name itself
    if (row[metric] !== undefined && row[metric] !== "") {
      return parseNumber(row[metric]);
    }

    // 3. Fuzzy match: case-insensitive partial match against all columns
    const metricLower = metric.toLowerCase().replace(/[^a-z]/g, "");
    for (const key of Object.keys(row)) {
      const keyLower = key.toLowerCase().replace(/[^a-z]/g, "");
      if (keyLower === metricLower && row[key] !== undefined && row[key] !== "") {
        return parseNumber(row[key]);
      }
    }

    return 0;
  };

  const evaluateCondition = (
    row: AmazonBulkRow,
    metric: string,
    operator: string,
    value: number,
    textValue?: string,
  ): boolean => {
    // Text-based conditions
    if (["equals", "not_equals", "contains", "not_contains"].includes(operator)) {
      const cellValue = (row[metric] || "").toString().trim().toLowerCase();
      const compareValue = (textValue || "").trim().toLowerCase();
      switch (operator) {
        case "equals": return cellValue === compareValue;
        case "not_equals": return cellValue !== compareValue;
        case "contains": return cellValue.includes(compareValue);
        case "not_contains": return !cellValue.includes(compareValue);
        default: return false;
      }
    }

    // Numeric conditions
    const rowValue = resolveColumnValue(row, metric);
    switch (operator) {
      case ">": return rowValue > value;
      case "<": return rowValue < value;
      case "=": return rowValue === value;
      case ">=": return rowValue >= value;
      case "<=": return rowValue <= value;
      default: return false;
    }
  };

  const processFile = useCallback(() => {
    if (rawData.length === 0) return;

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) {
      alert("Please select a valid project first.");
      return;
    }

    const activeRules = project.rules.filter((r) => r.isActive);
    if (activeRules.length === 0) {
      alert("No active rules found in the selected project.");
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);
    cancelRef.current = false;

    // Determine owner filter
    const ownerFilter = activeOwnerFilter && activeOwnerFilter !== "All" ? activeOwnerFilter.toLowerCase() : null;

    // === PRE-PASS: Build placement orders map ===
    // Map: campaignId -> { placement -> orders }
    const placementOrdersMap = new Map<string, Record<string, number>>();
    for (const row of rawData) {
      if ((row.Entity || "").trim().toLowerCase() !== "bidding adjustment") continue;
      const campId = row["Campaign ID"] || row["Campaign Name"] || "";
      const placement = (row.Placement || "").trim();
      const orders = parseNumber(row["Orders"] || row["7 Day Total Orders (#)"] || "0");
      if (!campId || !placement) continue;
      if (!placementOrdersMap.has(campId)) placementOrdersMap.set(campId, {});
      placementOrdersMap.get(campId)![placement] = orders;
    }

    const CHUNK_SIZE = 2000;
    const totalRows = rawData.length;
    const newData: AmazonBulkRow[] = new Array(totalRows);
    const newChanges: ProcessedChange[] = [];
    let chunkIndex = 0;
    let skippedCount = 0;

    const VALID_ENTITIES = ["campaign", "bidding adjustment", "ad group", "product ad", "keyword", "product targeting", "negative keyword", "negative product targeting"];

    const normalizeEntity = (entity: string | undefined): string => {
      if (!entity || entity.trim() === "") return "";
      return entity.trim().toLowerCase();
    };

    const processChunk = () => {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalRows);

      for (let index = start; index < end; index++) {
        const row = rawData[index];
        let updatedRow = { ...row };
        let rowChanged = false;
        let appliedRuleName = "";
        let appliedActionDesc = "";
        let changeTargetField = "";
        let changeOldValue = "";
        let changeNewValue = "";
        let validationWarn: string | undefined;

        // Owner filter: skip rows not matching selected owner
        if (ownerFilter) {
          const portfolio = row["Portfolio Name (Informational only)"] || "";
          const rowOwner = extractOwner(portfolio).toLowerCase();
          if (rowOwner !== ownerFilter) {
            newData[index] = updatedRow;
            skippedCount++;
            continue;
          }
        }

        const rowEntity = normalizeEntity(row.Entity);

        if (rowEntity !== "" && !VALID_ENTITIES.includes(rowEntity)) {
          newData[index] = updatedRow;
          skippedCount++;
          continue;
        }

        for (const rule of activeRules) {
          const ruleEntity = normalizeEntity(rule.entityType);
          if (ruleEntity !== "all" && rowEntity !== "" && ruleEntity !== rowEntity) {
            continue;
          }

          const conditionsMet = rule.conditions.every((cond) =>
            evaluateCondition(updatedRow, cond.metric, cond.operator, cond.value, cond.textValue),
          );

          if (conditionsMet) {
            rowChanged = true;
            appliedRuleName = rule.name;
            const action = rule.action;
            const targetField = action.targetField || "Bid";

            if (action.type === "pause") {
              changeTargetField = "State";
              changeOldValue = updatedRow.State || "enabled";
              updatedRow.State = "paused";
              changeNewValue = "paused";
              appliedActionDesc = "⏸ Paused";
            } else if (action.type === "enable") {
              changeTargetField = "State";
              changeOldValue = updatedRow.State || "paused";
              updatedRow.State = "enabled";
              changeNewValue = "enabled";
              appliedActionDesc = "▶ Enabled";
            } else if (action.type === "boost_best_placement") {
              // Boost placement có orders cao nhất trong campaign
              const campId = updatedRow["Campaign ID"] || updatedRow["Campaign Name"] || "";
              const placementMap = placementOrdersMap.get(campId) || {};
              const currentPlacement = (updatedRow.Placement || "").trim();
              const bestPlacement = Object.entries(placementMap)
                .sort(([, a], [, b]) => b - a)[0]?.[0];
              if (bestPlacement && bestPlacement === currentPlacement) {
                changeTargetField = "Percentage";
                changeOldValue = updatedRow.Percentage || "0";
                const currentPct = parseNumber(updatedRow.Percentage);
                const boostPct = action.boostPercent ?? 15;
                const newPct = Math.round(currentPct + boostPct);
                updatedRow.Percentage = String(Math.min(900, newPct));
                changeNewValue = updatedRow.Percentage;
                appliedActionDesc = `🎯 Boost best placement +${boostPct}%`;
              } else {
                // Không phải best placement, skip
                rowChanged = false;
              }
            } else if (action.type === "tiered_increase" || action.value !== undefined) {
              changeTargetField = targetField;
              const currentVal = parseNumber(updatedRow[targetField]);
              changeOldValue = updatedRow[targetField] || "0";

              const rawNewVal = computeActionValue(currentVal, action);
              const validation = validateActionValue(row.Entity, targetField, rawNewVal);
              validationWarn = validation.warning;

              updatedRow[targetField] = formatBid(validation.clampedValue, decimalSep);
              changeNewValue = updatedRow[targetField];
              appliedActionDesc = getActionDisplayText(action);
            }

            if (updatedRow.Operation !== "Create") {
              updatedRow.Operation = "Update";
            }
            break;
          }
        }

        if (rowChanged) {
          const campaignName = row["Campaign Name"] || row["Campaign Name (Informational only)"] || "";
          const adGroupName = row["Ad Group Name"] || row["Ad Group Name (Informational only)"] || "";
          newChanges.push({
            rowId: index,
            entityType: row.Entity,
            name:
              row["Keyword Text"] ||
              row["Product Targeting Expression"] ||
              row["Campaign Name"] ||
              row["Ad Group Name"] ||
              row.SKU ||
              "Unknown",
            targetField: changeTargetField,
            oldValue: changeOldValue,
            newValue: changeNewValue,
            ruleApplied: appliedRuleName,
            actionDescription: appliedActionDesc,
            campaignName,
            adGroupName,
            validationWarning: validationWarn,
          });
        }

        newData[index] = updatedRow;
      }

      const progress = Math.round((end / totalRows) * 100);
      setProcessProgress(progress);

      if (cancelRef.current) {
        setIsProcessing(false);
        setProcessProgress(0);
        return;
      }

      if (end < totalRows) {
        chunkIndex++;
        requestAnimationFrame(processChunk);
      } else {
        console.log(`[AutoCamp] Processing complete:`, {
          totalRows,
          skipped: skippedCount,
          evaluated: totalRows - skippedCount,
          changesFound: newChanges.length,
          entityBreakdown: rawData.reduce((acc, r) => {
            const e = r.Entity || "(empty)";
            acc[e] = (acc[e] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        });
        if (newChanges.length > 0) {
          console.log("[AutoCamp] Sample change:", newChanges[0]);
        }
        setProcessedData(newData);
        setChanges(newChanges);
        setIsProcessing(false);
        setProcessProgress(100);
      }
    };

    requestAnimationFrame(processChunk);
  }, [rawData, projects, selectedProjectId, decimalSep, activeOwnerFilter, setProcessedData, setChanges]);

  const downloadFile = () => {
    if (processedData.length === 0) return;

    if (fileName && fileName.endsWith(".xlsx")) {
      const ws = XLSX.utils.json_to_sheet(processedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sponsored Products Campaigns");
      XLSX.writeFile(wb, `joycamp_processed_${new Date().getTime()}.xlsx`);
    } else {
      const csv = Papa.unparse(processedData, {
        delimiter: ";",
        header: true,
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `joycamp_processed_${new Date().getTime()}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          File Processor
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-500" />
              1. Upload Bulk File
            </h2>

            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
              />
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                {fileName ? fileName : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-slate-500">CSV or XLSX up to 50MB</p>
            </div>

            {rawData.length > 0 && (
              <div className="mt-4 flex items-center justify-between text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">
                    Loaded {rawData.length} rows successfully
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleClear(); }}
                  className="flex items-center gap-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors text-xs font-semibold"
                  title="Clear file and reset"
                >
                  <XCircle className="w-4 h-4" />
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Owner Filter Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              JOY's Owner
            </h2>

            {/* Toggle: Dropdown vs Custom Input */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => { setUseCustomOwner(false); setCustomOwnerInput(""); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!useCustomOwner
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                  }`}
              >
                Chọn Owner
              </button>
              <button
                onClick={() => { setUseCustomOwner(true); setSelectedOwner("All"); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${useCustomOwner
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                  }`}
              >
                Nhập tên mới
              </button>
            </div>

            {!useCustomOwner ? (
              /* Dropdown mode */
              <div className="relative">
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none appearance-none cursor-pointer"
                >
                  <option value="All">🌐 All — Tất cả ({rawData.length} rows)</option>
                  {detectedOwners.map(owner => (
                    <option key={owner.name} value={owner.name}>
                      👤 {owner.name} ({owner.count} rows)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              /* Custom input mode */
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customOwnerInput}
                  onChange={(e) => setCustomOwnerInput(e.target.value)}
                  placeholder="Nhập tên owner (VD: THG, Long...)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Filtering info */}
            {rawData.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={`font-medium ${activeOwnerFilter && activeOwnerFilter !== "All"
                  ? "text-amber-700"
                  : "text-slate-500"
                  }`}>
                  {activeOwnerFilter && activeOwnerFilter !== "All"
                    ? `🔍 Lọc: ${filteredRowCount} / ${rawData.length} rows`
                    : `📊 Tổng: ${rawData.length} rows`
                  }
                </span>
                {activeOwnerFilter && activeOwnerFilter !== "All" && filteredRowCount === 0 && (
                  <span className="text-rose-500 font-medium">⚠️ Không tìm thấy</span>
                )}
              </div>
            )}

            {/* Owner chips for quick reference */}
            {detectedOwners.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {detectedOwners.slice(0, 8).map(owner => (
                  <button
                    key={owner.name}
                    onClick={() => {
                      setUseCustomOwner(false);
                      setSelectedOwner(owner.name);
                    }}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all border ${!useCustomOwner && selectedOwner === owner.name
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                  >
                    {owner.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Process Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-blue-500" />
              2. Apply Rules
            </h2>
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Project:</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.rules.length} rules)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report bao nhiêu ngày:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={reportDays}
                    onChange={(e) => setReportDays(Math.max(1, parseInt(e.target.value) || 7))}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span className="text-xs text-slate-500">ngày (cho metric Avg Daily Spend)</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Run the rule engine against the uploaded data. This will evaluate{" "}
                {projects.find(p => p.id === selectedProjectId)?.rules.filter((r) => r.isActive).length || 0} active rules.
              </p>
            </div>
            <button
              onClick={processFile}
              disabled={rawData.length === 0 || isProcessing || !selectedProjectId}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${rawData.length === 0 || !selectedProjectId
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                }`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing... {processProgress}%
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Run Processor
                </>
              )}
            </button>
            {isProcessing && (
              <div className="mt-3 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                  style={{ width: `${processProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Download Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-500" />
              3. Export Results
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Download the modified bulk file ready to be uploaded back to
              Amazon Seller Central.
            </p>
            <button
              onClick={downloadFile}
              disabled={processedData.length === 0}
              className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${processedData.length === 0
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20"
                }`}
            >
              <Download className="w-5 h-5" />
              Download Bulk File
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-8rem)]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">
              Changes Preview
            </h2>
            {processedData.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                {rawData.length} rows processed
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto p-0">
            {processedData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 p-8">
                <AlertCircle className="w-12 h-12 text-slate-300" />
                <p className="text-center font-medium">
                  No data processed yet.
                  <br />
                  Upload a file and run the processor to see changes.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm text-left text-slate-500">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-4 py-4">#</th>
                    <th className="px-4 py-4">Entity</th>
                    <th className="px-4 py-4">Campaign / Ad Group</th>
                    <th className="px-4 py-4">Name</th>
                    <th className="px-4 py-4">Rule</th>
                    <th className="px-4 py-4">Field</th>
                    <th className="px-4 py-4">Change</th>
                    <th className="px-4 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changes.length > 0 ? (
                    changes.slice(0, 200).map((change) => (
                      <tr
                        key={change.rowId}
                        className={`hover:bg-slate-50 ${change.validationWarning ? "bg-amber-50/40" : "bg-emerald-50/30"}`}
                      >
                        <td className="px-3 py-3 text-slate-400 text-xs">
                          {change.rowId + 1}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-900">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                            {change.entityType}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500 max-w-[160px]">
                          {change.campaignName && (
                            <div className="truncate" title={change.campaignName}>
                              🏢 {change.campaignName}
                            </div>
                          )}
                          {change.adGroupName && (
                            <div className="truncate text-slate-400" title={change.adGroupName}>
                              📦 {change.adGroupName}
                            </div>
                          )}
                        </td>
                        <td
                          className="px-3 py-3 truncate max-w-[150px] text-xs"
                          title={change.name}
                        >
                          {change.name}
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-md border border-amber-100">
                            {change.ruleApplied}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {change.targetField}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {change.oldValue !== change.newValue ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="line-through text-slate-400">
                                  {change.oldValue}
                                </span>
                                <span className="text-slate-300">→</span>
                                <span className="text-emerald-600 font-bold">
                                  {change.newValue}
                                </span>
                              </div>
                              {change.validationWarning && (
                                <div className="text-[10px] text-amber-600 flex items-center gap-1" title={change.validationWarning}>
                                  ⚠️ clamped
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {change.actionDescription ? (
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-md border ${change.actionDescription.includes("↑")
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : change.actionDescription.includes("↓")
                                  ? "bg-orange-50 text-orange-700 border-orange-200"
                                  : change.actionDescription.includes("Paused")
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : change.actionDescription.includes("Enabled")
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-slate-50 text-slate-700 border-slate-200"
                                }`}
                            >
                              {change.actionDescription}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        No changes detected. All rows passed through without modification.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          {processedData.length > 0 && (() => {
            const entityCounts = rawData.reduce((acc, r) => {
              const e = r.Entity || "Other";
              acc[e] = (acc[e] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            // Changes breakdown by entity
            const changesByEntity = changes.reduce((acc, c) => {
              acc[c.entityType] = (acc[c.entityType] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            // Changes breakdown by action type
            const changesByAction = changes.reduce((acc, c) => {
              const key = c.actionDescription.includes("↑") ? "📈 Increased"
                : c.actionDescription.includes("↓") ? "📉 Decreased"
                  : c.actionDescription.includes("Paused") ? "⏸ Paused"
                    : c.actionDescription.includes("Enabled") ? "▶ Enabled"
                      : c.actionDescription.includes("=") ? "💲 Set" : "Other";
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);

            const warningCount = changes.filter(c => c.validationWarning).length;

            return (
              <div className="p-4 border-t border-slate-100 text-sm text-slate-500 bg-slate-50 space-y-2">
                <div className="flex justify-between items-center">
                  <span>
                    <strong className="text-slate-700">{changes.length}</strong> changes out of{" "}
                    <strong className="text-slate-700">{processedData.length}</strong> rows
                    {changes.length > 200 && " (showing first 200)"}
                  </span>
                  <span className="text-xs text-slate-400">Format: {decimalSep === "," ? "EU (comma)" : "US (dot)"}</span>
                </div>

                {/* Changes by entity type */}
                {Object.keys(changesByEntity).length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-slate-400">Changes:</span>
                    {Object.entries(changesByEntity).map(([entity, count]) => (
                      <span key={entity} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                        {entity}: {count}
                      </span>
                    ))}
                  </div>
                )}

                {/* Changes by action type */}
                {Object.keys(changesByAction).length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-slate-400">Actions:</span>
                    {Object.entries(changesByAction).map(([action, count]) => (
                      <span key={action} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                        {action}: {count}
                      </span>
                    ))}
                  </div>
                )}

                {/* Validation warnings */}
                {warningCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                    ⚠️ <strong>{warningCount}</strong> values were clamped to stay within allowed limits
                  </div>
                )}

                {/* Entity breakdown of raw data */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="text-slate-400">Entities:</span>
                  {Object.entries(entityCounts).map(([entity, count]) => (
                    <span key={entity} className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md">
                      {entity}: {count}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
