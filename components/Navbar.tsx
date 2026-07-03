import Link from "next/link";
import { Trophy, ChevronRight } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
        >
          <div className="bg-primary/10 p-1.5 rounded-xl flex-shrink-0">
            <img
              src="/image.png"
              alt="Aacharya Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain"
            />
          </div>

          {/* Always visible */}
          <span className="font-bold text-sm sm:text-base lg:text-lg tracking-tight whitespace-nowrap">
            Aacharya Pairing
          </span>
        </Link>

        {/* Right Navigation */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Leaderboards */}
          <Link
            href="/results"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Leaderboards</span>
          </Link>

          {/* Admin Login */}
          <Link
            href="/pairing"
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-2 sm:px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
          >
            <span className="hidden sm:inline">Admin Login</span>
            <span className="sm:hidden">Login</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}