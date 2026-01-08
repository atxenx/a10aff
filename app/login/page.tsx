"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PieChart, Loader2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            localStorage.setItem("aff_token", "mock-token");
            setLoading(false);
            router.push("/dashboard");
        }, 1000);
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors duration-300">
            {/* Background Gradients */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                <Link
                    href="/"
                    className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>

                <div className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl p-8 shadow-2xl transition-all">
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                            <PieChart className="h-7 w-7" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Welcome Back</h1>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Enter your credentials to access your dashboard
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                className="bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 focus:ring-blue-500/20 dark:text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
                                <Link
                                    href="#"
                                    className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                required
                                className="bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-white/10 focus:ring-blue-500/20 dark:text-white"
                            />
                        </div>
                        <Button
                            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02]"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 hover:underline transition-all">
                            Create account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
