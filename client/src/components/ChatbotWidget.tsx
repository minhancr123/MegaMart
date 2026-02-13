"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, ChevronDown, Sparkles, HelpCircle, Package, RotateCcw, CreditCard, Truck, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiApi, ChatMessage as ApiChatMessage } from "@/lib/aiApi";

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
    answer: "Bạn có thể theo dõi đơn hàng tại mục **Tài khoản → Đơn hàng của tôi**. Tại đây bạn sẽ thấy trạng thái chi tiết của từng đơn hàng: Chờ xử lý → Đã xác nhận → Đang giao → Đã giao.\n\nNếu có thắc mắc, liên hệ hotline **1900 1234** để được hỗ trợ ngay!",
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
    answer: "Bạn có thể liên hệ MegaMart qua:\n\n📞 **Hotline**: 1900 1234 (8h - 22h hàng ngày)\n📧 **Email**: support@megamart.vn\n💬 **Chat**: Ngay tại đây!\n📍 **Địa chỉ**: 123 Đường ABC, Quận 1, TP.HCM\n\nĐội ngũ CSKH luôn sẵn sàng hỗ trợ bạn!",
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
    answer: "Xin lỗi, tôi chưa hiểu rõ câu hỏi của bạn. 😅\n\nBạn có thể thử hỏi về:\n• Theo dõi đơn hàng\n• Chính sách đổi trả\n• Phương thức thanh toán\n• Thông tin giao hàng\n\nHoặc liên hệ hotline **1900 1234** để được hỗ trợ trực tiếp!",
    quickReplies: FAQ_DATA.slice(0, 4).map(f => f.question),
  };
}

function renderMarkdown(text: string) {
  // Simple markdown: **bold** and \n for line breaks
  return text.split("\n").map((line, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {line.split(/(\*\*.*?\*\*)/).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      })}
    </span>
  ));
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
            role: m.sender === 'user' ? 'user' : 'assistant',
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
          quickReplies: FAQ_DATA.slice(0, 3).map(f => f.question),
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
        className="fixed bottom-6 right-6 z-[70] w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105"
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
          <span className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-20" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-4 sm:right-6 z-[70] w-[calc(100vw-2rem)] sm:w-[380px] h-[520px] bg-white dark:bg-gray-950 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 flex items-center gap-3">
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
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-800 rounded-bl-md"
                      }`}
                    >
                      {renderMarkdown(msg.text)}
                    </div>
                    {msg.sender === "user" && (
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
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
                          className="text-xs px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap"
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
            <div className="border-t border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-950">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Nhập câu hỏi của bạn..."
                  className="flex-1 border-gray-200 dark:border-gray-800 rounded-full px-4 text-sm bg-gray-50 dark:bg-gray-900 focus-visible:ring-blue-500"
                  disabled={isTyping}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isTyping}
                  className="rounded-full bg-blue-600 hover:bg-blue-700 w-10 h-10 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 mt-2">
                Trợ lý FAQ • Liên hệ 1900 1234 để được hỗ trợ trực tiếp
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
