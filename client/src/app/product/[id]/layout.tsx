import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default function ProductDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Header />
      <main className="pt-[100px] md:pt-[120px] min-h-[60vh]">{children}</main>
      <Footer />
    </div>
  );
}
