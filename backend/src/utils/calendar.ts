/**
 * CALENDAR GENERATOR
 * Berger round-robin: proper home/away distribution
 * Each team plays every other team once home and once away.
 */

import type { Fixture } from '../../shared/types/index';

export function generateCalendar(clubIds: string[]): Fixture[][] {
  const ids = [...clubIds];
  if (ids.length % 2 !== 0) ids.push('BYE'); // bye week if odd

  const n    = ids.length;
  const half = n / 2;
  const fixed   = ids[0];
  const rotating = ids.slice(1);

  const idaRounds: Fixture[][] = [];

  for (let r = 0; r < n - 1; r++) {
    const circle = [fixed, ...rotating];
    const round: Fixture[] = [];

    for (let i = 0; i < half; i++) {
      const a = circle[i];
      const b = circle[n - 1 - i];
      if (a === 'BYE' || b === 'BYE') continue;

      // Alternate home/away each round for balance
      const [local, visitante] = r % 2 === 0 ? [a, b] : [b, a];
      round.push({
        jornada: r + 1,
        localId: local,
        visitanteId: visitante,
        jugado: false,
      });
    }

    idaRounds.push(round);
    rotating.push(rotating.shift()!);
  }

  // Vuelta: invert home/away
  const vueltaRounds: Fixture[][] = idaRounds.map((round, r) =>
    round.map(f => ({
      jornada: idaRounds.length + r + 1,
      localId: f.visitanteId,
      visitanteId: f.localId,
      jugado: false,
    }))
  );

  return [...idaRounds, ...vueltaRounds];
}

export function getMyFixture(
  calendar: Fixture[][],
  jornada: number,
  myClubId: string
): Fixture | undefined {
  const roundIdx = jornada - 1;
  if (roundIdx < 0 || roundIdx >= calendar.length) return undefined;
  return calendar[roundIdx].find(
    f => f.localId === myClubId || f.visitanteId === myClubId
  );
}

export function getRivalId(fixture: Fixture, myClubId: string): string {
  return fixture.localId === myClubId ? fixture.visitanteId : fixture.localId;
}

export function isHome(fixture: Fixture, myClubId: string): boolean {
  return fixture.localId === myClubId;
}
