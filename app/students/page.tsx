import { getStudents } from "@/lib/actions";
import ClientStudents from "./ClientStudents";

export default async function StudentsPage() {
  const students = await getStudents();

  return (
    <div className="space-y-6 w-full max-w-5xl mx-auto py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary">Students Database</h1>
      </div>
      <ClientStudents initialStudents={students} />
    </div>
  );
}
