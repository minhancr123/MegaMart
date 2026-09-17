import Header from "../components/Header";

import Footer from "../components/Footer";
import Home from "./home/page";
export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8fa]">
      <Header />
      <main className="pt-[110px] sm:pt-[115px] md:pt-[120px]">
        <Home></Home>
      </main>
      <Footer />
    </div>
  );
}
