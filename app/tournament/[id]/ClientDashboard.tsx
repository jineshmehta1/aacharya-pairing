"use client";

import { useState, useTransition, useRef } from "react";
import { addPlayer, generateNextRound, updateMatchResult, markTournamentCompleted } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Plus, UserPlus, CheckCircle, Upload } from "lucide-react";

import { read, utils } from "xlsx";

export default function ClientDashboard({ initialTournament, students = [] }: { initialTournament: any, students?: any[] }) {
  const [tournament, setTournament] = useState(initialTournament);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("new");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerFatherName, setNewPlayerFatherName] = useState("");
  const [newPlayerDob, setNewPlayerDob] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");
  const [newPlayerRating, setNewPlayerRating] = useState("1200");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticResults, setOptimisticResults] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // We rely on revalidatePath in Server Actions to refresh the page, 
  // but since we are in a client component, we might want to let the Server Component handle the re-render.
  // Actually, Server Actions with revalidatePath will automatically refresh the Server Component and pass new props.
  // So we don't strictly need to manage state if we just use transitions or let Next.js do its thing.
  // But for fast UI, we can just let Next.js refresh.

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentId === "new" && !newPlayerName.trim()) return;
    
    let finalName = newPlayerName;
    let finalFatherName = newPlayerFatherName;
    let finalDob = newPlayerDob ? new Date(newPlayerDob) : null;
    let finalPhone = newPlayerPhone;
    let finalRating = parseInt(newPlayerRating);

    if (selectedStudentId !== "new") {
      const student = students.find((s) => s.id === selectedStudentId);
      if (student) {
        finalName = student.name;
        finalFatherName = student.fatherName || "";
        finalDob = student.dob ? new Date(student.dob) : null;
        finalPhone = student.phone || "";
        finalRating = student.rating || 1200;
      }
    }

    setLoading(true);
    await addPlayer(
      tournament.id, 
      finalName, 
      finalRating,
      finalFatherName || null,
      finalDob,
      finalPhone || null,
      selectedStudentId === "new" ? null : selectedStudentId
    );
    setNewPlayerName("");
    setNewPlayerFatherName("");
    setNewPlayerDob("");
    setNewPlayerPhone("");
    setSelectedStudentId("new");
    setLoading(false);
  };

  const calculateAge = (dobString: string | null) => {
    if (!dobString) return "—";
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return "—";
    const diff = new Date().getTime() - birthDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)).toString();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const ab = evt.target?.result as ArrayBuffer;
        const wb = read(ab, { type: "array" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = utils.sheet_to_json(ws);
        
        const playersData = data.map((row: any) => {
          const dobRaw = row.DOB || row.dob;
          let dobParsed: Date | undefined = undefined;
          if (dobRaw) {
            dobParsed = new Date(dobRaw);
            if (isNaN(dobParsed.getTime())) dobParsed = undefined;
          }
          return {
            name: row.Name || row.name || "Unknown",
            rating: parseInt(row.Rating || row.rating) || 1200,
            fatherName: row["Father Name"] || row.fatherName || undefined,
            dob: dobParsed,
            phone: row.Phone || row.phone || undefined,
          };
        });

        const { addPlayersBulk } = await import("@/lib/actions");
        await addPlayersBulk(tournament.id, playersData);
        setLoading(false);
        e.target.value = ""; // Reset input
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleGenerateRound = async () => {
    setLoading(true);
    await generateNextRound(tournament.id);
    setLoading(false);
  };

  const handleResultChange = (match: any, newResult: string) => {
    // 1. Instantly update the UI so it feels lightning fast
    setOptimisticResults((prev) => ({ ...prev, [match.id]: newResult }));
    
    // 2. Run the database updates and server recompilation in the background
    startTransition(async () => {
      await updateMatchResult(
        tournament.id,
        match.id,
        match.player1Id,
        match.player2Id,
        newResult as any,
        match.result
      );
    });
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
        <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <CardHeader>
            <CardTitle className="text-xl flex items-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 font-bold">
              <UserPlus className="w-5 h-5 mr-2 text-blue-500" />
              Add Player
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div className="space-y-2">
                <Select
                  value={selectedStudentId}
                  onValueChange={(val) => {
                    setSelectedStudentId(val || "new");
                    if (val !== "new") {
                      const st = students.find((s) => s.id === val);
                      if (st) {
                        setNewPlayerName(st.name);
                        setNewPlayerFatherName(st.fatherName || "");
                        setNewPlayerDob(st.dob ? new Date(st.dob).toISOString().split('T')[0] : "");
                        setNewPlayerPhone(st.phone || "");
                      }
                    } else {
                      setNewPlayerName("");
                      setNewPlayerFatherName("");
                      setNewPlayerDob("");
                      setNewPlayerPhone("");
                    }
                  }}
                  disabled={tournament.status === "COMPLETED"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing student" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">-- Create New Student --</SelectItem>
                    {students.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name} {st.fatherName ? `(s/o ${st.fatherName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStudentId === "new" && (
                <>
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
                      placeholder="Father's Name (Optional)" 
                      value={newPlayerFatherName}
                      onChange={(e) => setNewPlayerFatherName(e.target.value)}
                      disabled={tournament.status === "COMPLETED"}
                    />
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <label className="block pl-1">Date of Birth</label>
                    <Input 
                      type="date"
                      value={newPlayerDob}
                      onChange={(e) => setNewPlayerDob(e.target.value)}
                      disabled={tournament.status === "COMPLETED"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Input 
                      placeholder="Phone Number (Optional)" 
                      type="tel"
                      value={newPlayerPhone}
                      onChange={(e) => setNewPlayerPhone(e.target.value)}
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
                </>
              )}
              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading || tournament.status === "COMPLETED"}>
                  Add Player
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload}
                  disabled={loading || tournament.status === "COMPLETED"}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2 border-dashed border-2 border-muted-foreground/30 hover:border-primary/50" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || tournament.status === "COMPLETED"}
                >
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span>Upload Excel / CSV</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-600"></div>
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">Standings</CardTitle>
          </CardHeader>
          <CardContent className="px-0 overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-6 rounded-tl-lg font-semibold text-foreground">Name</TableHead>
                  <TableHead className="text-center font-semibold text-foreground">Age</TableHead>
                  <TableHead className="text-center font-semibold text-foreground">Results</TableHead>
                  <TableHead className="font-semibold text-foreground">Pts</TableHead>
                  <TableHead className="text-muted-foreground text-xs" title="Buchholz">BH</TableHead>
                  <TableHead className="text-muted-foreground text-xs" title="Sonneborn-Berger">SB</TableHead>
                  <TableHead className="pr-6 text-muted-foreground text-xs" title="Cumulative">CUM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialTournament.players.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 font-semibold">
                      {p.name}
                      {p.fatherName && <span className="block text-xs font-normal text-muted-foreground">s/o {p.fatherName}</span>}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{calculateAge(p.dob)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1 justify-center">
                        {initialTournament.rounds.map((r: any) => {
                          const match = r.matches.find((m: any) => m.player1Id === p.id || m.player2Id === p.id);
                          if (!match) return <span key={r.id} className="w-6 h-6 flex items-center justify-center text-[10px] bg-muted rounded-full shadow-sm">-</span>;
                          if (match.player2Id === null) return <span key={r.id} className="w-6 h-6 flex items-center justify-center text-[10px] bg-gradient-to-br from-green-400 to-green-600 text-white rounded-full shadow-sm font-bold transition-transform hover:scale-110">1</span>;
                          if (!match.result) return <span key={r.id} className="w-6 h-6 flex items-center justify-center text-[10px] bg-muted/80 rounded-full shadow-sm backdrop-blur-sm">?</span>;
                          
                          const isP1 = match.player1Id === p.id;
                          if (match.result === "1-0") return <span key={r.id} className={`w-6 h-6 flex items-center justify-center text-[10px] rounded-full shadow-sm font-bold transition-transform hover:scale-110 ${isP1 ? "bg-gradient-to-br from-green-400 to-green-600 text-white" : "bg-gradient-to-br from-red-400 to-red-600 text-white"}`}>{isP1 ? "1" : "0"}</span>;
                          if (match.result === "0-1") return <span key={r.id} className={`w-6 h-6 flex items-center justify-center text-[10px] rounded-full shadow-sm font-bold transition-transform hover:scale-110 ${!isP1 ? "bg-gradient-to-br from-green-400 to-green-600 text-white" : "bg-gradient-to-br from-red-400 to-red-600 text-white"}`}>{!isP1 ? "1" : "0"}</span>;
                          return <span key={r.id} className="w-6 h-6 flex items-center justify-center text-[10px] bg-gradient-to-br from-slate-400 to-slate-600 text-white rounded-full shadow-sm font-bold transition-transform hover:scale-110">½</span>;
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-lg">{p.score}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{p.buchholz}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">{p.sonnebornBerger ?? 0}</TableCell>
                    <TableCell className="pr-6 text-muted-foreground font-mono text-sm">{p.cumulative ?? 0}</TableCell>
                  </TableRow>
                ))}
                {initialTournament.players.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50 backdrop-blur-md p-4 rounded-xl shadow-sm border">
          <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Rounds</h3>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {tournament.status !== "COMPLETED" && (
              <Button variant="outline" onClick={handleMarkCompleted} disabled={loading} className="w-full sm:w-auto border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                <CheckCircle className="w-4 h-4 mr-2" />
                Conclude
              </Button>
            )}
            <Button onClick={handleGenerateRound} disabled={loading || initialTournament.players.length < 2 || tournament.status === "COMPLETED"} className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all">
              <Play className="w-4 h-4 mr-2" />
              Generate Next Round
            </Button>
          </div>
        </div>

        {initialTournament.rounds.slice().reverse().map((round: any, idx: number) => (
          <Card key={round.id} className="overflow-hidden border-none shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className={`bg-gradient-to-r ${idx === 0 ? "from-indigo-500/10 to-purple-500/10" : "from-muted to-muted/50"} px-4 sm:px-6 py-4 border-b flex justify-between items-center`}>
              <span className={`font-bold text-sm uppercase tracking-widest ${idx === 0 ? "text-indigo-600" : "text-muted-foreground"}`}>Round {round.roundNumber} {idx === 0 && "(Latest)"}</span>
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
                          disabled={isPending || loading} 
                          value={optimisticResults[match.id] ?? match.result ?? "PENDING"} 
                          onValueChange={(val) => handleResultChange(match, (val || "") === "PENDING" ? "" : (val as string))}
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
