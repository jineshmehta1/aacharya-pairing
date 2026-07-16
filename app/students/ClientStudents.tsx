"use client";

import { useState, useEffect, useRef } from "react";
import { createStudent, updateStudent, deleteStudent, verifyAdminPassword, addStudentsBulk } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Lock, Edit2, Trash2, X, Upload } from "lucide-react";
import { CardDescription } from "@/components/ui/card";
import { read, utils } from "xlsx";

export default function ClientStudents({ initialStudents }: { initialStudents: any[] }) {
  const [students, setStudents] = useState(initialStudents);
  const [name, setName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if session has a flag
    if (typeof window !== "undefined" && sessionStorage.getItem("adminAuth") === "true") {
      setIsLoggedIn(true);
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
    } else {
      setError("Invalid password");
    }
    setLoading(false);
  };

  const handleSubmitStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    if (editingStudentId) {
      const updatedStudent = await updateStudent(
        editingStudentId,
        name,
        fatherName || null,
        dob ? new Date(dob) : null,
        phone || null,
        1200
      );
      setStudents(students.map(s => s.id === editingStudentId ? updatedStudent : s));
    } else {
      const newStudent = await createStudent(
        name, 
        fatherName || null, 
        dob ? new Date(dob) : null,
        phone || null,
        1200
      );
      setStudents([...students, newStudent]);
    }

    setName("");
    setFatherName("");
    setDob("");
    setPhone("");
    setEditingStudentId(null);
    setLoading(false);
  };

  const handleEdit = (student: any) => {
    setEditingStudentId(student.id);
    setName(student.name);
    setFatherName(student.fatherName || "");
    setDob(student.dob ? new Date(student.dob).toISOString().split('T')[0] : "");
    setPhone(student.phone || "");
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setName("");
    setFatherName("");
    setDob("");
    setPhone("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student?")) return;
    setLoading(true);
    await deleteStudent(id);
    setStudents(students.filter(s => s.id !== id));
    setLoading(false);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        
        const studentsData = data.map((row: any) => {
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

        const updatedList = await addStudentsBulk(studentsData);
        setStudents(updatedList);
        setLoading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset input
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const calculateAge = (dobString: string | null) => {
    if (!dobString) return "—";
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return "—";
    const diff = new Date().getTime() - birthDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)).toString();
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
            <CardDescription>Enter the master password to manage students.</CardDescription>
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Add Student */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-background to-muted/30 overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <CardHeader>
            <CardTitle className="text-xl flex items-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 font-bold">
              <UserPlus className="w-5 h-5 mr-2 text-blue-500" />
              {editingStudentId ? "Edit Student" : "Add New Student"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitStudent} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Student Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Input 
                  placeholder="Father's Name" 
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <label className="block pl-1">Date of Birth</label>
                <Input 
                  type="date" 
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Input 
                  placeholder="Phone Number (Optional)" 
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Saving..." : editingStudentId ? "Update Student" : "Add Student"}
                  </Button>
                  {editingStudentId && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={loading}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {!editingStudentId && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 border-dashed border-2 border-muted-foreground/30 hover:border-primary/50"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span>Upload Excel / CSV</span>
                    </Button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Students List */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-none shadow-lg overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-600"></div>
          <CardHeader>
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">Registered Students</CardTitle>
          </CardHeader>
          <CardContent className="px-0 overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-6 w-16 text-center font-semibold text-foreground">S.No</TableHead>
                  <TableHead className="font-semibold text-foreground">Name</TableHead>
                  <TableHead className="font-semibold text-foreground">Father's Name</TableHead>
                  <TableHead className="text-center font-semibold text-foreground">DOB</TableHead>
                  <TableHead className="text-center font-semibold text-foreground">Age</TableHead>
                  <TableHead className="text-center font-semibold text-foreground">Phone</TableHead>
                  <TableHead className="text-right font-semibold text-foreground pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s: any, index: number) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="pl-6 text-center font-semibold text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-semibold">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.fatherName || "—"}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {s.dob ? new Date(s.dob).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {calculateAge(s.dob)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{s.phone || "—"}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-100" onClick={() => handleEdit(s)} disabled={loading}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => handleDelete(s.id)} disabled={loading}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No students registered yet. Add some on the left.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
