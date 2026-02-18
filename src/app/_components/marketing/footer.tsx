import Link from "next/link";
import { FacebookIcon, TwitterIcon, LinkedInIcon } from "~/app/_components/ui/icons";

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
                <FacebookIcon className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com/airtable"
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Twitter</span>
                <TwitterIcon className="h-5 w-5" />
              </Link>
              <Link
                href="https://linkedin.com/company/airtable"
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">LinkedIn</span>
                <LinkedInIcon className="h-5 w-5" />
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
