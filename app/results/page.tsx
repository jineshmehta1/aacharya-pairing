import { getTournaments, getTournamentById } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { ExportButton } from "@/components/ExportButton";
import { TournamentView } from "@/components/TournamentView";

// Trigger rebuild
export const revalidate = 0; // Disable static caching for live results

export default async function ResultsPage() {
  const tournamentsList = await getTournaments();
  const activeTournaments = tournamentsList.filter((t) => t.status !== "DRAFT");

  // Fetch full details for active/completed tournaments
  const tournamentsData = await Promise.all(
    activeTournaments.map((t) => getTournamentById(t.id))
  );

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/10">
          <Trophy className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 drop-shadow-md" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60 drop-shadow-sm pb-2">Public Leaderboards</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto px-4 font-medium">
          Live standings and historic results for all tournaments.
        </p>
      </div>

      <div className="space-y-12 max-w-5xl mx-auto w-full">
        {tournamentsData.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-2xl">
            No active tournaments at the moment.
          </div>
        ) : (
          tournamentsData.map((t: any) => {
            if (!t) return null;
            return (
              <Card key={t.id} className="overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-background/50 backdrop-blur-sm">
                <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                <CardHeader className="bg-muted/10 border-b flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6">
                  <div>
                    <CardTitle className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 drop-shadow-sm">{t.name}</CardTitle>
                    <p className="text-sm font-medium text-muted-foreground mt-2 flex items-center gap-2">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">Round {t.rounds.length}</span>
                      <span className="bg-muted px-2 py-0.5 rounded-full">{t.players.length} Players</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ExportButton tournamentName={t.name} players={t.players} />
                    <Badge variant={t.status === "COMPLETED" ? "default" : "secondary"} className={`text-sm px-4 py-1.5 shadow-sm ${t.status === "COMPLETED" ? "bg-gradient-to-r from-gray-700 to-gray-900" : "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-none animate-pulse"}`}>
                      {t.status === "IN_PROGRESS" ? "Live" : "Finished"}
                    </Badge>
                  </div>
                </CardHeader>
                <TournamentView tournament={t} />
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
