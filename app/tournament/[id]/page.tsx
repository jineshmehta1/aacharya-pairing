import { getTournamentById, getStudents } from "@/lib/actions";
import ClientDashboard from "./ClientDashboard";
import { notFound } from "next/navigation";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const tournament = await getTournamentById(resolvedParams.id);
  
  if (!tournament) {
    return notFound();
  }

  const students = await getStudents();

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">{tournament.name}</h1>
      </div>
      <ClientDashboard initialTournament={tournament} students={students} />
    </div>
  );
}
