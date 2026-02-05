'use client'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail, User, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useForm } from 'react-hook-form'
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo, LogoDark } from "@/components/ui/Logo";

// Dynamically import the 3D scene to avoid SSR issues with Three.js
const IPhoneScene = dynamic(() => import('@/components/auth/IPhoneScene'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-white/60 text-sm">Đang tải 3D...</span>
            </div>
        </div>
    )
});


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

function AuthContent() {
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
                router.push('/');
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
        <div className="min-h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 to-indigo-50/50 dark:from-gray-950 dark:to-gray-900">
            {/* Left Side - 3D Scene */}
            <div className="hidden lg:block lg:w-3/5 relative bg-slate-950 dark:bg-black overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <IPhoneScene />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80 z-10 pointer-events-none" />

                <div className="absolute top-10 left-10 z-20">
                    <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105 duration-300">
                        <LogoDark />
                    </Link>
                </div>

                <div className="absolute bottom-20 left-10 z-20 max-w-xl text-white">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-5xl font-bold mb-6 leading-tight"
                    >
                        Trải nghiệm mua sắm <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            Tương lai
                        </span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="text-lg text-slate-300 mb-8"
                    >
                        Khám phá hàng ngàn sản phẩm chất lượng cao với ưu đãi hấp dẫn mỗi ngày. Đăng nhập để bắt đầu hành trình mua sắm của bạn.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        className="flex gap-4"
                    >
                        <div className="flex -space-x-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs text-white">
                                    U{i}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-4 h-4 text-yellow-400">★</div>)}
                            </div>
                            <span className="text-sm text-slate-400">Được tin dùng bởi hơn 10k+ khách hàng</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-2/5 flex items-center justify-center p-6 relative">
                {/* Mobile Background (visible only on small screens) */}
                <div className="absolute inset-0 lg:hidden z-0 bg-slate-950 dark:bg-black">
                    <IPhoneScene />
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                </div>

                <div className="w-full max-w-md z-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/90 dark:bg-gray-900/90 lg:bg-white/50 lg:dark:bg-gray-900/50 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 shadow-2xl rounded-2xl p-8"
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
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors ${islogin ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
                                onClick={() => setIsLogin(true)}
                            >
                                Đăng nhập
                            </button>
                            <button
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg relative z-10 transition-colors ${!islogin ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'}`}
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
                                            <User className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                            <Input
                                                id="name"
                                                placeholder="Nguyễn Văn A"
                                                className="pl-10 bg-white/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
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
                                    <Mail className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="name@example.com"
                                        className="pl-10 bg-white/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
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
                                        <Link href="/auth/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                            Quên mật khẩu?
                                        </Link>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-10 pr-10 bg-white/50 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all"
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
                                className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] rounded-xl font-medium text-base"
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
                                <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
                                    Điều khoản dịch vụ
                                </Link>{' '}
                                và{' '}
                                <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline">
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

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        }>
            <AuthContent />
        </Suspense>
    )
}
