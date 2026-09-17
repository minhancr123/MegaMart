import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function StaticPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Header />
      <main className="min-h-[60vh] pt-[104px]">{children}</main>
      <Footer />
    </div>
  );
}
