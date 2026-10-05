'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCurrency } from '@dtabs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';
  const tenantParam = `?tenant=${tenantSlug}`;

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mock');

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const sessionId = localStorage.getItem('dtabs_cart_session');
        if (!sessionId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/storefront/cart?sessionId=${sessionId}`, {
          headers: {
            'x-tenant-slug': tenantSlug,
            'x-cart-session': sessionId
          }
        });

        if (res.ok) {
          const data = await res.json();
          setCart(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [tenantSlug]);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!cart || !cart.items?.length) return;

    setProcessing(true);
    try {
      const sessionId = localStorage.getItem('dtabs_cart_session');
      const res = await fetch(`${API_BASE}/storefront/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          'x-cart-session': sessionId
        },
        body: JSON.stringify({
          cartId: cart._id,
          customerDetails: { email, firstName, lastName, phone },
          shippingAddress: { street, city, state, postalCode, country: 'US' },
          paymentMethod,
          idempotencyKey: `ord_idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCompletedOrder(data.data.order);
        // Clear cart session ID
        localStorage.removeItem('dtabs_cart_session');
      } else {
        alert(data.error?.message || 'Checkout failed');
      }
    } catch (err) {
      alert('Network error placing order');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Preparing checkout...</p>
      </div>
    );
  }

  if (completedOrder) {
    return (
      <div className="container" style={{ padding: '64px 24px', maxWidth: '680px' }}>
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Order Confirmed!</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Thank you for your purchase. We have received your order and are preparing it for shipment.
          </p>

          <div style={{ background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Order Reference</span>
              <span style={{ fontWeight: '700', color: 'var(--theme-accent)' }}>{completedOrder.orderNumber}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status</span>
              <span className="badge badge-success">{completedOrder.status.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Paid</span>
              <span style={{ fontWeight: '700' }}>{formatCurrency(completedOrder.grandTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Shipment Sent To</span>
              <span>{completedOrder.shippingAddress?.street}, {completedOrder.shippingAddress?.city}</span>
            </div>
          </div>

          <Link href={`/${tenantParam}`} className="btn btn-primary" style={{ padding: '12px 24px' }}>
            Return to Store
          </Link>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const discount = cart?.discountAmount || 0;
  const estimatedTax = Math.round(subtotal * 0.05 * 100) / 100;
  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 10;
  const grandTotal = Math.max(0, subtotal - discount + estimatedTax + shipping);

  return (
    <div className="container" style={{ padding: '48px 24px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '32px' }}>Checkout</h1>

      <form onSubmit={handlePlaceOrder} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
        {/* Customer Information & Shipping Form */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Contact & Shipping Details</h3>

          <div className="form-group">
            <label className="form-label">Email Address (for order tracking)</label>
            <input
              type="email"
              required
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Alex"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input
                type="text"
                required
                className="form-input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Rivers"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '24px 0 16px 0' }}>Delivery Address</h3>

          <div className="form-group">
            <label className="form-label">Street Address</label>
            <input
              type="text"
              required
              className="form-input"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              placeholder="742 Evergreen Terrace"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                type="text"
                required
                className="form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Springfield"
              />
            </div>
            <div className="form-group">
              <label className="form-label">State</label>
              <input
                type="text"
                className="form-input"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="OR"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Postal Code</label>
              <input
                type="text"
                required
                className="form-input"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="97477"
              />
            </div>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '24px 0 16px 0' }}>Payment Gateway</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: paymentMethod === 'mock' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="mock"
                checked={paymentMethod === 'mock'}
                onChange={() => setPaymentMethod('mock')}
              />
              <div>
                <strong>DTabs Instant Checkout (Sandbox / Instant Confirmation)</strong>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Simulates instant settlement for test scenarios</p>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: paymentMethod === 'stripe' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="stripe"
                checked={paymentMethod === 'stripe'}
                onChange={() => setPaymentMethod('stripe')}
              />
              <div>
                <strong>Stripe Provider</strong>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Credit cards, Apple Pay, Google Pay via Stripe</p>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', background: paymentMethod === 'dodo' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', cursor: 'pointer' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="dodo"
                checked={paymentMethod === 'dodo'}
                onChange={() => setPaymentMethod('dodo')}
              />
              <div>
                <strong>Dodo Payments</strong>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Global cross-border payments with localized currencies</p>
              </div>
            </label>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Items in Order ({items.length})</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            {items.map((item) => (
              <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span>{item.quantity}x {item.name} {item.variantTitle && `(${item.variantTitle})`}</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                <span>Coupon Savings</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Taxes</span>
              <span>{formatCurrency(estimatedTax)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Shipping</span>
              <span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '20px', fontWeight: '800', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: '8px' }}>
              <span>Pay Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing || items.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '24px', padding: '14px', fontSize: '16px' }}
          >
            {processing ? 'Securing Order...' : `Pay ${formatCurrency(grandTotal)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
