import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ServicesSection from "@/components/ServicesSection";
import WhatWeAnalyzeSection from "@/components/WhatWeAnalyzeSection";
import WhyUsSection from "@/components/WhyUsSection";
import FaqSection from "@/components/FaqSection";
import CtaBanner from "@/components/CtaBanner";
import Footer from "@/components/Footer";

const LandingPage = ({ handleAnalysisClick }) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar handleAnalysisClick={handleAnalysisClick} />
      <HeroSection handleAnalysisClick={handleAnalysisClick} />
      <HowItWorksSection handleAnalysisClick={handleAnalysisClick} />
      <ServicesSection handleAnalysisClick={handleAnalysisClick} />
      <WhatWeAnalyzeSection />
      <WhyUsSection />
      <FaqSection />
      <CtaBanner handleAnalysisClick={handleAnalysisClick} />
      <Footer handleAnalysisClick={handleAnalysisClick} />
    </div>
  );
};

export default LandingPage;