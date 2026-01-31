"use client"
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import axiosClient from '@/lib/axiosClient';
import { toast } from 'sonner';
import axios from 'axios';
import { Camera } from 'lucide-react';

// Cloudinary envs — may be undefined in local developer environments.
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function ProfilePage() {
    const { user } = useAuthStore();
    const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [file, setfile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (user) {
            console.log('Loaded user in profile page:', user);
            setForm({ name: (user as any).name || '', email: (user as any).email || '', phone: (user as any).phone || '', address: (user as any).address || '' });
            setAvatarUrl((user as any).avatarUrl || null);
        }
    }, [user]);

    const handleFileChange = async (e: any) => {
        const picked = e.target.files?.[0];
        if (!picked) return;
        setfile(picked);
        setPreview(URL.createObjectURL(picked));
    }
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    }

    const handleSave = async () => {
        if (!user) return toast.error('Bạn chưa đăng nhập');
        setLoading(true);
        try {
            let finalAvatarUrl = avatarUrl || (user as any)?.avatarUrl || null;

            // If a file was selected, try Cloudinary first (if envs present), otherwise fallback to backend upload.
            if (file) {
                const formdata = new FormData();
                formdata.append('file', file as File);

                if (cloudName && uploadPreset) {
                    formdata.append('upload_preset', uploadPreset);

                    const res = await fetch(
                        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                        {
                            method: "POST",
                            body: formdata,
                        }
                    );

                    const data = await res.json();
                    if (res.ok && data?.secure_url) {
                        finalAvatarUrl = data.secure_url;
                        console.log("Cloudinary URL:", data.secure_url);
                    } else {
                        console.error("Cloudinary upload error:", data);
                        // Try backend fallback below
                    }
                }

                // If cloudName was not provided or Cloudinary failed to return a URL, fallback to backend endpoint
                if (!finalAvatarUrl) {
                    try {
                        // Use axiosClient so the request goes to the configured API baseURL (which already includes `/api`)
                        const backendRes = await axiosClient.post('/users/me/avatar', formdata, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });

                        // Try a few common places the backend might return the URL
                        finalAvatarUrl = backendRes?.data?.data?.avatarUrl || backendRes?.data?.avatarUrl || backendRes?.data?.data?.user?.avatarUrl || null;
                        if (!finalAvatarUrl) {
                            console.error('Backend upload did not return avatar URL', backendRes?.data);
                            throw new Error('Không thể lấy URL ảnh từ server');
                        }
                    } catch (beErr: any) {
                        console.error('Backend upload error:', beErr);
                        throw beErr;
                    }
                }
            }

            // Now save user profile fields (including avatar URL if we have one)
            const payload: any = { name: form.name, phone: form.phone, address: form.address };
            if (finalAvatarUrl) payload.avatarUrl = finalAvatarUrl;

            // axiosClient.baseURL already includes `/api`, so call backend path without leading `/api`
            await axiosClient.patch(`/users/me/avatar/${user.id}`, payload);

            setAvatarUrl(finalAvatarUrl);
            toast.success('Cập nhật hồ sơ thành công');
        } catch (error: any) {
            console.error('Update profile error:', error);
            toast.error(error?.message || 'Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 dark:bg-gray-950 min-h-screen">
            <h1 className="text-2xl font-bold mb-4 text-center dark:text-white">Hồ sơ của tôi</h1>
            <div className="bg-white dark:bg-gray-900 p-6 rounded-md shadow-sm border dark:border-gray-800">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="md:col-span-1 relative flex flex-col items-center">
                        <div className="relative w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3 cursor-pointer" onClick={triggerFileInput}>

                            {preview ? (
                                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            ) : (avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                            ))}
                            <div className='absolute z-10 inset-0 bg-black/50 w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 duration-300 rounded-full'>
                                <Camera className='w-6 h-6 text-white'></Camera>
                            </div>
                        </div>
                        <div className='absolute bottom-12 right-12 bg-white dark:bg-gray-800 rounded-full p-2 shadow-md border border-gray-200 dark:border-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-950 transition-colors duration-300'>
                            <Camera className='w-4 h-4 text-gray-300 dark:text-gray-500'></Camera>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Ảnh đại diện</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Hỗ trợ PNG, JPG, JPEG</p>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <div className="space-y-3">
                            <Input placeholder="Họ và tên" value={form.name} onChange={(e: any) => setForm({ ...form, name: e.target.value })} />
                            <Input placeholder="Email" value={form.email} disabled />
                            <Input placeholder="Số điện thoại" value={form.phone} onChange={(e: any) => setForm({ ...form, phone: e.target.value })} />
                            <Input placeholder="Địa chỉ" value={form.address} onChange={(e: any) => setForm({ ...form, address: e.target.value })} />
                            <div className="pt-3 flex gap-3">
                                <Button onClick={handleSave} disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Helpful hint when Cloudinary envs are missing */}
            {(!cloudName || !uploadPreset) && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-3">Cloudinary chưa được cấu hình (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET). Ứng dụng sẽ cố gắng tải ảnh lên server thay thế nếu có.</p>
            )}
        </div>
    );
}

