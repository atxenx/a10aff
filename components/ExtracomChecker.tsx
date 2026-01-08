"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, ArrowDownToLine, Package, Percent, DollarSign, ShoppingBag, FileSpreadsheet, Loader2, Sparkles, Target, Search } from "lucide-react";
import { DashboardNavbar } from "@/components/DashboardNavbar";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

declare global {
    interface Window {
        Papa: any;
        XLSX: any;
    }
}

/**
 * Extracom Checker
 * - Filters and displays products with seller commission > 0 (Extracom products)
 * - Shows: Product Name, Actual Commission, Total Commission %, Product Price
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
const prettyPercent = (n: any) => `${pretty(n, 2)}%`;

// --- Default mappings for Shopee Affiliate (TH) ---------------------------
const DEFAULT_KEYS = {
    productName: "ชื่อรายการสินค้า",
    sellerCommission: "คอมมิชชั่นคำสั่งซื้อจากผู้ขาย(฿)",
    overallProductCommission: "คอมมิชชั่นสินค้าโดยรวม(฿)",
    shopCommissionRate: "อัตราคอมมิชชั่นร้านค้าของสินค้า",
    shopeeCommissionRate: "อัตราคอมมิชชั่นช้อปปี้ของสินค้า",
    purchaseValue: "มูลค่าซื้อ(฿)",
    modelId: "เลขที่ โมเดล",
    orderId: "รหัสการสั่งซื้อ",
};

// --- Main Component --------------------------------------------------------
export default function ExtracomChecker() {
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [map, setMap] = useState(DEFAULT_KEYS);
    const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);
    const [extracomGoals, setExtracomGoals] = useState<number[]>([]);
    const [goalInput, setGoalInput] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");

    const fileRef = useRef<HTMLInputElement>(null);

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

    // 1. Load data from LocalStorage on mount (using same key as main dashboard)
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

        // Load extracom goals (multiple milestones)
        const savedGoals = localStorage.getItem("extracom_goals");
        if (savedGoals) {
            try {
                const goals = JSON.parse(savedGoals);
                if (Array.isArray(goals) && goals.length > 0) {
                    setExtracomGoals(goals);
                    setGoalInput(goals[goals.length - 1].toString());
                }
            } catch (e) {
                console.error("Failed to parse goals", e);
            }
        }
    }, []);

    // 2. Parse CSV/Excel client-side & Save to LocalStorage (using same key as main dashboard)
    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        const ext = file.name.toLowerCase().split(".").pop();
        if (["csv"].includes(ext || "") && window.Papa && window.Papa.parse) {
            window.Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (r: any) => {
                    setRawRows(r.data);
                    localStorage.setItem("aff_raw_rows", JSON.stringify(r.data));
                },
            });
        } else if (["xls", "xlsx"].includes(ext || "") && window.XLSX && window.XLSX.read) {
            const buf = await file.arrayBuffer();
            const wb = window.XLSX.read(buf, { type: "array" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const json = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
            setRawRows(json);
            localStorage.setItem("aff_raw_rows", JSON.stringify(json));
        } else {
            console.log("Unsupported file type or libraries not loaded.");
        }
    };

    // Process and filter rows for Extracom products
    const extracomProducts = useMemo(() => {
        if (!rawRows?.length) return [];

        const {
            productName,
            sellerCommission,
            overallProductCommission,
            shopCommissionRate,
            shopeeCommissionRate,
            purchaseValue,
            modelId,
            orderId
        } = map;

        return rawRows
            .map((r) => {
                const sellerComm = toNumber(r[sellerCommission]);
                const shopRate = toNumber(r[shopCommissionRate]);
                const shopeeRate = toNumber(r[shopeeCommissionRate]);

                return {
                    productName: (r[productName] ?? "").toString(),
                    sellerCommission: sellerComm,
                    overallProductCommission: toNumber(r[overallProductCommission]),
                    shopCommissionRate: shopRate,
                    shopeeCommissionRate: shopeeRate,
                    totalCommissionRate: shopRate + shopeeRate,
                    purchaseValue: toNumber(r[purchaseValue]),
                    modelId: (r[modelId] ?? "").toString().trim(),
                    orderId: (r[orderId] ?? "").toString().trim(),
                    _raw: r,
                };
            })
            .filter((r) => r.sellerCommission > 0); // Filter: Only Extracom products
    }, [rawRows, map]);

    // Filtered products based on search query
    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return extracomProducts;

        const query = searchQuery.toLowerCase();
        return extracomProducts.filter(product =>
            product.productName.toLowerCase().includes(query)
        );
    }, [extracomProducts, searchQuery]);

    // Statistics (based on ALL extracom products, not filtered)
    const stats = useMemo(() => {
        const totalItems = extracomProducts.length;
        const totalCommission = extracomProducts.reduce((s, r) => s + r.overallProductCommission, 0);
        const totalValue = extracomProducts.reduce((s, r) => s + r.purchaseValue, 0);
        const avgCommissionRate = totalItems > 0
            ? extracomProducts.reduce((s, r) => s + r.totalCommissionRate, 0) / totalItems
            : 0;

        return { totalItems, totalCommission, totalValue, avgCommissionRate };
    }, [extracomProducts]);

    // Goal progress calculation (multi-milestone)
    const goalProgress = useMemo(() => {
        if (extracomGoals.length === 0) return null;

        const current = stats.totalValue;

        // Find current active goal (first one that hasn't been achieved yet)
        let activeGoalIndex = 0;
        for (let i = 0; i < extracomGoals.length; i++) {
            if (current < extracomGoals[i]) {
                activeGoalIndex = i;
                break;
            }
            // If we've passed all goals
            if (i === extracomGoals.length - 1) {
                activeGoalIndex = i;
            }
        }

        const activeGoal = extracomGoals[activeGoalIndex];
        const previousGoal = activeGoalIndex > 0 ? extracomGoals[activeGoalIndex - 1] : 0;

        // Calculate progress within current milestone
        const progressInMilestone = current - previousGoal;
        const milestoneRange = activeGoal - previousGoal;
        const percentage = milestoneRange > 0 ? (progressInMilestone / milestoneRange) * 100 : 100;

        return {
            current,
            activeGoal,
            activeGoalIndex,
            totalGoals: extracomGoals.length,
            previousGoal,
            remaining: activeGoal - current > 0 ? activeGoal - current : 0,
            percentage: Math.min(percentage, 100),
            isComplete: current >= activeGoal,
            allGoalsAchieved: current >= extracomGoals[extracomGoals.length - 1]
        };
    }, [stats.totalValue, extracomGoals]);

    // Save/Add goal handler
    const handleSaveGoal = () => {
        const goal = parseFloat(goalInput.replace(/,/g, ""));
        if (!isNaN(goal) && goal > 0) {
            const newGoals = [...extracomGoals, goal].sort((a, b) => a - b);
            setExtracomGoals(newGoals);
            localStorage.setItem("extracom_goals", JSON.stringify(newGoals));
            setGoalInput("");
        }
    };

    // Remove goal handler
    const handleRemoveGoal = (index: number) => {
        const newGoals = extracomGoals.filter((_, i) => i !== index);
        setExtracomGoals(newGoals);
        localStorage.setItem("extracom_goals", JSON.stringify(newGoals));
    };

    // --- UI Components -----------------------------------------------------------
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries({
                productName: "ชื่อรายการสินค้า",
                sellerCommission: "คอมมิชชั่นคำสั่งซื้อจากผู้ขาย(฿)",
                overallProductCommission: "คอมมิชชั่นสินค้าโดยรวม(฿)",
                shopCommissionRate: "อัตราคอมมิชชั่นร้านค้าของสินค้า",
                shopeeCommissionRate: "อัตราคอมมิชชั่นช้อปปี้ของสินค้า",
                purchaseValue: "มูลค่าซื้อ(฿)",
                modelId: "เลขที่ โมเดล",
                orderId: "รหัสการสั่งซื้อ",
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
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
            <DashboardNavbar />

            <div className="container mx-auto px-6 pt-20 pb-8 space-y-8">
                {/* Header with Goal and Reset Buttons */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    {/* Goal Button - Left Side */}
                    <div className="flex items-center gap-2">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="rounded-full gap-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 shadow-sm transition-all"
                                >
                                    <Target className="w-4 h-4" />
                                    เป้าหมาย
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        ตั้งเป้าหมาย Extracom
                                    </DialogTitle>
                                    <DialogDescription>
                                        กรอกยอดมูลค่าซื้อรวมที่ต้องการให้ได้จากสินค้า Extracom
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    {/* Existing Goals List */}
                                    {extracomGoals.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">เป้าหมายทั้งหมด</Label>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {extracomGoals.map((goal, idx) => (
                                                    <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border ${goalProgress && idx === goalProgress.activeGoalIndex ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                                        <div className="flex items-center gap-2">
                                                            {goalProgress && idx === goalProgress.activeGoalIndex && (
                                                                <Badge className="bg-blue-600">ขั้นปัจจุบัน</Badge>
                                                            )}
                                                            {goalProgress && idx < goalProgress.activeGoalIndex && (
                                                                <Badge className="bg-green-600">✓ สำเร็จ</Badge>
                                                            )}
                                                            <span className="font-medium">ขั้นที่ {idx + 1}:</span>
                                                            <span className="text-blue-600 dark:text-blue-400 font-bold">{prettyBaht(goal)}</span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleRemoveGoal(idx)}
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            ×
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Add New Goal */}
                                    <div className="space-y-2">
                                        <Label htmlFor="goal" className="text-sm font-medium">
                                            เพิ่มเป้าหมายใหม่ (฿)
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="goal"
                                                type="text"
                                                placeholder="เช่น 100000"
                                                value={goalInput}
                                                onChange={(e) => setGoalInput(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSaveGoal()}
                                                className="text-lg"
                                            />
                                            <Button
                                                onClick={handleSaveGoal}
                                                className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                                            >
                                                เพิ่ม
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Current Progress */}
                                    {goalProgress && (
                                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    ความคืบหน้า (ขั้นที่ {goalProgress.activeGoalIndex + 1}/{goalProgress.totalGoals})
                                                </span>
                                                <span className={`font-bold ${goalProgress.isComplete ? 'text-green-600' : 'text-blue-600'}`}>
                                                    {goalProgress.percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <Progress value={goalProgress.percentage} className="h-2" />
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <div className="text-slate-600 dark:text-slate-400 text-xs">ยอดปัจจุบัน</div>
                                                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                                                        {prettyBaht(goalProgress.current)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-600 dark:text-slate-400 text-xs">ยอดที่ขาดถึงเป้าหมายขั้นนี้</div>
                                                    <div className={`font-semibold ${goalProgress.isComplete ? 'text-green-600' : 'text-orange-600'}`}>
                                                        {goalProgress.isComplete ? 'บรรลุแล้ว! 🎉' : prettyBaht(goalProgress.remaining)}
                                                    </div>
                                                </div>
                                            </div>
                                            {goalProgress.allGoalsAchieved && (
                                                <div className="text-center p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg font-bold">
                                                    🎊 บรรลุเป้าหมายทั้งหมดแล้ว!
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <Button
                                        onClick={handleSaveGoal}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                    >
                                        บันทึกเป้าหมาย
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Title - Center */}
                    <div className="text-center flex-1">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <Package className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                Extracom Checker
                            </h1>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                            ตรวจหาสินค้า Extracom จากรายงาน Shopee Affiliate
                        </p>
                    </div>

                    {/* Reset Button - Right Side */}
                    {rawRows.length > 0 && (
                        <Button
                            variant="secondary"
                            className="rounded-full gap-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 shadow-sm transition-all"
                            onClick={() => {
                                setRawRows([]);
                                setMap(DEFAULT_KEYS);
                                localStorage.removeItem("aff_raw_rows");
                            }}
                        >
                            <Sparkles className="w-4 h-4" />
                            รีเซ็ตข้อมูล
                        </Button>
                    )}
                </div>

                {/* File Picker - Hide when data is loaded */}
                {rawRows.length === 0 && (
                    <Card className="shadow-lg rounded-xl border-none bg-white dark:bg-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">อัพโหลดไฟล์</h2>
                            </div>
                            {!isScriptsLoaded ? (
                                <div className="flex items-center justify-center gap-2 p-6 text-slate-500 dark:text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>กำลังโหลดระบบ...</span>
                                </div>
                            ) : (
                                <FilePicker />
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Goal Progress Card */}
                {goalProgress && extracomProducts.length > 0 && (
                    <Card className="shadow-lg rounded-xl border-none bg-gradient-to-br from-blue-400 to-blue-500 text-white">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Target className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">
                                    ความคืบหน้าเป้าหมาย Extracom
                                    <span className="ml-2 text-sm opacity-90">(ขั้นที่ {goalProgress.activeGoalIndex + 1}/{goalProgress.totalGoals})</span>
                                </h3>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm opacity-90">เป้าหมายขั้นนี้: {prettyBaht(goalProgress.activeGoal)}</span>
                                    <span className="text-2xl font-bold">{goalProgress.percentage.toFixed(1)}%</span>
                                </div>
                                <Progress value={goalProgress.percentage} className="h-3 bg-white/30" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/20 rounded-lg p-3">
                                        <div className="text-xs opacity-90 mb-1">ยอดปัจจุบัน</div>
                                        <div className="text-lg font-bold">{prettyBaht(goalProgress.current)}</div>
                                    </div>
                                    <div className="bg-white/20 rounded-lg p-3">
                                        <div className="text-xs opacity-90 mb-1">ยอดที่ขาด</div>
                                        <div className="text-lg font-bold">
                                            {goalProgress.isComplete ? '✅ สำเร็จ!' : prettyBaht(goalProgress.remaining)}
                                        </div>
                                    </div>
                                </div>
                                {goalProgress.allGoalsAchieved && (
                                    <div className="bg-green-500 rounded-lg p-3 text-center font-bold animate-pulse">
                                        🎊 บรรลุเป้าหมายทั้งหมดแล้ว!
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Statistics */}
                {extracomProducts.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="shadow-lg rounded-xl border-none bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-200">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm opacity-90 mb-1">สินค้า Extracom ทั้งหมด</div>
                                            <div className="text-3xl font-bold">{stats.totalItems}</div>
                                        </div>
                                        <Package className="w-12 h-12 opacity-80" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg rounded-xl border-none bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 text-blue-700 dark:text-blue-300">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm opacity-90 mb-1">คอมมิชชั่นรวม</div>
                                            <div className="text-3xl font-bold">{prettyBaht(stats.totalCommission)}</div>
                                        </div>
                                        <DollarSign className="w-12 h-12 opacity-80" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg rounded-xl border-none bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 text-emerald-700 dark:text-emerald-300">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm opacity-90 mb-1">มูลค่าซื้อรวม</div>
                                            <div className="text-3xl font-bold">{prettyBaht(stats.totalValue)}</div>
                                        </div>
                                        <ShoppingBag className="w-12 h-12 opacity-80" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-lg rounded-xl border-none bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-700 dark:text-amber-300">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm opacity-90 mb-1">% คอมมิชชั่นเฉลี่ย</div>
                                            <div className="text-3xl font-bold">{prettyPercent(stats.avgCommissionRate)}</div>
                                        </div>
                                        <Percent className="w-12 h-12 opacity-80" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Table */}
                        <Card className="shadow-lg rounded-xl border-none bg-white dark:bg-slate-800">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                            รายการสินค้า Extracom ({extracomProducts.length} รายการ)
                                        </h2>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative flex-1 max-w-md">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            type="text"
                                            placeholder="ค้นหาชื่อสินค้า..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                                        />
                                        {searchQuery && (
                                            <Badge
                                                variant="secondary"
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                                            >
                                                {filteredProducts.length} ผลลัพธ์
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                                <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">#</th>
                                                <th className="text-left p-3 font-semibold text-slate-700 dark:text-slate-300">ชื่อสินค้า</th>
                                                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">ราคาสินค้า</th>
                                                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">คอมมิชชั่นที่ได้</th>
                                                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">% รวม</th>
                                                <th className="text-right p-3 font-semibold text-slate-700 dark:text-slate-300">คอมผู้ขาย</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredProducts.map((product, idx) => (
                                                <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                    <td className="p-3 text-slate-600 dark:text-slate-400">{idx + 1}</td>
                                                    <td className="p-3 text-slate-800 dark:text-slate-200 font-medium max-w-md truncate">
                                                        {product.productName}
                                                    </td>
                                                    <td className="p-3 text-right text-slate-800 dark:text-slate-200">
                                                        {prettyBaht(product.purchaseValue)}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                                            {prettyBaht(product.overallProductCommission)}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                                            {prettyPercent(product.totalCommissionRate)}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3 text-right text-orange-600 dark:text-orange-400 font-semibold">
                                                        {prettyBaht(product.sellerCommission)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* No data message */}
                {rawRows.length > 0 && extracomProducts.length === 0 && (
                    <Card className="shadow-lg rounded-xl border-none bg-white dark:bg-slate-800">
                        <CardContent className="p-12 text-center">
                            <Package className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                ไม่พบสินค้า Extracom
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                                ไม่มีสินค้าในรายงานที่มีคอมมิชชั่นจากผู้ขายมากกว่า 0
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
