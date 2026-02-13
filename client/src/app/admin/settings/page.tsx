"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Store, Settings as SettingsIcon, Shield, Loader2 } from "lucide-react";
import { getSettings, updateSettings, UpdateSettingsDto } from "@/lib/settingsApi";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings state
    const [storeSettings, setStoreSettings] = useState({
        storeName: "",
        storeDescription: "",
        email: "",
        phone: "",
        address: ""
    });

    const [configSettings, setConfigSettings] = useState({
        maintenanceMode: false,
        enableReviews: true,
        enableRegistration: true
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await getSettings();
            setStoreSettings({
                storeName: data.storeName || "",
                storeDescription: data.storeDescription || "",
                email: data.email || "",
                phone: data.phone || "",
                address: data.address || ""
            });
            setConfigSettings({
                maintenanceMode: data.maintenanceMode,
                enableReviews: data.enableReviews,
                enableRegistration: data.enableRegistration
            });
        } catch (error) {
            console.error("Failed to load settings", error);
            toast.error("Không thể tải cài đặt");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveStoreSettings = async () => {
        try {
            setSaving(true);
            await updateSettings(storeSettings);
            toast.success("Đã lưu thông tin cửa hàng");
        } catch (error) {
            console.error("Failed to save store settings", error);
            toast.error("Không thể lưu thông tin cửa hàng");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            setSaving(true);
            await updateSettings(configSettings);
            toast.success("Đã lưu cấu hình hệ thống");
        } catch (error) {
            console.error("Failed to save config", error);
            toast.error("Không thể lưu cấu hình");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cài đặt</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Quản lý thông tin cửa hàng và cấu hình hệ thống</p>
            </div>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                    <TabsTrigger value="general">Thông tin chung</TabsTrigger>
                    <TabsTrigger value="config">Cấu hình</TabsTrigger>
                    <TabsTrigger value="security">Bảo mật</TabsTrigger>
                </TabsList>

                {/* General Settings */}
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>Thông tin cửa hàng</CardTitle>
                            <CardDescription>
                                Thông tin này sẽ được hiển thị trên website và trong các email gửi đi.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="storeName">Tên cửa hàng</Label>
                                <Input
                                    id="storeName"
                                    value={storeSettings.storeName}
                                    onChange={(e) => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="storeDescription">Mô tả ngắn</Label>
                                <Textarea
                                    id="storeDescription"
                                    value={storeSettings.storeDescription}
                                    onChange={(e) => setStoreSettings({ ...storeSettings, storeDescription: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email liên hệ</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={storeSettings.email}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="phone">Số điện thoại</Label>
                                    <Input
                                        id="phone"
                                        value={storeSettings.phone}
                                        onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="address">Địa chỉ</Label>
                                <Input
                                    id="address"
                                    value={storeSettings.address}
                                    onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveStoreSettings} disabled={saving}>
                                {saving ? "Đang lưu..." : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Configuration Settings */}
                <TabsContent value="config">
                    <Card>
                        <CardHeader>
                            <CardTitle>Cấu hình hệ thống</CardTitle>
                            <CardDescription>
                                Quản lý các chức năng và trạng thái của website.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Chế độ bảo trì</Label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Tạm thời đóng cửa website để bảo trì. Chỉ Admin mới có thể truy cập.
                                    </p>
                                </div>
                                <Switch
                                    checked={configSettings.maintenanceMode}
                                    onCheckedChange={(checked) => setConfigSettings({ ...configSettings, maintenanceMode: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Cho phép đánh giá</Label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Cho phép khách hàng đánh giá sản phẩm.
                                    </p>
                                </div>
                                <Switch
                                    checked={configSettings.enableReviews}
                                    onCheckedChange={(checked) => setConfigSettings({ ...configSettings, enableReviews: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Đăng ký thành viên</Label>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Cho phép người dùng mới đăng ký tài khoản.
                                    </p>
                                </div>
                                <Switch
                                    checked={configSettings.enableRegistration}
                                    onCheckedChange={(checked) => setConfigSettings({ ...configSettings, enableRegistration: checked })}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleSaveConfig} disabled={saving}>
                                {saving ? "Đang lưu..." : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" /> Lưu cấu hình
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Security Settings Placeholder */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Bảo mật & Quyền hạn</CardTitle>
                            <CardDescription>Cài đặt bảo mật cho tài khoản quản trị.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                                <div className="flex items-center gap-2 font-medium mb-1">
                                    <Shield className="w-4 h-4" />
                                    Lưu ý bảo mật
                                </div>
                                <p className="text-sm">
                                    Để thay đổi mật khẩu hoặc thông tin cá nhân của Admin, vui lòng truy cập trang
                                    <a href="/profile" className="font-bold underline ml-1">Hồ sơ cá nhân</a>.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
