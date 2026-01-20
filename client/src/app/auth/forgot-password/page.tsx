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
        } catch (error) {
            toast.error("Đã xảy ra lỗi, vui lòng thử lại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu?</h1>
                    <p className="text-gray-500 text-sm">
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
                                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
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
                            className="w-full bg-blue-600 hover:bg-blue-700"
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
                    <Link href="/auth" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Quay lại đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
}
