import Link from "next/link";
import { ArrowRight, Trophy, Users, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="space-y-6 max-w-3xl">
       
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-balance bg-clip-text text-transparent bg-gradient-to-br from-primary to-yellow-600 pb-2">
          Swiss Pairing <br className="hidden sm:block" /> Made Beautiful.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
          Manage chess tournaments effortlessly. Add players, generate BBP-style Swiss pairings, and track leaderboards in real-time.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
        <Link href="/pairing" className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white transition-all duration-200 bg-primary border border-transparent rounded-full overflow-hidden hover:bg-primary/90 hover:scale-105 active:scale-95">
          <Shield className="w-5 h-5 mr-2" />
          Admin Dashboard
          <div className="absolute inset-0 h-full w-full bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -translate-x-full rounded-full" />
        </Link>
        <Link href="/results" className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold transition-all duration-200 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full hover:border-primary hover:text-primary hover:scale-105 active:scale-95 shadow-sm hover:shadow-md">
          <Trophy className="w-5 h-5 mr-2" />
          View Leaderboards
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-8 mt-16 max-w-4xl text-left w-full">
        <Card className="bg-gradient-to-br from-background to-muted border-muted/50 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <CardTitle>Player Management</CardTitle>
            <CardDescription>Easily add and track players with their initial FIDE or custom ratings.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted border-muted/50 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-2">
              <ArrowRight className="w-5 h-5 text-green-500" />
            </div>
            <CardTitle>Smart Pairings</CardTitle>
            <CardDescription>Generate mathematically fair Swiss pairings with Buchholz tie-breaks.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-background to-muted border-muted/50 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
              <Trophy className="w-5 h-5 text-amber-500" />
            </div>
            <CardTitle>Live Standings</CardTitle>
            <CardDescription>Share a public link to let players follow the tournament progress live.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
