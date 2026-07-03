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
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Trophy className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary">Public Leaderboards</h1>
        <p className="text-muted-foreground max-w-xl mx-auto px-4">
          Live standings for all active and completed tournaments.
        </p>
      </div>

      <div className="space-y-12 max-w-5xl mx-auto px-4 sm:px-0">
        {tournamentsData.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-2xl">
            No active tournaments at the moment.
          </div>
        ) : (
          tournamentsData.map((t) => {
            if (!t) return null;
            return (
              <Card key={t.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="bg-muted/30 border-b flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <CardTitle className="text-xl sm:text-2xl text-primary">{t.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Round {t.rounds.length} • {t.players.length} Players
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ExportButton tournamentName={t.name} players={t.players} />
                    <Badge variant={t.status === "COMPLETED" ? "default" : "secondary"} className="text-sm px-3 py-1">
                      {t.status === "IN_PROGRESS" ? "Live" : "Finished"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table className="min-w-[600px]">
                    <TableHeader>
                      <TableRow className="bg-muted/10 hover:bg-muted/10">
                        <TableHead className="w-16 text-center">Rank</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead className="text-center w-24">Rating</TableHead>
                        <TableHead className="text-center min-w-[120px]">Results</TableHead>
                        <TableHead className="text-center w-24">Score</TableHead>
                        <TableHead className="text-center w-24">Buchholz</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.players.map((p, index) => (
                        <TableRow key={p.id} className="hover:bg-muted/5">
                          <TableCell className="text-center font-semibold text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-bold">{p.name}</TableCell>
                          <TableCell className="text-center">{p.rating}</TableCell>
                          <TableCell>
                            <div className="flex space-x-1 justify-center">
                              {t.rounds.map((r) => {
                                const match = r.matches.find((m: any) => m.player1Id === p.id || m.player2Id === p.id);
                                if (!match) return <span key={r.id} className="w-6 h-6 flex items-center justify-center text-xs bg-muted rounded">-</span>;
                                if (match.player2Id === null) return <span key={r.id} className="w-6 h-6 flex items-center justify-center text-xs bg-green-500 text-white rounded font-bold" title="BYE">1</span>;
                                if (!match.result) return <span key={r.id} className="w-6 h-6 flex items-center justify-center text-xs bg-muted rounded">?</span>;
                                
                                const isP1 = match.player1Id === p.id;
                                if (match.result === "1-0") {
                                  return <span key={r.id} className={`w-6 h-6 flex items-center justify-center text-xs rounded font-bold ${isP1 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`} title={isP1 ? "Win" : "Loss"}>{isP1 ? "1" : "0"}</span>;
                                } else if (match.result === "0-1") {
                                  return <span key={r.id} className={`w-6 h-6 flex items-center justify-center text-xs rounded font-bold ${!isP1 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`} title={!isP1 ? "Win" : "Loss"}>{!isP1 ? "1" : "0"}</span>;
                                } else {
                                  return <span key={r.id} className="w-6 h-6 flex items-center justify-center text-xs bg-gray-500 text-white rounded font-bold" title="Draw">½</span>;
                                }
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-lg font-bold text-primary">{p.score}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{p.buchholz}</TableCell>
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
