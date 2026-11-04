import type { Bootstrap, Student } from '../types'

/** Demo mode: placeholder students only (S1…S30). Never put real names here. */
export const DEMO_URL = 'demo'

const fake = (n: number, inactive: number[] = []): Student[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, no: i + 1, nick: `S${i + 1}`, active: !inactive.includes(i + 1) }))

export function demoBootstrap(): Bootstrap {
  const names = ['M.1/2', 'M.1/3', 'M.2/1', 'M.2/2', 'M.2/3', 'M.3/1', 'M.3/2', 'M.3/3']
  return {
    classes: names.map((name, i) => ({
      name,
      level: `M.${name[2]}` as Bootstrap['classes'][number]['level'],
      archived: false,
      defaultTeamSize: null,
      order: i,
    })),
    rosters: Object.fromEntries(names.map((n, i) => [n, fake(26 + (i % 5), i === 6 ? [5] : [])])),
    teamSets: [],
    sheetUrl: null,
    rosterIssues: [],
    // what a set typed into the Sheet's Questions tab looks like in Quiz Battle
    questions: (['M.1', 'M.2', 'M.3'] as const).map((level) => ({
      level,
      name: 'Demo set from the Sheet',
      questions: [
        { q: 'This set comes from the Questions tab in your Sheet. Which letter is the answer?', choices: ['A', 'B', 'C'], answer: 1, double: false },
        { q: 'Short answer: what is 2 + 3?', answer: 'five (5)', double: true },
      ],
    })),
    questionProblems: [{ row: 5, problem: 'Answer is empty' }],
  }
}
