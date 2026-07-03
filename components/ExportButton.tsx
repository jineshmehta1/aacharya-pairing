"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButton({ tournamentName, players }: { tournamentName: string, players: any[] }) {
  const handleExport = () => {
    const csvContent = [
      ["Rank", "Name", "Rating", "Score", "Buchholz"].join(","),
      ...players.map((p, index) => 
        [index + 1, `"${p.name}"`, p.rating, p.score, p.buchholz].join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${tournamentName.replace(/\s+/g, '_')}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
      <Download className="w-4 h-4 mr-2" />
      Export CSV
    </Button>
  );
}
