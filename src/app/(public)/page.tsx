import { Calendar, MapPin, Search } from "lucide-react";

export default function HomePage() {
  return (
    <div className="theme-curator flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-24 font-body text-on-surface">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-8 flex justify-center">
          <div className="rounded-2xl bg-surface-container-low p-4 editorial-shadow">
            <Calendar className="text-primary size-10" />
          </div>
        </div>

        <p className="text-primary text-[10px] font-bold uppercase tracking-widest">
          Community
        </p>
        <h1 className="font-headline mt-3 text-4xl italic tracking-tight sm:text-5xl">
          Find Your Community
        </h1>

        <p className="mt-4 text-lg text-on-surface/60">
          Discover local events, explore business directories, grab exclusive
          coupons, and stay connected with what matters most in your area.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <div className="bg-surface-container-low flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-on-surface/70 editorial-shadow">
            <Search className="size-4 shrink-0 text-primary" />
            <span>Browse events &amp; businesses</span>
          </div>
          <div className="bg-surface-container-low flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-on-surface/70 editorial-shadow">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span>Support local communities</span>
          </div>
        </div>

        <p className="mt-12 text-sm text-on-surface/60">
          Visit your community&apos;s page directly by navigating to their
          unique URL.
        </p>
      </div>
    </div>
  );
}
