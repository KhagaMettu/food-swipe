import Link from "next/link";

/**
 * Custom 404 page with MunchMatch branding.
 */
export default function NotFound() {
  return (
    <main
      className="flex flex-1 flex-col items-center justify-center min-h-screen px-4 py-16"
      style={{ background: "linear-gradient(135deg, #8ECAE6 0%, #219EBC 100%)" }}
    >
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-[#023047] mb-2">404</h1>
        <p className="text-xl font-semibold text-[#023047] mb-2">
          🍽️ Page not found
        </p>
        <p className="text-[#023047]/70 text-sm mb-8">
          Looks like this page wandered off the menu. Let&apos;s get you back to
          finding restaurants.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-[#023047] px-6 py-3 text-white font-medium hover:bg-[#023047]/90 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </main>
  );
}
