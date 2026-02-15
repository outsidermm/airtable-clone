import Link from "next/link";

export function TestimonialSection() {
  return (
    <section className="bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Video/Visual */}
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black/20 shadow-2xl">
            <div className="flex h-full items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <svg
                  className="h-8 w-8 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Testimonial Content */}
          <div className="text-white">
            <blockquote className="mb-8 text-2xl leading-relaxed font-medium md:text-3xl">
              &quot;Airtable makes it easy to deliver AI insights to every team
              quickly and without complex builds.&quot;
            </blockquote>

            <div className="mb-8 flex items-center gap-4">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-white/10">
                <div className="flex h-full items-center justify-center text-lg font-semibold text-white">
                  AY
                </div>
              </div>
              <div>
                <p className="font-semibold">Angela Yanes</p>
                <p className="text-sm text-blue-200">
                  Director of Product Operations, eBay
                </p>
              </div>
            </div>

            <Link
              href="/customer-stories"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Explore all customer stories
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
