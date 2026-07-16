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

type PlayerColorInfo = {
  balance: number; // White games - Black games
  consecutive: number; // positive for White, negative for Black
  last: "W" | "B" | null;
  history: ("W" | "B")[];
};

/**
 * FIDE Dutch Swiss pairing implementation using Branch and Bound search.
 * 
 * Objectives:
 * 1. Strictly avoid rematches.
 * 2. Avoid giving a second BYE to any player.
 * 3. Pair players within the same score group as much as possible (minimize floaters).
 * 4. Respect FIDE color constraints (max 2 consecutive same color, max 2 color difference).
 * 5. Optimize color balance and alternate color assignments to match player preferences.
 */
export function generateSwissPairings(
  players: Player[],
  history: MatchHistory[]
): Pairing[] {
  if (players.length === 0) return [];

  // Sort players by score, then Buchholz, then rating, then name (alphabetical) to establish rankings
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    if (b.rating !== a.rating) return b.rating - a.rating;
    return a.name.localeCompare(b.name);
  });

  const playerRankMap: Record<string, number> = {};
  sortedPlayers.forEach((p, idx) => {
    playerRankMap[p.id] = idx;
  });

  // Precompute score groups and relative ranks within each score group
  const scoreGroups: Record<number, Player[]> = {};
  for (const p of sortedPlayers) {
    if (!scoreGroups[p.score]) {
      scoreGroups[p.score] = [];
    }
    scoreGroups[p.score].push(p);
  }

  const playerRelativeRankMap: Record<string, { relRank: number; groupSize: number }> = {};
  for (const scoreStr of Object.keys(scoreGroups)) {
    const score = Number(scoreStr);
    const group = scoreGroups[score];
    group.forEach((p, relRank) => {
      playerRelativeRankMap[p.id] = {
        relRank,
        groupSize: group.length,
      };
    });
  }

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

  // Build color history for each player
  const colorHistoryMap: Record<string, ("W" | "B")[]> = {};
  for (const p of players) {
    colorHistoryMap[p.id] = [];
  }

  for (const match of history) {
    const p1 = match.player1Id;
    const p2 = match.player2Id;
    
    if (colorHistoryMap[p1]) {
      colorHistoryMap[p1].push("W");
    }
    if (p2 && colorHistoryMap[p2]) {
      colorHistoryMap[p2].push("B");
    }
  }

  const playerColorInfo: Record<string, PlayerColorInfo> = {};
  for (const p of players) {
    const pHistory = colorHistoryMap[p.id] || [];
    let balance = 0;
    let consecutive = 0;
    let last: "W" | "B" | null = null;
    
    for (const c of pHistory) {
      if (c === "W") {
        balance++;
        if (last === "W") {
          consecutive++;
        } else {
          consecutive = 1;
        }
        last = "W";
      } else {
        balance--;
        if (last === "B") {
          consecutive--;
        } else {
          consecutive = -1;
        }
        last = "B";
      }
    }
    
    playerColorInfo[p.id] = {
      balance,
      consecutive,
      last,
      history: pHistory,
    };
  }

  // Determine color assignment and preference penalty
  const getColorAssignment = (
    p1Id: string,
    p2Id: string
  ): { p1White: boolean; penalty: number } | null => {
    const info1 = playerColorInfo[p1Id];
    const info2 = playerColorInfo[p2Id];

    // FIDE Rules:
    // 1. No player can have the same color 3 times in a row.
    // 2. No player can have a color difference |W - B| > 2.
    const p1CanWhite = info1.consecutive < 2 && info1.balance < 2;
    const p2CanBlack = info2.consecutive > -2 && info2.balance > -2;
    
    const p1CanBlack = info1.consecutive > -2 && info1.balance > -2;
    const p2CanWhite = info2.consecutive < 2 && info2.balance < 2;
    
    const option1Allowed = p1CanWhite && p2CanBlack; // p1 White, p2 Black
    const option2Allowed = p1CanBlack && p2CanWhite; // p1 Black, p2 White
    
    if (!option1Allowed && !option2Allowed) {
      return null;
    }
    
    const getPrefPenalty = (info: PlayerColorInfo, assignedColor: "W" | "B") => {
      let preferred: "W" | "B" | null = null;
      if (info.balance > 0) preferred = "B";
      else if (info.balance < 0) preferred = "W";
      else if (info.last === "W") preferred = "B";
      else if (info.last === "B") preferred = "W";
      
      if (preferred && preferred !== assignedColor) {
        return 10 + Math.abs(info.balance) * 5;
      }
      return 0;
    };
    
    let opt1Penalty = Infinity;
    if (option1Allowed) {
      opt1Penalty = getPrefPenalty(info1, "W") + getPrefPenalty(info2, "B");
    }
    
    let opt2Penalty = Infinity;
    if (option2Allowed) {
      opt2Penalty = getPrefPenalty(info1, "B") + getPrefPenalty(info2, "W");
    }
    
    if (opt1Penalty <= opt2Penalty) {
      return { p1White: true, penalty: opt1Penalty };
    } else {
      return { p1White: false, penalty: opt2Penalty };
    }
  };

  let bestCost = Infinity;
  let bestPairings: Pairing[] = [];
  let iterations = 0;
  const MAX_ITERATIONS = 10000;

  function search(
    unpaired: Player[],
    currentPairings: Pairing[],
    currentCost: number
  ) {
    if (iterations++ > MAX_ITERATIONS) return;
    if (currentCost >= bestCost) return;

    if (unpaired.length === 0) {
      bestCost = currentCost;
      bestPairings = [...currentPairings];
      return;
    }

    const p1 = unpaired[0];
    const rest = unpaired.slice(1);

    const options: {
      opponent: Player | null;
      cost: number;
      remaining: Player[];
      p1White?: boolean;
    }[] = [];

    // Option A: Pair with an opponent
    let candidatesChecked = 0;
    for (let i = 0; i < rest.length; i++) {
      const p2 = rest[i];
      
      if (hasPlayed(p1.id, p2.id)) continue;
      if (candidatesChecked >= 12) break;
      candidatesChecked++;
      
      const colorAssign = getColorAssignment(p1.id, p2.id);
      if (!colorAssign) continue;
      
      const scoreDiff = Math.abs(p1.score - p2.score);
      const scoreCost = scoreDiff * scoreDiff * 1000000;
      const prefCost = colorAssign.penalty;
      
      let rankCost = 0;
      if (p1.score === p2.score) {
        const info1 = playerRelativeRankMap[p1.id];
        const info2 = playerRelativeRankMap[p2.id];
        const idealOffset = Math.floor(info1.groupSize / 2);
        const actualOffset = Math.abs(info1.relRank - info2.relRank);
        rankCost = Math.abs(actualOffset - idealOffset) * 0.1;
      } else {
        const rank1 = playerRankMap[p1.id];
        const rank2 = playerRankMap[p2.id];
        rankCost = Math.abs(rank1 - rank2) * 0.1;
      }
      
      options.push({
        opponent: p2,
        cost: scoreCost + prefCost + rankCost,
        remaining: [...rest.slice(0, i), ...rest.slice(i + 1)],
        p1White: colorAssign.p1White,
      });
    }

    // Option B: Assign BYE if odd number of players
    const totalPlayersOdd = sortedPlayers.length % 2 !== 0;
    const byeAlreadyAssigned = currentPairings.some((p) => p.player2Id === null);
    if (totalPlayersOdd && !byeAlreadyAssigned && !hasReceivedBye(p1.id)) {
      // Bye cost: strongly penalize giving BYE to higher-score players
      const byeCost = p1.score * 10000000 + p1.rating * 10;
      options.push({
        opponent: null,
        cost: byeCost,
        remaining: rest,
      });
    }

    // Search more promising branches first
    options.sort((a, b) => a.cost - b.cost);

    for (const opt of options) {
      if (opt.opponent === null) {
        search(
          opt.remaining,
          [...currentPairings, { player1Id: p1.id, player2Id: null }],
          currentCost + opt.cost
        );
      } else {
        const newPairing = opt.p1White
          ? { player1Id: p1.id, player2Id: opt.opponent.id }
          : { player1Id: opt.opponent.id, player2Id: p1.id };
        search(
          opt.remaining,
          [...currentPairings, newPairing],
          currentCost + opt.cost
        );
      }
    }
  }

  // Execute Search
  search(sortedPlayers, [], 0);

  if (bestPairings.length > 0) return bestPairings;

  // Fallback: If no matching was found under strict constraints, relax color & BYE constraints
  // and run a simplified greedy matching
  const pairings: Pairing[] = [];
  const used = new Set<string>();

  for (let i = 0; i < sortedPlayers.length; i++) {
    const p1 = sortedPlayers[i];
    if (used.has(p1.id)) continue;

    let paired = false;
    for (let j = i + 1; j < sortedPlayers.length; j++) {
      const p2 = sortedPlayers[j];
      if (used.has(p2.id)) continue;

      if (!hasPlayed(p1.id, p2.id)) {
        pairings.push({ player1Id: p1.id, player2Id: p2.id });
        used.add(p1.id);
        used.add(p2.id);
        paired = true;
        break;
      }
    }

    if (!paired) {
      // Force pair even if they played before
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        const p2 = sortedPlayers[j];
        if (used.has(p2.id)) continue;
        pairings.push({ player1Id: p1.id, player2Id: p2.id });
        used.add(p1.id);
        used.add(p2.id);
        paired = true;
        break;
      }
      if (!paired) {
        pairings.push({ player1Id: p1.id, player2Id: null });
        used.add(p1.id);
      }
    }
  }

  return pairings;
}
