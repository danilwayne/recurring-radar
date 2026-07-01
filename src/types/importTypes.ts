export interface ColumnMap {
    name: string | null
    price: string | null
    category: string | null
    seats: string | null
    renew_date: string | null
}

export interface ParseResult {
    headers: string[]
    rows: Record<string, string>[]
    columnMap: ColumnMap
    confidence: 'high' | 'low'
}

export interface SubscriptionDraft {
    name: string
    price: number
    category: string
    seats: number
    last_used: null
    renew_date: string | null
    usage_score: number
    data_source: 'csv'
    _calibration_needed: boolean
    _is_duplicate: boolean
    _row_index: number
}

export interface InvalidRow {
    index: number
    rawData: Record<string, string>
    error: string
}
