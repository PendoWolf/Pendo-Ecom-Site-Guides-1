import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatPrice } from '../data/pies'
import { useCart } from '../context/CartContext'
import { useProfile } from '../context/ProfileContext'

const paymentFields = ['cardName', 'cardNumber', 'expiry', 'cvc']

function validateField(name, value) {
  const trimmed = value.trim()
  if (name === 'cardName') {
    return trimmed ? '' : 'Enter the name on your card.'
  }
  if (name === 'cardNumber') {
    const digits = trimmed.replace(/[\s-]/g, '')
    if (!digits) return 'Enter your card number.'
    return /^\d{12,19}$/.test(digits) ? '' : 'Card number should be 12–19 digits.'
  }
  if (name === 'expiry') {
    if (!trimmed) return 'Enter the expiry date (MM/YY).'
    return /^(0[1-9]|1[0-2])\/?\d{2}$/.test(trimmed) ? '' : 'Use the MM/YY format, e.g. 08/27.'
  }
  if (name === 'cvc') {
    if (!trimmed) return 'Enter the 3- or 4-digit security code.'
    return /^\d{3,4}$/.test(trimmed) ? '' : 'CVC should be 3 or 4 digits.'
  }
  return ''
}

function focusField(field) {
  if (!field) return
  field.scrollIntoView({ block: 'center' })
  field.focus({ preventScroll: true })
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, subtotal, clearCart } = useCart()
  const { profile, updateProfile, hasShippingAddress } = useProfile()
  const [payment, setPayment] = useState({
    cardName: profile.fullName || '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  })
  const [addressForm, setAddressForm] = useState({
    fullName: profile.fullName,
    email: profile.email,
    address1: profile.address1,
    address2: profile.address2,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
  })
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const addressFormRef = useRef(null)

  const shipping = subtotal >= 75 || subtotal === 0 ? 0 : 8
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="page empty-state">
        <h1>Nothing to check out</h1>
        <p>Add a pie first, then come back for the checkout flourish.</p>
        <Link to="/shop" className="btn btn--primary">
          Shop pies
        </Link>
      </div>
    )
  }

  const onPaymentChange = (e) => {
    const { name, value } = e.target
    setPayment((prev) => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
    }
  }

  const onPaymentBlur = (e) => {
    const { name, value } = e.target
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }))
  }

  const onAddressChange = (field) => (e) => {
    setAddressForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleAddressSubmit = (e) => {
    e.preventDefault()
    updateProfile(addressForm)
    setFieldErrors((prev) => ({ ...prev, address: '' }))
    if (!payment.cardName.trim()) {
      // Pre-fill the card name, as returning from the Profile page used to.
      setPayment((prev) => ({ ...prev, cardName: addressForm.fullName }))
      setFieldErrors((prev) => ({ ...prev, cardName: '' }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const errors = {}
    paymentFields.forEach((name) => {
      const message = validateField(name, payment[name])
      if (message) errors[name] = message
    })
    if (!hasShippingAddress) {
      errors.address = 'Save your shipping address to place your order.'
    }
    setFieldErrors(errors)

    if (!hasShippingAddress) {
      if (window.pendo) {
        window.pendo.track('checkout_validation_failed', {
          failureReason: 'missing_shipping_address',
          hasShippingAddress: false,
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          cartTotal: total,
        })
      }
      const form = addressFormRef.current
      if (form) {
        focusField(form.querySelector(':invalid') || form.querySelector('button[type="submit"]'))
      }
      return
    }

    const firstInvalid = paymentFields.find((name) => errors[name])
    if (firstInvalid) {
      if (window.pendo) {
        window.pendo.track('checkout_validation_failed', {
          failureReason: 'incomplete_payment',
          hasShippingAddress: true,
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          cartTotal: total,
        })
      }
      focusField(e.currentTarget.elements.namedItem(firstInvalid))
      return
    }

    setSubmitting(true)
    const orderId = `PR-${Date.now().toString().slice(-8)}`
    const order = {
      orderId,
      items,
      subtotal,
      shipping,
      total,
      shippingAddress: { ...profile },
      placedAt: new Date().toISOString(),
    }
    sessionStorage.setItem('pieriot-last-order', JSON.stringify(order))
    if (window.pendo) {
      window.pendo.track('order_placed', {
        orderId,
        itemCount: items.length,
        subtotal,
        shipping,
        total,
        hasDeliveryNotes: Boolean(profile.deliveryNotes),
        shippingCity: profile.city,
        shippingState: profile.state,
      })
    }
    clearCart()
    navigate(`/success/${orderId}`)
  }

  return (
    <div className="page checkout">
      <header className="page-header">
        <h1>Checkout</h1>
        <p>Confirm shipping, enter payment, and let the pies start their journey.</p>
      </header>

      <div className="checkout__layout">
        <div className="checkout__forms">
          <section className="panel">
            <div className="panel__head">
              <h2>Shipping address</h2>
              {hasShippingAddress && (
                <Link to="/profile" className="text-link">
                  Edit profile
                </Link>
              )}
            </div>
            {hasShippingAddress ? (
              <address className="checkout__address">
                <strong>{profile.fullName}</strong>
                <br />
                {profile.address1}
                {profile.address2 ? `, ${profile.address2}` : ''}
                <br />
                {profile.city}, {profile.state} {profile.zip}
                <br />
                {profile.email}
                {profile.phone ? ` · ${profile.phone}` : ''}
                {profile.deliveryNotes && (
                  <>
                    <br />
                    <em>Note: {profile.deliveryNotes}</em>
                  </>
                )}
              </address>
            ) : (
              <form
                ref={addressFormRef}
                className="checkout__address-form"
                onSubmit={handleAddressSubmit}
              >
                <p className="muted">
                  No shipping address on file yet — add it here and we’ll save it to your profile.
                </p>
                <div className="field-row">
                  <label className="field">
                    <span>Full name</span>
                    <input
                      value={addressForm.fullName}
                      onChange={onAddressChange('fullName')}
                      autoComplete="name"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={addressForm.email}
                      onChange={onAddressChange('email')}
                      autoComplete="email"
                      required
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Address line 1</span>
                  <input
                    value={addressForm.address1}
                    onChange={onAddressChange('address1')}
                    autoComplete="address-line1"
                    required
                  />
                </label>

                <label className="field">
                  <span>Address line 2</span>
                  <input
                    value={addressForm.address2}
                    onChange={onAddressChange('address2')}
                    autoComplete="address-line2"
                  />
                </label>

                <div className="field-row field-row--3">
                  <label className="field">
                    <span>City</span>
                    <input
                      value={addressForm.city}
                      onChange={onAddressChange('city')}
                      autoComplete="address-level2"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>State</span>
                    <input
                      value={addressForm.state}
                      onChange={onAddressChange('state')}
                      autoComplete="address-level1"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>ZIP</span>
                    <input
                      value={addressForm.zip}
                      onChange={onAddressChange('zip')}
                      autoComplete="postal-code"
                      required
                    />
                  </label>
                </div>

                <div className="checkout__address-actions">
                  <button type="submit" className="btn btn--secondary btn--sm">
                    Save shipping address
                  </button>
                  {fieldErrors.address && (
                    <p className="form-error" role="alert">
                      {fieldErrors.address}
                    </p>
                  )}
                </div>
              </form>
            )}

            <label className="field">
              <span>Delivery notes (optional)</span>
              <textarea
                rows="2"
                value={profile.deliveryNotes}
                onChange={(e) => updateProfile({ deliveryNotes: e.target.value })}
                placeholder="Gate code, porch preference, pie urgency level..."
              />
            </label>
          </section>

          <form id="checkout-payment" className="panel" onSubmit={handleSubmit} noValidate>
            <h2>Payment</h2>
            <p className="muted">Demo checkout only — nothing is charged.</p>
            <label className="field">
              <span>Name on card</span>
              <input
                name="cardName"
                value={payment.cardName}
                onChange={onPaymentChange}
                onBlur={onPaymentBlur}
                autoComplete="cc-name"
                required
                aria-invalid={Boolean(fieldErrors.cardName)}
                aria-describedby={fieldErrors.cardName ? 'cardName-error' : undefined}
              />
              {fieldErrors.cardName && (
                <span id="cardName-error" className="field-error">
                  {fieldErrors.cardName}
                </span>
              )}
            </label>
            <label className="field">
              <span>Card number</span>
              <input
                name="cardNumber"
                value={payment.cardNumber}
                onChange={onPaymentChange}
                onBlur={onPaymentBlur}
                placeholder="4242 4242 4242 4242"
                autoComplete="cc-number"
                inputMode="numeric"
                maxLength="19"
                required
                aria-invalid={Boolean(fieldErrors.cardNumber)}
                aria-describedby={fieldErrors.cardNumber ? 'cardNumber-error' : undefined}
              />
              {fieldErrors.cardNumber && (
                <span id="cardNumber-error" className="field-error">
                  {fieldErrors.cardNumber}
                </span>
              )}
            </label>
            <div className="field-row">
              <label className="field">
                <span>Expiry</span>
                <input
                  name="expiry"
                  value={payment.expiry}
                  onChange={onPaymentChange}
                  onBlur={onPaymentBlur}
                  placeholder="MM/YY"
                  autoComplete="cc-exp"
                  maxLength="5"
                  required
                  aria-invalid={Boolean(fieldErrors.expiry)}
                  aria-describedby={fieldErrors.expiry ? 'expiry-error' : undefined}
                />
                {fieldErrors.expiry && (
                  <span id="expiry-error" className="field-error">
                    {fieldErrors.expiry}
                  </span>
                )}
              </label>
              <label className="field">
                <span>CVC</span>
                <input
                  name="cvc"
                  value={payment.cvc}
                  onChange={onPaymentChange}
                  onBlur={onPaymentBlur}
                  placeholder="123"
                  autoComplete="cc-csc"
                  inputMode="numeric"
                  maxLength="4"
                  required
                  aria-invalid={Boolean(fieldErrors.cvc)}
                  aria-describedby={fieldErrors.cvc ? 'cvc-error' : undefined}
                />
                {fieldErrors.cvc && (
                  <span id="cvc-error" className="field-error">
                    {fieldErrors.cvc}
                  </span>
                )}
              </label>
            </div>
          </form>
        </div>

        <aside className="cart__summary">
          <h2>Order summary</h2>
          <ul className="checkout__lines">
            {items.map((item) => (
              <li key={item.lineId}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="cart__row">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="cart__row">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
          </div>
          <div className="cart__row cart__row--total">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <button
            type="submit"
            form="checkout-payment"
            className="btn btn--primary btn--block"
            disabled={submitting}
          >
            {submitting ? 'Placing order…' : `Pay ${formatPrice(total)}`}
          </button>
        </aside>
      </div>
    </div>
  )
}
