import { useState, useRef, useCallback } from 'react'
import { parseCSVContent, buildDrafts } from '../utils/csvParser'
import { parseXLSXContent } from '../utils/xlsxParser'
import { ColumnMap, SubscriptionDraft, InvalidRow } from '../types/importTypes'
import { Subscription } from '../hooks/useSubscriptions'

// ── Constants ─────────────────────────────────────────────────────────────────

const USAGE_LEVELS = [
    { label: 'Nunca',     short: '0%',   value: 0 },
    { label: 'Pouco',     short: '25%',  value: 25 },
    { label: 'Médio',     short: '50%',  value: 50 },
    { label: 'Muito',     short: '75%',  value: 75 },
    { label: 'Essencial', short: '100%', value: 100 },
]

const FIELD_OPTIONS = [
    { value: 'name',       label: 'Nome da ferramenta' },
    { value: 'price',      label: 'Valor mensal (R$)' },
    { value: 'category',   label: 'Categoria' },
    { value: 'seats',      label: 'Nº de licenças' },
    { value: 'renew_date', label: 'Data de renovação' },
    { value: 'ignore',     label: 'Ignorar coluna' },
]

const FONT = "'DM Mono', monospace"
const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type Step = 'upload' | 'mapping' | 'calibrating' | 'importing'

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    subs: Subscription[]
    batchAddSubscriptions: (list: Omit<Subscription, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]) => Promise<void>
    setPage: (p: string) => void
    isMobile: boolean
    planLimit: number
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ImportWizard({ subs, batchAddSubscriptions, setPage, isMobile, planLimit }: Props) {
    const [step, setStep] = useState<Step>('upload')
    const [isDragging, setIsDragging] = useState(false)
    const [fileName, setFileName] = useState('')

    // Raw parse state
    const [headers, setHeaders] = useState<string[]>([])
    const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
    const [headerToField, setHeaderToField] = useState<Record<string, string>>({})

    // Processed drafts
    const [drafts, setDrafts] = useState<SubscriptionDraft[]>([])
    const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([])
    const [showInvalid, setShowInvalid] = useState(false)

    // Calibration: draftIdx → usage_score
    const [calibration, setCalibration] = useState<Record<number, number>>({})

    // Import
    const [importError, setImportError] = useState<string | null>(null)
    const [skippedMapping, setSkippedMapping] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getUsage = (idx: number) => calibration[idx] ?? 50
    const setUsage = (idx: number, value: number) =>
        setCalibration(prev => ({ ...prev, [idx]: value }))

    const totalMonthly = drafts.reduce((a, d) => a + d.price, 0)
    const duplicateCount = drafts.filter(d => d._is_duplicate).length

    // Derive ColumnMap from headerToField state
    const deriveColumnMap = useCallback((): ColumnMap => {
        const map: ColumnMap = { name: null, price: null, category: null, seats: null, renew_date: null }
        for (const [header, field] of Object.entries(headerToField)) {
            if (field === 'name' || field === 'price' || field === 'category' || field === 'seats' || field === 'renew_date') {
                map[field] = header
            }
        }
        return map
    }, [headerToField])

    // ── File processing ───────────────────────────────────────────────────────

    const processFile = useCallback((file: File) => {
        const isXLSX = /\.xlsx?$/i.test(file.name)
        const isCSV  = /\.(csv|txt)$/i.test(file.name)
        if (!isXLSX && !isCSV) {
            alert('Por favor, selecione um arquivo .xlsx ou .csv')
            return
        }
        setFileName(file.name)
        const reader = new FileReader()

        const applyParsed = (parsed: ReturnType<typeof parseCSVContent>) => {
            setHeaders(parsed.headers)
            setRawRows(parsed.rows)

            const h2f: Record<string, string> = {}
            for (const [field, header] of Object.entries(parsed.columnMap)) {
                if (header) h2f[header] = field
            }
            setHeaderToField(h2f)

            const { valid, invalid } = buildDrafts(
                parsed.rows,
                parsed.columnMap,
                subs.map(s => s.name),
            )
            setDrafts(valid)
            setInvalidRows(invalid)
            setCalibration({})

            if (parsed.confidence === 'high') {
                setSkippedMapping(true)
                setStep('calibrating')
            } else {
                setSkippedMapping(false)
                setStep('mapping')
            }
        }

        if (isXLSX) {
            reader.onload = async e => {
                const buffer = e.target?.result as ArrayBuffer
                if (!buffer) return
                const parsed = await parseXLSXContent(buffer)
                applyParsed(parsed)
            }
            reader.readAsArrayBuffer(file)
        } else {
            reader.onload = e => {
                const content = e.target?.result as string
                if (!content) return
                applyParsed(parseCSVContent(content))
            }
            reader.readAsText(file, 'utf-8')
        }
    }, [subs])

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) processFile(file)
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) processFile(file)
        e.target.value = ''
    }

    // ── Mapping step handlers ─────────────────────────────────────────────────

    const handleColumnAssign = (header: string, field: string) => {
        setHeaderToField(prev => {
            const next = { ...prev }
            // Remove exclusive field from any other header first
            if (field !== 'ignore') {
                for (const h of Object.keys(next)) {
                    if (next[h] === field && h !== header) next[h] = 'ignore'
                }
            }
            next[header] = field
            return next
        })
    }

    const handleMappingContinue = () => {
        const map = deriveColumnMap()
        if (!map.name || !map.price) {
            alert('Mapeie ao menos "Nome da ferramenta" e "Valor mensal" para continuar.')
            return
        }
        const { valid, invalid } = buildDrafts(rawRows, map, subs.map(s => s.name))
        setDrafts(valid)
        setInvalidRows(invalid)
        setCalibration({})
        setStep('calibrating')
    }

    // ── Import ────────────────────────────────────────────────────────────────

    const handleImport = async () => {
        setStep('importing')
        setImportError(null)
        try {
            const allowed = Math.min(drafts.length, isFinite(planLimit) ? planLimit : drafts.length)
            const payload = drafts.slice(0, allowed).map((d, idx) => ({
                name: d.name,
                category: d.category,
                price: d.price,
                currency: 'BRL' as const,
                billing_cycle: 'mensal',
                seats: d.seats,
                last_used: null,
                logo_url: null,
                status: 'ativo',
                usage_score: getUsage(idx),
                renew_date: d.renew_date,
                data_source: 'csv' as const,
            }))
            await batchAddSubscriptions(payload)
            setPage('radar')
        } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Erro ao importar assinaturas.')
            setStep('calibrating')
        }
    }

    // ── Shared styles ─────────────────────────────────────────────────────────

    const inputSt: React.CSSProperties = {
        width: '100%', padding: '9px 12px', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
        color: '#f1f5f9', fontFamily: FONT, fontSize: 12,
        outline: 'none', boxSizing: 'border-box',
    }

    const pad = isMobile ? '20px 16px' : '32px 36px'

    // ── Step indicator ────────────────────────────────────────────────────────

    const stepDots = ['upload', 'calibrating'].map((s, _i) => (
        <div key={s} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: (step === 'mapping' && s === 'upload') || step === s
                ? '#6366f1' : 'rgba(255,255,255,0.15)',
            transition: 'background 0.2s',
        }} />
    ))

    // ── Summary bar (shown in calibrating when confidence was high) ───────────

    const SummaryBar = () => {
        if (drafts.length === 0 && invalidRows.length === 0) return null
        return (
            <div style={{
                display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                marginBottom: 20, fontFamily: FONT, fontSize: 11,
            }}>
                <span style={{ color: '#34d399' }}>✓ {drafts.length} linha{drafts.length !== 1 ? 's' : ''} válida{drafts.length !== 1 ? 's' : ''}</span>
                {invalidRows.length > 0 && (
                    <button onClick={() => setShowInvalid(p => !p)} style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: '#f87171', fontFamily: FONT, fontSize: 11,
                        textDecoration: 'underline',
                    }}>
                        ✕ {invalidRows.length} ignorada{invalidRows.length !== 1 ? 's' : ''} (nome ou preço ausente)
                    </button>
                )}
                {duplicateCount > 0 && (
                    <span style={{ color: '#fbbf24' }}>
                        ⚠ {duplicateCount} possível{duplicateCount !== 1 ? 'is' : ''} duplicata{duplicateCount !== 1 ? 's' : ''}
                    </span>
                )}
                {showInvalid && invalidRows.length > 0 && (
                    <div style={{ width: '100%', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {invalidRows.slice(0, 5).map(r => (
                            <div key={r.index} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginBottom: 2 }}>
                                Linha {r.index + 2}: {r.error}
                            </div>
                        ))}
                        {invalidRows.length > 5 && <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>...e mais {invalidRows.length - 5}</div>}
                    </div>
                )}
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: UPLOAD
    // ─────────────────────────────────────────────────────────────────────────

    if (step === 'upload') return (
        <div style={{ padding: pad, maxWidth: 640 }}>
            <div style={{ marginBottom: 28 }}>
                <button onClick={() => setPage('subscriptions')} style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                    fontFamily: FONT, fontSize: 11, cursor: 'pointer', padding: 0, marginBottom: 16,
                }}>← Assinaturas</button>
                <div style={{ fontSize: 11, color: '#818cf8', fontFamily: FONT, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
                    Importação
                </div>
                <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: '#f1f5f9', fontFamily: FONT, margin: 0 }}>
                    Importar planilha
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT, fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
                    Importe suas assinaturas do Excel ou de um CSV. O Radar analisa tudo automaticamente.
                </p>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragging ? '#6366f1' : 'rgba(255,255,255,0.12)'}`,
                    borderRadius: 16,
                    padding: isMobile ? '40px 20px' : '56px 40px',
                    textAlign: 'center',
                    background: isDragging ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
            >
                <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', fontFamily: FONT, marginBottom: 6 }}>
                    {isDragging ? 'Solte o arquivo aqui' : 'Arraste uma planilha aqui'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: FONT, marginBottom: 20 }}>
                    ou clique para selecionar · .xlsx e .csv
                </div>
                <div style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    borderRadius: 9, color: '#fff', padding: '10px 22px',
                    fontFamily: FONT, fontSize: 13, fontWeight: 700,
                    pointerEvents: 'none',
                }}>
                    Selecionar arquivo
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    style={{ display: 'none' }}
                    onChange={handleFileInput}
                />
            </div>

            {/* Template + hint */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a
                    href="/modelo-importacao.csv"
                    download
                    style={{ color: '#818cf8', fontFamily: FONT, fontSize: 11, textDecoration: 'none' }}
                >
                    Baixar modelo CSV →
                </a>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: FONT, lineHeight: 1.6 }}>
                    Colunas detectadas automaticamente: Nome, Valor, Categoria, Licenças, Data de renovação.<br />
                    Formatos: .xlsx (Excel), .csv com vírgula ou ponto-e-vírgula, valores em R$ ou números.
                </div>
            </div>
        </div>
    )

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: MAPPING
    // ─────────────────────────────────────────────────────────────────────────

    if (step === 'mapping') {
        const previewRows = rawRows.slice(0, 3)
        const mapVal = deriveColumnMap()
        const nameOk = !!mapVal.name
        const priceOk = !!mapVal.price

        return (
            <div style={{ padding: pad, maxWidth: 720 }}>
                <div style={{ marginBottom: 24 }}>
                    <button onClick={() => setStep('upload')} style={{
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                        fontFamily: FONT, fontSize: 11, cursor: 'pointer', padding: 0, marginBottom: 16,
                    }}>← Voltar</button>
                    <div style={{ fontSize: 11, color: '#818cf8', fontFamily: FONT, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
                        Passo 1 de 2
                    </div>
                    <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#f1f5f9', fontFamily: FONT, margin: 0 }}>
                        Confirmar colunas
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT, fontSize: 12, marginTop: 6 }}>
                        {fileName} · {rawRows.length} linha{rawRows.length !== 1 ? 's' : ''} encontrada{rawRows.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <SummaryBar />

                {/* Column mapping */}
                <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Coluna no CSV', 'Campo do Radar'].map(h => (
                            <div key={h} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: FONT, letterSpacing: 1, textTransform: 'uppercase' }}>{h}</div>
                        ))}
                    </div>
                    {headers.map(header => (
                        <div key={header} style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr',
                            padding: '12px 16px', alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <div style={{ fontSize: 12, color: '#f1f5f9', fontFamily: FONT }}>{header}</div>
                            <select
                                value={headerToField[header] ?? 'ignore'}
                                onChange={e => handleColumnAssign(header, e.target.value)}
                                style={inputSt}
                            >
                                {FIELD_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>

                {/* Validation hint */}
                {(!nameOk || !priceOk) && (
                    <div style={{
                        fontSize: 11, color: '#fbbf24', fontFamily: FONT,
                        background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                    }}>
                        {!nameOk && !priceOk
                            ? 'Mapeie "Nome da ferramenta" e "Valor mensal" para continuar.'
                            : !nameOk
                                ? 'Mapeie a coluna "Nome da ferramenta" para continuar.'
                                : 'Mapeie a coluna "Valor mensal" para continuar.'}
                    </div>
                )}

                {/* Preview */}
                {previewRows.length > 0 && mapVal.name && (
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: FONT, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                            Prévia (primeiras {previewRows.length} linhas)
                        </div>
                        <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                            {previewRows.map((row, i) => (
                                <div key={i} style={{
                                    padding: '10px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)',
                                    fontFamily: FONT, borderBottom: i < previewRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                    display: 'flex', gap: 16, flexWrap: 'wrap',
                                }}>
                                    {mapVal.name && <span style={{ color: '#f1f5f9' }}>{row[mapVal.name]}</span>}
                                    {mapVal.price && <span>{row[mapVal.price]}</span>}
                                    {mapVal.category && <span>{row[mapVal.category]}</span>}
                                    {mapVal.seats && <span>{row[mapVal.seats]} usuários</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    onClick={handleMappingContinue}
                    disabled={!nameOk || !priceOk}
                    style={{
                        background: (!nameOk || !priceOk) ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        border: 'none', borderRadius: 10, color: '#fff',
                        padding: '13px 24px', cursor: (!nameOk || !priceOk) ? 'not-allowed' : 'pointer',
                        fontFamily: FONT, fontSize: 14, fontWeight: 700,
                        opacity: (!nameOk || !priceOk) ? 0.6 : 1,
                    }}
                >
                    Continuar →
                </button>
            </div>
        )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER: CALIBRATING
    // ─────────────────────────────────────────────────────────────────────────

    if (step === 'calibrating' || step === 'importing') {
        const isImporting = step === 'importing'

        return (
            <div style={{ padding: pad, maxWidth: 860, position: 'relative' }}>

                {/* Importing overlay */}
                {isImporting && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(8,8,15,0.92)',
                        zIndex: 200, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', gap: 16,
                    }}>
                        <div style={{ fontSize: 32 }}>◈</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', fontFamily: FONT }}>
                            {(() => {
                                const n = Math.min(drafts.length, isFinite(planLimit) ? planLimit : drafts.length)
                                return `Analisando ${n} assinatura${n !== 1 ? 's' : ''}...`
                            })()}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: FONT }}>
                            O Radar estará pronto em segundos.
                        </div>
                    </div>
                )}

                {/* Header */}
                <div style={{ marginBottom: 24 }}>
                    <button onClick={() => setStep(skippedMapping ? 'upload' : 'mapping')} style={{
                        background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                        fontFamily: FONT, fontSize: 11, cursor: 'pointer', padding: 0, marginBottom: 16,
                    }}>← Voltar</button>
                    <div style={{ fontSize: 11, color: '#818cf8', fontFamily: FONT, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
                        Passo 2 de 2
                    </div>
                    <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#f1f5f9', fontFamily: FONT, margin: 0 }}>
                        Qual o uso real de cada ferramenta?
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT, fontSize: 12, marginTop: 6 }}>
                        {drafts.length} assinatura{drafts.length !== 1 ? 's' : ''} · {fmt(totalMonthly)}/mês identificado{drafts.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <SummaryBar />

                {isFinite(planLimit) && planLimit < drafts.length && (
                    <div style={{
                        fontSize: 12, color: '#fbbf24', fontFamily: FONT,
                        background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                    }}>
                        Seu plano Free permite adicionar mais {planLimit} ferramenta{planLimit !== 1 ? 's' : ''}.
                        {' '}Apenas as primeiras {planLimit} serão importadas.
                        {' '}<span style={{ opacity: 0.6 }}>Ative o Pro para importar tudo.</span>
                    </div>
                )}

                {importError && (
                    <div style={{
                        fontSize: 12, color: '#f87171', fontFamily: FONT,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                    }}>
                        {importError}
                    </div>
                )}

                {/* Calibration table — Desktop */}
                {!isMobile && (
                    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
                        <div style={{
                            display: 'grid', gridTemplateColumns: '2fr 100px 1fr',
                            padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            {['Ferramenta', 'Valor/mês', 'Uso nos últimos 30 dias'].map(h => (
                                <div key={h} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: FONT, letterSpacing: 1, textTransform: 'uppercase' }}>{h}</div>
                            ))}
                        </div>
                        {drafts.map((d, idx) => (
                            <div key={idx} style={{
                                display: 'grid', gridTemplateColumns: '2fr 100px 1fr',
                                padding: '12px 16px', alignItems: 'center',
                                borderBottom: idx < drafts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                                background: d._is_duplicate ? 'rgba(251,191,36,0.04)' : 'transparent',
                            }}>
                                <div>
                                    <div style={{ fontSize: 13, color: '#f1f5f9', fontFamily: FONT, fontWeight: 600 }}>
                                        {d.name}
                                        {d._is_duplicate && (
                                            <span style={{ marginLeft: 8, fontSize: 9, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '2px 6px', borderRadius: 4, fontFamily: FONT }}>
                                                JÁ EXISTE
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: FONT }}>{d.category}</div>
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', fontFamily: FONT }}>
                                    {fmt(d.price)}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {USAGE_LEVELS.map(u => (
                                        <button key={u.value} type="button" onClick={() => setUsage(idx, u.value)} style={{
                                            flex: 1, padding: '7px 2px', fontSize: 10,
                                            border: getUsage(idx) === u.value
                                                ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.07)',
                                            background: getUsage(idx) === u.value
                                                ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.02)',
                                            color: getUsage(idx) === u.value ? '#818cf8' : 'rgba(255,255,255,0.3)',
                                            borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
                                            transition: 'all 0.1s',
                                        }}>
                                            {u.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Calibration table — Mobile (card layout) */}
                {isMobile && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                        {drafts.map((d, idx) => (
                            <div key={idx} style={{
                                background: '#111118', border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: 12, padding: '14px 16px',
                                borderLeft: d._is_duplicate ? '3px solid #fbbf24' : '3px solid rgba(255,255,255,0.07)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', fontFamily: FONT }}>{d.name}</div>
                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: FONT }}>{d.category}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', fontFamily: FONT }}>{fmt(d.price)}</div>
                                        {d._is_duplicate && (
                                            <span style={{ fontSize: 9, color: '#fbbf24', fontFamily: FONT }}>já existe</span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    {USAGE_LEVELS.map(u => (
                                        <button key={u.value} type="button" onClick={() => setUsage(idx, u.value)} style={{
                                            flex: 1, padding: '8px 2px', fontSize: 9,
                                            border: getUsage(idx) === u.value
                                                ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.07)',
                                            background: getUsage(idx) === u.value
                                                ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.02)',
                                            color: getUsage(idx) === u.value ? '#818cf8' : 'rgba(255,255,255,0.3)',
                                            borderRadius: 6, cursor: 'pointer', fontFamily: FONT,
                                        }}>
                                            {u.short}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step dots + CTA */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {stepDots}
                    </div>
                    <button onClick={handleImport} disabled={drafts.length === 0} style={{
                        background: drafts.length === 0 ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        border: 'none', borderRadius: 10, color: '#fff',
                        padding: isMobile ? '12px 20px' : '13px 28px',
                        cursor: drafts.length === 0 ? 'not-allowed' : 'pointer',
                        fontFamily: FONT, fontSize: isMobile ? 13 : 14, fontWeight: 700,
                        opacity: drafts.length === 0 ? 0.5 : 1,
                    }}>
                        {(() => {
                            const n = Math.min(drafts.length, isFinite(planLimit) ? planLimit : drafts.length)
                            return `Analisar ${n} assinatura${n !== 1 ? 's' : ''} →`
                        })()}
                    </button>
                </div>
            </div>
        )
    }

    return null
}
