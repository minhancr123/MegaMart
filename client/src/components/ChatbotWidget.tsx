"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, ChevronDown, Sparkles, HelpCircle, Package, RotateCcw, CreditCard, Truck, Phone, Clock, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi, ChatMessage as ApiChatMessage } from "@/lib/aiApi";
import { useAuthStore } from "@/store/authStore";

interface Message {
  id: string;
  text: string;
  sender: "bot" | "user";
  timestamp: Date;
  quickReplies?: string[];
}

interface FAQItem {
  keywords: string[];
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

const FAQ_DATA: FAQItem[] = [
  {
    keywords: ["đơn hàng", "đơn", "order", "theo dõi", "tracking", "ở đâu", "giao đến đâu", "kiểm tra"],
    question: "Theo dõi đơn hàng",
    answer: "Bạn có thể theo dõi đơn hàng tại mục **Tài khoản → Đơn hàng của tôi**. Tại đây bạn sẽ thấy trạng thái chi tiết của từng đơn hàng: Chờ xử lý → Đã xác nhận → Đang giao → Đã giao.\n\nNếu có thắc mắc, liên hệ hotline **1900 6789** để được hỗ trợ ngay!",
    icon: <Package className="w-4 h-4" />,
  },
  {
    keywords: ["đổi trả", "trả hàng", "hoàn tiền", "đổi", "trả", "refund", "return", "bảo hành"],
    question: "Chính sách đổi trả",
    answer: "MegaMart hỗ trợ đổi trả trong **7 ngày** kể từ ngày nhận hàng với điều kiện:\n\n✅ Sản phẩm còn nguyên tem, nhãn, hộp\n✅ Chưa qua sử dụng\n✅ Có hóa đơn mua hàng\n\nĐối với sản phẩm lỗi do nhà sản xuất, bạn được **đổi mới trong 1 tháng** và bảo hành chính hãng 12 tháng.",
    icon: <RotateCcw className="w-4 h-4" />,
  },
  {
    keywords: ["thanh toán", "trả tiền", "payment", "cod", "vnpay", "chuyển khoản", "thẻ", "visa"],
    question: "Phương thức thanh toán",
    answer: "MegaMart hỗ trợ nhiều phương thức thanh toán:\n\n💵 **COD** - Thanh toán khi nhận hàng\n💳 **VNPay** - Thanh toán online qua ngân hàng\n🏦 **Chuyển khoản** - Chuyển khoản ngân hàng\n📱 **Ví điện tử** - MoMo, ZaloPay\n\nTất cả giao dịch đều được mã hóa và bảo mật tuyệt đối!",
    icon: <CreditCard className="w-4 h-4" />,
  },
  {
    keywords: ["giao hàng", "vận chuyển", "ship", "shipping", "phí ship", "miễn phí", "bao lâu", "mấy ngày"],
    question: "Thông tin giao hàng",
    answer: "🚚 **Giao hàng nhanh**: 1-2 ngày (nội thành HCM, HN)\n📦 **Giao hàng tiêu chuẩn**: 3-5 ngày (toàn quốc)\n\n🎁 **MIỄN PHÍ vận chuyển** cho đơn hàng từ **500.000đ**\n\nPhí giao hàng tiêu chuẩn: **25.000đ - 40.000đ** tùy khu vực.",
    icon: <Truck className="w-4 h-4" />,
  },
  {
    keywords: ["liên hệ", "hotline", "điện thoại", "email", "hỗ trợ", "tư vấn", "contact", "gọi"],
    question: "Liên hệ hỗ trợ",
    answer: "Bạn có thể liên hệ MegaMart qua:\n\n📞 **Hotline**: 1900 6789 (8h - 21h hàng ngày)\n📧 **Email**: hotro@megamart.vn\n💬 **Chat**: Ngay tại đây!\n📍 **Địa chỉ**: 128 Nguyễn Gia Trí, Bình Thạnh, TP.HCM\n\nĐội ngũ CSKH luôn sẵn sàng hỗ trợ bạn!",
    icon: <Phone className="w-4 h-4" />,
  },
  {
    keywords: ["khuyến mãi", "giảm giá", "sale", "voucher", "mã giảm", "coupon", "flash sale", "ưu đãi"],
    question: "Khuyến mãi & Voucher",
    answer: "🔥 Cập nhật khuyến mãi tại trang chủ MegaMart!\n\n🎫 Nhập mã voucher tại bước thanh toán để được giảm giá\n⚡ **Flash Sale** diễn ra thường xuyên với giảm giá lên đến **50%**\n🎁 Đăng ký nhận email để không bỏ lỡ ưu đãi mới nhất\n⭐ Tích điểm thành viên để đổi voucher miễn phí!",
    icon: <Sparkles className="w-4 h-4" />,
  },
  {
    keywords: ["tài khoản", "đăng ký", "đăng nhập", "mật khẩu", "quên mật khẩu", "account", "login", "register"],
    question: "Tài khoản & Đăng nhập",
    answer: "📝 **Đăng ký**: Nhấn vào icon tài khoản trên header → Đăng ký → Điền thông tin\n🔐 **Đăng nhập**: Sử dụng email và mật khẩu đã đăng ký\n🔑 **Quên mật khẩu**: Nhấn 'Quên mật khẩu' tại trang đăng nhập, link đặt lại sẽ được gửi qua email\n\nBạn cũng có thể đăng nhập nhanh bằng Google!",
    icon: <User className="w-4 h-4" />,
  },
  {
    keywords: ["giờ", "mở cửa", "thời gian", "làm việc"],
    question: "Giờ làm việc",
    answer: "🕐 **Cửa hàng online**: Hoạt động 24/7\n📞 **Hotline CSKH**: 8:00 - 22:00 hàng ngày (kể cả T7, CN)\n🏪 **Showroom**: 8:00 - 21:00 (Thứ 2 - Chủ nhật)\n\nĐặt hàng online bất kỳ lúc nào, chúng tôi sẽ xử lý trong giờ làm việc!",
    icon: <Clock className="w-4 h-4" />,
  },
];

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  text: "Xin chào! 👋 Tôi là trợ lý ảo của **MegaMart**. Tôi có thể giúp bạn giải đáp các thắc mắc về đơn hàng, giao hàng, đổi trả và nhiều hơn nữa!\n\nBạn cần hỗ trợ gì?",
  sender: "bot",
  timestamp: new Date(),
  quickReplies: FAQ_DATA.slice(0, 4).map(f => f.question),
};

function findAnswer(input: string): { answer: string; quickReplies?: string[] } {
  const normalized = input.toLowerCase().trim();

  // Check each FAQ item for keyword matches
  for (const faq of FAQ_DATA) {
    const matchCount = faq.keywords.filter(keyword =>
      normalized.includes(keyword.toLowerCase())
    ).length;
    if (matchCount > 0) {
      const otherFaqs = FAQ_DATA.filter(f => f.question !== faq.question)
        .slice(0, 3)
        .map(f => f.question);
      return {
        answer: faq.answer,
        quickReplies: [...otherFaqs, "Liên hệ hỗ trợ"],
      };
    }
  }

  // Check if user selects a quick reply that matches a FAQ question
  for (const faq of FAQ_DATA) {
    if (normalized === faq.question.toLowerCase()) {
      const otherFaqs = FAQ_DATA.filter(f => f.question !== faq.question)
        .slice(0, 3)
        .map(f => f.question);
      return {
        answer: faq.answer,
        quickReplies: [...otherFaqs, "Liên hệ hỗ trợ"],
      };
    }
  }

  // Default fallback
  return {
    answer: "Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn. 😅\n\nBạn có thể thử hỏi về:\n• Theo dõi đơn hàng\n• Chính sách đổi trả\n• Phương thức thanh toán\n• Thông tin giao hàng\n\nHoặc liên hệ hotline **1900 6789** để được hỗ trợ trực tiếp!",
    quickReplies: FAQ_DATA.slice(0, 4).map(f => f.question),
  };
}

function renderInline(text: string, keyPrefix: string) {
  // **bold**
  return text.split(/(\*\*.*?\*\*)/).map((part, j) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-b${j}`} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-t${j}`}>{part}</span>;
  });
}

// Ảnh linked: [![alt](img)](/product/id) | ảnh thường: ![alt](img) | link nội bộ.
// SRC cho phép 1 cấp ngoặc cân bằng (URL Cloudinary dạng image_(1).jpg).
const IMG_SRC = "(?:[^()\\s]|\\([^()\\s]*\\))*";
const RICH_TOKEN = new RegExp(
  `(\\[![^\\]]*\\]\\(${IMG_SRC}\\)\\]\\([^)\\s]+\\)|!\\[[^\\]]*\\]\\(${IMG_SRC}\\)|\\/(?:product|category)\\/[\\w-]+)`,
  "g",
);
// Chỉ cho href nội bộ (/product/.., /category/..) — chặn javascript: và open redirect
const SAFE_HREF = /^\/(?:product|category)\/[\w-]+$/;

function renderRichLine(line: string, keyPrefix: string) {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RICH_TOKEN.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((m = RICH_TOKEN.exec(line)) !== null) {
    if (m.index > last) out.push(<span key={`${keyPrefix}-p${out.length}`}>{renderInline(line.slice(last, m.index), `${keyPrefix}-p${out.length}`)}</span>);
    const token = m[0];
    const linked = token.match(
      new RegExp(`^\\[!\\[([^\\]]*)\\]\\((${IMG_SRC})\\)\\]\\(([^)\\s]+)\\)$`),
    );
    const plain = token.match(new RegExp(`^!\\[[^\\]]*\\]\\((${IMG_SRC})\\)$`));
    if (linked) {
      const [, alt, src, href] = linked;
      if (!SAFE_HREF.test(href)) {
        out.push(<span key={`${keyPrefix}-p${out.length}`}>{renderInline(alt || token, `${keyPrefix}-p${out.length}`)}</span>);
      } else {
        out.push(
          <Link key={`${keyPrefix}-img${out.length}`} href={href} className="my-1.5 block w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || "Ảnh sản phẩm"}
              loading="lazy"
              className="h-24 w-24 rounded-xl border border-gray-200 bg-white object-cover dark:border-gray-700"
              onError={(e) => {
                e.currentTarget.closest("a")?.setAttribute("style", "display:none");
              }}
            />
          </Link>,
        );
      }
    } else if (plain) {
      const [, alt, src] = plain;
      out.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${keyPrefix}-img${out.length}`}
          src={src}
          alt={alt || "Ảnh"}
          loading="lazy"
          className="my-1.5 block h-24 w-24 rounded-xl border border-gray-200 bg-white object-cover dark:border-gray-700"
          onError={(e) => {
            e.currentTarget.setAttribute("style", "display:none");
          }}
        />,
      );
    } else {
      out.push(
        <Link
          key={`${keyPrefix}-link${out.length}`}
          href={token}
          className="font-medium text-[#c53b00] underline decoration-orange-200 underline-offset-2 hover:text-[#ff4d00]"
        >
          {token}
        </Link>,
      );
    }
    last = m.index + token.length;
  }
  if (last < line.length) out.push(<span key={`${keyPrefix}-p${out.length}`}>{renderInline(line.slice(last), `${keyPrefix}-p${out.length}`)}</span>);
  return out.length > 0 ? out : renderInline(line, keyPrefix);
}

export function renderMarkdown(text: string) {
  // Simple markdown: **bold**, \n line breaks, images and internal links
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {renderRichLine(line, `l${i}`)}
    </span>
  ));
}

export default function ChatbotWidget() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      ...INITIAL_MESSAGE,
      timestamp: new Date(),
      quickReplies: user
        ? ["Đơn hàng đang giao", ...FAQ_DATA.slice(0, 3).map((f) => f.question)]
        : INITIAL_MESSAGE.quickReplies,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Kích thước khung chat (kéo tay cầm ở header để phóng to/thu nhỏ, lưu localStorage)
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    moved: boolean;
  } | null>(null);
  const [panelSize, setPanelSize] = useState<{ w: number; h: number } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("megamart_chat_size");
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p?.w === "number" && typeof p?.h === "number") {
        const w = Math.min(1600, Math.max(300, Math.round(p.w)));
        const h = Math.min(1200, Math.max(320, Math.round(p.h)));
        return { w, h };
      }
    } catch { /* ignore */ }
    return null;
  });

  const applyResize = useCallback((clientX: number, clientY: number) => {
    const s = resizeState.current;
    if (!s || typeof window === "undefined") return;
    if (Math.hypot(clientX - s.startX, clientY - s.startY) > 3) s.moved = true;
    // Tay cầm ở phía trái header: kéo sang trái/lên trên để phóng to.
    // Trần cao khớp với style (100dvh - 12.5rem) để không bị khựng.
    const w = Math.min(window.innerWidth - 24, Math.max(300, s.startW + (s.startX - clientX)));
    const h = Math.min(window.innerHeight - 200, Math.max(320, s.startH + (s.startY - clientY)));
    setPanelSize({ w: Math.round(w), h: Math.round(h) });
  }, []);

  const onResizeMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    applyResize(e.clientX, e.clientY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResizeTouchMove = useCallback((e: TouchEvent) => {
    const s = resizeState.current;
    const t = e.touches[0];
    if (!s || !t) return;
    // Ngưỡng 10px: vuốt nhẹ qua nút thì vẫn cuộn trang bình thường
    if (Math.hypot(t.clientX - s.startX, t.clientY - s.startY) < 10) return;
    e.preventDefault();
    applyResize(t.clientX, t.clientY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const endResize = useCallback(() => {
    const s = resizeState.current;
    if (!s) return;
    resizeState.current = null;
    window.removeEventListener("mousemove", onResizeMouseMove);
    window.removeEventListener("mouseup", endResize);
    window.removeEventListener("touchmove", onResizeTouchMove);
    window.removeEventListener("touchend", endResize);
    window.removeEventListener("touchcancel", endResize);
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    // Click/double-click không kéo thì không khóa kích thước cố định
    if (!s.moved) return;
    const el = panelRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      try {
        localStorage.setItem("megamart_chat_size", JSON.stringify({ w: Math.round(r.width), h: Math.round(r.height) }));
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startResize = useCallback((clientX: number, clientY: number) => {
    const el = panelRef.current;
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    resizeState.current = { startX: clientX, startY: clientY, startW: r.width, startH: r.height, moved: false };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "nwse-resize";
    window.addEventListener("mousemove", onResizeMouseMove);
    window.addEventListener("mouseup", endResize);
    window.addEventListener("touchmove", onResizeTouchMove, { passive: false });
    window.addEventListener("touchend", endResize);
    window.addEventListener("touchcancel", endResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetPanelSize = useCallback(() => {
    setPanelSize(null);
    try {
      localStorage.removeItem("megamart_chat_size");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    return () => {
      resizeState.current = null;
      window.removeEventListener("mousemove", onResizeMouseMove);
      window.removeEventListener("mouseup", endResize);
      window.removeEventListener("touchmove", onResizeTouchMove);
      window.removeEventListener("touchend", endResize);
      window.removeEventListener("touchcancel", endResize);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: text.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Call AI API using axiosClient
      const response = await aiApi.chat({
        message: text.trim(),
        conversationHistory: messages
          .filter(m => m.sender === 'user' || m.sender === 'bot')
          .map(m => ({
            role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: m.text,
          }))
          .slice(-10), // Keep last 10 messages for context
      });

      // axiosClient interceptor may return data directly or wrapped
      const data = response.data || response;
      
      if (data.success && data.message) {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          text: data.message,
          sender: "bot",
          timestamp: new Date(),
          quickReplies: user
            ? ["Đơn hàng đang giao", ...FAQ_DATA.slice(0, 2).map(f => f.question)]
            : FAQ_DATA.slice(0, 3).map(f => f.question),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);

        if (!isOpen) {
          setUnreadCount((prev) => prev + 1);
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('AI chat error:', error);
      
      // Fallback to keyword matching
      const delay = Math.random() * 800 + 600;
      setTimeout(() => {
        const { answer, quickReplies } = findAnswer(text);
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          text: answer,
          sender: "bot",
          timestamp: new Date(),
          quickReplies,
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);

        if (!isOpen) {
          setUnreadCount((prev) => prev + 1);
        }
      }, delay);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-[5.5rem] right-4 sm:bottom-6 sm:right-6 z-[70] w-14 h-14 rounded-full bg-gradient-to-r from-[#ff6b00] to-[#d94100] text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread badge */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold animate-bounce">
            {unreadCount}
          </span>
        )}

        {/* Pulse ring */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-orange-600 animate-ping opacity-20" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={
              panelSize
                ? {
                    width: `min(${panelSize.w}px, calc(100vw - 1.5rem))`,
                    height: `min(${panelSize.h}px, calc(100dvh - 12.5rem))`,
                  }
                : undefined
            }
            className="fixed inset-x-3 bottom-[9.25rem] sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-[380px] z-[70] h-[min(520px,calc(100vh-12.5rem))] supports-[height:100dvh]:h-[min(520px,calc(100dvh-12.5rem))] sm:supports-[height:100dvh]:h-[min(540px,calc(100dvh-9rem))] bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#ff6b00] to-[#d94100] px-4 py-3 flex items-center gap-2.5">
              {/* Tay cầm kéo phóng to / thu nhỏ (desktop), nhấp đúp để về mặc định */}
              <button
                type="button"
                aria-label="Kéo để đổi kích thước khung chat"
                title="Kéo để phóng to / thu nhỏ (nhấp đúp để về mặc định)"
                onMouseDown={(e) => {
                  e.preventDefault();
                  startResize(e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  if (t) startResize(t.clientX, t.clientY);
                }}
                onDoubleClick={resetPanelSize}
                className="flex w-7 h-7 shrink-0 cursor-nwse-resize select-none items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm">MegaMart Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-blue-100 text-xs">Đang hoạt động</span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div
                    className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.sender === "bot" && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-[#ff4d00] text-white rounded-br-md"
                          : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-800 rounded-bl-md"
                      }`}
                    >
                      {renderMarkdown(msg.text)}
                    </div>
                    {msg.sender === "user" && (
                      <div className="w-7 h-7 rounded-full bg-[#ff4d00] flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Quick Replies */}
                  {msg.sender === "bot" && msg.quickReplies && msg.id === messages[messages.length - 1]?.id && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-9">
                      {msg.quickReplies.map((reply) => (
                        <button
                          key={reply}
                          onClick={() => handleQuickReply(reply)}
                          className="text-xs px-3 py-1.5 rounded-full border border-orange-200 text-[#c53b00] hover:bg-orange-50 transition-colors whitespace-nowrap"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white dark:bg-gray-950">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="flex-1 border-gray-200 dark:border-gray-800 rounded-full px-4 text-base sm:text-sm bg-gray-50 dark:bg-gray-900 focus-visible:ring-blue-500"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isTyping}
                  className="rounded-full bg-[#ff4d00] hover:bg-[#d94100] w-10 h-10 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                Trợ lý FAQ • Liên hệ 1900 6789 để được hỗ trợ trực tiếp
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
