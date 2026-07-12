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

  function backtrack(unpaired: Player[], pairings: Pairing[]): Pairing[] | null {
    if (unpaired.length === 0) return pairings;

    const p1 = unpaired[0];
    const rest = unpaired.slice(1);

    for (let i = 0; i < rest.length; i++) {
      const p2 = rest[i];
      if (!hasPlayed(p1.id, p2.id)) {
        const remainingUnpaired = [...rest.slice(0, i), ...rest.slice(i + 1)];
        const result = backtrack(remainingUnpaired, [...pairings, { player1Id: p1.id, player2Id: p2.id }]);
        if (result) return result;
      }
    }
    
    return null;
  }

  let finalPairings: Pairing[] | null = null;

  if (sortedPlayers.length % 2 !== 0) {
    // Odd number of players, someone gets a BYE.
    // Try to give BYE to the lowest ranked player who hasn't had one.
    for (let i = sortedPlayers.length - 1; i >= 0; i--) {
      const candidate = sortedPlayers[i];
      if (!hasReceivedBye(candidate.id)) {
        const remainingUnpaired = [...sortedPlayers.slice(0, i), ...sortedPlayers.slice(i + 1)];
        const result = backtrack(remainingUnpaired, [{ player1Id: candidate.id, player2Id: null }]);
        if (result) {
          finalPairings = result;
          break;
        }
      }
    }
    // If all candidates for BYE lead to failure, just pick the absolute lowest even if they had a BYE
    if (!finalPairings) {
      for (let i = sortedPlayers.length - 1; i >= 0; i--) {
        const candidate = sortedPlayers[i];
        const remainingUnpaired = [...sortedPlayers.slice(0, i), ...sortedPlayers.slice(i + 1)];
        const result = backtrack(remainingUnpaired, [{ player1Id: candidate.id, player2Id: null }]);
        if (result) {
          finalPairings = result;
          break;
        }
      }
    }
  } else {
    // Even number of players
    finalPairings = backtrack(sortedPlayers, []);
  }

  if (finalPairings) return finalPairings;

  // Fallback: Just pair greedily if backtracking fails (e.g. everyone has played everyone)
  const pairings: Pairing[] = [];
  const usedPlayerIds = new Set<string>();

  for (let i = 0; i < sortedPlayers.length; i++) {
    const p1 = sortedPlayers[i];
    if (usedPlayerIds.has(p1.id)) continue;

    let paired = false;

    // Look for an opponent they haven't played
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

    // If no opponent found, pair anyway
    if (!paired) {
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
            pairings.push({ player1Id: p1.id, player2Id: null });
            usedPlayerIds.add(p1.id);
        }
    }
  }

  return pairings;
}
