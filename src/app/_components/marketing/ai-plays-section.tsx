import Link from "next/link";

const plays = [
  {
    title:
      "Read this brief and generate 10 campaign ideas for our summer launch.",
    gradient: "from-orange-400 to-pink-500",
  },
  {
    title:
      "Gather intel on all event invitees to help me personalize outreach.",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    title:
      "What are customers saying about our competitors and where are our biggest opportunities?",
    gradient: "from-purple-400 to-pink-500",
  },
  {
    title:
      "Run language translation on 500 assets and check for local regulation requirements.",
    gradient: "from-green-400 to-emerald-500",
  },
];

export function AIPlaysSection() {
  return (
    <section className="bg-gray-50 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-gray-900 md:text-4xl">
              The path to 10x every person in your organization
            </h2>
            <p className="text-lg text-gray-600">
              Use cases and templates to activate AI in your workflows
            </p>
          </div>
          <Link
            href="/ai-plays"
            className="shrink-0 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
          >
            See AI plays
          </Link>
        </div>

        {/* Plays Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plays.map((play, index) => (
            <Link
              key={index}
              href="/ai-plays"
              className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
            >
              {/* Gradient background */}
              <div
                className={`absolute inset-0 bg-linear-to-br ${play.gradient} opacity-10 transition-opacity group-hover:opacity-20`}
              />

              {/* Content */}
              <div className="relative">
                <p className="mb-4 text-sm font-medium leading-relaxed text-gray-900">
                  {play.title}
                </p>
                <div className="flex items-center gap-1 text-xs font-medium text-blue-600">
                  Explore AI Plays
                  <svg
                    className="h-3 w-3 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
