import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ScrollToTop from "@/components/ScrollToTop";
import { ThemeProvider } from "@/components/theme-provider";
import SocialProofToast from "@/components/SocialProofToast";
import ChatbotWidget from "@/components/ChatbotWidget";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 5,
  maximumScale: 5,
};

// ID đo lường lấy từ biến môi trường (điền trong client/.env.local).
// Bỏ trống = không nhúng script tương ứng.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID || "";

export const metadata: Metadata = {
  title: "MegaMart VN - Điện máy chính hãng",
  description: "Mua sắm TV, máy lạnh, tủ lạnh, máy giặt, laptop và đồ gia dụng chính hãng tại MegaMart VN.",
  keywords: "điện máy, tivi, máy lạnh, tủ lạnh, máy giặt, laptop, MegaMart VN",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Microsoft Clarity - chỉ nhúng khi có NEXT_PUBLIC_CLARITY_ID */}
        {CLARITY_ID ? (
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${CLARITY_ID}");
            `,
            }}
          />
        ) : null}

        {/* Google Analytics 4 - chỉ nhúng khi có NEXT_PUBLIC_GA_ID */}
        {GA_ID ? (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
              });
            `,
              }}
            />
          </>
        ) : null}
      </head>
      <body
        className={`${inter.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <ScrollToTop />
          <SocialProofToast />
          <ChatbotWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
