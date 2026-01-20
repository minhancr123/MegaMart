'use client'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail, User, ShoppingBag, ArrowRight, Facebook, Chrome } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from 'react-hook-form'
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

const loginschema = z.object({
    email: z.string().min(1, { message: 'Email không được để trống' }).email({ message: 'Email không hợp lệ' }),
    password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
})

const registerschema = z.object({
    name: z.string().min(1, { message: 'Tên không được để trống' }),
    email: z.string().min(1, { message: 'Email không được để trống' }).email({ message: 'Email không hợp lệ' }),
    password: z.string().min(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
})

type loginFormData = z.infer<typeof loginschema>;
type registerFormData = z.infer<typeof registerschema>;

export default function AuthPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [islogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setloading] = useState(false);
    const { login } = useAuthStore();

    // Check if redirected due to expired token
    useEffect(() => {
        const expired = searchParams.get('expired');
        if (expired === 'true') {
            toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
        }
    }, [searchParams]);

    const loginform = useForm<loginFormData>({
        resolver: zodResolver(loginschema),
        defaultValues: {
            email: '',
            password: ''
        }
    })

    const registerform = useForm<registerFormData>({
        resolver: zodResolver(registerschema),
        defaultValues: {
            name: '',
            email: '',
            password: ''
        }
    })

    const currentForm = islogin ? loginform : registerform;

    const onSubmit = async (data: loginFormData | registerFormData) => {
        setloading(true);
        try {

            if (islogin) {
                console.log("Login data: ", data);
                const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/signin`, {
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST',
                    body: JSON.stringify(data)
                })
                const resData = await result.json();
                if (!resData.success) {
                    toast.error(resData.message || 'Đăng nhập thất bại');
                    return;
                }
                console.log("Login response data: ", resData);
                login(resData.user, resData.accessToken);
                router.push('/');
                toast.success('Đăng nhập thành công');

                console.log("Login data: ", resData);
            } else {
                const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/signup`, {
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST',
                    body: JSON.stringify(data)
                })
                console.log(data);
                const resData = await result.json();
                if (resData.success) {
                    toast.success('Đăng ký thành công, bạn có thể đăng nhập ngay bây giờ');
                    setIsLogin(true);
                    registerform.reset();
                }
                if (!resData.success) {
                    toast.error(resData.message || 'Đăng ký thất bại');
                    return;
                }
            }
        } catch (error) {
            toast.error('Đã xảy ra lỗi, vui lòng thử lại sau');
        }
        finally {
            setloading(false);
        }
    }

    return (
        <div className="min-h-screen w-full flex bg-white">
            {/* Left Side - Image & Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-blue-50 relative flex-col justify-between p-12 overflow-hidden">
                <div className="z-10 relative">
                    <Link href="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600 transition-opacity hover:opacity-80">
                        <ShoppingBag className="w-8 h-8" />
                        Mega Shop
                    </Link>
                    <div className="mt-16 space-y-6">
                        <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
                            Khám phá thế giới <br /> mua sắm trực tuyến
                        </h1>
                        <p className="text-lg text-gray-600 max-w-md">
                            Hàng ngàn sản phẩm chất lượng, ưu đãi hấp dẫn và giao hàng nhanh chóng đang chờ đón bạn.
                        </p>
                        <div className="flex gap-4 pt-4">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                                        U{i}
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-col justify-center">
                                <div className="flex text-yellow-400 text-sm">★★★★★</div>
                                <div className="text-sm text-gray-600">Hơn 10k+ khách hàng tin dùng</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 z-0">
                    <Image
                        src="/images/auth-banner.png"
                        alt="Shopping Banner"
                        fill
                        className="object-cover object-center opacity-90"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent" />
                </div>

                <div className="z-10 relative text-sm text-gray-500 font-medium">
                    © 2026 Mega Shop. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="w-full max-w-md space-y-8">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-blue-600">
                            <ShoppingBag className="w-8 h-8" />
                            Mega Shop
                        </Link>
                    </div>

                    <div className="text-center lg:text-left space-y-2">
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
                            {islogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
                        </h2>
                        <p className="text-gray-500">
                            {islogin
                                ? 'Nhập thông tin đăng nhập để tiếp tục.'
                                : 'Đăng ký miễn phí và bắt đầu mua sắm ngay hôm nay.'}
                        </p>
                    </div>

                    {/* Social Login */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="w-full h-11 font-medium text-gray-700 hover:bg-gray-50">
                            <Chrome className="w-5 h-5 mr-2 text-red-500" />
                            Google
                        </Button>
                        <Button variant="outline" className="w-full h-11 font-medium text-gray-700 hover:bg-gray-50">
                            <Facebook className="w-5 h-5 mr-2 text-blue-600" />
                            Facebook
                        </Button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Hoặc tiếp tục với email</span>
                        </div>
                    </div>

                    {/* Form */}
                    <form className="space-y-5" onSubmit={currentForm.handleSubmit(onSubmit)}>
                        {!islogin && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Tên đầy đủ</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <Input
                                        id="name"
                                        placeholder="Nguyễn Văn A"
                                        className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                                        {...registerform.register("name")}
                                    />
                                </div>
                                {registerform.formState.errors.name && (
                                    <p className="text-xs text-red-500 mt-1">{registerform.formState.errors.name.message}</p>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    className="pl-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                                    {...(islogin ? loginform.register("email") : registerform.register("email"))}
                                />
                            </div>
                            {(islogin ? loginform.formState.errors.email : registerform.formState.errors.email) && (
                                <p className="text-xs text-red-500 mt-1">
                                    {(islogin ? loginform.formState.errors.email?.message : registerform.formState.errors.email?.message)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mật khẩu</Label>
                                {islogin && (
                                    <Link href="/auth/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-500">
                                        Quên mật khẩu?
                                    </Link>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                                    {...(islogin ? loginform.register("password") : registerform.register("password"))}
                                />
                                <Button
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-1 top-1 h-9 w-9 text-gray-400 hover:text-gray-600"
                                    variant="ghost"
                                    size="icon"
                                    type="button"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </Button>
                            </div>
                            {(islogin ? loginform.formState.errors.password : registerform.formState.errors.password) && (
                                <p className="text-xs text-red-500 mt-1">
                                    {(islogin ? loginform.formState.errors.password?.message : registerform.formState.errors.password?.message)}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/40"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                            {islogin ? "Đăng nhập" : "Tạo tài khoản"}
                            {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                        </Button>
                    </form>

                    <div className="text-center text-sm text-gray-500">
                        {islogin ? "Bạn chưa có tài khoản? " : "Bạn đã có tài khoản? "}
                        <button
                            onClick={() => {
                                setIsLogin(!islogin);
                                if (islogin) loginform.reset();
                                else registerform.reset();
                            }}
                            className="font-semibold text-blue-600 hover:text-blue-500 hover:underline transition-all"
                        >
                            {islogin ? "Đăng ký ngay" : "Đăng nhập"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

