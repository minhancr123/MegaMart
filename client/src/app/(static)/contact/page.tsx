"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Phone, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ContactPage() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        toast.success("Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất.");
        setLoading(false);
        (e.target as HTMLFormElement).reset();
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">Liên hệ với chúng tôi</h1>
            <p className="text-gray-500 text-center mb-12 max-w-2xl mx-auto">
                Chúng tôi luôn sẵn sàng hỗ trợ bạn. Hãy gửi tin nhắn hoặc ghé thăm cửa hàng của chúng tôi.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Contact Info */}
                <div className="space-y-8">
                    <div className="bg-blue-50 p-8 rounded-2xl space-y-6">
                        <h3 className="text-xl font-bold text-gray-900">Thông tin liên hệ</h3>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">Địa chỉ</h4>
                                <p className="text-gray-600">123 Đường ABC, Phường XYZ, Quận 1, TP. Hồ Chí Minh</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                                <Phone className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">Điện thoại</h4>
                                <p className="text-gray-600">1900 1234 (8:00 - 21:00)</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 flex-shrink-0">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900">Email</h4>
                                <p className="text-gray-600">support@megamart.vn</p>
                            </div>
                        </div>
                    </div>

                    {/* Map Placeholder */}
                    <div className="bg-gray-200 rounded-2xl h-64 flex items-center justify-center text-gray-500">
                        [Bản đồ Google Maps]
                    </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-6">Gửi tin nhắn cho chúng tôi</h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Họ và tên</label>
                                <Input required placeholder="Nguyễn Văn A" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Email</label>
                                <Input required type="email" placeholder="email@example.com" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Số điện thoại</label>
                            <Input required type="tel" placeholder="0901234567" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Nội dung</label>
                            <Textarea required placeholder="Bạn cần hỗ trợ gì?" className="min-h-[150px]" />
                        </div>

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                            <Send className="w-4 h-4 mr-2" />
                            {loading ? "Đang gửi..." : "Gửi tin nhắn"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
