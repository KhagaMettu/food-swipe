import HomePageClient from "@/app/components/HomePageClient";

/**
 * HomePage — Server Component entry point.
 * Delegates rendering to the client component.
 */
export default function HomePage() {
  return <HomePageClient />;
}
