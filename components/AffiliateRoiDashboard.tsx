"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, TrendingUp, TrendingDown, FileSpreadsheet, DollarSign, PieChart, Loader2, Sparkles, Lightbulb, TriangleAlert, FileText, ArrowDownToLine, ShoppingCart, Percent, Calculator, ListTree, ShoppingBag, ChevronDown, ChevronUp, Plus, Trash2, Filter } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { DashboardNavbar } from "@/components/DashboardNavbar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

declare global {
    interface Window {
        Papa: any;
        XLSX: any;
    }
}

/**
 * Affiliate ROI Dashboard
 * - Client-side only (no backend). Upload CSV/Excel from Shopee Affiliate.
 * - Auto-detects Thai column names (Sub_id1..5, ค่าคอมมิชชั่นสุทธิ(฿), เวลาที่สั่งซื้อ, สถานะการสั่งซื้อ, ชื่อรายการสินค้า)
 * - Lets you key in Ad Spend and Other Costs per SubID and calculates Profit/ROI.
 * - Shows KPIs, charts, tables, and plain-language insights & recommendations.
 *
 * Styling: Tailwind + shadcn/ui, charts: recharts
 *
 * Note: Styling has been updated to use a soft, pastel color palette for a clean and user-friendly look.
 */

// --- Helpers ---------------------------------------------------------------
const toNumber = (v: any) => {
    if (v === null || v === undefined) return 0;
    if (typeof v === "number") return isFinite(v) ? v : 0;
    let s = String(v).trim();
    if (!s) return 0;
    s = s.replace(/[,]/g, ""); // remove thousands
    s = s.replace(/%$/, "");
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
};

const pretty = (n: any, digits = 2) => {
    if (n === null || n === undefined || isNaN(n)) return "0";
    return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
};

const prettyBaht = (n: any) => `฿${pretty(n, 2)}`;
const prettyPercent = (n: any) => `${(n * 100).toFixed(2)}%`;

// FIXED: Adjusted date parsing to avoid timezone issues.
// This function now correctly extracts year, month, and day based on the local date.
const dateOnly = (isoLike: any) => {
    if (!isoLike) return "";

    // Convert to string once
    const s = String(isoLike).trim();

    // Try to extract YYYY-MM-DD directly from string to avoid timezone shifts
    // Matches 2025-12-01, 2025/12/01, etc.
    const ymdMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
    }

    // Fallback to Date object parsing
    const d = new Date(isoLike);
    if (isNaN(d.getTime())) return s.slice(0, 10);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Extract the first non-empty Sub_id* value
const extractSubId = (row: any, subKeys: any) => {
    for (const k of subKeys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
    return "(no-subid)";
};

// Detect channel from SubID
const detectChannel = (subId: string): string => {
    if (!subId || subId === "(no-subid)") return "Others";
    const lower = subId.toLowerCase();

    if (lower.includes("fb") || lower.includes("facebook")) return "Facebook";
    if (lower.includes("line")) return "Line";
    if (lower.includes("shopee") || lower.includes("video")) return "Shopeevideo-Shopee";

    return "Others";
};

// --- Default mappings for Shopee Affiliate (TH) ---------------------------
const DEFAULT_KEYS = {
    netCommission: "ค่าคอมมิชชั่นสุทธิ(฿)",
    orderStatus: "สถานะการสั่งซื้อ",
    orderTime: "เวลาที่สั่งซื้อ",
    productName: "ชื่อรายการสินค้า",
    overallOrderCommission: "มูลค่าซื้อ(฿)",
    orderId: "รหัสการสั่งซื้อ",
    modelId: "เลขที่ โมเดล",
    quantity: "จำนวน", // Added quantity column
    subIds: ["Sub_id1", "Sub_id2", "Sub_id3", "Sub_id4", "Sub_id5"],
};

// --- Main Component --------------------------------------------------------
export default function AffiliateRoiDashboard() {
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [map, setMap] = useState(DEFAULT_KEYS);
    const [spendBySub, setSpendBySub] = useState<any>({}); // { subid: { ad: number, other: number } }
    const [otherIncomes, setOtherIncomes] = useState<{ id: string; source: string; amount: number }[]>([]);
    const [totalAdSpend, setTotalAdSpend] = useState("");
    const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
    // Move activeTab state here to be at the top level
    const [activeTab, setActiveTab] = useState("kpi");

    // Channel and Status filters
    const [channelFilters, setChannelFilters] = useState<string[]>([]);
    const [statusFilters, setStatusFilters] = useState<string[]>([]);

    const fileRef = useRef<HTMLInputElement>(null);

    // New state to track if external scripts are loaded
    const [isTopProductsExpanded, setIsTopProductsExpanded] = useState(true);
    const [isTopSubIdsExpanded, setIsTopSubIdsExpanded] = useState(true);

    const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);

    // Dynamically load external scripts (PapaParse and XLSX)
    useEffect(() => {
        const loadScript = (src: string, onloadCallback: () => void) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => onloadCallback();
            script.onerror = () => console.error(`Failed to load script: ${src}`);
            document.head.appendChild(script);
        };

        let papaLoaded = false;
        let xlsxLoaded = false;

        const checkAndSetLoaded = () => {
            if (papaLoaded && xlsxLoaded) {
                setIsScriptsLoaded(true);
            }
        };

        loadScript('https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js', () => {
            papaLoaded = true;
            checkAndSetLoaded();
        });

        loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', () => {
            xlsxLoaded = true;
            checkAndSetLoaded();
        });
    }, []);

    // 1. Load data from LocalStorage on mount
    useEffect(() => {
        const savedData = localStorage.getItem("aff_raw_rows");
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setRawRows(parsed);
                }
            } catch (e) {
                console.error("Failed to parse saved data", e);
            }
        }

        // Load other incomes
        const savedIncomes = localStorage.getItem("aff_other_incomes");
        if (savedIncomes) {
            try {
                setOtherIncomes(JSON.parse(savedIncomes));
            } catch (e) { console.error(e); }
        }
    }, []);

    // Save other incomes whenever they change
    useEffect(() => {
        localStorage.setItem("aff_other_incomes", JSON.stringify(otherIncomes));
    }, [otherIncomes]);

    // 2. Parse CSV/Excel client-side & Save to LocalStorage
    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        const ext = file.name.toLowerCase().split(".").pop();
        if (["csv"].includes(ext || "") && window.Papa && window.Papa.parse) {
            window.Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (r: any) => {
                    setRawRows(r.data);
                    localStorage.setItem("aff_raw_rows", JSON.stringify(r.data)); // Save
                    setActiveTab("kpi");
                },
            });
        } else if (["xls", "xlsx"].includes(ext || "") && window.XLSX && window.XLSX.read) {
            const buf = await file.arrayBuffer();
            const wb = window.XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
            setRawRows(json);
            localStorage.setItem("aff_raw_rows", JSON.stringify(json)); // Save
            setActiveTab("kpi");
        } else {
            console.log("Unsupported file type or libraries not loaded.");
        }
    };

    // Normalize rows to unified shape
    const rows = useMemo(() => {
        if (!rawRows?.length) return [];
        const { netCommission, orderStatus, orderTime, productName, overallOrderCommission, orderId, subIds, modelId, quantity } = map;
        return rawRows.map((r) => ({
            netCommission: toNumber(r[netCommission]),
            orderStatus: (r[orderStatus] ?? "").toString().trim(),
            orderTime: r[orderTime],
            orderDate: dateOnly(r[orderTime]),
            productName: (r[productName] ?? "").toString(),
            overallOrderCommission: toNumber(r[overallOrderCommission]),
            orderId: (r[orderId] ?? "").toString().trim(),
            modelId: (r[modelId] ?? "").toString().trim(),
            quantity: toNumber(r[quantity]), // Parse quantity
            subid: extractSubId(r, subIds),
            channel: detectChannel(extractSubId(r, subIds)), // Add channel detection
            _raw: r,
        }));
    }, [rawRows, map]);

    const filtered = useMemo(() => {
        let result = rows;

        // Apply status filter (existing logic)
        if (filterStatus !== "ทั้งหมด") {
            result = result.filter((r) => r.orderStatus === filterStatus);
        }

        // Apply channel filters
        if (channelFilters.length > 0) {
            result = result.filter((r) => channelFilters.includes(r.channel));
        }

        // Apply affiliate product status filters
        if (statusFilters.length > 0) {
            result = result.filter((r) => {
                const status = r.orderStatus;
                return statusFilters.some(filter => {
                    if (filter === "ยกเลิก") return status.includes("ยกเลิก");
                    if (filter === "ยังไม่ชำระเงิน") return status.includes("ยังไม่ชำระเงิน");
                    if (filter === "รอดำเนินการ") return status.includes("รอดำเนินการ");
                    if (filter === "สำเร็จ") return status.includes("สำเร็จ") || status.includes("สำเร็จแล้ว") || status.includes("สำเร็จสมบูรณ์");
                    return false;
                });
            });
        }

        return result;
    }, [rows, filterStatus, channelFilters, statusFilters]);

    // New Memoized variable for date range
    const dateRange = useMemo(() => {
        if (filtered.length === 0) return null;
        const sortedDates = [...new Set(filtered.map(r => r.orderDate))].sort();
        if (sortedDates.length === 0) return null;
        const startDate = sortedDates[0];
        const endDate = sortedDates[sortedDates.length - 1];
        if (startDate === endDate) return startDate;
        return `${startDate} - ${endDate}`;
    }, [filtered]);

    const kpis = useMemo(() => {
        const totalCommission = filtered.reduce((s, r) => s + r.netCommission, 0);

        // --- FIX START ---
        // Count unique order IDs to get the correct number of orders.
        // Using a Set to automatically handle duplicates.
        const uniqueOrderIds = new Set(filtered.map(r => r.orderId));
        const totalOrders = uniqueOrderIds.size;
        // --- FIX END ---

        const totalGMV = filtered.reduce((s, r) => s + r.overallOrderCommission, 0);
        const avgCommissionRate = totalGMV > 0 ? totalCommission / totalGMV : 0;
        const pending = filtered.filter((r) => r.orderStatus.includes("รอดำเนินการ")).length;
        const approved = filtered.filter((r) => r.orderStatus.includes("สำเร็จ") || r.orderStatus.includes("สำเร็จแล้ว") || r.orderStatus.includes("สำเร็จสมบูรณ์")).length;
        const rejected = filtered.filter((r) => r.orderStatus.includes("ยกเลิก") || r.orderStatus.includes("ปฏิเสธ")).length;
        const avgPerOrder = totalOrders ? totalCommission / totalOrders : 0;
        return { totalCommission, totalOrders, avgPerOrder, pending, approved, rejected, totalGMV, avgCommissionRate };
    }, [filtered]);

    const byDate = useMemo(() => {
        const map = new Map();
        for (const r of filtered) {
            if (!map.has(r.orderDate)) map.set(r.orderDate, 0);
            map.set(r.orderDate, map.get(r.orderDate) + r.netCommission);
        }
        const arr = Array.from(map.entries()).map(([date, value]) => ({ date, value }));
        // @ts-ignore
        arr.sort((a, b) => a.date.localeCompare(b.date));
        return arr;
    }, [filtered]);

    const bySubId = useMemo(() => {
        const acc = new Map();
        for (const r of filtered) {
            if (!acc.has(r.subid)) acc.set(r.subid, { subid: r.subid, orders: 0, commission: 0 });
            const o = acc.get(r.subid);
            o.orders += 1;
            o.commission += r.netCommission;
        }
        const rows = Array.from(acc.values()).map((o: any) => {
            // Use state from the parent for calculation, as it's the source of truth
            const spend = toNumber(spendBySub[o.subid]?.ad) + toNumber(spendBySub[o.subid]?.other);
            const profit = o.commission - spend;
            const roi = spend > 0 ? (profit / spend) : null;
            return { ...o, spend, profit, roi };
        });
        rows.sort((a, b) => b.commission - a.commission);
        return rows;
    }, [filtered, spendBySub]);

    // Calculate Top 5 Selling Products logic: 
    // filter(status != ยกเลิก) -> parse number -> group by product -> sum qty & commission -> sort asc/desc
    const topProducts = useMemo(() => {
        const acc = new Map();

        // 1. Filter out 'ยกเลิก' status
        const validRows = filtered.filter(r => !r.orderStatus.includes("ยกเลิก"));

        for (const r of validRows) {
            // 2. Parse numbers (already done in 'rows' useMemo, but good to be safe)
            // Group by Product (using Model ID as key)
            let key = r.modelId;
            if (!key || key === "-" || key === "0") {
                // Skip invalid model IDs
                continue;
            }

            if (!acc.has(key)) {
                acc.set(key, {
                    id: key,
                    name: r.productName,
                    count: 0,
                    totalCommission: 0,
                    image: null
                });
            }

            const item = acc.get(key);

            // 3. Sum Qty & Commission
            // Use parsed quantity from row, default to 1 if 0/undefined
            const qty = r.quantity > 0 ? r.quantity : 1;
            item.count += qty;
            item.totalCommission += r.netCommission;
        }

        // 4. Sort by Total Commission (Descending)
        const sorted = Array.from(acc.values()).sort((a: any, b: any) => b.totalCommission - a.totalCommission);
        return sorted.slice(0, 5);
    }, [filtered]);

    // Calculate Top 5 SubIDs logic
    const topSubIds = useMemo(() => {
        const acc = new Map();
        // 1. Filter out 'ยกเลิก' status (consistent with top products)
        const validRows = filtered.filter(r => !r.orderStatus.includes("ยกเลิก"));

        for (const r of validRows) {
            const key = r.subid || "No SubID";
            if (!acc.has(key)) {
                acc.set(key, {
                    subid: key,
                    count: 0,
                    totalCommission: 0
                });
            }
            const item = acc.get(key);
            item.count += 1; // Count orders
            item.totalCommission += r.netCommission;
        }

        return Array.from(acc.values())
            .sort((a: any, b: any) => b.totalCommission - a.totalCommission)
            .slice(0, 5);
    }, [filtered]);

    // Total profit calculation
    const totalProfit = useMemo(() => {
        const totalCommission = kpis.totalCommission;
        // Sum up other incomes
        const otherIncomeSum = otherIncomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

        // Calculate total spend
        let realTotalSpend = 0;

        if (totalAdSpend && totalAdSpend.trim() !== "") {
            realTotalSpend = parseFloat(totalAdSpend.replace(/,/g, "")) || 0;
        } else {
            // Sum from subids
            realTotalSpend = Object.values(spendBySub).reduce((acc: number, curr: any) => {
                return acc + (curr.ad || 0) + (curr.other || 0);
            }, 0);
        }

        return (totalCommission + otherIncomeSum) - realTotalSpend;
    }, [kpis.totalCommission, totalAdSpend, spendBySub, otherIncomes]);

    // Calculate total spend (Memoized for reuse)
    const totalSpend = useMemo(() => {
        let realTotalSpend = 0;
        if (totalAdSpend && totalAdSpend.trim() !== "") {
            realTotalSpend = parseFloat(totalAdSpend.replace(/,/g, "")) || 0;
        } else {
            // Sum from subids
            realTotalSpend = Object.values(spendBySub).reduce((acc: number, curr: any) => {
                return acc + (curr.ad || 0) + (curr.other || 0);
            }, 0);
        }
        return realTotalSpend;
    }, [totalAdSpend, spendBySub]);

    const totalRoi = useMemo(() => {
        if (totalSpend === 0) return null;
        return totalProfit / totalSpend;
    }, [totalProfit, totalSpend]);

    // Trend slope (simple) for insights
    const trend = useMemo(() => {
        if (byDate.length < 2) return { slope: 0, direction: "flat", text: "ยังไม่มีแนวโน้มที่ชัดเจน" };
        const n = byDate.length;
        const xs = byDate.map((_, i) => i + 1);
        // @ts-ignore
        const ys = byDate.map((d) => d.value);
        // @ts-ignore
        const xbar = xs.reduce((a, b) => a + b) / n;
        // @ts-ignore
        const ybar = ys.reduce((a, b) => a + b) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) { num += (xs[i] - xbar) * (ys[i] - ybar); den += (xs[i] - xbar) ** 2; }
        const slope = den === 0 ? 0 : num / den;

        let direction = "flat";
        let text = "ทรงตัว";
        if (slope > 0.5) {
            direction = "up";
            text = "เพิ่มขึ้นอย่างต่อเนื่อง";
        } else if (slope > 0.05) {
            direction = "up";
            text = "เพิ่มขึ้นเล็กน้อย";
        } else if (slope < -0.5) {
            direction = "down";
            text = "ลดลงอย่างต่อเนื่อง";
        } else if (slope < -0.05) {
            direction = "down";
            text = "ลดลงเล็กน้อย";
        }
        return { slope, direction, text };
    }, [byDate]);

    // --- UI pieces -----------------------------------------------------------
    const FilePicker = () => {
        const [isDragging, setIsDragging] = useState(false);

        const handleDragOver = (e: any) => {
            e.preventDefault();
            setIsDragging(true);
        };

        const handleDragLeave = (e: any) => {
            e.preventDefault();
            setIsDragging(false);
        };

        const handleDrop = (e: any) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
                e.dataTransfer.clearData();
            }
        };

        return (
            <div
                className={`relative w-full rounded-lg border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'} transition-all duration-300 p-6 text-center cursor-pointer`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
            >
                <div className="flex flex-col items-center justify-center space-y-2">
                    <ArrowDownToLine className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'} transition-colors`} />
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {isDragging ? "วางไฟล์ที่นี่" : "คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวาง"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        รองรับไฟล์ .csv, .xls, .xlsx
                    </div>
                </div>
                <input type="file" accept=".csv,.xls,.xlsx" ref={fileRef}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    className="hidden"
                />
            </div>
        );
    };

    const Mapping = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries({
                netCommission: "คอลัมน์: ค่าคอมมิชชั่นสุทธิ(฿)",
                overallOrderCommission: "คอลัมน์: มูลค่าซื้อ(฿)",
                orderStatus: "คอลัมน์: สถานะการสั่งซื้อ",
                orderTime: "คอลัมน์: เวลาที่สั่งซื้อ",
                orderId: "คอลัมน์: รหัสการสั่งซื้อ",
                productName: "คอลัมน์: ชื่อรายการสินค้า",
                modelId: "คอลัมน์: เลขที่ โมเดล (Model ID)",
                quantity: "คอลัมน์: จำนวน (ถ้ามี)",
            }).map(([k, label]) => (
                <div key={k} className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>
                    <Input list={`list-${k}`} value={(map as any)[k]}
                        onChange={(e) => setMap({ ...map, [k]: e.target.value })}
                        className="rounded-lg border-blue-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-800/50 focus-visible:ring-blue-500 dark:text-white" />
                    <datalist id={`list-${k}`}>
                        {rawRows[0] && Object.keys(rawRows[0]).map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </datalist>
                </div>
            ))}
            <div className="col-span-1 md:col-span-3">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">คอลัมน์ Sub_id (เลือกได้หลายตัว จะดึงค่าที่ไม่ว่างอันแรก)</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                    {map.subIds.map((v, i) => (
                        <Input key={i} list={`list-sub-${i}`} value={v}
                            onChange={(e) => {
                                const copy = [...map.subIds];
                                copy[i] = e.target.value; setMap({ ...map, subIds: copy });
                            }}
                            className="rounded-lg border-blue-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-800/50 focus-visible:ring-blue-500 dark:text-white" />
                    ))}
                </div>
            </div>
        </div>
    );

    const SubIdSpendCard = ({ subId, commission, profit, roi, initialAdSpend, initialOtherSpend, onUpdateSpend }: any) => {
        const [adSpend, setAdSpend] = useState(initialAdSpend);
        const [otherSpend, setOtherSpend] = useState(initialOtherSpend);

        useEffect(() => {
            setAdSpend(initialAdSpend);
            setOtherSpend(initialOtherSpend);
        }, [initialAdSpend, initialOtherSpend]);

        const handleBlur = () => {
            onUpdateSpend(subId, adSpend, otherSpend);
        };

        return (

            <Card className="shadow-lg rounded-xl transition-all duration-300 hover:shadow-2xl bg-white dark:bg-slate-800 border-none">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="font-semibold text-lg text-slate-900 dark:text-white">{subId}</div>
                        <Badge variant="secondary" className="rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-semibold px-3 py-1">{prettyBaht(commission)}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-slate-500 dark:text-slate-400">ค่าแอด (฿)</Label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:text-white"
                                placeholder="0"
                                value={adSpend}
                                onChange={(e) => setAdSpend(e.target.value)}
                                onBlur={handleBlur}
                            />
                        </div>
                        <div>
                            <Label className="text-xs text-slate-500 dark:text-slate-400">ค่าอื่นๆ (฿)</Label>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:text-white"
                                placeholder="0"
                                value={otherSpend}
                                onChange={(e) => setOtherSpend(e.target.value)}
                                onBlur={handleBlur}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1 font-semibold dark:text-slate-300">
                        <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-500" />
                            กำไร:{" "}
                            <span className={profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                {prettyBaht(profit)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <PieChart className="w-4 h-4 text-blue-500" /> ROI:{" "}
                            {roi === null ? "—" : <span className={roi >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{`${(roi * 100).toFixed(0)}%`}</span>}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );

    };

    const handleUpdateSpend = (subId: any, ad: any, other: any) => {
        setSpendBySub((s: any) => ({
            ...s,
            [subId]: { ad: toNumber(ad), other: toNumber(other) }
        }));
    };

    // New component to manage the total ad spend input state locally
    // This prevents the parent component from re-rendering on every keystroke, fixing the focus issue.
    const TotalAdSpendInput = ({ value, onChange }: any) => {
        const [localValue, setLocalValue] = useState(value);

        // Sync local state with prop when parent state changes (e.g., on reset)
        useEffect(() => {
            setLocalValue(value);
        }, [value]);

        const handleBlur = () => {
            onChange(localValue);
        };

        return (
            <Input
                type="text"
                placeholder="กรอกค่าใช้จ่ายค่าแอดรวมทั้งหมดที่นี่"
                value={localValue}
                onChange={(e: any) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                className="rounded-lg border-blue-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-800/50 focus-visible:ring-blue-500 dark:text-white"
            />
        );
    };



    const Insights = () => {
        // New calculations for average daily commission and number of days
        const avgDailyCommission = byDate.length > 0 ? kpis.totalCommission / byDate.length : 0;
        const numberOfDays = byDate.length;

        const roiColor = totalRoi === null ? "text-slate-500" :
            totalRoi > 0.35 ? "text-green-600" :
                totalRoi >= 0 ? "text-yellow-600" : "text-red-600";

        // Dynamic recommendations based on data
        const recommendations = useMemo(() => {
            const recs = [];

            // Recommendation 1: Overall Trend
            const trendDir = trend.direction;
            const trendText = trend.text;
            const trendIconColor = trendDir === "up" ? "text-green-500" : trendDir === "down" ? "text-red-500" : "text-slate-500";
            recs.push({
                text: `ค่าคอมมิชชั่นรวมของคุณมีแนวโน้ม <span class="font-bold ${trendIconColor}">${trendText}</span>. ควรติดตามเพื่อดูผลกระทบของกิจกรรมล่าสุด`,
                icon: trendDir === "up" ? <TrendingUp className="w-5 h-5" /> : trendDir === "down" ? <TrendingDown className="w-5 h-5" /> : <ListTree className="w-5 h-5" />,
            });

            // --- New ROI-based recommendations logic ---
            // @ts-ignore
            const hasCosts = totalSpend > 0;
            if (hasCosts) {
                if (totalRoi !== null && totalRoi >= 0.6) {
                    recs.push({
                        text: `เยี่ยมมาก! ROI รวมของคุณอยู่ในระดับ **สูง** (${prettyPercent(totalRoi)}) ซึ่งแสดงว่ากลยุทธ์ของคุณมาถูกทางแล้ว.`,
                        icon: <Sparkles className="w-5 h-5 text-yellow-500" />,
                    });
                    recs.push({
                        text: `แนะนำให้พิจารณาเพิ่มงบประมาณและขยายสเกลแคมเปญที่ทำกำไรได้ดีที่สุด เพื่อเติบโตไปอีกขั้น.`,
                        icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
                    });
                } else if (totalRoi !== null && totalRoi >= 0.4) {
                    recs.push({
                        text: `ROI รวมของคุณอยู่ในระดับ **กลาง** (${prettyPercent(totalRoi)}). แม้จะทำกำไรได้ดี แต่ยังสามารถเพิ่มประสิทธิภาพได้อีก.`,
                        icon: <Percent className="w-5 h-5 text-blue-500" />,
                    });
                    recs.push({
                        text: `ลองพิจารณาเพิ่มงบประมาณในแคมเปญที่ทำกำไรสูงสุด หรือทดสอบโฆษณาในรูปแบบใหม่ๆ เพื่อหาช่องทางที่ทำกำไรได้ดีขึ้น.`,
                        icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
                    });
                } else if (totalRoi !== null && totalRoi >= 0 && totalRoi < 0.4) {
                    recs.push({
                        text: `ROI รวมของคุณค่อนข้าง **ต่ำ** (${prettyPercent(totalRoi)}). แนะนำให้ทบทวนกลยุทธ์โดยรวม`,
                        icon: <TriangleAlert className="w-5 h-5 text-red-500" />,
                    });
                    recs.push({
                        text: `ตรวจสอบกลุ่มเป้าหมาย, ปรับปรุงคุณภาพคอนเทนต์, หรือพิจารณาเปลี่ยนสินค้าที่คุณโปรโมทเพื่อเพิ่มประสิทธิภาพ.`,
                        icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
                    });
                } else { // totalRoi < 0
                    recs.push({
                        text: `คุณกำลังขาดทุน! ROI รวมของคุณติดลบ (${prettyPercent(totalRoi)}).`,
                        icon: <TriangleAlert className="w-5 h-5 text-red-500" />,
                    });
                    recs.push({
                        text: `แนะนำให้หยุดแคมเปญที่ขาดทุน, วิเคราะห์สาเหตุ, และปรับปรุงอย่างเร่งด่วน.`,
                        icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
                    });
                }
            }

            // Recommendation for top SubIDs (remains the same as it's a good insight)
            // @ts-ignore
            const profitablePerformers = bySubId.filter(s => s.profit > 0).sort((a, b) => b.profit - a.profit);
            const top3Performers = profitablePerformers.slice(0, 3);
            if (top3Performers.length > 0) {
                // @ts-ignore
                const topSubIDsList = top3Performers.map(t => `<span class="font-bold">${t.subid}</span>`).join(', ');
                recs.push({
                    text: `SubID ที่ทำกำไรสูงสุดคือ ${topSubIDsList}. ควรพิจารณาเพิ่มงบประมาณสำหรับ SubID เหล่านี้เพื่อขยายผลให้ดียิ่งขึ้น.`,
                    icon: <DollarSign className="w-5 h-5 text-green-500" />,
                });
            }

            // Default message if no specific recommendations are available
            if (recs.length === 1 && recs[0].text.includes("แนวโน้ม")) {
                recs.push({
                    text: "โปรดกรอกค่าใช้จ่ายเพื่อรับคำแนะนำที่ละเอียดขึ้น",
                    icon: <FileText className="w-5 h-5 text-slate-500" />,
                });
            }

            return recs;
        }, [bySubId, trend, totalRoi, totalSpend]);

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="shadow-lg rounded-xl transition-all duration-300 hover:shadow-2xl border-none bg-white dark:bg-slate-800">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                            <Sparkles className="w-8 h-8 text-blue-500" />
                            สรุปภาพรวม
                        </div>
                        <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                            <li>
                                <span className="font-semibold text-base">ค่าคอมมิชชั่นรวม:</span>{" "}
                                <span className="text-blue-600 font-bold">{prettyBaht(kpis.totalCommission)}</span>
                                <span className="text-slate-500 ml-1">จาก {kpis.totalOrders} ออเดอร์</span>
                            </li>
                            {otherIncomes.reduce((s, i) => s + (i.amount || 0), 0) > 0 && (
                                <li>
                                    <span className="font-semibold text-base">รายได้อื่นๆ:</span>{" "}
                                    <span className="text-green-600 font-bold">+{prettyBaht(otherIncomes.reduce((s, i) => s + (i.amount || 0), 0))}</span>
                                </li>
                            )}
                            {/* Added new metrics as requested */}
                            <li>
                                <span className="font-semibold text-base">เฉลี่ยค่าคอมต่อวัน:</span>{" "}
                                <span className="text-green-600 font-bold">{prettyBaht(avgDailyCommission)}</span>
                            </li>
                            <li>
                                <span className="font-semibold text-base">จำนวนวันในรายงาน:</span>{" "}
                                <span className="text-blue-600 font-bold">{numberOfDays} วัน</span>
                            </li>
                            {/* Added Net Profit */}
                            <li>
                                <span className="font-semibold text-base">กำไรสุทธิ:</span>{" "}
                                <span className={totalProfit >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                    {prettyBaht(totalProfit)}
                                </span>
                            </li>
                            {/* Added Total ROI with color coding */}
                            <li>
                                <span className="font-semibold text-base">ROI สุทธิ:</span>{" "}
                                <span className={`font-bold ${roiColor}`}>
                                    {totalRoi === null ? "—" : prettyPercent(totalRoi)}
                                </span>
                            </li>
                        </ul>
                    </CardContent>
                </Card>

                <Card className="shadow-lg rounded-xl transition-all duration-300 hover:shadow-2xl border-none bg-white dark:bg-slate-800">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                            <Lightbulb className="w-8 h-8 text-yellow-500" />
                            คำแนะนำ
                        </div>
                        <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            {recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    <span className="flex-shrink-0 w-5 h-5 mt-1 text-yellow-500">{rec.icon}</span>
                                    <span dangerouslySetInnerHTML={{ __html: rec.text }} />
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const Summary = () => {
        // Determine the color for the ROI card based on the totalRoi value
        const roiCardBg = (totalRoi !== null && totalRoi > 0.35) ? "bg-green-100 border-2 border-green-300" :
            (totalRoi !== null && totalRoi >= 0) ? "bg-yellow-100 border-2 border-yellow-300" :
                "bg-red-100 border-2 border-red-300";

        const roiCardText = (totalRoi !== null && totalRoi > 0.35) ? "text-green-800" :
            (totalRoi !== null && totalRoi >= 0) ? "text-yellow-800" :
                "text-red-800";

        const roiCardValueText = (totalRoi !== null && totalRoi > 0.35) ? "text-green-900" :
            (totalRoi !== null && totalRoi >= 0) ? "text-yellow-900" :
                "text-red-900";

        return (
            <div className="space-y-4">
                <Card className="shadow-lg rounded-xl border-none bg-white dark:bg-slate-800">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-3 text-2xl font-bold text-slate-800 dark:text-white">
                            <Calculator className="w-8 h-8 text-green-500" />
                            สรุปยอดสุทธิ
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="bg-green-100 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-800"><CardContent className="p-4"><div className="text-xs text-green-800 dark:text-green-300 font-medium">ค่าคอมมิชชั่นรวม</div><div className="text-2xl font-bold text-green-900 dark:text-green-100">{prettyBaht(kpis.totalCommission)}</div></CardContent></Card>
                            <Card className="bg-red-100 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800"><CardContent className="p-4"><div className="text-xs text-red-800 dark:text-red-300 font-medium">ค่าใช้จ่ายรวม</div><div className="text-2xl font-bold text-red-900 dark:text-red-100">{prettyBaht(totalSpend)}</div></CardContent></Card>
                            <Card className="bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-800"><CardContent className="p-4"><div className="text-xs text-blue-800 dark:text-blue-300 font-medium">กำไรสุทธิ</div><div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{prettyBaht(totalProfit)}</div></CardContent></Card>
                            {/* Added new card for Total ROI */}
                            <Card className={`${roiCardBg.replace('bg-green-100', 'bg-green-100 dark:bg-green-900/20').replace('border-green-300', 'border-green-300 dark:border-green-800').replace('bg-yellow-100', 'bg-yellow-100 dark:bg-yellow-900/20').replace('border-yellow-300', 'border-yellow-300 dark:border-yellow-800').replace('bg-red-100', 'bg-red-100 dark:bg-red-900/20').replace('border-red-300', 'border-red-300 dark:border-red-800')}`}><CardContent className="p-4"><div className={`text-xs ${roiCardText.replace('text-green-800', 'text-green-800 dark:text-green-300').replace('text-yellow-800', 'text-yellow-800 dark:text-yellow-300').replace('text-red-800', 'text-red-800 dark:text-red-300')} font-medium`}>ROI สุทธิ</div><div className={`text-2xl font-bold ${roiCardValueText.replace('text-green-900', 'text-green-900 dark:text-green-100').replace('text-yellow-900', 'text-yellow-900 dark:text-yellow-100').replace('text-red-900', 'text-red-900 dark:text-red-100')}`}>{totalRoi === null ? "—" : prettyPercent(totalRoi)}</div></CardContent></Card>
                        </div>
                        <div className="text-sm mt-4 p-4 rounded-lg bg-blue-50 dark:bg-slate-800/50 border-l-4 border-blue-200 dark:border-blue-700 text-slate-700 dark:text-slate-300">
                            <p>
                                <span className="font-semibold">หมายเหตุ:</span> หากกรอกค่าแอดรวมไว้ ระบบจะใช้ค่านั้นในการคำนวณกำไรสุทธิ หากไม่ได้กรอกจะใช้ยอดรวมจากค่าใช้จ่ายราย SubID แทน
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    const FilterSection = () => {
        const channelOptions = ["Facebook", "Line", "Others", "Shopeevideo-Shopee"];
        const statusOptions = ["ยกเลิก", "ยังไม่ชำระเงิน", "รอดำเนินการ", "สำเร็จ"];

        const toggleChannelFilter = (channel: string) => {
            setChannelFilters(prev =>
                prev.includes(channel)
                    ? prev.filter(c => c !== channel)
                    : [...prev, channel]
            );
        };

        const toggleStatusFilter = (status: string) => {
            setStatusFilters(prev =>
                prev.includes(status)
                    ? prev.filter(s => s !== status)
                    : [...prev, status]
            );
        };

        // Get counts for each filter option
        const getChannelCount = (channel: string) => {
            return rows.filter(r => r.channel === channel).length;
        };

        const getStatusCount = (status: string) => {
            return rows.filter(r => {
                const orderStatus = r.orderStatus;
                if (status === "ยกเลิก") return orderStatus.includes("ยกเลิก");
                if (status === "ยังไม่ชำระเงิน") return orderStatus.includes("ยังไม่ชำระเงิน");
                if (status === "รอดำเนินการ") return orderStatus.includes("รอดำเนินการ");
                if (status === "สำเร็จ") return orderStatus.includes("สำเร็จ") || orderStatus.includes("สำเร็จแล้ว") || orderStatus.includes("สำเร็จสมบูรณ์");
                return false;
            }).length;
        };

        return (
            <div className="flex flex-wrap items-center gap-3 mb-6">
                {/* Channel Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="rounded-lg gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600"
                        >
                            <Filter className="w-4 h-4" />
                            ช่องทาง
                            {channelFilters.length > 0 && (
                                <Badge className="ml-1 bg-blue-600 text-white">
                                    {channelFilters.length}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <div className="space-y-2">
                            {channelOptions.map(channel => (
                                <label
                                    key={channel}
                                    className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={channelFilters.includes(channel)}
                                        onChange={() => toggleChannelFilter(channel)}
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {channel}
                                    </span>
                                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {getChannelCount(channel)}
                                    </Badge>
                                </label>
                            ))}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Status Filter */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className="rounded-lg gap-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600"
                        >
                            <Filter className="w-4 h-4" />
                            สถานะสินค้า Affiliate
                            {statusFilters.length > 0 && (
                                <Badge className="ml-1 bg-blue-600 text-white">
                                    {statusFilters.length}
                                </Badge>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-3 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <div className="space-y-2">
                            {statusOptions.map(status => (
                                <label
                                    key={status}
                                    className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={statusFilters.includes(status)}
                                        onChange={() => toggleStatusFilter(status)}
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        {status}
                                    </span>
                                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                        {getStatusCount(status)}
                                    </Badge>
                                </label>
                            ))}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Clear Filters Button */}
                {(channelFilters.length > 0 || statusFilters.length > 0) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setChannelFilters([]);
                            setStatusFilters([]);
                        }}
                        className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                        ล้างฟิลเตอร์ทั้งหมด
                    </Button>
                )}
            </div>
        );
    };

    const KpiSection = () => {
        return (
            <div className="space-y-4">
                {dateRange && (
                    <div className="flex items-center justify-center p-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 transition-colors">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-2">ช่วงเวลาของข้อมูล:</div>
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{dateRange}</div>
                    </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="shadow-lg rounded-xl transition-all hover:scale-105 bg-white dark:bg-slate-800 border-none"><CardContent className="p-4"><div className="text-xs text-blue-600 dark:text-blue-400 font-medium">ค่าคอมรวม</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{prettyBaht(kpis.totalCommission)}</div></CardContent></Card>
                    <Card className="shadow-lg rounded-xl transition-all hover:scale-105 bg-white dark:bg-slate-800 border-none"><CardContent className="p-4"><div className="text-xs text-blue-600 dark:text-blue-400 font-medium">ยอดขายรวม (GMV)</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{prettyBaht(kpis.totalGMV)}</div></CardContent></Card>
                    <Card className="shadow-lg rounded-xl transition-all hover:scale-105 bg-white dark:bg-slate-800 border-none"><CardContent className="p-4"><div className="text-xs text-blue-600 dark:text-blue-400 font-medium">จำนวนออเดอร์</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{pretty(kpis.totalOrders)}</div></CardContent></Card>
                    <Card className="shadow-lg rounded-xl transition-all hover:scale-105 bg-white dark:bg-slate-800 border-none"><CardContent className="p-4"><div className="text-xs text-blue-600 dark:text-blue-400 font-medium">คอมฯ เฉลี่ย/ออเดอร์</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{prettyBaht(kpis.avgPerOrder)}</div></CardContent></Card>
                    <Card className="shadow-lg rounded-xl transition-all hover:scale-105 bg-white dark:bg-slate-800 border-none"><CardContent className="p-4"><div className="text-xs text-blue-600 dark:text-blue-400 font-medium">เฉลี่ย % ค่าคอม</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{prettyPercent(kpis.avgCommissionRate)}</div></CardContent></Card>
                    <Card className="shadow-lg rounded-xl transition-all hover:scale-105 bg-white dark:bg-slate-800 border-none"><CardContent className="p-4"><div className="text-xs text-blue-600 dark:text-blue-400 font-medium">รอดำเนินการ</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{pretty(kpis.pending)}</div></CardContent></Card>
                    <Card className="shadow-lg rounded-xl transition-all hover:scale-105 bg-white dark:bg-slate-800 border-none"><CardContent className="p-4"><div className="text-xs text-blue-600 dark:text-blue-400 font-medium">สำเร็จ</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{pretty(kpis.approved)}</div></CardContent></Card>
                    <Card className="shadow-lg rounded-xl transition-all hover:scale-105 bg-white dark:bg-slate-800 border-none"><CardContent className="p-4"><div className="text-xs text-blue-600 dark:text-blue-400 font-medium">ยกเลิก/ปฏิเสธ</div><div className="text-2xl font-bold text-slate-900 dark:text-white">{pretty(kpis.rejected)}</div></CardContent></Card>
                </div>

                {/* Top 5 Products Section */}
                {topProducts.length > 0 && (
                    <Card className="shadow-lg rounded-xl border-none bg-white dark:bg-slate-800 mt-6">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                        <ShoppingBag className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Top 5 สินค้าทำเงินสูงสุด</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">จัดอันดับตามยอดค่าคอมมิชชั่นรวมสูงสุด</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsTopProductsExpanded(!isTopProductsExpanded)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {isTopProductsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </Button>
                            </div>

                            {isTopProductsExpanded && (
                                <div className="overflow-x-auto animate-in slide-in-from-top-2 duration-200">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">อันดับ</th>
                                                <th className="px-4 py-3">รหัสโมเดล (Model ID) / ชื่อสินค้า</th>
                                                <th className="px-4 py-3 text-right">จำนวนที่ขายได้ (ชิ้น)</th>
                                                <th className="px-4 py-3 text-right rounded-r-lg">ค่าคอมรวม (฿)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {topProducts.map((product: any, index: number) => (
                                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-4 font-medium">
                                                        <div className={`
                                                        flex items-center justify-center w-8 h-8 rounded-full font-bold
                                                        ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                index === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                                                                    index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                        'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500'}
                                                    `}>
                                                            {index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mb-1">{product.id}</span>
                                                            <span className="line-clamp-1">{product.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                                                        {product.count.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-green-600 dark:text-green-400">
                                                        {prettyBaht(product.totalCommission)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Top 5 SubIDs Section */}
                {topSubIds.length > 0 && (
                    <Card className="shadow-lg rounded-xl border-none bg-white dark:bg-slate-800 mt-6">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                        <ListTree className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Top 5 SubID ทำเงินสูงสุด</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">จัดอันดับตามยอดค่าคอมมิชชั่นรวมสูงสุด</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsTopSubIdsExpanded(!isTopSubIdsExpanded)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {isTopSubIdsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </Button>
                            </div>

                            {isTopSubIdsExpanded && (
                                <div className="overflow-x-auto animate-in slide-in-from-top-2 duration-200">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 dark:text-slate-400">
                                            <tr>
                                                <th className="px-4 py-3 rounded-l-lg">อันดับ</th>
                                                <th className="px-4 py-3">SubID</th>
                                                <th className="px-4 py-3 text-right">จำนวนออเดอร์</th>
                                                <th className="px-4 py-3 text-right rounded-r-lg">ค่าคอมรวม (฿)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {topSubIds.map((item: any, index: number) => (
                                                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-4 py-4 font-medium">
                                                        <div className={`
                                                            flex items-center justify-center w-8 h-8 rounded-full font-bold
                                                            ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                index === 1 ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                                                                    index === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                        'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500'}
                                                        `}>
                                                            {index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">
                                                        <span className="font-mono text-sm">{item.subid}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-slate-700 dark:text-slate-300">
                                                        {item.count.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-4 text-right font-bold text-green-600 dark:text-green-400">
                                                        {prettyBaht(item.totalCommission)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    if (!isScriptsLoaded) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <div className="text-center text-lg font-medium text-slate-900 dark:text-white">กำลังโหลดเครื่องมือ...</div>
                <div className="text-sm text-center text-slate-500 dark:text-slate-400">
                    โปรดรอสักครู่ขณะที่กำลังโหลดไฟล์เพื่อประมวลผล.
                </div>
            </div>
        );
    }

    // --- Helper for parsing dates --- //
    // ... (Keep existing helpers) ...



    // ... (Keep component logic) ...

    return (
        <>
            <DashboardNavbar
                activeTab={activeTab}
                onTabChange={setActiveTab}
                hasData={rawRows.length > 0}
            />

            <div className="space-y-6">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                                Affiliate Dashboard
                            </span>
                        </h1>
                        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">
                            อัพโหลดไฟล์รายงานจาก Shopee Affiliate (.csv/.xlsx) เพื่อคำนวณกำไร & ROI ตาม SubID
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            className="rounded-full gap-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 shadow-sm transition-all"
                            onClick={() => {
                                setRawRows([]);
                                setSpendBySub({});
                                setFilterStatus("ทั้งหมด");
                                setMap(DEFAULT_KEYS);
                                setTotalAdSpend("");
                                setOtherIncomes([]); // Reset other incomes
                                localStorage.removeItem("aff_raw_rows"); // Clear saved data
                                localStorage.removeItem("aff_other_incomes");
                            }}
                        >
                            <Sparkles className="w-4 h-4" />
                            รีเซ็ตข้อมูล
                        </Button>
                    </div>
                </div>

                <Card className="shadow-2xl rounded-xl border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm transition-colors">
                    <CardContent className="p-5 space-y-4">
                        {!rawRows.length && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-slate-700">ไฟล์รายงาน (.csv, .xls, .xlsx)</Label>
                                <FilePicker />
                            </div>
                        )}

                        {rawRows.length > 0 && (
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                {/* Hidden TabsList to maintain accessibility but hidden visually since controlled by navbar, or simply remove if not needed for semantics. 
                                    However, keeping TabsContent as is is the key. 
                                    Ideally, we remove TabsList entirely and just use TabsContent controlled by `value`. 
                                */}

                                <TabsContent value="map" className="pt-4">
                                    <Mapping />
                                </TabsContent>

                                <TabsContent value="kpi" className="pt-4">
                                    <FilterSection />
                                    <KpiSection />
                                </TabsContent>

                                <TabsContent value="sub" className="pt-4">
                                    <div className="space-y-6">
                                        {/* Other Income Section */}
                                        <div className="space-y-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-base font-bold text-slate-800 dark:text-slate-200">รายได้อื่นๆ (เพิ่มเติม)</Label>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 border-indigo-200 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-400 dark:hover:bg-indigo-900/50"
                                                        >
                                                            <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        {[
                                                            { id: 'lazada', label: 'ค่าคอม Lazada' },
                                                            { id: 'tiktok', label: 'ค่าคอม TikTok' },
                                                            { id: 'shopee_video', label: 'Shopee Video/Live' },
                                                            { id: 'campaign_bonus', label: 'โบนัสจากแคมเปญ' },
                                                            { id: 'other', label: 'อื่นๆ' }
                                                        ].map((item) => (
                                                            <DropdownMenuItem
                                                                key={item.id}
                                                                onClick={() => {
                                                                    // Check if already exists
                                                                    if (otherIncomes.find(i => i.id === item.id)) return;
                                                                    setOtherIncomes([...otherIncomes, { id: item.id, source: item.label, amount: 0 }]);
                                                                }}
                                                                disabled={!!otherIncomes.find(i => i.id === item.id)}
                                                            >
                                                                {item.label}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {otherIncomes.length === 0 && (
                                                <p className="text-xs text-slate-500 italic">กดปุ่ม "เพิ่มรายการ" เพื่อบันทึกรายได้จากช่องทางอื่น</p>
                                            )}

                                            <div className="space-y-3">
                                                {otherIncomes.map((item, index) => (
                                                    <div key={item.id} className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1">
                                                        <Label className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {item.source}
                                                        </Label>
                                                        <div className="relative w-32 md:w-48">
                                                            <span className="absolute left-3 top-2.5 text-slate-500 text-sm">฿</span>
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                value={item.amount || ""}
                                                                onChange={(e) => {
                                                                    const newIncomes = [...otherIncomes];
                                                                    newIncomes[index].amount = parseFloat(e.target.value) || 0;
                                                                    setOtherIncomes(newIncomes);
                                                                }}
                                                                className="pl-7 rounded-lg border-indigo-200 dark:border-indigo-900/50"
                                                            />
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => {
                                                                const newIncomes = otherIncomes.filter(i => i.id !== item.id);
                                                                setOtherIncomes(newIncomes);
                                                            }}
                                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}

                                                <div className="text-right text-sm font-medium text-slate-600 dark:text-slate-400 mt-2 border-t border-indigo-200 dark:border-indigo-800 pt-2">
                                                    รวมรายได้อื่นๆ: <span className="text-green-600 font-bold">{prettyBaht(otherIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0))}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">ค่าแอดรวมทั้งหมด (฿)</Label>
                                            <p className="text-xs text-slate-500 mb-2">หากกรอกค่านี้ ระบบจะใช้ยอดนี้เป็นยอดค่าใช้จ่ายรวม และจะไม่คำนวณยอดรวมจาก SubID แต่ละตัว</p>
                                            <TotalAdSpendInput value={totalAdSpend} onChange={setTotalAdSpend} />
                                        </div>

                                        <div className="space-y-3">
                                            <div className="text-sm text-muted-foreground">
                                                กรอกค่าใช้จ่ายราย SubID (สำหรับรายละเอียด)
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {// @ts-ignore
                                                    bySubId.map((r: any) => (
                                                        <SubIdSpendCard
                                                            key={r.subid}
                                                            subId={r.subid}
                                                            commission={r.commission}
                                                            profit={r.profit}
                                                            roi={r.roi}
                                                            initialAdSpend={spendBySub[r.subid]?.ad ?? ""}
                                                            initialOtherSpend={spendBySub[r.subid]?.other ?? ""}
                                                            onUpdateSpend={handleUpdateSpend}
                                                        />
                                                    ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <ResponsiveContainer width="100%" height={320}>
                                            {/* @ts-ignore */}
                                            <BarChart data={bySubId}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
                                                <XAxis dataKey="subid" interval={0} angle={-15} textAnchor="end" height={70} stroke="#94a3b8" />
                                                <YAxis stroke="#94a3b8" />
                                                <Tooltip formatter={(v: any) => prettyBaht(v)} />
                                                <Legend />
                                                <Bar dataKey="commission" name="ค่าคอม" fill="#60a5fa" />
                                                <Bar dataKey="spend" name="ค่าใช้จ่าย" fill="#f87171" />
                                                <Bar dataKey="profit" name="กำไร" fill="#22c55e" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </TabsContent>

                                <TabsContent value="summary" className="pt-4">
                                    <Summary />
                                </TabsContent>

                                <TabsContent value="chart" className="pt-4">
                                    <Card className="shadow-lg rounded-xl bg-white dark:bg-slate-800 border-none">
                                        <CardContent className="p-4">
                                            <div className="text-sm mb-2 text-blue-600 dark:text-blue-400 font-medium">แนวโน้มค่าคอมตามวันที่สั่งซื้อ</div>
                                            <ResponsiveContainer width="100%" height={360}>
                                                {/* @ts-ignore */}
                                                <LineChart data={byDate}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} />
                                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                                    <YAxis stroke="#94a3b8" />
                                                    <Tooltip
                                                        formatter={(v: any) => prettyBaht(v)}
                                                        contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', borderColor: 'var(--tooltip-border, #e2e8f0)', color: 'var(--tooltip-text, #1e293b)' }}
                                                    />
                                                    <Line type="monotone" dataKey="value" name="ค่าคอมรวม/วัน" dot={false} stroke="#8b5cf6" strokeWidth={2} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="insight" className="pt-4">
                                    <Insights />
                                </TabsContent>
                            </Tabs>
                        )}
                    </CardContent>
                </Card>

                {!rawRows.length && (
                    <Card className="shadow-lg rounded-xl border-none bg-white dark:bg-slate-800">
                        <CardContent className="p-8 text-center space-y-3">
                            <FileSpreadsheet className="w-12 h-12 mx-auto text-blue-500" />
                            <div className="text-xl font-bold text-slate-800 dark:text-white">อัพโหลดไฟล์รายงานเพื่อเริ่มต้น</div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">รองรับไฟล์ CSV/Excel จากหน้า Shopee Affiliate & สามารถปรับคอลัมน์ได้หากชื่อไม่ตรง</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}
