export type Player = {
  id: string;
  name: string;
  rating: number;
  score: number;
  buchholz: number;
};

export type MatchHistory = {
  player1Id: string;
  player2Id: string | null; // null for BYE
};

export type Pairing = {
  player1Id: string;
  player2Id: string | null; // null for BYE
};

/**
 * Basic Swiss Pairing implementation.
 * 1. Sorts by score, then buchholz, then rating.
 * 2. Attempts to pair adjacent players.
 * 3. Skips players who have already played each other.
 * 4. Assigns a BYE to the lowest ranked player if odd number of players.
 */
export function generateSwissPairings(
  players: Player[],
  history: MatchHistory[]
): Pairing[] {
  // Sort players
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return b.rating - a.rating;
  });

  const pairings: Pairing[] = [];
  const usedPlayerIds = new Set<string>();

  const hasPlayed = (id1: string, id2: string) => {
    return history.some(
      (m) =>
        (m.player1Id === id1 && m.player2Id === id2) ||
        (m.player1Id === id2 && m.player2Id === id1)
    );
  };

  const hasReceivedBye = (id: string) => {
    return history.some((m) => m.player1Id === id && m.player2Id === null);
  };

  for (let i = 0; i < sortedPlayers.length; i++) {
    const p1 = sortedPlayers[i];
    if (usedPlayerIds.has(p1.id)) continue;

    let paired = false;

    // Look for an opponent
    for (let j = i + 1; j < sortedPlayers.length; j++) {
      const p2 = sortedPlayers[j];
      if (usedPlayerIds.has(p2.id)) continue;

      if (!hasPlayed(p1.id, p2.id)) {
        pairings.push({ player1Id: p1.id, player2Id: p2.id });
        usedPlayerIds.add(p1.id);
        usedPlayerIds.add(p2.id);
        paired = true;
        break;
      }
    }

    // If no opponent found, they get a BYE (if they haven't had one)
    if (!paired) {
      if (!hasReceivedBye(p1.id)) {
        pairings.push({ player1Id: p1.id, player2Id: null });
        usedPlayerIds.add(p1.id);
      } else {
        // Fallback: Just pair them with someone anyway if we are stuck (simplification)
        for (let j = i + 1; j < sortedPlayers.length; j++) {
            const p2 = sortedPlayers[j];
            if (usedPlayerIds.has(p2.id)) continue;
            pairings.push({ player1Id: p1.id, player2Id: p2.id });
            usedPlayerIds.add(p1.id);
            usedPlayerIds.add(p2.id);
            paired = true;
            break;
        }
        if (!paired) {
            // Only 1 player left, they MUST get a BYE even if they had one (rare)
            pairings.push({ player1Id: p1.id, player2Id: null });
            usedPlayerIds.add(p1.id);
        }
      }
    }
  }

  return pairings;
}
