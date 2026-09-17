import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Header />
      <main className="pt-[104px]">{children}</main>
      <Footer />
    </div>
  );
}
