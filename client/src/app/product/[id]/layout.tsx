import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Header />
      {/* Header fixed cao 92px (promo 28px + navbar 64px) + 8px thở */}
      <main className="min-h-[60vh] pt-[100px]">{children}</main>
      <Footer />
    </div>
  );
}
