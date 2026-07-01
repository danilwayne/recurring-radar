import type { ParseResult } from '../types/importTypes'
import { detectColumns } from './csvParser'

// SheetJS is loaded dynamically — not in the initial bundle.
// Only fetched when the user actually uploads an .xlsx file.

export async function parseXLSXContent(buffer: ArrayBuffer): Promise<ParseResult> {
    const XLSX = await import('xlsx')

    const workbook = XLSX.read(buffer, {
        type: 'array',
        cellDates: true,    // keep date cells as Date objects
        dateNF: 'yyyy-mm-dd',
    })

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
        return { headers: [], rows: [], columnMap: { name: null, price: null, category: null, seats: null, renew_date: null }, confidence: 'low' }
    }

    const sheet = workbook.Sheets[sheetName]

    // Get as array-of-arrays. raw: false converts numbers/dates to formatted strings.
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
        dateNF: 'yyyy-mm-dd',
    })

    if (matrix.length === 0) {
        return { headers: [], rows: [], columnMap: { name: null, price: null, category: null, seats: null, renew_date: null }, confidence: 'low' }
    }

    // First row → headers
    const headers = (matrix[0] as unknown[])
        .map(h => String(h ?? '').trim())
        .filter(Boolean)

    // Remaining rows → Record<string, string>[]
    const rows: Record<string, string>[] = []
    for (let i = 1; i < matrix.length; i++) {
        const row = matrix[i] as unknown[]
        const record: Record<string, string> = {}
        let hasContent = false
        headers.forEach((header, idx) => {
            const raw = row[idx]
            // Date objects (from cellDates: true) get formatted directly
            let val: string
            if (raw instanceof Date) {
                val = raw.toISOString().split('T')[0]
            } else {
                val = String(raw ?? '').trim()
            }
            record[header] = val
            if (val) hasContent = true
        })
        if (hasContent) rows.push(record)
    }

    const { columnMap, confidence } = detectColumns(headers)
    return { headers, rows, columnMap, confidence }
}
