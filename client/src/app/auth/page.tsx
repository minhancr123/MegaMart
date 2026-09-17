'use client'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, BadgeCheck, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, ShoppingBag, Truck, User } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from 'react-hook-form'
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, LogoDark } from "@/components/ui/Logo";
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

// Component to handle search params (must be in Suspense boundary)
function ExpiredTokenChecker() {
    const searchParams = useSearchParams();
    
    useEffect(() => {
        const expired = searchParams.get('expired');
        if (expired === 'true') {
            // Removed automatic error toast - users can browse without login
            // toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
        }
    }, [searchParams]);

    return null;
}

function AuthPageContent() {
    const router = useRouter();
    const [islogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setloading] = useState(false);
    const { login } = useAuthStore();

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
                const result = await fetch('http://localhost:3001/api/auth/signin', {
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
                // Điều hướng theo vai trò: shipper là nhân viên giao hàng, không vào giao diện khách hàng.
                const role = resData.user?.role;
                const redirectTo = role === 'SHIPPER' ? '/shipper' : role === 'SUPPLIER' ? '/supplier' : '/';
                router.push(redirectTo);
                toast.success('Đăng nhập thành công');

                console.log("Login data: ", resData);
            } else {
                const result = await fetch('http://localhost:3001/api/auth/signup', {
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
        } catch {
            toast.error('Đã xảy ra lỗi, vui lòng thử lại sau');
        }
        finally {
            setloading(false);
        }
    }

    return (
        <div className="flex min-h-screen overflow-hidden bg-[#f7f8fa]">
            <Suspense fallback={<div />}>
                <ExpiredTokenChecker />
            </Suspense>
            
            {/* Left visual uses the dedicated sign-in artwork generated in Stitch. */}
            <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#7f2400] via-[#c53b00] to-[#ff6b00] p-12 text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between xl:p-16">
                <Image src="/images/stitch/auth-shopping.jpg" alt="Không gian mua sắm MegaMart" fill priority sizes="50vw" className="object-cover object-[88%_center] opacity-70 mix-blend-screen" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#7f2400]/78 via-[#c53b00]/68 to-[#ff6b00]/55" />
                <div className="absolute -right-24 -top-20 h-96 w-96 rounded-full border-[72px] border-white/10" />
                <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-orange-200/10 blur-2xl" />
                <Link href="/" className="relative z-10 w-fit"><LogoDark /></Link>
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 max-w-xl">
                    <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em]"><BadgeCheck className="h-4 w-4" /> Thành viên MegaMart</span>
                    <h1 className="text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">Mua sắm điện máy dễ dàng hơn mỗi ngày</h1>
                    <p className="mt-5 max-w-lg text-lg leading-8 text-orange-50">Đăng nhập để theo dõi đơn hàng, lưu sản phẩm yêu thích và nhận ưu đãi dành riêng cho bạn.</p>
                    <div className="mt-9 grid gap-3 sm:grid-cols-3">
                        {[
                            { icon: ShoppingBag, label: "3.000+ sản phẩm" },
                            { icon: ShieldCheck, label: "Chính hãng 100%" },
                            { icon: Truck, label: "Giao lắp tận nơi" },
                        ].map((item) => <div key={item.label} className="rounded-xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm"><item.icon className="mb-2 h-5 w-5 text-orange-200" /><span className="text-xs font-bold">{item.label}</span></div>)}
                    </div>
                </motion.div>
                <p className="relative z-10 text-xs text-white/60">© 2026 MegaMart VN · Điện máy chính hãng</p>
            </div>

            {/* Right Side - Form */}
            <div className="relative flex w-full items-center justify-center p-6 lg:w-1/2">
                <div className="w-full max-w-md z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-[0_20px_60px_rgba(28,25,23,0.10)]"
                    >
                        <div className="text-center mb-8 lg:hidden">
                            <Link className="inline-flex items-center justify-center mb-2" href={'/'}>
                                <Logo />
                            </Link>
                        </div>

                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                {islogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
                            </h2>
                            <p className="text-slate-500 dark:text-gray-400">
                                {islogin ? 'Nhập thông tin đăng nhập của bạn để tiếp tục.' : 'Điền thông tin bên dưới để đăng ký tài khoản.'}
                            </p>
                        </div>

                        <div className="flex p-1 bg-slate-100/50 dark:bg-gray-800/50 rounded-xl mb-8 relative">
                            <div
                                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-300 ease-in-out"
                                style={{ left: islogin ? '4px' : 'calc(50%)' }}
                            />
                            <button
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors ${islogin ? 'text-[#af3200] dark:text-[#ff571a]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
                                onClick={() => setIsLogin(true)}
                            >
                                Đăng nhập
                            </button>
                            <button
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors ${!islogin ? 'text-[#af3200] dark:text-[#ff571a]' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
                                onClick={() => setIsLogin(false)}
                            >
                                Đăng ký
                            </button>
                        </div>

                        <form className="space-y-5" onSubmit={currentForm.handleSubmit(onSubmit)}>
                            <AnimatePresence mode="wait">
                                {!islogin && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 overflow-hidden"
                                    >
                                        <Label htmlFor="name" className="text-slate-700">Tên đầy đủ</Label>
                                        <div className="relative group">
                                            <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-[#fc4c00] transition-colors" size={18} />
                                            <Input
                                                id="name"
                                                placeholder="Nguyễn Văn A"
                                                className="pl-10 bg-white/50 border-slate-200 focus:border-[#fc4c00] focus:ring-[#fc4c00]/20 transition-all"
                                                {...registerform.register("name")}
                                            />
                                        </div>
                                        {registerform.formState.errors.name && (
                                            <p className="text-red-500 text-xs mt-1">{registerform.formState.errors.name.message}</p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700">Email</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-[#fc4c00] transition-colors" size={18} />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="pl-10 bg-white/50 border-slate-200 focus:border-[#fc4c00] focus:ring-[#fc4c00]/20 transition-all"
                                        {...(islogin ? loginform.register("email") : registerform.register("email"))}
                                    />
                                </div>
                                {(islogin ? loginform.formState.errors.email : registerform.formState.errors.email) && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {(islogin ? loginform.formState.errors.email?.message : registerform.formState.errors.email?.message)}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-slate-700">Mật khẩu</Label>
                                    {islogin && (
                                        <Link href="/auth/forgot-password" className="text-xs text-[#af3200] hover:text-[#9a2b00] font-medium">
                                            Quên mật khẩu?
                                        </Link>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-[#fc4c00] transition-colors" size={18} />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-10 pr-10 bg-white/50 border-slate-200 focus:border-[#fc4c00] focus:ring-[#fc4c00]/20 transition-all"
                                        {...(islogin ? loginform.register("password") : registerform.register("password"))}
                                    />
                                    <button
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                                        type="button"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {(islogin ? loginform.formState.errors.password : registerform.formState.errors.password) && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {(islogin ? loginform.formState.errors.password?.message : registerform.formState.errors.password?.message)}
                                    </p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-11 bg-[#fc4c00] hover:bg-[#af3200] text-white shadow-lg shadow-[#fc4c00]/30 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-full font-medium text-base"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin mr-2" />
                                ) : (
                                    <span className="flex items-center justify-center">
                                        {islogin ? "Đăng nhập" : "Tạo tài khoản"}
                                        <ArrowRight className="ml-2" size={18} />
                                    </span>
                                )}
                            </Button>
                        </form>

                        <div className="mt-8 text-center">
                            <p className="text-slate-500 text-sm">
                                Bằng cách tiếp tục, bạn đồng ý với{' '}
                                <Link href="/terms" className="text-[#af3200] hover:text-[#9a2b00] font-medium hover:underline">
                                    Điều khoản dịch vụ
                                </Link>{' '}
                                và{' '}
                                <Link href="/privacy" className="text-[#af3200] hover:text-[#9a2b00] font-medium hover:underline">
                                    Chính sách bảo mật
                                </Link>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

// Main export with Suspense boundary
export default function AuthPage() {
    return (
        <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-[#ff571a]/30 border-t-[#fc4c00] rounded-full animate-spin" />
                    <span className="text-slate-600 text-sm">Đang tải...</span>
                </div>
            </div>
        }>
            <AuthPageContent />
        </Suspense>
    );
}
