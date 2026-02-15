import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-white py-12">
      <div className="mx-auto max-w-7xl px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {/* Platform */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Platform
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/platform/app-building"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  AI App Building
                </Link>
              </li>
              <li>
                <Link
                  href="/platform/ai-agents"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  AI Agents
                </Link>
              </li>
              <li>
                <Link
                  href="/platform"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Airtable Platform
                </Link>
              </li>
              <li>
                <Link
                  href="/platform/portals"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Portals
                </Link>
              </li>
              <li>
                <Link
                  href="/platform/automations"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Automations
                </Link>
              </li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Solutions
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/solutions/product"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Product
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/marketing"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Marketing
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/operations"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Operations
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/project-management"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Project Management
                </Link>
              </li>
              <li>
                <Link
                  href="/solutions/hr"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Human Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/resources"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Resources Hub
                </Link>
              </li>
              <li>
                <Link
                  href="/templates"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Templates
                </Link>
              </li>
              <li>
                <Link
                  href="/ai-plays"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  AI Plays
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/customer-stories"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Customer Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Learn</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/guides"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  How-to guides
                </Link>
              </li>
              <li>
                <Link
                  href="/developers"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Developer docs
                </Link>
              </li>
              <li>
                <Link
                  href="/academy"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Airtable Academy
                </Link>
              </li>
              <li>
                <Link
                  href="/community"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Airtable Community
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Help center
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/signup"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Try Airtable for free
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-sales"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Contact sales
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/careers"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Connect
            </h3>
            <div className="flex gap-4">
              <Link
                href="https://facebook.com/airtableapp"
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Facebook</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </Link>
              <Link
                href="https://twitter.com/airtable"
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </Link>
              <Link
                href="https://linkedin.com/company/airtable"
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-gray-500">
              © 2026 Airtable. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link
                href="/privacy"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Terms
              </Link>
              <Link
                href="/security"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Security
              </Link>
              <Link
                href="/sitemap"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
