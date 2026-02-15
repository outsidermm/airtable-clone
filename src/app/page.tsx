import { Navigation } from "./_components/marketing/navigation";
import { Hero } from "./_components/marketing/hero";
import { TrustedBy } from "./_components/marketing/trusted-by";
import { Footer } from "./_components/marketing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <main>
        <Hero />
        <TrustedBy />

        {/* Features Section Placeholder */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-4 text-center text-4xl font-bold text-gray-900">
              Sophisticated workflows in minutes, not months
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Feature cards will go here */}
              <div className="rounded-lg border border-gray-200 p-8">
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Production apps at prototype speed
                </h3>
                <p className="text-gray-600">
                  Streamline your team's critical data through conversational
                  building. Generate apps with Airtable's best-in-class no-code
                  components.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-8">
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Don't just ask AI. Deploy it.
                </h3>
                <p className="text-gray-600">
                  Embed intelligence into every workflow—Airtable agents think
                  dynamically across thousands of records.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 p-8">
                <h3 className="mb-3 text-xl font-semibold text-gray-900">
                  Enterprise capabilities
                </h3>
                <p className="text-gray-600">
                  The power of AI with the industrial-grade platform your
                  business demands.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 px-6 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900">
              Start building with Airtable
            </h2>
            <p className="mb-8 text-lg text-gray-600">
              Teams at over 500,000 forward-thinking organizations use Airtable
              every day. Join them.
            </p>
            <a
              href="/signup"
              className="inline-block rounded-lg bg-gray-900 px-8 py-4 text-lg font-medium text-white hover:bg-gray-800"
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
