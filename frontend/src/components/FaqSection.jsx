import { useRef, useState } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const faqs = [
  {
    q: "How accurate is the AI graphology analysis?",
    a: "Our analysis is based on 10 observable handwriting features mapped through a validated graphology rules engine. While graphology is not scientifically proven, our system provides thoughtful observation-based insights that many users find surprisingly reflective of their personality.",
  },
  {
    q: "What kind of handwriting sample should I upload?",
    a: "Upload a clear photo or scan of at least 3-4 lines of natural handwriting on plain or lined paper. Avoid very short samples — the more natural and relaxed your writing, the more accurate the analysis.",
  },
  {
    q: "Is my handwriting image stored anywhere?",
    a: "No. Your image is processed in real-time and is never stored on our servers. Only your anonymized personality report is saved to your account history.",
  },
  {
    q: "How long does the analysis take?",
    a: "Most analyses complete within 30 to 60 seconds. The AI performs three sequential steps — vision extraction, rules mapping, and report generation — all powered by Google's Gemini AI.",
  },
  {
    q: "Can I download my report?",
    a: "Yes. Once your analysis is complete you can download a beautifully formatted PDF report of your personality traits directly from the results page.",
  },
  {
    q: "Is this suitable for professional use?",
    a: "This tool is designed for personal self-reflection and entertainment purposes. It is not intended for clinical assessment, hiring decisions, or professional psychological evaluation.",
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