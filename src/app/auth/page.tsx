'use client'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {z} from "zod";
import { useForm } from 'react-hook-form'
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Finlandica } from "next/font/google";

const loginschema = z.object({
    email : z.string().min(1 , {message : 'Email không được để trống'}).email({message : 'Email không hợp lệ'}),
    password : z.string().min(6 , {message : 'Mật khẩu phải có ít nhất 6 ký tự'}),
})

const registerschema = z.object({
    name : z.string().min(1 , {message : 'Tên không được để trống'}),
    email : z.string().min(1 , {message : 'Email không được để trống'}).email({message : 'Email không hợp lệ'}),
    password : z.string().min(6 , {message : 'Mật khẩu phải có ít nhất 6 ký tự'}),
})

type loginFormData = z.infer<typeof loginschema>;
type registerFormData = z.infer<typeof registerschema>;

export default function AuthPage(){
    const router = useRouter();
    const [islogin , setIsLogin] = useState(true);
    const [showPassword , setShowPassword] = useState(false);
    const [loading , setloading] = useState(false);
    const {login }= useAuthStore();
    
    const loginform = useForm<loginFormData>({
        resolver : zodResolver(loginschema),
        defaultValues : {
            email : '',
            password : ''
        }
    })

    const registerform = useForm<registerFormData>({
        resolver : zodResolver(registerschema),
        defaultValues : {
            name : '',
            email : '',
            password : ''
        }
    })

    const currentForm = islogin ? loginform : registerform;

    const onSubmit = async (data : loginFormData | registerFormData) => {
        setloading(true);
        try {
            
            if(islogin){            
                console.log("Login data: ", data);
                const result = await fetch('http://localhost:3001/api/auth/signin', {
                    headers : {'Content-Type' : 'application/json'},
                    method : 'POST',
                    body : JSON.stringify(data)
                })
                const resData = await result.json();
                if(!resData.success){
                    toast.error(resData.message || 'Đăng nhập thất bại');
                    return;
                }
                console.log("Login response data: ", resData);
                login(resData.user, resData.accessToken);
                router.push('/');
                toast.success('Đăng nhập thành công');
                
                console.log("Login data: ", resData);
            }else{
                const result = await fetch('http://localhost:3001/api/auth/signup', {
                    headers : {'Content-Type' : 'application/json'},
                    method : 'POST',
                    body : JSON.stringify(data)
                })
                console.log(data);
                const resData = await result.json();
                if(resData.success){
                    toast.success('Đăng ký thành công, bạn có thể đăng nhập ngay bây giờ');
                    setIsLogin(true);
                    registerform.reset();
                }
                 if(!resData.success){
                    toast.error(resData.message || 'Đăng ký thất bại');
                    return;
                }
            }
        } catch (error) {
            toast.error('Đã xảy ra lỗi, vui lòng thử lại sau');
        }
        finally{
            setloading(false);
        }
    }

    return(

        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link className="inline-flex items-center text-xl font-bold text-indigo-600 hover:text-indigo-800" href={'/'}>
                        Mega Shop
                    </Link>
                    <p className="text-gray-600">
                        {islogin ? 'Đăng nhập vào tài khoản của bạn' : 'Tạo tài khoản mới'}
                    </p>
                </div>
            <div className="flex mb-6 text-gray-600 rounded-lg p-1 gap-2">
                 <Button variant={islogin ? 'default' : 'ghost'} className="flex-1 rounded-lg " onClick={() => setIsLogin(true)}>Đăng nhập</Button>
                    <Button variant={!islogin ? 'outline' : 'ghost'} className="flex-1 rounded-lg" onClick={() => setIsLogin(false)}>Đăng ký</Button>
            </div>
                  <form className="flex-col space-y-4 bg-white p-6 rounded-lg shadow-md gap-3" onSubmit={currentForm.handleSubmit(onSubmit)}>
                  {!islogin && (
            <div >
              <Label htmlFor="name" className="mb-2">Tên của bạn</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={18} />
                <Input id="name" placeholder="Nhập tên" className="pl-9 mb-2" {...currentForm.register("name")} />
              </div>
            </div>
          )}
            <div >
                <Label htmlFor="email" className="mb-2">Email</Label>
                <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <Input id="email" type="email" placeholder="Nhập email" className="pl-9" {...currentForm.register("email")} />
                </div>
            </div>
            <div>
                <Label htmlFor="password" className="mb-2">Mật khẩu</Label>
                <div className="relative">
                    <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu" className="pl-9" {...currentForm.register("password")} />
                    <Button onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 rounded-md p-1" variant="ghost" size="icon" type="button">
                        {showPassword ? <EyeOff size={18}></EyeOff> : <Eye size={18}></Eye>}
                    </Button>
                </div>


            </div>
              <Button type="submit" className="w-full mt-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600" >
                {loading ? <Loader2 className="animate-spin" /> : (islogin ? "Đăng nhập" : "Đăng ký")}
          </Button>
            </form>
            </div>
        </div>
    )
}

