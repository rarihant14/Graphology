import { useRef, useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const faqs = [
  {
    q: "What does the AI analyze?",
    a: "The report contains 70 visual handwriting observations across 12 categories. Each observation includes confidence, assessability, and concise evidence; it does not infer personality or psychological traits.",
  },
  {
    q: "What kind of handwriting sample should I upload?",
    a: "Upload a clear photo or scan with several lines of handwriting and, if you want page-layout observations, visible page boundaries. Features without enough evidence are marked unknown rather than guessed.",
  },
  {
    q: "Is my handwriting image stored anywhere?",
    a: "Your image is processed for analysis and is not saved in your account history. The resulting observation report is saved to your account.",
  },
  {
    q: "How long does the analysis take?",
    a: "Analysis time can vary with image size and service availability. Gemini vision examines the image and returns the structured observation report.",
  },
  {
    q: "Can I download my report?",
    a: "Yes. You can copy the complete JSON payload or download a formatted PDF containing the image assessment and all 70 observations.",
  },
  {
    q: "Is this suitable for professional use?",
    a: "The report describes visible image features only. It does not provide personality, medical, psychological, hiring, or other decision-making assessments.",
  },
];

const FaqSection = () => {
  const ref = useRef(null);
  const isVisible = useScrollAnimation(ref);
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" ref={ref} className="relative py-24 px-4">
      <div className={`relative z-10 max-w-[720px] mx-auto fade-up ${isVisible ? "visible" : ""}`}>
        <p className="section-label">QUESTIONS</p>
        <h2 className="section-heading">Frequently Asked Questions</h2>
        <p className="section-subtext">Everything you need to know before you begin.</p>

        <div className="space-y-0">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-border">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between py-5 text-left cursor-pointer group"
              >
                <span className="text-foreground font-medium pr-4">{faq.q}</span>
                <span
                  className={`text-primary text-2xl transition-transform duration-300 flex-shrink-0 ${
                    openIndex === i ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: openIndex === i ? 200 : 0 }}
              >
                <p className="text-muted-foreground pb-5 leading-relaxed text-sm">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;