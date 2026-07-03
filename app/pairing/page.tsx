"use client";

import { useState, useEffect } from "react";
import { verifyAdminPassword, getTournaments, createTournament, deleteTournament } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Plus, Swords, Trash2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function PairingAdmin() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [newTournamentName, setNewTournamentName] = useState("");

  useEffect(() => {
    // Check if session has a flag
    if (typeof window !== "undefined" && sessionStorage.getItem("adminAuth") === "true") {
      setIsLoggedIn(true);
      fetchTournaments();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const isValid = await verifyAdminPassword(password);
    if (isValid) {
      setIsLoggedIn(true);
      sessionStorage.setItem("adminAuth", "true");
      await fetchTournaments();
    } else {
      setError("Invalid password");
    }
    setLoading(false);
  };

  const fetchTournaments = async () => {
    const data = await getTournaments();
    setTournaments(data);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim()) return;
    setLoading(true);
    await createTournament(newTournamentName);
    setNewTournamentName("");
    await fetchTournaments();
    setLoading(false);
  };

  const handleDeleteTournament = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament? This cannot be undone.")) return;
    setLoading(true);
    await deleteTournament(id);
    await fetchTournaments();
    setLoading(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader className="space-y-1 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Admin Access</CardTitle>
            <CardDescription>Enter the master password to manage pairings.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={error ? "border-red-500" : ""}
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 px-4 sm:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-primary">Tournaments</h2>
          <p className="text-muted-foreground">Manage your chess tournaments.</p>
        </div>
        <form onSubmit={handleCreateTournament} className="flex gap-2 w-full md:w-auto">
          <Input 
            placeholder="New tournament name..." 
            value={newTournamentName}
            onChange={(e) => setNewTournamentName(e.target.value)}
            className="w-full md:w-64"
          />
          <Button type="submit" disabled={loading || !newTournamentName.trim()}>
            <Plus className="w-4 h-4 mr-2" /> Create
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
            No tournaments found. Create one to get started.
          </div>
        ) : (
          tournaments.map((t) => (
            <Card key={t.id} className="hover:border-primary/50 transition-colors flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl line-clamp-1">{t.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === "COMPLETED" ? "default" : t.status === "IN_PROGRESS" ? "secondary" : "outline"}>
                      {t.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30" onClick={() => handleDeleteTournament(t.id)} disabled={loading}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Created on {new Date(t.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto pt-6 border-t bg-muted/20">
                <Link href={`/tournament/${t.id}`} className="w-full">
                  <Button variant="default" className="w-full">
                    <Swords className="w-4 h-4 mr-2" />
                    Manage Pairings
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
