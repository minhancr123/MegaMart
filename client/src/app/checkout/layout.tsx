import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">{children}</main>
      <Footer />
    </>
  );
}
