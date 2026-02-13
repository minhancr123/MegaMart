import Header from "../components/Header";

import Footer from "../components/Footer";
import Home from "./home/page";
export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 overflow-x-hidden">
      <Header />
      <main className="pt-[100px] md:pt-[120px] py-4 sm:py-8">
        <Home></Home>
      </main>
      <Footer />
    </div>
  );
}
