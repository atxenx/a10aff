import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, CheckCircle2, Globe, Layers, LineChart, PieChart, ShieldCheck, Zap } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 selection:bg-blue-500/30 transition-colors duration-300">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <header className="fixed top-0 z-50 w-full border-b border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl transition-colors duration-300">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <PieChart className="h-5 w-5" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              AffROI
            </span>
          </div>
          <nav className="flex items-center gap-2 md:gap-6">
            <ModeToggle />
            <div className="hidden md:flex items-center gap-6">
              <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Log in
              </Link>
              <Link href="/signup">
                <Button className="h-9 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 font-medium px-6 transition-all shadow-[0_0_20px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_0_20px_-10px_rgba(255,255,255,0.5)]">
                  Sign Up
                </Button>
              </Link>
            </div>
            {/* Mobile simplified nav */}
            <div className="flex md:hidden items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-300 mb-8 backdrop-blur-sm animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 mr-2 animate-pulse"></span>
              New: Real-time ROI Tracking v2.0
            </div>
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl mb-8">
              <span className="block text-slate-900 dark:text-slate-100">Maximize Your</span>
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 whitespace-nowrap">
                Affiliate Profits
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400 md:text-xl mb-10 leading-relaxed">
              Stop guessing. Start scaling. Track your Shopee Affiliate performance with precision,
              calculate real ROI per SubID, and unlock actionable insights.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button className="h-14 px-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-semibold shadow-lg shadow-blue-500/25 transition-all hover:scale-105">
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" className="h-14 px-8 rounded-full border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-100/10 hover:text-slate-900 dark:hover:text-white text-lg transition-all">
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Abstract UI Mockup */}
            <div className="mt-20 relative mx-auto max-w-5xl rounded-xl border border-slate-200 dark:border-white/10 bg-white/40 dark:bg-slate-900/50 backdrop-blur-sm shadow-2xl overflow-hidden aspect-[16/9] group">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5" />
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />

              {/* Mockup Content Grid */}
              <div className="p-8 grid grid-cols-12 gap-6 h-full text-left opacity-80 group-hover:opacity-100 transition-opacity duration-500">
                {/* Sidebar Mockup */}
                <div className="col-span-3 hidden md:flex flex-col gap-4 border-r border-slate-200 dark:border-white/5 pr-6">
                  <div className="h-8 w-24 bg-slate-200 dark:bg-white/10 rounded-md" />
                  <div className="h-4 w-full bg-slate-100 dark:bg-white/5 rounded-md mt-4" />
                  <div className="h-4 w-3/4 bg-slate-100 dark:bg-white/5 rounded-md" />
                  <div className="h-4 w-5/6 bg-slate-100 dark:bg-white/5 rounded-md" />
                </div>
                {/* Main Content Mockup */}
                <div className="col-span-12 md:col-span-9 flex flex-col gap-6">
                  <div className="flex gap-4 mb-4">
                    <div className="h-24 flex-1 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl" />
                    <div className="h-24 flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl" />
                    <div className="h-24 flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl" />
                  </div>
                  <div className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-500/20 to-transparent" />
                    {/* Fake Chart Lines */}
                    <svg className="w-full h-full absolute inset-0 text-blue-500/30" preserveAspectRatio="none">
                      <path d="M0,100 C150,80 300,120 450,60 S 800,90 1200,10 L1200,200 L0,200 Z" fill="currentColor" />
                      <path d="M0,100 C150,80 300,120 450,60 S 800,90 1200,10" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 md:py-32 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl mb-4">
                Everything you need to scale
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
                Built for serious affiliates who demand data-driven results.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />}
                title="Real-Time Analytics"
                description="Watch your commissions grow in real-time with our low-latency tracking system."
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-amber-500 dark:text-amber-400" />}
                title="Instant ROI Calculation"
                description="Automatically match ad spend with revenue to calculate precise ROI for every campaign."
              />
              <FeatureCard
                icon={<Globe className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />}
                title="Global Marketplace Support"
                description="Track campaigns across multiple Shopee regions from a single unified dashboard."
              />
              <FeatureCard
                icon={<Layers className="h-8 w-8 text-purple-600 dark:text-purple-400" />}
                title="SubID Granularity"
                description="Drill down into individual SubIDs to identify your winning variances instantly."
              />
              <FeatureCard
                icon={<ShieldCheck className="h-8 w-8 text-rose-600 dark:text-rose-400" />}
                title="Link Protection"
                description="Secure your affiliate links and prevent commission hijacking with our shield tech."
              />
              <FeatureCard
                icon={<LineChart className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />}
                title="Trend Forecasting"
                description="AI-powered insights predict which products are about to trend before they explode."
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-600/5" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/50 dark:to-indigo-900/50 border border-white/20 dark:border-white/10 p-8 md:p-16 text-center backdrop-blur-md overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px]" />
              <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />

              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 relative z-10">
                Ready to dominate your niche?
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 relative z-10">
                Join thousands of top-tier affiliates who are already using AffROI to maximize their earnings.
              </p>
              <div className="relative z-10">
                <Link href="/signup">
                  <Button className="h-14 px-10 rounded-full bg-blue-600 dark:bg-white text-white dark:text-blue-900 hover:bg-blue-700 dark:hover:bg-blue-50 font-bold text-lg shadow-xl hover:shadow-2xl transition-all hover:scale-105">
                    Start Your Free Trial
                  </Button>
                </Link>
                <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> No credit card required</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> 14-day free trial</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-10 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 font-bold text-xl text-slate-900 dark:text-white mb-4">
                <PieChart className="h-6 w-6 text-blue-500" />
                <span>AffROI</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                The #1 choice for data-driven affiliates.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-blue-500 hover:dark:text-blue-400 transition-colors">Features</Link></li>
                <li><Link href="#" className="hover:text-blue-500 hover:dark:text-blue-400 transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-blue-500 hover:dark:text-blue-400 transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-blue-500 hover:dark:text-blue-400 transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-blue-500 hover:dark:text-blue-400 transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-blue-500 hover:dark:text-blue-400 transition-colors">Guides</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-blue-500 hover:dark:text-blue-400 transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-blue-500 hover:dark:text-blue-400 transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-500 text-slate-600">© 2024 AffROI Inc. All rights reserved.</p>
            <div className="flex gap-4">
              {/* Social placeholders */}
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 cursor-pointer transition-colors" />
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 cursor-pointer transition-colors" />
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/5 hover:bg-slate-300 dark:hover:bg-white/10 cursor-pointer transition-colors" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 p-8 transition-all hover:border-blue-200 hover:dark:border-white/10 hover:-translate-y-1 shadow-sm hover:shadow-md dark:shadow-none">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/5 transition-all group-hover:scale-110 group-hover:dark:bg-white/10 hover:rotate-3">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  )
}
