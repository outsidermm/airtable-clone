import { Navigation } from "./_components/marketing/navigation";
import { Hero } from "./_components/marketing/hero";
import { TrustedBy } from "./_components/marketing/trusted-by";
import { FeaturesSection } from "./_components/marketing/features-section";
import { AIPlaysSection } from "./_components/marketing/ai-plays-section";
import { TestimonialSection } from "./_components/marketing/testimonial-section";
import { Footer } from "./_components/marketing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main>
        <Hero />
        <TrustedBy />
        <FeaturesSection />
        <AIPlaysSection />
        <TestimonialSection />

        {/* Final CTA Section */}
        <section className="bg-linear-to-br from-blue-50 to-indigo-50 px-6 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              Start building with Airtable
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              Teams at over 500,000 forward-thinking organizations use Airtable
              every day. Join them.
            </p>
            <a
              href="/signup"
              className="inline-block rounded-lg bg-gray-900 px-8 py-4 text-base font-medium text-white transition-colors hover:bg-gray-800"
            >
              Get started for free
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
