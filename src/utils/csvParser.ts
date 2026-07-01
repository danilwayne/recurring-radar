import Papa from 'papaparse'
import { ColumnMap, ParseResult, SubscriptionDraft, InvalidRow } from '../types/importTypes'
import { guessCategory } from './categoryGuesser'

const VALID_CATEGORIES = ["Comunicação", "Design", "Produtividade", "CRM", "Desenvolvimento", "Analytics", "Suporte"]

// ── Column detection hints ────────────────────────────────────────────────────

const FIELD_HINTS: Record<keyof ColumnMap, string[]> = {
    name:       ['nome', 'name', 'ferramenta', 'tool', 'software', 'serviço', 'service',
                 'descrição', 'description', 'produto', 'product', 'aplicativo', 'app', 'sistema'],
    price:      ['valor', 'price', 'preço', 'custo', 'cost', 'amount', 'montante',
                 'mensalidade', 'monthly', 'mensal', 'fee', 'subscription', 'total'],
    category:   ['categoria', 'category', 'tipo', 'type', 'área', 'area',
                 'departamento', 'grupo', 'group', 'setor'],
    seats:      ['licenças', 'seats', 'usuários', 'users', 'assentos', 'quantidade',
                 'qty', 'licenses', 'count', 'total usuários', 'acessos'],
    renew_date: ['renovação', 'renewal', 'vencimento', 'data renovação', 'data',
                 'date', 'vence', 'expires', 'expira', 'próxima renovação', 'próximo'],
}

function scoreHeader(header: string, hints: string[]): number {
    const h = header.toLowerCase().trim()
    for (const hint of hints) {
        if (h === hint) return 2           // exact match
        if (h.includes(hint) || hint.includes(h)) return 1  // partial match
    }
    return 0
}

export function detectColumns(headers: string[]): { columnMap: ColumnMap; confidence: 'high' | 'low' } {
    const assigned = new Set<string>()
    const map: ColumnMap = { name: null, price: null, category: null, seats: null, renew_date: null }

    for (const field of ['name', 'price', 'category', 'seats', 'renew_date'] as (keyof ColumnMap)[]) {
        let bestHeader: string | null = null
        let bestScore = 0

        for (const header of headers) {
            if (assigned.has(header)) continue
            const score = scoreHeader(header, FIELD_HINTS[field])
            if (score > bestScore) {
                bestScore = score
                bestHeader = header
            }
        }

        if (bestScore > 0 && bestHeader) {
            map[field] = bestHeader
            assigned.add(bestHeader)
        }
    }

    const confidence: 'high' | 'low' = (map.name !== null && map.price !== null) ? 'high' : 'low'
    return { columnMap: map, confidence }
}

// ── Value parsers ─────────────────────────────────────────────────────────────

export function parsePrice(raw: string): number | null {
    const s = raw.replace(/[R$\s€£¥]/g, '').trim()
    if (!s) return null

    // Brazilian thousands + decimal: "1.200,50" or "1.200"
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
        const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
        return isNaN(n) || n < 0 ? null : n
    }

    // Comma as decimal separator: "299,90"
    if (/^\d+(,\d{1,2})$/.test(s)) {
        const n = parseFloat(s.replace(',', '.'))
        return isNaN(n) || n < 0 ? null : n
    }

    // Standard decimal or integer: "299.90" / "1200"
    const n = parseFloat(s.replace(/,/g, ''))
    return isNaN(n) || n < 0 ? null : n
}

function parseSeats(raw: string): number {
    const n = parseInt(raw?.trim() ?? '1')
    return isNaN(n) || n < 1 ? 1 : n
}

function parseRenewDate(raw: string): string | null {
    const s = raw?.trim()
    if (!s) return null
    // ISO: 2025-03-01
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // DD/MM/YYYY (Brazilian)
    const dmy = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/)
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
    return null
}

// ── CSV parse entry point ─────────────────────────────────────────────────────

export function parseCSVContent(content: string): ParseResult {
    const result = Papa.parse<Record<string, string>>(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
    })

    const headers = (result.meta.fields ?? []).filter(Boolean)
    const rows = (result.data as Record<string, string>[]).filter(row =>
        Object.values(row).some(v => v?.trim())
    )

    const { columnMap, confidence } = detectColumns(headers)
    return { headers, rows, columnMap, confidence }
}

// ── Build SubscriptionDraft[] from raw rows ───────────────────────────────────

export function buildDrafts(
    rows: Record<string, string>[],
    map: ColumnMap,
    existingNames: string[] = [],
): { valid: SubscriptionDraft[]; invalid: InvalidRow[] } {
    const valid: SubscriptionDraft[] = []
    const invalid: InvalidRow[] = []
    const existingLower = new Set(existingNames.map(n => n.toLowerCase().trim()))

    rows.forEach((row, i) => {
        const rawName = map.name ? row[map.name] : ''
        const rawPrice = map.price ? row[map.price] : ''

        const name = rawName?.trim()
        const price = parsePrice(rawPrice ?? '')

        if (!name) {
            invalid.push({ index: i, rawData: row, error: 'nome ausente' })
            return
        }
        if (price === null) {
            invalid.push({ index: i, rawData: row, error: 'preço inválido' })
            return
        }

        const rawCategory = map.category ? row[map.category]?.trim() : ''
        const guessed = rawCategory || guessCategory(name)
        const category = guessed && VALID_CATEGORIES.includes(guessed)
            ? guessed
            : (guessed ?? 'Outras')

        valid.push({
            name,
            price,
            category,
            seats: map.seats ? parseSeats(row[map.seats] ?? '') : 1,
            last_used: null,
            renew_date: map.renew_date ? parseRenewDate(row[map.renew_date] ?? '') : null,
            usage_score: 50,
            data_source: 'csv',
            _calibration_needed: true,
            _is_duplicate: existingLower.has(name.toLowerCase().trim()),
            _row_index: i,
        })
    })

    return { valid, invalid }
}
