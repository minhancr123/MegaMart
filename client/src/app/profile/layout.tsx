import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">{children}</main>
      <Footer />
    </>
  );
}
