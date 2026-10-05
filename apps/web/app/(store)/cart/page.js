'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatCurrency } from '@dtabs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function CartPage() {
  const searchParams = useSearchParams();
  const tenantSlug = searchParams.get('tenant') || 'aurora';
  const tenantParam = `?tenant=${tenantSlug}`;

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

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

  useEffect(() => {
    fetchCart();
  }, [tenantSlug]);

  const updateQuantity = async (itemId, newQty) => {
    try {
      const sessionId = localStorage.getItem('dtabs_cart_session');
      const res = await fetch(`${API_BASE}/storefront/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          'x-cart-session': sessionId
        },
        body: JSON.stringify({ quantity: newQty, sessionId })
      });

      if (res.ok) {
        const data = await res.json();
        setCart(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (itemId) => {
    try {
      const sessionId = localStorage.getItem('dtabs_cart_session');
      const res = await fetch(`${API_BASE}/storefront/cart/items/${itemId}?sessionId=${sessionId}`, {
        method: 'DELETE',
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
    }
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode) return;
    setIsApplyingCoupon(true);
    setCouponMessage(null);

    try {
      const sessionId = localStorage.getItem('dtabs_cart_session');
      const res = await fetch(`${API_BASE}/storefront/cart/coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
          'x-cart-session': sessionId
        },
        body: JSON.stringify({ code: couponCode, sessionId })
      });

      const data = await res.json();
      if (res.ok) {
        setCart(data.data.cart);
        setCouponMessage({ type: 'success', text: `Coupon applied: -$${data.data.discount}` });
      } else {
        setCouponMessage({ type: 'error', text: data.error?.message || 'Invalid coupon' });
      }
    } catch (err) {
      setCouponMessage({ type: 'error', text: 'Error applying coupon' });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading cart contents...</p>
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
      <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '32px' }}>Your Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Looks like you haven't added any items to your shopping cart yet.
          </p>
          <Link href={`/products${tenantParam}`} className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Cart Items List */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {items.map((item) => (
                <div
                  key={item._id}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'center',
                    paddingBottom: '20px',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}
                >
                  <img
                    src={item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30'}
                    alt={item.name}
                    style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                  />

                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{item.name}</h4>
                    {item.variantTitle && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Option: {item.variantTitle}
                      </p>
                    )}
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>
                      {formatCurrency(item.unitPrice)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity - 1)}
                      style={{ padding: '6px 10px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span style={{ padding: '6px 10px', fontSize: '13px', fontWeight: '600' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                      style={{ padding: '6px 10px', background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => removeItem(item._id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Order Summary</h3>

            {/* Coupon input */}
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Coupon code (e.g. LUXE15)"
                className="form-input"
                style={{ flexGrow: 1, textTransform: 'uppercase' }}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <button type="submit" disabled={isApplyingCoupon} className="btn btn-secondary" style={{ padding: '0 16px' }}>
                Apply
              </button>
            </form>

            {couponMessage && (
              <p style={{
                fontSize: '12px',
                marginBottom: '16px',
                color: couponMessage.type === 'success' ? '#34d399' : '#f87171'
              }}>
                {couponMessage.text}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#34d399' }}>
                  <span>Discount ({cart.appliedCouponCode})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Estimated Tax (5%)</span>
                <span>{formatCurrency(estimatedTax)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Estimated Shipping</span>
                <span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: '8px' }}>
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <Link
              href={`/checkout${tenantParam}`}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '24px', padding: '12px', textAlign: 'center' }}
            >
              Proceed to Checkout &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
