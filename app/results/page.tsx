import { getTournaments, getTournamentById } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { ExportButton } from "@/components/ExportButton";

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
          tournamentsData.map((t) => {
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
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                        <TableHead className="w-16 text-center font-bold text-foreground">Rank</TableHead>
                        <TableHead className="font-bold text-foreground">Player</TableHead>
                        <TableHead className="text-center w-24 font-bold text-foreground">Rating</TableHead>
                        <TableHead className="text-center min-w-[120px] font-bold text-foreground">Results</TableHead>
                        <TableHead className="text-center w-24 font-bold text-foreground">Score</TableHead>
                        <TableHead className="text-center w-24 text-muted-foreground text-xs" title="Buchholz">BH</TableHead>
                        <TableHead className="text-center w-24 text-muted-foreground text-xs" title="Sonneborn-Berger">SB</TableHead>
                        <TableHead className="text-center w-24 text-muted-foreground text-xs" title="Cumulative">CUM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.players.map((p: any, index: number) => (
                        <TableRow key={p.id} className="hover:bg-muted/10 transition-colors group">
                          <TableCell className="text-center font-bold text-muted-foreground group-hover:text-primary transition-colors">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-bold text-lg">{p.name}</TableCell>
                          <TableCell className="text-center text-muted-foreground font-mono">{p.rating}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1 justify-center">
                              {t.rounds.map((r: any) => {
                                const match = r.matches.find((m: any) => m.player1Id === p.id || m.player2Id === p.id);
                                if (!match) return <span key={r.id} className="w-7 h-7 flex items-center justify-center text-xs bg-muted rounded-full shadow-sm">-</span>;
                                if (match.player2Id === null) return <span key={r.id} className="w-7 h-7 flex items-center justify-center text-xs bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full shadow-sm font-bold transition-transform hover:scale-110" title="BYE">1</span>;
                                if (!match.result) return <span key={r.id} className="w-7 h-7 flex items-center justify-center text-xs bg-muted/80 rounded-full shadow-sm backdrop-blur-sm">?</span>;
                                
                                const isP1 = match.player1Id === p.id;
                                if (match.result === "1-0") {
                                  return <span key={r.id} className={`w-7 h-7 flex items-center justify-center text-xs rounded-full shadow-sm font-bold transition-transform hover:scale-110 ${isP1 ? "bg-gradient-to-br from-green-400 to-green-600 text-white" : "bg-gradient-to-br from-red-400 to-red-600 text-white"}`} title={isP1 ? "Win" : "Loss"}>{isP1 ? "1" : "0"}</span>;
                                } else if (match.result === "0-1") {
                                  return <span key={r.id} className={`w-7 h-7 flex items-center justify-center text-xs rounded-full shadow-sm font-bold transition-transform hover:scale-110 ${!isP1 ? "bg-gradient-to-br from-green-400 to-green-600 text-white" : "bg-gradient-to-br from-red-400 to-red-600 text-white"}`} title={!isP1 ? "Win" : "Loss"}>{!isP1 ? "1" : "0"}</span>;
                                } else {
                                  return <span key={r.id} className="w-7 h-7 flex items-center justify-center text-xs bg-gradient-to-br from-slate-400 to-slate-600 text-white rounded-full shadow-sm font-bold transition-transform hover:scale-110" title="Draw">½</span>;
                                }
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">{p.score}</TableCell>
                          <TableCell className="text-center text-muted-foreground font-mono text-sm">{p.buchholz}</TableCell>
                          <TableCell className="text-center text-muted-foreground font-mono text-sm">{p.sonnebornBerger ?? 0}</TableCell>
                          <TableCell className="text-center text-muted-foreground font-mono text-sm">{p.cumulative ?? 0}</TableCell>
                        </TableRow>
                      ))}
                      {t.players.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No players registered.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
