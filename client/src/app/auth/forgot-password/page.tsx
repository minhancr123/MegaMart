'use client'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";

const forgotPasswordSchema = z.object({
    email: z.string().min(1, { message: 'Email không được để trống' }).email({ message: 'Email không hợp lệ' }),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log("Forgot password for:", data.email);
            setSubmitted(true);
            toast.success("Đã gửi email khôi phục mật khẩu (mô phỏng)");
        } catch {
            toast.error("Đã xảy ra lỗi, vui lòng thử lại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[#f7f8fa] p-4 sm:p-6">
            <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_70px_rgba(28,25,23,0.12)] lg:grid-cols-[1.15fr_.85fr]">
                <div className="relative hidden min-h-[560px] overflow-hidden bg-orange-50 lg:block">
                    <Image src="/images/stitch/forgot-shopping.jpg" alt="Minh họa thiết bị điện máy" fill priority sizes="55vw" className="object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#9f2d00]/45 via-transparent to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-10 text-white">
                        <p className="text-sm font-bold uppercase tracking-[0.14em] text-orange-100">MegaMart VN</p>
                        <h2 className="mt-2 text-3xl font-black">Khôi phục tài khoản an toàn</h2>
                        <p className="mt-2 max-w-md text-sm text-orange-50">Chúng tôi sẽ gửi hướng dẫn đến đúng địa chỉ email đã đăng ký.</p>
                    </div>
                </div>

                <div className="flex flex-col justify-center space-y-6 p-8 sm:p-10">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quên mật khẩu?</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {!submitted
                            ? "Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu."
                            : "Chúng tôi đã gửi hướng dẫn đến email của bạn."}
                    </p>
                </div>

                {!submitted ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" size={18} />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10"
                                    {...register("email")}
                                />
                            </div>
                            {errors.email && (
                                <p className="text-xs text-red-500">{errors.email.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full rounded-full bg-[#fc4c00] hover:bg-[#af3200] text-white"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                            Gửi hướng dẫn
                        </Button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm">
                            Vui lòng kiểm tra hộp thư đến (và cả thư mục spam) để nhận liên kết đặt lại mật khẩu.
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setSubmitted(false)}
                        >
                            Gửi lại
                        </Button>
                    </div>
                )}

                <div className="text-center">
                    <Link href="/auth" className="inline-flex items-center text-sm font-medium text-[#af3200] hover:text-[#9a2b00]">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Quay lại đăng nhập
                    </Link>
                </div>
                </div>
            </div>
        </div>
    );
}
