"use client";

import { useState } from "react";
import { addPlayer, generateNextRound, updateMatchResult, markTournamentCompleted } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, UserPlus, CheckCircle } from "lucide-react";

export default function ClientDashboard({ initialTournament }: { initialTournament: any }) {
  const [tournament, setTournament] = useState(initialTournament);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerRating, setNewPlayerRating] = useState("1200");
  const [loading, setLoading] = useState(false);

  // We rely on revalidatePath in Server Actions to refresh the page, 
  // but since we are in a client component, we might want to let the Server Component handle the re-render.
  // Actually, Server Actions with revalidatePath will automatically refresh the Server Component and pass new props.
  // So we don't strictly need to manage state if we just use transitions or let Next.js do its thing.
  // But for fast UI, we can just let Next.js refresh.

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    setLoading(true);
    await addPlayer(tournament.id, newPlayerName, parseInt(newPlayerRating));
    setNewPlayerName("");
    setLoading(false);
  };

  const handleGenerateRound = async () => {
    setLoading(true);
    await generateNextRound(tournament.id);
    setLoading(false);
  };

  const handleResultChange = async (match: any, newResult: string) => {
    setLoading(true);
    await updateMatchResult(
      match.id,
      match.player1Id,
      match.player2Id,
      newResult as any,
      match.result
    );
    setLoading(false);
  };

  const handleMarkCompleted = async () => {
    if (!confirm("Are you sure you want to conclude this tournament? No more rounds can be generated.")) return;
    setLoading(true);
    await markTournamentCompleted(tournament.id);
    setTournament({ ...tournament, status: "COMPLETED" });
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Players */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Add Player
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Player Name" 
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  disabled={tournament.status === "COMPLETED"}
                />
              </div>
              <div className="space-y-2">
                <Input 
                  type="number" 
                  placeholder="Rating (e.g. 1200)" 
                  value={newPlayerRating}
                  onChange={(e) => setNewPlayerRating(e.target.value)}
                  disabled={tournament.status === "COMPLETED"}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || tournament.status === "COMPLETED"}>
                Add Player
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-primary">Standings</CardTitle>
          </CardHeader>
          <CardContent className="px-0 overflow-x-auto">
            <Table className="min-w-[400px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Name</TableHead>
                  <TableHead className="text-center">Results</TableHead>
                  <TableHead>Pts</TableHead>
                  <TableHead className="pr-4">BH</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialTournament.players.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4 font-medium">{p.name}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1 justify-center">
                        {initialTournament.rounds.map((r: any) => {
                          const match = r.matches.find((m: any) => m.player1Id === p.id || m.player2Id === p.id);
                          if (!match) return <span key={r.id} className="w-5 h-5 flex items-center justify-center text-[10px] bg-muted rounded">-</span>;
                          if (match.player2Id === null) return <span key={r.id} className="w-5 h-5 flex items-center justify-center text-[10px] bg-green-500 text-white rounded font-bold">1</span>;
                          if (!match.result) return <span key={r.id} className="w-5 h-5 flex items-center justify-center text-[10px] bg-muted rounded">?</span>;
                          
                          const isP1 = match.player1Id === p.id;
                          if (match.result === "1-0") return <span key={r.id} className={`w-5 h-5 flex items-center justify-center text-[10px] rounded font-bold ${isP1 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>{isP1 ? "1" : "0"}</span>;
                          if (match.result === "0-1") return <span key={r.id} className={`w-5 h-5 flex items-center justify-center text-[10px] rounded font-bold ${!isP1 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>{!isP1 ? "1" : "0"}</span>;
                          return <span key={r.id} className="w-5 h-5 flex items-center justify-center text-[10px] bg-gray-500 text-white rounded font-bold">½</span>;
                        })}
                      </div>
                    </TableCell>
                    <TableCell>{p.score}</TableCell>
                    <TableCell className="pr-4 text-muted-foreground">{p.buchholz}</TableCell>
                  </TableRow>
                ))}
                {initialTournament.players.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                      No players yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Rounds & Pairings */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-2xl font-bold text-primary">Rounds</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            {tournament.status !== "COMPLETED" && (
              <Button variant="outline" onClick={handleMarkCompleted} disabled={loading} className="w-full sm:w-auto">
                <CheckCircle className="w-4 h-4 mr-2" />
                Conclude
              </Button>
            )}
            <Button onClick={handleGenerateRound} disabled={loading || initialTournament.players.length < 2 || tournament.status === "COMPLETED"} className="w-full sm:w-auto">
              <Play className="w-4 h-4 mr-2" />
              Generate Next Round
            </Button>
          </div>
        </div>

        {initialTournament.rounds.slice().reverse().map((round: any) => (
          <Card key={round.id} className="overflow-hidden">
            <div className="bg-muted px-4 sm:px-6 py-3 border-b flex justify-between items-center">
              <span className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Round {round.roundNumber}</span>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">White (Player 1)</TableHead>
                  <TableHead className="w-1/3">Black (Player 2)</TableHead>
                  <TableHead className="w-1/3 text-right">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {round.matches.map((match: any) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-medium">{match.player1.name} {match.player2 ? "" : "(BYE)"}</TableCell>
                    <TableCell>{match.player2?.name || "—"}</TableCell>
                    <TableCell className="text-right">
                      {match.player2 === null ? (
                        <Badge variant="outline">1-0 (BYE)</Badge>
                      ) : (
                        <Select 
                          disabled={loading} 
                          value={match.result || "PENDING"} 
                          onValueChange={(val) => handleResultChange(match, val === "PENDING" ? "" : val)}
                        >
                          <SelectTrigger className="w-[120px] ml-auto">
                            <SelectValue placeholder="Result" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="1-0">1-0 (P1 Wins)</SelectItem>
                            <SelectItem value="0-1">0-1 (P2 Wins)</SelectItem>
                            <SelectItem value="1/2-1/2">1/2-1/2 (Draw)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ))}

        {initialTournament.rounds.length === 0 && (
          <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            No rounds generated yet. Add players and click "Generate Next Round".
          </div>
        )}
      </div>
    </div>
  );
}
