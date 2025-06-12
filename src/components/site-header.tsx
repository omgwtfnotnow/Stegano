import { Gem } from 'lucide-react';
import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Gem className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline sm:inline-block text-xl">
            Stegano
          </span>
        </Link>
        <nav className="flex flex-1 items-center space-x-4">
          {/* Add nav items here if needed later */}
        </nav>
      </div>
    </header>
  );
}
