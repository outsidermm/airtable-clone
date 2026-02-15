import { redirect } from "next/navigation";
import { auth, signIn } from "~/server/auth";
import Image from "next/image";
import { AppleIcon, GoogleIcon } from "~/components/icons";

export default async function LoginPage() {
  const session = await auth();

  // If already logged in, redirect to dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-white lg:flex-row">
      {/* Left Side - Login Form */}
      <div className="flex w-full flex-col items-center justify-center px-8 py-12 lg:w-1/2 lg:items-start lg:px-24">
        {/* Logo */}
        <div className="mb-12">
          <Image
            src="/airtable-color.svg"
            alt="Airtable Logo"
            width={32}
            height={32}
          />
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md">
          <h1 className="mb-8 text-3xl font-medium text-gray-900">
            Sign in to Airtable
          </h1>

          {/* Email Input */}
          <div className="mb-6">
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-900"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Email address"
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Continue Button */}
          <button className="mb-6 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
            Continue
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-500">or</span>
            </div>
          </div>

          {/* SSO Section */}
          <div className="mb-4">
            <button className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:outline-none">
              Sign in with <span className="font-extrabold">Single Sign On</span>
            </button>
          </div>

          {/* OAuth Buttons */}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
            className="mb-3"
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:outline-none"
            >
              <GoogleIcon />
              <div>
                Continue with <span className="font-extrabold">Google</span>
              </div>
            </button>
          </form>

          <button className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-300 focus:outline-none">
            <AppleIcon />
            <div>
              Continue with <span className="font-bold">Apple ID</span>
            </div>
          </button>

          {/* Footer Links */}
          <div className="mt-8 space-y-2 text-sm">
            <p className="text-gray-600">
              New to Airtable?{" "}
              <a
                href="https://airtable.com/signup"
                className="font-medium text-blue-600 underline hover:text-blue-700"
              >
                Create an account
              </a>{" "}
              instead
            </p>
            <p className="text-gray-600">
              Manage your cookie preferences{" "}
              <a
                href="#"
                className="font-medium text-blue-600 underline hover:text-blue-700"
              >
                here
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Promotional Card */}
      <div className="hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center lg:bg-linear-to-br lg:from-purple-900 lg:to-purple-700 lg:p-12">
        <div className="max-w-lg text-white">
          <h2 className="mb-6 text-4xl font-semibold">
            Meet Omni, your AI collaborator for building custom apps.
          </h2>
          <button className="rounded-md bg-white px-6 py-2.5 text-sm font-medium text-purple-900 hover:bg-gray-100">
            Start building
          </button>
          <div className="mt-12 grid grid-cols-2 gap-4">
            {/* Mock app screenshots */}
            <div className="aspect-square rounded-lg bg-purple-800/50 p-4">
              <div className="h-full w-full rounded-md bg-linear-to-br from-pink-500 to-purple-500"></div>
            </div>
            <div className="aspect-square rounded-lg bg-purple-800/50 p-4">
              <div className="h-full w-full rounded-md bg-linear-to-br from-blue-500 to-cyan-500"></div>
            </div>
            <div className="aspect-square rounded-lg bg-purple-800/50 p-4">
              <div className="h-full w-full rounded-md bg-linear-to-br from-green-500 to-emerald-500"></div>
            </div>
            <div className="aspect-square rounded-lg bg-purple-800/50 p-4">
              <div className="h-full w-full rounded-md bg-linear-to-br from-orange-500 to-red-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
