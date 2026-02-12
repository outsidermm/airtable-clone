import { redirect } from "next/navigation";
import { auth, signIn } from "~/server/auth";
import Image from "next/image";

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
          <Image src="/airtable-color.svg" alt="Airtable Logo" width={32} height={32} />
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
              className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Continue Button */}
          <button className="mb-6 w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
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
            <button className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300">
              Sign in with <span className="font-semibold">Single Sign On</span>
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
              className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with <span className="font-semibold">Google</span>
            </button>
          </form>

          <button className="flex w-full items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with <span className="font-semibold">Apple ID</span>
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
      <div className="hidden lg:flex lg:w-1/2 lg:items-center lg:justify-center lg:bg-gradient-to-br lg:from-purple-900 lg:to-purple-700 lg:p-12">
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
              <div className="h-full w-full rounded-md bg-gradient-to-br from-pink-500 to-purple-500"></div>
            </div>
            <div className="aspect-square rounded-lg bg-purple-800/50 p-4">
              <div className="h-full w-full rounded-md bg-gradient-to-br from-blue-500 to-cyan-500"></div>
            </div>
            <div className="aspect-square rounded-lg bg-purple-800/50 p-4">
              <div className="h-full w-full rounded-md bg-gradient-to-br from-green-500 to-emerald-500"></div>
            </div>
            <div className="aspect-square rounded-lg bg-purple-800/50 p-4">
              <div className="h-full w-full rounded-md bg-gradient-to-br from-orange-500 to-red-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
