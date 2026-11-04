/**
 * A tiny in-memory stand-in for Google Sheets, just enough for Code.gs's read/write helpers.
 * Lets the tests run real submitResults / saveTeamSet code without Google.
 */
type Cell = unknown

export class FakeSheet {
  rows: Cell[][]
  maxRows: number
  constructor(
    public name: string,
    headers: string[],
  ) {
    this.rows = [headers.slice()]
    this.maxRows = 1000
  }
  getLastRow() {
    for (let r = this.rows.length - 1; r >= 0; r--) if (this.rows[r].some((v) => v !== '' && v != null)) return r + 1
    return 0
  }
  getLastColumn() {
    return Math.max(0, ...this.rows.map((r) => r.length))
  }
  getMaxRows() {
    return this.maxRows
  }
  insertRowsAfter(_after: number, n: number) {
    this.maxRows += n
  }
  deleteRows(start: number, n: number) {
    this.rows.splice(start - 1, n)
  }
  getRange(row: number, col: number, nRows = 1, nCols = 1) {
    if (row + nRows - 1 > this.maxRows) throw new Error('Range out of bounds')
    return {
      getValues: () =>
        Array.from({ length: nRows }, (_, i) =>
          Array.from({ length: nCols }, (_, j) => this.rows[row - 1 + i]?.[col - 1 + j] ?? ''),
        ),
      setValues: (vals: Cell[][]) => {
        vals.forEach((line, i) => {
          const r = row - 1 + i
          while (this.rows.length <= r) this.rows.push([])
          line.forEach((v, j) => (this.rows[r][col - 1 + j] = v))
        })
      },
      setNumberFormat: () => undefined,
      setFontWeight: () => undefined,
      setDataValidation: () => undefined,
    }
  }
  /** Rows as objects keyed by header, for easy assertions. */
  objects() {
    const [h, ...rest] = this.rows
    return rest.map((r) => Object.fromEntries((h as string[]).map((k, i) => [k, r[i] ?? ''])))
  }
}

export function fakeGoogle(sheets: FakeSheet[], key = 'test-key') {
  const ss = {
    getSheetByName: (n: string) => sheets.find((s) => s.name === n) ?? null,
    getUrl: () => 'https://example.invalid/sheet',
    getSpreadsheetLocale: () => 'en_GB',
    getSpreadsheetTimeZone: () => 'Asia/Bangkok',
  }
  return {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => (k === 'KRU_KEY' ? key : null) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text: string) => ({ setMimeType: () => ({ text }) }),
    },
  }
}
