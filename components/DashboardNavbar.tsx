"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PieChart, LogOut, Settings, User, Menu, Calendar, Package, Bell } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import { useState, useMemo } from "react";


interface DashboardNavbarProps {
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    hasData?: boolean;
}

export function DashboardNavbar({ activeTab = "sub", onTabChange, hasData = false }: DashboardNavbarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [sheetOpen, setSheetOpen] = useState(false);

    const handleSignOut = () => {
        localStorage.removeItem("aff_token");
        router.push("/");
    };

    const navItems = [
        { id: "kpi", label: "สรุปตัวชี้วัด" },
        { id: "sub", label: "SubID & ค่าใช้จ่าย" },
        { id: "summary", label: "สรุปยอดสุทธิ" },
        { id: "chart", label: "กราฟ" },
        { id: "insight", label: "อินไซต์" },
    ];

    // Upcoming campaigns/promotions
    const upcomingCampaigns = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();

        const campaigns = [];

        // Generate campaigns for current and next year
        for (let year of [currentYear, currentYear + 1]) {
            // Monthly X.X sales (1.1, 2.2, etc.)
            for (let month = 1; month <= 12; month++) {
                campaigns.push({
                    name: `${month}.${month} ${month === 11 ? "Singles' Day" : month === 12 ? "Birthday Sale" : month === 10 ? "Shopping Festival" : month === 6 ? "Mid Year Sale" : "Sale"}`,
                    date: `${year}-${String(month).padStart(2, '0')}-${String(month).padStart(2, '0')}`
                });
            }

            // Mid-Month Sales (15th of every month)
            for (let month = 1; month <= 12; month++) {
                campaigns.push({
                    name: "Mid-Month Sale",
                    date: `${year}-${String(month).padStart(2, '0')}-15`
                });
            }

            // Payday Sales (25th of every month)
            for (let month = 1; month <= 12; month++) {
                campaigns.push({
                    name: "Payday Sale",
                    date: `${year}-${String(month).padStart(2, '0')}-25`
                });
            }
        }

        const upcoming = campaigns
            .map(camp => {
                const campDate = new Date(camp.date);
                const diffTime = campDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return { ...camp, daysLeft: diffDays };
            })
            .filter(camp => camp.daysLeft > 0) // Only upcoming
            .sort((a, b) => a.daysLeft - b.daysLeft); // Nearest first

        return upcoming[0] || null; // Return closest upcoming campaign
    }, []);

    const handleTabClick = (id: string) => {
        onTabChange?.(id);
        setSheetOpen(false);
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl transition-all duration-300 shadow-sm supports-[backdrop-filter]:bg-white/60">
            <div className="w-full px-6 flex h-16 items-center justify-between">
                <div className="flex items-center gap-8">
                    {/* Mobile Menu Trigger */}
                    <div className="lg:hidden">
                        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="mr-2 text-slate-600 dark:text-slate-300">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left">
                                <SheetHeader>
                                    <SheetTitle className="flex items-center gap-2">
                                        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                                            <PieChart className="h-5 w-5" />
                                        </div>
                                        AffROI
                                    </SheetTitle>
                                </SheetHeader>
                                {hasData && (
                                    <div className="flex flex-col gap-2 mt-8">
                                        {navItems.map((item) => (
                                            <Button
                                                key={item.id}
                                                variant={activeTab === item.id ? "secondary" : "ghost"}
                                                className="justify-start w-full text-base"
                                                onClick={() => handleTabClick(item.id)}
                                            >
                                                {item.label}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
                        <div className="hidden md:flex relative h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                            <PieChart className="h-5 w-5" />
                        </div>
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                            AffROI
                        </span>
                    </Link>

                    {hasData && (
                        <nav className="hidden lg:flex items-center gap-1">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange?.(item.id)}
                                    className={cn(
                                        "px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-200",
                                        activeTab === item.id
                                            ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md transform scale-105"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    )}
                </div>

                <nav className="flex items-center gap-3">
                    {/* Campaign Notification Banner */}
                    {upcomingCampaigns && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800 rounded-full shadow-sm">
                            <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400 animate-pulse" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                <span className="text-orange-600 dark:text-orange-400 font-bold">{upcomingCampaigns.name}</span>
                                {' '}อีก{' '}
                                <span className="font-bold text-red-600 dark:text-red-400">{upcomingCampaigns.daysLeft}</span>
                                {' '}วัน
                            </span>
                        </div>
                    )}

                    <Link href={pathname === "/extracom" ? "/dashboard" : "/extracom"}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full w-10 h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all"
                            title="Extracom Checker"
                        >
                            <Package className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                        </Button>
                    </Link>
                    <Link href="/calendar">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full w-10 h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all"
                            title="ปฏิทินแคมเปญ"
                        >
                            <Calendar className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                        </Button>
                    </Link>
                    <ModeToggle />

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full w-10 h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition-all"
                            >
                                <User className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                                <span className="sr-only">Toggle user menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mt-2">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer" onClick={() => onTabChange?.("map")}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>ตั้งค่าคอลัมน์</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20" onClick={handleSignOut}>
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sign out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </nav>
            </div>
        </header>
    );
}
