import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProfileNav from '@/components/profile/ProfileNav';

export const dynamic = 'force-dynamic';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Header />
      <main className="min-h-screen pt-[104px]">
        <div className="mm-container grid gap-6 py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <ProfileNav />
          <section className="min-w-0">{children}</section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
