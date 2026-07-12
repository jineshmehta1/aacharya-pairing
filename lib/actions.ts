"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { generateSwissPairings } from "./swiss-pairing";

const prisma = new PrismaClient();

export async function verifyAdminPassword(password: string) {
  if (password === process.env.ADMIN_PASSWORD) {
    return true;
  }
  return false;
}

export async function getTournaments() {
  return await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getTournamentById(id: string) {
  return await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: {
        orderBy: [{ score: "desc" }, { buchholz: "desc" }, { sonnebornBerger: "desc" }, { cumulative: "desc" }, { rating: "desc" }],
      },
      rounds: {
        include: {
          matches: {
            include: {
              player1: true,
              player2: true,
            },
          },
        },
        orderBy: { roundNumber: "asc" },
      },
    },
  });
}

export async function createTournament(name: string) {
  const tournament = await prisma.tournament.create({
    data: {
      name,
    },
  });
  revalidatePath("/");
  return tournament;
}

export async function getStudents() {
  return await prisma.student.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createStudent(name: string, fatherName: string | null, dob: Date | null, phone: string | null, rating: number = 1200) {
  const student = await prisma.student.create({
    data: {
      name,
      fatherName,
      dob,
      phone,
      rating,
    },
  });
  revalidatePath("/students");
  return student;
}

export async function updateStudent(id: string, name: string, fatherName: string | null, dob: Date | null, phone: string | null, rating: number = 1200) {
  const student = await prisma.student.update({
    where: { id },
    data: {
      name,
      fatherName,
      dob,
      phone,
      rating,
    },
  });
  revalidatePath("/students");
  return student;
}

export async function deleteStudent(id: string) {
  await prisma.student.delete({
    where: { id },
  });
  revalidatePath("/students");
}

export async function addPlayer(
  tournamentId: string, 
  name: string, 
  rating: number, 
  fatherName: string | null = null,
  dob: Date | null = null,
  phone: string | null = null,
  studentId: string | null = null
) {
  let finalStudentId = studentId;

  // If no studentId provided, create a new student so it's added to the database
  if (!finalStudentId) {
    const student = await prisma.student.create({
      data: {
        name,
        fatherName,
        dob,
        phone,
        rating,
      },
    });
    finalStudentId = student.id;
  }

  await prisma.player.create({
    data: {
      name,
      rating,
      fatherName,
      dob,
      phone,
      studentId: finalStudentId,
      tournamentId,
    },
  });
  revalidatePath(`/tournament/${tournamentId}`);
}

export async function addPlayersBulk(tournamentId: string, playersData: { name: string, rating?: number, fatherName?: string, dob?: Date, phone?: string }[]) {
  const data = await Promise.all(playersData.map(async (p) => {
    // Try to find an existing student by name to link to, or create one?
    // The requirement says we should add them to the database if they are new.
    // For simplicity in bulk add, we just add them to the tournament.
    // We can also create students for them.
    let student = await prisma.student.findFirst({ where: { name: p.name } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          name: p.name,
          rating: p.rating || 1200,
          fatherName: p.fatherName || null,
          dob: p.dob || null,
          phone: p.phone || null,
        }
      });
    }

    return {
      name: p.name,
      rating: p.rating || 1200,
      fatherName: p.fatherName || null,
      dob: p.dob || null,
      phone: p.phone || null,
      studentId: student.id,
      tournamentId,
    };
  }));

  await prisma.player.createMany({
    data,
  });
  revalidatePath(`/tournament/${tournamentId}`);
}

export async function generateNextRound(tournamentId: string) {
  const tournament = await getTournamentById(tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  const players = tournament.players;
  if (players.length === 0) throw new Error("No players in tournament");

  const rounds = tournament.rounds;
  const nextRoundNumber = rounds.length + 1;

  // Get all past matches
  const history = rounds.flatMap((r) =>
    r.matches.map((m) => ({
      player1Id: m.player1Id,
      player2Id: m.player2Id,
    }))
  );

  const pairings = generateSwissPairings(players, history);

  // Update tournament status if first round
  if (tournament.status === "DRAFT") {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "IN_PROGRESS" },
    });
  }

  // Create Round and Matches in a transaction
  await prisma.$transaction(
    async (tx) => {
      const round = await tx.round.create({
        data: {
          roundNumber: nextRoundNumber,
          tournamentId,
        },
      });

      const matchData = pairings.map((p) => ({
        roundId: round.id,
        player1Id: p.player1Id,
        player2Id: p.player2Id,
        result: p.player2Id === null ? "1-0" : null, // BYE automatically wins
      }));

      await tx.match.createMany({
        data: matchData,
      });

      // If BYE, add score to player 1 immediately
      const byePairings = pairings.filter((p) => p.player2Id === null);
      if (byePairings.length > 0) {
        await Promise.all(
          byePairings.map((p) =>
            tx.player.update({
              where: { id: p.player1Id },
              data: { score: { increment: 1 } },
            })
          )
        );
      }
    },
    {
      maxWait: 10000,
      timeout: 30000,
    }
  );

  revalidatePath(`/tournament/${tournamentId}`);
}

export async function updateMatchResult(
  tournamentId: string,
  matchId: string,
  player1Id: string,
  player2Id: string | null,
  result: "1-0" | "0-1" | "1/2-1/2" | null,
  previousResult: string | null
) {
  const operations: any[] = [];

  // Revert previous result scores if any
  if (previousResult) {
    if (previousResult === "1-0") {
      operations.push(prisma.player.update({ where: { id: player1Id }, data: { score: { decrement: 1 } } }));
    } else if (previousResult === "0-1" && player2Id) {
      operations.push(prisma.player.update({ where: { id: player2Id }, data: { score: { decrement: 1 } } }));
    } else if (previousResult === "1/2-1/2" && player2Id) {
      operations.push(prisma.player.update({ where: { id: player1Id }, data: { score: { decrement: 0.5 } } }));
      operations.push(prisma.player.update({ where: { id: player2Id }, data: { score: { decrement: 0.5 } } }));
    }
  }

  // Apply new result
  if (result) {
    if (result === "1-0") {
      operations.push(prisma.player.update({ where: { id: player1Id }, data: { score: { increment: 1 } } }));
    } else if (result === "0-1" && player2Id) {
      operations.push(prisma.player.update({ where: { id: player2Id }, data: { score: { increment: 1 } } }));
    } else if (result === "1/2-1/2" && player2Id) {
      operations.push(prisma.player.update({ where: { id: player1Id }, data: { score: { increment: 0.5 } } }));
      operations.push(prisma.player.update({ where: { id: player2Id }, data: { score: { increment: 0.5 } } }));
    }
  }

  operations.push(
    prisma.match.update({
      where: { id: matchId },
      data: { result },
    })
  );

  // Execute all score reverts/applies and match update in a single batch trip
  await prisma.$transaction(operations);

  // Recalculate tiebreakers
  await updateTiebreakers(tournamentId);
  revalidatePath(`/tournament/${tournamentId}`);
}

async function updateTiebreakers(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: true,
      rounds: {
        include: {
          matches: true,
        },
      },
    },
  });

  if (!tournament) return;

  // Precompute player scores map
  const scores = new Map(tournament.players.map((p) => [p.id, p.score]));

  const updateOperations = tournament.players.map((player) => {
    let buchholz = 0;
    let sonnebornBerger = 0;
    let cumulative = 0;
    let runningScore = 0;

    const sortedRounds = [...tournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);

    for (const round of sortedRounds) {
      let roundScoreIncrement = 0;
      for (const match of round.matches) {
        if (match.player1Id === player.id) {
          if (match.player2Id) {
            buchholz += scores.get(match.player2Id) || 0;
            if (match.result === "1-0") {
              sonnebornBerger += scores.get(match.player2Id) || 0;
              roundScoreIncrement = 1;
            } else if (match.result === "1/2-1/2") {
              sonnebornBerger += (scores.get(match.player2Id) || 0) / 2;
              roundScoreIncrement = 0.5;
            }
          } else {
            roundScoreIncrement = 1; // BYE
          }
        } else if (match.player2Id === player.id) {
          buchholz += scores.get(match.player1Id) || 0;
          if (match.result === "0-1") {
            sonnebornBerger += scores.get(match.player1Id) || 0;
            roundScoreIncrement = 1;
          } else if (match.result === "1/2-1/2") {
            sonnebornBerger += (scores.get(match.player1Id) || 0) / 2;
            roundScoreIncrement = 0.5;
          }
        }
      }
      runningScore += roundScoreIncrement;
      cumulative += runningScore;
    }

    return prisma.player.update({
      where: { id: player.id },
      data: { buchholz, sonnebornBerger, cumulative },
    });
  });

  // Execute all updates in a single transaction
  await prisma.$transaction(updateOperations);
}

export async function deleteTournament(tournamentId: string) {
  await prisma.tournament.delete({
    where: { id: tournamentId },
  });
  revalidatePath("/pairing");
  revalidatePath("/results");
}

export async function markTournamentCompleted(tournamentId: string) {
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "COMPLETED" },
  });
  revalidatePath(`/tournament/${tournamentId}`);
  revalidatePath("/pairing");
  revalidatePath("/results");
}

export async function addStudentsBulk(studentsData: { name: string, rating?: number, fatherName?: string, dob?: Date, phone?: string }[]) {
  const data = studentsData.map((p) => ({
    name: p.name,
    rating: p.rating || 1200,
    fatherName: p.fatherName || null,
    dob: p.dob || null,
    phone: p.phone || null,
  }));
  await prisma.student.createMany({
    data,
  });
  revalidatePath("/students");
  return await prisma.student.findMany({
    orderBy: { name: "asc" },
  });
}
