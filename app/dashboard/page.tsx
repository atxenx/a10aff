"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AffiliateRoiDashboard from "@/components/AffiliateRoiDashboard";
import { DashboardNavbar } from "@/components/DashboardNavbar";

export default function DashboardPage() {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("aff_token");
        if (!token) {
            router.push("/login");
        } else {
            setAuthorized(true);
        }
    }, [router]);

    if (!authorized) {
        return null; // or a loading spinner
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-300">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
                <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-[100px]" />
            </div>



            <main className="relative z-10 pt-20 pb-10 px-4 md:px-6 container mx-auto">
                <AffiliateRoiDashboard />
            </main>
        </div>
    );
}
