"use client";

import { useState } from "react";
import Link from "next/link";

const features = [
  {
    id: "01",
    title: "AI app building",
    headline: "Production apps at prototype speed",
    description:
      "Streamline your team's critical data through conversational building. Generate apps with Airtable's best-in-class no-code components—no technical expertise required.",
    link: "/platform/app-building",
  },
  {
    id: "02",
    title: "Agents at Scale",
    headline: "Don't just ask AI. Deploy it.",
    description:
      "Embed intelligence into every workflow—Airtable agents think dynamically across thousands of records and orchestrate actions across your entire operation.",
    link: "/platform/ai-agents",
  },
  {
    id: "03",
    title: "Meet Omni",
    headline: "Say hello to Omni",
    description:
      "Use it to build any enterprise-grade applications with your data. The possibilities are endless.",
    link: "/platform/app-building",
  },
  {
    id: "04",
    title: "Enterprise capabilities",
    headline:
      "The power of AI with the industrial-grade platform your business demands",
    description:
      "Scalable infrastructure, flexible administration, and enterprise-grade security and compliance.",
    link: "/platform",
  },
];

export function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <section className="bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-16 text-center text-4xl font-bold text-gray-900 md:text-5xl">
          Sophisticated workflows in minutes, not months
        </h2>

        {/* Feature Navigation Tabs */}
        <div className="mb-12 flex flex-wrap justify-center gap-4 border-b border-gray-200">
          {features.map((feature, index) => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(index)}
              className={`relative pb-4 text-left transition-colors ${
                activeFeature === index
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{feature.id}</span>
                <span className="text-sm font-medium">{feature.title}</span>
              </div>
              {activeFeature === index && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          ))}
        </div>

        {/* Active Feature Content */}
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Text Content */}
          <div>
            <h3 className="mb-4 text-3xl font-bold text-gray-900">
              {features[activeFeature]?.headline}
            </h3>
            <p className="mb-6 text-lg leading-relaxed text-gray-600">
              {features[activeFeature]?.description}
            </p>
            <Link
              href={features[activeFeature]?.link ?? "#"}
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Learn more
              <svg
                className="h-4 w-4"
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
            </Link>
          </div>

          {/* Visual/Demo Area */}
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-2xl bg-linear-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 shadow-xl">
              <div className="flex h-full items-center justify-center">
                {/* Placeholder for animated demo */}
                <div className="text-center">
                  <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg">
                    <svg
                      className="h-10 w-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    Interactive Feature Demo
                  </p>
                </div>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-yellow-200 opacity-20 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-blue-200 opacity-20 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
