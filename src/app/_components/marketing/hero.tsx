import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-6xl text-center">
        {/* Main Headline */}
        <h1 className="mb-6 text-5xl font-bold leading-tight text-gray-900 md:text-6xl lg:text-7xl">
          All your teams, all their workflows—connected in one workspace
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-10 max-w-3xl text-lg text-gray-600 md:text-xl">
          Build AI-powered workflows that unify data, maximize collaboration,
          and set your teams up for long-term success. No code required.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-lg bg-gray-900 px-6 py-3 text-base font-medium text-white hover:bg-gray-800"
          >
            Get started for free
          </Link>
          <Link
            href="/contact-sales"
            className="rounded-lg border border-gray-300 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50"
          >
            Book demo
          </Link>
        </div>

        {/* Hero Image/Video Placeholder */}
        <div className="mt-16">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 shadow-2xl">
            <div className="aspect-video w-full bg-gradient-to-br from-blue-900 to-indigo-900 p-8">
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-4 inline-block rounded-lg bg-white/10 px-6 py-3 backdrop-blur-sm">
                    <p className="text-sm font-medium text-white">
                      💡 Interactive Product Demo
                    </p>
                  </div>
                  <p className="text-white/80">
                    AI-powered workflows and collaboration
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
