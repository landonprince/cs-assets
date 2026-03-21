import { useState, useEffect, useRef, useCallback } from 'react'
import {
  STEAM_IMAGE_BASE, RARITY_COLORS, RARITY_ORDER, RARITY_LABELS,
  getRarity, stripWear,
} from './constants'

function historyKey(steamId) { return `csassets-history-${steamId}` }

function loadHistory(steamId) {
  try { return JSON.parse(localStorage.getItem(historyKey(steamId)) || '[]') } catch { return [] }
}

function saveSnapshot(steamId, steam, csfloat) {
  const history = loadHistory(steamId)
  const date = new Date().toISOString().slice(0, 10)
  const idx = history.findIndex(s => s.date === date)
  const entry = { date, steam, csfloat }
  if (idx >= 0) history[idx] = entry
  else history.push(entry)
  history.sort((a, b) => a.date.localeCompare(b.date))
  const trimmed = history.slice(-90)
  localStorage.setItem(historyKey(steamId), JSON.stringify(trimmed))
  return trimmed
}

// ── Line chart ─────────────────────────────────────────────────
function ValueLineChart({ data, color, gradId }) {
  const [tooltip, setTooltip] = useState(null)

  const W = 560, H = 150
  const PAD = { top: 12, right: 12, bottom: 26, left: 62 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const values = data.map(d => d.value)
  const minV   = Math.min(...values)
  const maxV   = Math.max(...values)
  const range  = maxV - minV || 1

  const toX = i => PAD.left + (i / Math.max(data.length - 1, 1)) * cW
  const toY = v => PAD.top + cH - ((v - minV) / range) * cH

  const points = data.map((d, i) => ({
    x: toX(i),
    y: toY(d.value),
    value: d.value,
    date: new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points.at(-1).x},${PAD.top + cH} L${points[0].x},${PAD.top + cH}Z`

  const yTicks = [0, 1, 2, 3].map(i => {
    const val = minV + (range * i) / 3
    return { val, y: toY(val) }
  })

  const xIdxs = data.length <= 5
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length * 0.25), Math.floor(data.length * 0.5), Math.floor(data.length * 0.75), data.length - 1]
  const xTicks = [...new Set(xIdxs)].map(i => ({ label: points[i].date, x: toX(i) }))

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const svgX = ((e.clientX - rect.left) / rect.width) * W
    const idx = Math.round(((svgX - PAD.left) / cW) * (data.length - 1))
    setTooltip(points[Math.max(0, Math.min(data.length - 1, idx))])
  }, [points, data.length, cW])

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="price-svg"
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map(({ y }, i) => (
          <line key={i} x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y}
            stroke="var(--border)" strokeDasharray="3 4" strokeWidth="1" />
        ))}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

        {yTicks.map(({ val, y }, i) => (
          <text key={i} x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text)">
            ${val.toFixed(2)}
          </text>
        ))}

        {xTicks.map(({ label, x }, i) => (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text)">
            {label}
          </text>
        ))}

        {tooltip && (
          <>
            <line x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + cH}
              stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
            <circle cx={tooltip.x} cy={tooltip.y} r="4"
              fill={color} stroke="var(--bg)" strokeWidth="2" />
          </>
        )}
      </svg>

      <div className={`chart-tooltip ${tooltip ? 'visible' : ''}`}>
        {tooltip && (
          <>
            <span className="tt-date">{tooltip.date}</span>
            <span className="tt-price" style={{ color }}>${tooltip.value.toFixed(2)}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────
export default function Dashboard({ items, steamPrices, csfloatPrices, steamId, profile, onNavigate }) {
  const [history, setHistory]   = useState(() => loadHistory(steamId))
  const snapshotSaved           = useRef(false)

  const pricesLoaded  = Object.keys(steamPrices).length > 0
  const totalSteam    = items.reduce((s, i) => s + (steamPrices[i.market_hash_name]   ?? 0), 0)
  const totalCsfloat  = items.reduce((s, i) => s + (csfloatPrices[i.market_hash_name] ?? 0), 0)

  // Save snapshot once prices are loaded
  useEffect(() => {
    if (!pricesLoaded || snapshotSaved.current || totalSteam === 0) return
    snapshotSaved.current = true
    const updated = saveSnapshot(steamId, totalSteam, totalCsfloat)
    setHistory(updated)
  }, [pricesLoaded, totalSteam, totalCsfloat, steamId])

  const topItems = [...items]
    .filter(i => steamPrices[i.market_hash_name] != null)
    .sort((a, b) => steamPrices[b.market_hash_name] - steamPrices[a.market_hash_name])
    .slice(0, 5)

  const rarityCounts = {}
  for (const item of items) {
    const r = getRarity(item)
    if (r) rarityCounts[r] = (rarityCounts[r] ?? 0) + 1
  }

  const steamHistory   = history.map(h => ({ date: h.date, value: h.steam }))
  const csfloatHistory = history.map(h => ({ date: h.date, value: h.csfloat }))

  return (
    <div className="dashboard">

      {/* ── Greeting ── */}
      <div className="dash-greeting">
        {profile?.avatar && <img src={profile.avatar} alt="avatar" className="dash-avatar" />}
        <div>
          <h2 className="dash-welcome">
            Welcome back{profile?.name ? `, ${profile.name}` : ''}
          </h2>
          <p className="dash-sub">Here's a snapshot of your CS2 portfolio.</p>
        </div>
      </div>

      {/* ── Key stats ── */}
      <div className="dash-stats">
        <div className="dash-stat">
          <span className="dash-stat-label">Total Items</span>
          <span className="dash-stat-value">{items.length.toLocaleString()}</span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">Steam Value</span>
          <span className="dash-stat-value">
            {pricesLoaded ? `$${totalSteam.toFixed(2)}` : <span className="dash-stat-loading">Loading…</span>}
          </span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">CSFloat Value</span>
          <span className="dash-stat-value">
            {pricesLoaded ? `$${totalCsfloat.toFixed(2)}` : <span className="dash-stat-loading">Loading…</span>}
          </span>
        </div>
        <div className="dash-stat">
          <span className="dash-stat-label">Unique Skins</span>
          <span className="dash-stat-value">
            {new Set(items.map(i => i.market_hash_name)).size.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Value charts ── */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h3 className="dash-section-title">Steam Portfolio Value</h3>
          {pricesLoaded && steamHistory.length > 0 && (
            <span className="dash-chart-current">${totalSteam.toFixed(2)}</span>
          )}
        </div>
        {steamHistory.length >= 2 ? (
          <ValueLineChart data={steamHistory} color="var(--accent)" gradId="dashSteamGrad" />
        ) : (
          <p className="dash-chart-empty">
            {pricesLoaded
              ? 'Come back tomorrow — your first data point has been saved.'
              : 'Loading prices…'}
          </p>
        )}
      </div>

      <div className="dash-section">
        <div className="dash-section-header">
          <h3 className="dash-section-title">CSFloat Portfolio Value</h3>
          {pricesLoaded && csfloatHistory.length > 0 && (
            <span className="dash-chart-current">${totalCsfloat.toFixed(2)}</span>
          )}
        </div>
        {csfloatHistory.length >= 2 ? (
          <ValueLineChart data={csfloatHistory} color="#0078D0" gradId="dashCsfloatGrad" />
        ) : (
          <p className="dash-chart-empty">
            {pricesLoaded
              ? 'Come back tomorrow — your first data point has been saved.'
              : 'Loading prices…'}
          </p>
        )}
      </div>

      <div className="dash-columns">
        {/* ── Top items ── */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h3 className="dash-section-title">Top Items by Value</h3>
            <button className="dash-section-link" onClick={() => onNavigate('inventory')}>
              View all →
            </button>
          </div>
          {pricesLoaded ? (
            <div className="dash-top-items">
              {topItems.map((item, idx) => {
                const rarity = getRarity(item)
                const color  = RARITY_COLORS[rarity] ?? '#6b6375'
                const price  = steamPrices[item.market_hash_name]
                return (
                  <div className="dash-top-item" key={item.assetid} style={{ '--rarity': color }}>
                    <span className="dash-top-rank">#{idx + 1}</span>
                    <img
                      src={`${STEAM_IMAGE_BASE}${item.icon_url}`}
                      alt={item.name}
                      className="dash-top-img"
                    />
                    <span className="dash-top-name">{stripWear(item.market_hash_name || item.name)}</span>
                    <span className="dash-top-price">${price.toFixed(2)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="dash-loading-msg">Loading prices…</p>
          )}
        </div>

        {/* ── Rarity breakdown ── */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h3 className="dash-section-title">Rarity Breakdown</h3>
          </div>
          <div className="dash-rarity">
            {RARITY_ORDER.filter(r => rarityCounts[r]).map(r => (
              <div className="dash-rarity-row" key={r}>
                <span className="dash-rarity-label" style={{ color: RARITY_COLORS[r] }}>
                  {RARITY_LABELS[r]}
                </span>
                <div className="dash-rarity-track">
                  <div
                    className="dash-rarity-fill"
                    style={{ width: `${(rarityCounts[r] / items.length) * 100}%`, background: RARITY_COLORS[r] }}
                  />
                </div>
                <span className="dash-rarity-count">{rarityCounts[r]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
