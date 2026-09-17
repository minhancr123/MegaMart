import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#f7f8fa] pt-[104px]">{children}</main>
      <Footer />
    </>
  );
}
