import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default function CategoryDetailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-[60vh] bg-[#f7f8fa] pt-[130px] sm:pt-[140px] md:pt-[150px]">{children}</main>
      <Footer />
    </>
  );
}
