import Header from "../components/Header";
import MainContent from "../components/MainContent";
import Footer from "../components/Footer";
import Home from "./home/page";
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="py-8">
        <Home></Home>
      </main>
      <Footer />
    </div>
  );
}
