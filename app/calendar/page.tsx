"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ArrowLeft, Clock, CheckCircle2, XCircle, ShoppingBag, DollarSign, CalendarDays } from "lucide-react";
import Link from "next/link";

export default function CalendarPage() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    const currentDate = today.getDate();

    // Helper to format date
    const formatDate = (date: Date) => {
        return date.toLocaleDateString("th-TH", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    // Calculate Campaigns
    const campaigns = useMemo(() => {
        const list = [];

        // 1. D-Day (Double Day) - Month equals Day (1.1, 2.2, etc.)
        // Note: JS Month is 0-indexed (0=Jan), so currentMonth+1 is the expected day.
        const dDayMonth = currentMonth + 1;
        const dDayDate = new Date(currentYear, currentMonth, dDayMonth);

        // Handle edge case where D-Day might not exist (e.g. 30.30? No, max 12.12).
        // Since we are in the current month, if month > 12, there is no d-day.
        // Actually, d-day is only until 12.12.
        let isDDayValid = dDayMonth <= 12;

        if (isDDayValid) {
            list.push({
                type: "D-Day",
                title: `${dDayMonth}.${dDayMonth} Double Day`,
                date: dDayDate,
                icon: <ShoppingBag className="w-6 h-6 text-pink-500" />,
                description: "วันเลขเบิ้ล โปรแรงที่สุดของเดือน ลดแหลกแจกโค้ด",
                bg: "bg-pink-50 dark:bg-pink-900/20",
                border: "border-pink-200 dark:border-pink-800",
                accent: "text-pink-600 dark:text-pink-400"
            });
        }

        // 2. Mid-Month Sale (15th)
        const midMonthDate = new Date(currentYear, currentMonth, 15);
        list.push({
            type: "Mid-Month",
            title: "Mid-Month Sale",
            date: midMonthDate,
            icon: <CalendarDays className="w-6 h-6 text-purple-500" />,
            description: "โปรกลางเดือน เก็บโค้ดลดเพิ่ม ดีลเด็ดครึ่งเดือน",
            bg: "bg-purple-50 dark:bg-purple-900/20",
            border: "border-purple-200 dark:border-purple-800",
            accent: "text-purple-600 dark:text-purple-400"
        });

        // 3. Payday Sale (25th)
        const paydayDate = new Date(currentYear, currentMonth, 25);
        list.push({
            type: "Payday",
            title: "Payday Sale",
            date: paydayDate,
            icon: <DollarSign className="w-6 h-6 text-green-500" />,
            description: "โปรเงินเดือนออก ช้อปมันส์วันสิ้นเดือน",
            bg: "bg-green-50 dark:bg-green-900/20",
            border: "border-green-200 dark:border-green-800",
            accent: "text-green-600 dark:text-green-400"
        });

        // Process status for each
        return list.map(c => {
            const cDate = c.date.getDate();
            let status = "";
            let daysLeft = 0;

            if (currentDate === cDate) {
                status = "today";
            } else if (currentDate > cDate) {
                status = "ended";
            } else {
                status = "upcoming";
                daysLeft = cDate - currentDate;
            }

            return { ...c, status, daysLeft };
        }).sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [currentDate, currentMonth, currentYear]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-10 transition-colors duration-300">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                            <ArrowLeft className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <CalendarIcon className="w-8 h-8 text-blue-600" />
                            ปฏิทินแคมเปญ
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            วางแผนการโปรโมทล่วงหน้ากับ 3 วันโปรโมชั่นหลักประจำเดือน {today.toLocaleDateString("th-TH", { month: "long" })}
                        </p>
                    </div>
                </div>

                {/* Campaigns List */}
                <div className="grid gap-6">
                    {campaigns.map((campaign, idx) => (
                        <div key={idx} className={`relative overflow-hidden rounded-2xl border ${campaign.border} ${campaign.bg} shadow-sm transition-all hover:shadow-md`}>
                            <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                {/* Left: Info */}
                                <div className="flex items-start gap-5">
                                    <div className={`p-4 rounded-xl bg-white dark:bg-slate-900 shadow-sm ${campaign.accent}`}>
                                        {campaign.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className={`text-2xl font-bold ${campaign.accent}`}>
                                                {campaign.title}
                                            </h3>
                                            <Badge variant="outline" className={`text-sm py-1 px-3 bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 ${campaign.border} text-slate-700 dark:text-slate-300`}>
                                                {formatDate(campaign.date)}
                                            </Badge>
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-lg">
                                            {campaign.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Right: Status */}
                                <div className="flex-shrink-0 min-w-[140px] text-right">
                                    {campaign.status === "today" && (
                                        <div className="flex flex-col items-end gap-1 animate-pulse">
                                            <Badge className="bg-red-500 text-white border-none px-4 py-1.5 text-base rounded-full">
                                                🔥 วันนี้!
                                            </Badge>
                                            <span className="text-sm text-red-600 font-medium">รีบโปรโมทเลย</span>
                                        </div>
                                    )}
                                    {campaign.status === "upcoming" && (
                                        <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xl">
                                                <Clock className="w-5 h-5" />
                                                อีก {campaign.daysLeft} วัน
                                            </div>
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-none">
                                                เตรียมตัวให้พร้อม
                                            </Badge>
                                        </div>
                                    )}
                                    {campaign.status === "ended" && (
                                        <div className="flex flex-col items-end gap-1 opacity-60">
                                            <div className="flex items-center gap-2 text-slate-500 font-medium text-lg">
                                                <CheckCircle2 className="w-5 h-5" />
                                                จบไปแล้ว
                                            </div>
                                            <span className="text-sm text-slate-400">รอพบกันเดือนหน้า</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Decorative Background Blob */}
                            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-10 bg-current ${campaign.accent}`} />
                        </div>
                    ))}
                </div>

                <div className="mt-12 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-slate-500 dark:text-slate-400">
                        * วันที่จัดแคมเปญอาจมีการเปลี่ยนแปลงตามนโยบายของแพลตฟอร์ม
                        โปรดตรวจสอบประกาศอย่างเป็นทางการอีกครั้ง
                    </p>
                </div>
            </div>
        </div>
    );
}
