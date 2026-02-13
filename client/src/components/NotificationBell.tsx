"use client";

import { useState, useEffect } from "react";
import { Bell, Package, Zap, Gift, Shield, Star, Check, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useNotificationStore,
  generateWelcomeNotifications,
  NotificationType,
} from "@/store/notificationStore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const typeIcons: Record<NotificationType, React.ReactNode> = {
  order: <Package className="w-4 h-4 text-blue-500" />,
  flash_sale: <Zap className="w-4 h-4 text-orange-500" />,
  promo: <Gift className="w-4 h-4 text-purple-500" />,
  system: <Shield className="w-4 h-4 text-green-500" />,
  points: <Star className="w-4 h-4 text-yellow-500" />,
};

const typeBgColors: Record<NotificationType, string> = {
  order: "bg-blue-50 dark:bg-blue-950/50",
  flash_sale: "bg-orange-50 dark:bg-orange-950/50",
  promo: "bg-purple-50 dark:bg-purple-950/50",
  system: "bg-green-50 dark:bg-green-950/50",
  points: "bg-yellow-50 dark:bg-yellow-950/50",
};

export default function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } =
    useNotificationStore();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    generateWelcomeNotifications();
  }, []);

  const getTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes}p trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h trước`;
    const days = Math.floor(hours / 24);
    return `${days}d trước`;
  };

  const handleNotificationClick = (notifId: string, link?: string) => {
    markAsRead(notifId);
    if (link) {
      setOpen(false);
      router.push(link);
    }
  };

  if (!mounted) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[380px] p-0 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-xl rounded-xl"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0">
                {unreadCount} mới
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 h-7 px-2"
              >
                <Check className="w-3 h-3 mr-1" />
                Đọc tất cả
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 h-7 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <Bell className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-900">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.id, notif.link)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors flex gap-3 ${
                    !notif.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      typeBgColors[notif.type]
                    }`}
                  >
                    {typeIcons[notif.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!notif.read ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-700 dark:text-gray-300"}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                      {getTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
