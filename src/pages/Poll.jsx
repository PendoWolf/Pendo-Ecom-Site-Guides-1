import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const HOUR_MS = 60 * 60 * 1000

const questions = [
  {
    id: 'crust',
    prompt: 'How flaky was the crust?',
    options: ['Needs work', 'Solid flake', 'Shatteringly perfect'],
  },
  {
    id: 'flavor',
    prompt: 'Did the filling riot hard enough?',
    options: ['Too polite', 'Just right', 'Full mutiny'],
  },
  {
    id: 'shipping',
    prompt: 'How was chilled delivery?',
    options: ['Warm & sad', 'Acceptable', 'Ice-cold heroics'],
  },
  {
    id: 'reorder',
    prompt: 'Would you order again?',
    options: ['Maybe', 'Yes', 'Already craving'],
  },
]

export default function Poll() {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order') || null
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const allAnswered = questions.every((q) => answers[q.id])

  const onSubmit = (e) => {
    e.preventDefault()
    if (!allAnswered) return
    const at = new Date().toISOString()
    const existing = JSON.parse(localStorage.getItem('pieriot-polls') || '[]')
    existing.push({ answers, orderId, at })
    localStorage.setItem('pieriot-polls', JSON.stringify(existing))

    let orders = []
    try {
      const saved = JSON.parse(localStorage.getItem('pieriot-orders') || '[]')
      orders = Array.isArray(saved) ? saved : []
    } catch {
      orders = []
    }
    const order = orderId ? orders.find((entry) => entry?.orderId === orderId) : null
    if (order) {
      order.ratedAt = at
      localStorage.setItem('pieriot-orders', JSON.stringify(orders))
    }
    const hoursSinceOrder = order
      ? Math.round((Date.now() - Date.parse(order.placedAt)) / HOUR_MS)
      : null

    window.pendo.track('experience_rating_submitted', {
      crustRating: answers.crust,
      flavorRating: answers.flavor,
      shippingRating: answers.shipping,
      reorderIntent: answers.reorder,
      orderId,
      entryPoint: orderId ? 'delivered_prompt' : 'direct',
      hoursSinceOrder,
    })
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="page empty-state">
        <h1>Thanks for voting</h1>
        <p>Your ratings help us decide which pie gets the next experimental spice rack.</p>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setAnswers({})
            setSubmitted(false)
          }}
        >
          Rate again
        </button>
      </div>
    )
  }

  return (
    <div className="page poll">
      <header className="page-header">
        <h1>Rate your experience</h1>
        <p>Four quick votes. No essay questions. Maximum pie science.</p>
      </header>

      <form className="panel poll__form" onSubmit={onSubmit}>
        {questions.map((question) => (
          <fieldset key={question.id} className="poll__question">
            <legend>{question.prompt}</legend>
            <div className="chip-row">
              {question.options.map((option) => (
                <label
                  key={option}
                  className={`chip chip--radio ${
                    answers[question.id] === option ? 'is-active' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [question.id]: option }))
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <button type="submit" className="btn btn--primary" disabled={!allAnswered}>
          Submit ratings
        </button>
      </form>
    </div>
  )
}
