import { useState } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'

const ORDERS_KEY = 'pieriot-orders'
const DISMISSED_KEY = 'pieriot-rating-dismissed'
const DELIVERY_WINDOW_MS = 24 * 60 * 60 * 1000
const HIDDEN_PATHS = ['/poll', '/checkout', '/success/*']

function readList(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export default function DeliveredRatingPrompt() {
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState(() => readList(DISMISSED_KEY))

  if (HIDDEN_PATHS.some((path) => matchPath(path, pathname))) return null

  const now = Date.now()
  const order = readList(ORDERS_KEY)
    .filter(
      (entry) =>
        entry?.orderId &&
        !entry.ratedAt &&
        !dismissed.includes(entry.orderId) &&
        now - Date.parse(entry.placedAt) >= DELIVERY_WINDOW_MS,
    )
    .sort((a, b) => Date.parse(b.placedAt) - Date.parse(a.placedAt))[0]

  if (!order) return null

  const dismiss = () => {
    const next = [...dismissed, order.orderId]
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
    setDismissed(next)
  }

  return (
    <aside className="rate-prompt" aria-label="Rate your delivered order">
      <p className="rate-prompt__text">
        Your pies from order <strong>{order.orderId}</strong> should have landed. How did the
        crust, filling and cold packs hold up?
      </p>
      <div className="rate-prompt__actions">
        <Link
          to={`/poll?order=${encodeURIComponent(order.orderId)}`}
          className="btn btn--primary btn--sm rate-prompt__cta"
        >
          Rate your pies
        </Link>
        <button type="button" className="text-link rate-prompt__dismiss" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  )
}
