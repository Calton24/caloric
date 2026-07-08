import { Features } from "@/components/Features";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Transformation } from "@/components/Transformation";
import { Waitlist } from "@/components/Waitlist";

export default function Home() {
  return (
    <div id="top" className="relative overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.12)_0%,_transparent_55%)]"
      />
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Transformation />
        <Waitlist />
      </main>
      <Footer />
    </div>
  );
}
