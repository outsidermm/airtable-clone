export function TrustedBy() {
  const companies = [
    "AWS",
    "Walmart",
    "HBO",
    "Vimeo",
    "Levi's",
    "NBA",
    "New Balance",
    "Ironclad",
  ];

  return (
    <section className="border-y border-gray-200 bg-gray-50 px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-12 text-center text-2xl font-semibold text-gray-900">
          Trusted by 500,000 leading teams
        </h2>

        {/* Logo Grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-8">
          {companies.map((company) => (
            <div
              key={company}
              className="flex items-center justify-center grayscale transition-all hover:grayscale-0"
            >
              <div className="flex h-12 items-center justify-center rounded-lg bg-white px-4 py-2 text-center shadow-sm">
                <span className="text-sm font-semibold text-gray-700">
                  {company}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
