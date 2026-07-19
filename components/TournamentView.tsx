"use client";

import React, { useState } from "react";
import { ZoomableTable } from "./ZoomableTable";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";
import { Trophy, Users, Layers, Play } from "lucide-react";

interface Player {
  id: string;
  name: string;
  rating: number;
  score: number;
  buchholz: number;
  sonnebornBerger: number | null;
  cumulative: number | null;
}

interface Match {
  id: string;
  player1Id: string;
  player1: Player;
  player2Id: string | null;
  player2: Player | null;
  result: string | null;
}

interface Round {
  id: string;
  roundNumber: number;
  matches: Match[];
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  players: Player[];
  rounds: Round[];
}

interface TournamentViewProps {
  tournament: Tournament;
}

export function TournamentView({ tournament }: TournamentViewProps) {
  const [activeTab, setActiveTab] = useState<"standings" | "pairings">("standings");
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(
    tournament.rounds.length > 0 ? tournament.rounds.length - 1 : 0
  );

  const selectedRound = tournament.rounds[selectedRoundIndex];

  return (
    <div>
      {/* Tabs Selector */}
      <div className="flex border-b border-muted-foreground/10 px-6 bg-muted/5 gap-4">
        <button
          onClick={() => setActiveTab("standings")}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "standings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Standings</span>
        </button>
        <button
          onClick={() => setActiveTab("pairings")}
          className={`py-3 px-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "pairings"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rounds & Pairings</span>
        </button>
      </div>

      {activeTab === "standings" ? (
        <CardContent className="p-4 sm:p-6 pt-14 sm:pt-6 relative">
          <ZoomableTable>
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
                {tournament.players.map((p, index) => (
                  <TableRow key={p.id} className="hover:bg-muted/10 transition-colors group">
                    <TableCell className="text-center font-bold text-muted-foreground group-hover:text-primary transition-colors">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-bold text-lg">{p.name}</TableCell>
                    <TableCell className="text-center text-muted-foreground font-mono">{p.rating}</TableCell>
                    <TableCell>
                      <div className="flex space-x-1 justify-center">
                        {tournament.rounds.map((r) => {
                          const match = r.matches.find((m) => m.player1Id === p.id || m.player2Id === p.id);
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
                {tournament.players.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No players registered.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ZoomableTable>
        </CardContent>
      ) : (
        <CardContent className="p-6 space-y-6">
          {/* Round Selector Sub-navigation */}
          {tournament.rounds.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2 pb-4 border-b border-muted-foreground/10">
                {tournament.rounds.map((r, idx) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoundIndex(idx)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      selectedRoundIndex === idx
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    Round {r.roundNumber}
                  </button>
                ))}
              </div>

              {/* Match / Pairing List */}
              <div className="space-y-4 pt-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  <span>Round {selectedRound.roundNumber} Pairings & Results</span>
                </h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedRound.matches.map((match, matchIdx) => {
                    const hasFinished = !!match.result;
                    const isBye = match.player2Id === null;
                    
                    return (
                      <div
                        key={match.id}
                        className="p-4 rounded-xl border bg-card hover:bg-muted/5 transition-all flex flex-col justify-between gap-3 shadow-sm hover:shadow-md relative overflow-hidden"
                      >
                        {/* Board Number Tag */}
                        <div className="absolute right-0 top-0 bg-muted px-2.5 py-1 text-xs font-mono text-muted-foreground rounded-bl-lg">
                          Board {matchIdx + 1}
                        </div>

                        {/* Players Section */}
                        <div className="space-y-3 pr-12">
                          {/* Player 1 (White) */}
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="font-bold text-base text-foreground flex items-center gap-2">
                                {match.player1.name}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                Rating: {match.player1.rating}
                              </span>
                            </div>
                            {hasFinished && match.result === "1-0" && (
                              <Badge className="bg-green-500 hover:bg-green-500 text-white font-black px-2 py-0.5">1</Badge>
                            )}
                            {hasFinished && match.result === "0-1" && (
                              <Badge variant="outline" className="text-muted-foreground font-black px-2 py-0.5">0</Badge>
                            )}
                            {hasFinished && match.result === "1/2-1/2" && (
                              <Badge variant="secondary" className="text-foreground font-black px-2 py-0.5">½</Badge>
                            )}
                            {!hasFinished && (
                              <Badge variant="outline" className="text-muted-foreground font-bold px-2 py-0.5">-</Badge>
                            )}
                          </div>

                          <div className="h-px bg-muted"></div>

                          {/* Player 2 (Black or BYE) */}
                          <div className="flex items-center justify-between">
                            {isBye ? (
                              <div className="flex flex-col">
                                <span className="font-medium text-base text-muted-foreground italic">
                                  BYE (No opponent)
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-bold text-base text-foreground">
                                  {match.player2?.name}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  Rating: {match.player2?.rating}
                                </span>
                              </div>
                            )}

                            {isBye ? (
                              <Badge className="bg-muted hover:bg-muted text-muted-foreground font-bold px-2 py-0.5">BYE</Badge>
                            ) : (
                              <>
                                {hasFinished && match.result === "0-1" && (
                                  <Badge className="bg-green-500 hover:bg-green-500 text-white font-black px-2 py-0.5">1</Badge>
                                )}
                                {hasFinished && match.result === "1-0" && (
                                  <Badge variant="outline" className="text-muted-foreground font-black px-2 py-0.5">0</Badge>
                                )}
                                {hasFinished && match.result === "1/2-1/2" && (
                                  <Badge variant="secondary" className="text-foreground font-black px-2 py-0.5">½</Badge>
                                )}
                                {!hasFinished && (
                                  <Badge variant="outline" className="text-muted-foreground font-bold px-2 py-0.5">-</Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No rounds have been generated yet for this tournament.
            </div>
          )}
        </CardContent>
      )}
    </div>
  );
}
