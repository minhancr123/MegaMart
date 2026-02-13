"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  Gift,
  ArrowLeft,
  TrendingUp,
  Award,
  Ticket,
  Clock,
  CheckCircle2,
  Copy,
  Sparkles,
} from "lucide-react";
import {
  useLoyaltyStore,
  generateDemoPoints,
  LOYALTY_TIERS,
  REDEEMABLE_VOUCHERS,
  PointTransactionType,
} from "@/store/loyaltyStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { motion } from "framer-motion";

const transactionTypeConfig: Record<
  PointTransactionType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  earn: { label: "Tích điểm", color: "text-green-600 dark:text-green-400", icon: <TrendingUp className="w-4 h-4" /> },
  redeem: { label: "Đổi điểm", color: "text-red-600 dark:text-red-400", icon: <Ticket className="w-4 h-4" /> },
  bonus: { label: "Thưởng", color: "text-purple-600 dark:text-purple-400", icon: <Gift className="w-4 h-4" /> },
  expire: { label: "Hết hạn", color: "text-gray-500", icon: <Clock className="w-4 h-4" /> },
};

export default function LoyaltyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    totalPoints,
    lifetimePoints,
    transactions,
    getCurrentTier,
    getNextTier,
    getProgressToNextTier,
    redeemVoucher,
  } = useLoyaltyStore();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "redeem" | "history">("overview");

  useEffect(() => {
    setMounted(true);
    generateDemoPoints();
  }, []);

  if (!mounted) return null;

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const progress = getProgressToNextTier();

  const handleRedeem = (voucherId: string) => {
    const result = redeemVoucher(voucherId);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Đã copy mã: ${code}`);
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} ngày trước`;
    return new Date(timestamp).toLocaleDateString("vi-VN");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Header />
      <main className="pt-[100px] md:pt-[120px] pb-12">
        <div className="max-w-5xl mx-auto px-4">
          {/* Back */}
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 hover:bg-white dark:hover:bg-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </Button>

          {/* Hero Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className={`overflow-hidden border-0 shadow-xl bg-gradient-to-r ${currentTier.color} text-white mb-8`}>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">{currentTier.icon}</span>
                      <div>
                        <p className="text-white/80 text-sm">Hạng thành viên</p>
                        <h1 className="text-2xl sm:text-3xl font-bold">{currentTier.name}</h1>
                      </div>
                    </div>
                    <p className="text-white/80 text-sm mt-1">
                      {user?.name || "Thành viên MegaMart"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-white/80 text-sm">Điểm hiện có</p>
                    <p className="text-4xl font-bold">{totalPoints.toLocaleString()}</p>
                    <p className="text-white/70 text-xs mt-1">
                      Tích lũy: {lifetimePoints.toLocaleString()} điểm
                    </p>
                  </div>
                </div>

                {/* Progress to next tier */}
                {nextTier && (
                  <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-white/80">
                        {currentTier.icon} {currentTier.name}
                      </span>
                      <span className="text-white/80">
                        {nextTier.icon} {nextTier.name}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2 bg-white/20" />
                    <p className="text-white/70 text-xs mt-2 text-center">
                      Còn {(nextTier.minPoints - lifetimePoints).toLocaleString()} điểm nữa để lên hạng{" "}
                      <strong className="text-white">{nextTier.name}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800 pb-0">
            {[
              { key: "overview", label: "Tổng quan", icon: <Award className="w-4 h-4" /> },
              { key: "redeem", label: "Đổi voucher", icon: <Gift className="w-4 h-4" /> },
              { key: "history", label: "Lịch sử", icon: <Clock className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-[1px] ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Tier Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {LOYALTY_TIERS.map((tier) => (
                  <Card
                    key={tier.name}
                    className={`transition-all ${
                      tier.name === currentTier.name
                        ? "ring-2 ring-blue-500 shadow-lg"
                        : "opacity-70"
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{tier.icon}</span>
                        <div>
                          <CardTitle className="text-sm">{tier.name}</CardTitle>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {tier.minPoints.toLocaleString()}+ điểm
                          </p>
                        </div>
                        {tier.name === currentTier.name && (
                          <Badge className="ml-auto bg-blue-600 text-white text-[10px]">
                            Hiện tại
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1.5">
                        {tier.benefits.map((benefit, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Điểm kiếm được</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        +{transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Điểm đã dùng</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Tổng giao dịch</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {transactions.length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === "redeem" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 Bạn đang có <strong>{totalPoints.toLocaleString()} điểm</strong>. Đổi điểm lấy voucher giảm giá ngay!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {REDEEMABLE_VOUCHERS.map((voucher) => {
                  const canAfford = totalPoints >= voucher.pointsCost;
                  return (
                    <Card
                      key={voucher.id}
                      className={`overflow-hidden transition-all ${
                        canAfford
                          ? "hover:shadow-lg hover:-translate-y-0.5"
                          : "opacity-60"
                      }`}
                    >
                      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {voucher.name}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {voucher.description}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className="flex-shrink-0 border-yellow-400 text-yellow-700 dark:text-yellow-400"
                          >
                            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                            {voucher.pointsCost}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono text-gray-600 dark:text-gray-300">
                            {voucher.code}
                          </code>
                          <button
                            onClick={() => copyCode(voucher.code)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <Button
                          onClick={() => handleRedeem(voucher.id)}
                          disabled={!canAfford}
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500"
                        >
                          {canAfford ? "Đổi ngay" : `Thiếu ${(voucher.pointsCost - totalPoints).toLocaleString()} điểm`}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Card>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                      <Clock className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm">Chưa có giao dịch nào</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {transactions.map((tx) => {
                        const config = transactionTypeConfig[tx.type];
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                          >
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                tx.amount > 0
                                  ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                  : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                              }`}
                            >
                              {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {tx.description}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {config.label}
                                </Badge>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {getTimeAgo(tx.createdAt)}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-sm font-bold flex-shrink-0 ${config.color}`}
                            >
                              {tx.amount > 0 ? "+" : ""}
                              {tx.amount.toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
