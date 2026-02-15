import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-white px-6 pb-12 pt-16">
      <div className="mx-auto max-w-6xl text-center">
        {/* Main Headline */}
        <h1 className="mb-6 text-4xl font-bold leading-[1.1] tracking-tight text-gray-900 md:text-5xl lg:text-6xl">
          All your teams, all their workflows—connected in one workspace
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg">
          Build AI-powered workflows that unify data, maximize collaboration,
          and set your teams up for long-term success. No code required.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Get started for free
          </Link>
          <Link
            href="/contact-sales"
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Book demo
          </Link>
        </div>

        {/* Hero Image/Video Placeholder */}
        <div className="mt-12">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-xl shadow-2xl">
            <div className="relative aspect-video w-full bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900">
              {/* Animated grid background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f46e520_1px,transparent_1px),linear-gradient(to_bottom,#4f46e520_1px,transparent_1px)] bg-size-[4rem_4rem]" />

              {/* Content overlay */}
              <div className="relative flex h-full items-center justify-center p-12">
                <div className="text-center">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                    <p className="text-sm font-medium text-white">
                      Live Product Demo
                    </p>
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold text-white">
                    See Airtable in action
                  </h3>
                  <p className="text-base text-blue-200">
                    Build apps, automate workflows, and deploy AI agents
                  </p>
                </div>
              </div>

              {/* Bottom gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-slate-900/50 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
