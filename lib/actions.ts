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
        orderBy: [{ score: "desc" }, { buchholz: "desc" }, { rating: "desc" }],
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

export async function addPlayer(tournamentId: string, name: string, rating: number) {
  await prisma.player.create({
    data: {
      name,
      rating,
      tournamentId,
    },
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
  await prisma.$transaction(async (tx) => {
    const round = await tx.round.create({
      data: {
        roundNumber: nextRoundNumber,
        tournamentId,
      },
    });

    for (const p of pairings) {
      await tx.match.create({
        data: {
          roundId: round.id,
          player1Id: p.player1Id,
          player2Id: p.player2Id,
          result: p.player2Id === null ? "1-0" : null, // BYE automatically wins
        },
      });

      // If BYE, add score to player 1 immediately
      if (p.player2Id === null) {
        await tx.player.update({
          where: { id: p.player1Id },
          data: {
            score: { increment: 1 },
          },
        });
      }
    }
  });

  revalidatePath(`/tournament/${tournamentId}`);
}

export async function updateMatchResult(
  matchId: string,
  player1Id: string,
  player2Id: string,
  result: "1-0" | "0-1" | "1/2-1/2" | null,
  previousResult: string | null
) {
  await prisma.$transaction(async (tx) => {
    // Revert previous result scores if any
    if (previousResult) {
      if (previousResult === "1-0") {
        await tx.player.update({ where: { id: player1Id }, data: { score: { decrement: 1 } } });
      } else if (previousResult === "0-1") {
        await tx.player.update({ where: { id: player2Id }, data: { score: { decrement: 1 } } });
      } else if (previousResult === "1/2-1/2") {
        await tx.player.update({ where: { id: player1Id }, data: { score: { decrement: 0.5 } } });
        await tx.player.update({ where: { id: player2Id }, data: { score: { decrement: 0.5 } } });
      }
    }

    // Apply new result
    if (result) {
      if (result === "1-0") {
        await tx.player.update({ where: { id: player1Id }, data: { score: { increment: 1 } } });
      } else if (result === "0-1") {
        await tx.player.update({ where: { id: player2Id }, data: { score: { increment: 1 } } });
      } else if (result === "1/2-1/2") {
        await tx.player.update({ where: { id: player1Id }, data: { score: { increment: 0.5 } } });
        await tx.player.update({ where: { id: player2Id }, data: { score: { increment: 0.5 } } });
      }
    }

    await tx.match.update({
      where: { id: matchId },
      data: { result },
    });
  });

  // Calculate Buchholz for all players after result updates
  // A simple way is to re-calculate it for everyone in the tournament
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { round: true } });
  if (match) {
    await updateBuchholz(match.round.tournamentId);
    revalidatePath(`/tournament/${match.round.tournamentId}`);
  }
}

async function updateBuchholz(tournamentId: string) {
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

  for (const player of tournament.players) {
    let buchholz = 0;
    // Find all opponents this player played against
    for (const round of tournament.rounds) {
      for (const match of round.matches) {
        if (match.player1Id === player.id && match.player2Id) {
          buchholz += scores.get(match.player2Id) || 0;
        } else if (match.player2Id === player.id) {
          buchholz += scores.get(match.player1Id) || 0;
        }
      }
    }

    await prisma.player.update({
      where: { id: player.id },
      data: { buchholz },
    });
  }
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
