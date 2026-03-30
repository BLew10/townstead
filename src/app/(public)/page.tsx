import { Calendar } from "lucide-react";
import { SiteDirectory } from "@/components/public/site-directory";

export default function HomePage() {
  return (
    <div className="theme-curator flex min-h-screen flex-col bg-surface font-body text-on-surface">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pb-8 pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-8 flex justify-center">
            <div className="rounded-2xl bg-surface-container-low p-4 editorial-shadow">
              <Calendar className="size-10 text-primary" />
            </div>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Community
          </p>
          <h1 className="font-headline mt-3 text-4xl italic tracking-tight sm:text-5xl">
            Find Your Community
          </h1>

          <p className="mt-4 text-lg text-on-surface/60">
            Discover local events, explore business directories, grab exclusive
            coupons, and stay connected with what matters most in your area.
          </p>
        </div>
      </section>

      {/* Site directory */}
      <SiteDirectory />
    </div>
  );
}
