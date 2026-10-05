'use client';

import { useState } from 'react';
import { formatCurrency } from '@dtabs/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export default function ProductDetailView({ product, inventory, reviews: initialReviews, tenant }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Review Form state
  const [reviews, setReviews] = useState(initialReviews || []);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);

  const activeSku = selectedVariant ? selectedVariant.sku : product.sku;
  const stockInfo = inventory[activeSku] || { inStock: true, quantity: 10 };
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentCompareAt = selectedVariant ? selectedVariant.compareAtPrice : product.compareAtPrice;

  const handleAddToCart = async () => {
    setIsAdding(true);
    setAddedSuccess(false);

    try {
      // Get or create session ID in localStorage
      let sessionId = localStorage.getItem('dtabs_cart_session');
      if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('dtabs_cart_session', sessionId);
      }

      const res = await fetch(`${API_BASE}/storefront/cart/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenant.slug
        },
        body: JSON.stringify({
          sessionId,
          productId: product._id,
          variantId: selectedVariant ? selectedVariant._id : null,
          quantity
        })
      });

      if (res.ok) {
        setAddedSuccess(true);
        setTimeout(() => setAddedSuccess(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Failed to add item to cart');
      }
    } catch (err) {
      alert('Error connecting to store API');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewerName || !reviewComment) return;

    setSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE}/storefront/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenant.slug
        },
        body: JSON.stringify({
          productId: product._id,
          customerName: reviewerName,
          rating: reviewRating,
          comment: reviewComment
        })
      });

      if (res.ok) {
        const data = await res.json();
        setReviews([data.data, ...reviews]);
        setReviewerName('');
        setReviewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const mainImage = selectedVariant?.image || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px' }}>
      {/* Product Gallery */}
      <div>
        <div className="glass-panel" style={{ overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <img
            src={mainImage}
            alt={product.name}
            style={{ width: '100%', height: '480px', objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Product Details & Variant Selection */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          {product.categories?.[0] && (
            <span className="badge badge-primary" style={{ marginBottom: '12px' }}>
              {product.categories[0].name}
            </span>
          )}
          <h1 style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.2', marginBottom: '8px' }}>
            {product.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>SKU: {activeSku}</p>
        </div>

        {/* Pricing */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {formatCurrency(currentPrice, tenant.settings?.currency || 'USD')}
          </span>
          {currentCompareAt && currentCompareAt > currentPrice && (
            <span style={{ fontSize: '18px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
              {formatCurrency(currentCompareAt, tenant.settings?.currency || 'USD')}
            </span>
          )}
        </div>

        {/* Stock Status Badge */}
        <div>
          {stockInfo.inStock ? (
            <span className="badge badge-success">
              ✓ In Stock ({stockInfo.quantity} units available)
            </span>
          ) : (
            <span className="badge badge-warning">
              ⚠ Out of Stock
            </span>
          )}
        </div>

        {/* Description */}
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '15px' }}>
          {product.description || 'No description provided.'}
        </p>

        {/* Variants Selection */}
        {product.variants && product.variants.length > 0 && (
          <div>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
              Select Option / Variant:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {product.variants.map((variant) => (
                <button
                  key={variant._id}
                  type="button"
                  onClick={() => setSelectedVariant(variant)}
                  className={`btn ${selectedVariant?._id === variant._id ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  {variant.title || variant.sku}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity and Add to Cart */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{ padding: '10px 16px', background: 'var(--bg-surface)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              -
            </button>
            <span style={{ padding: '10px 16px', minWidth: '40px', textAlign: 'center', fontWeight: '600' }}>
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              style={{ padding: '10px 16px', background: 'var(--bg-surface)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!stockInfo.inStock || isAdding}
            className="btn btn-primary"
            style={{ flexGrow: 1, padding: '12px 24px', fontSize: '15px' }}
          >
            {isAdding ? 'Adding...' : addedSuccess ? '✓ Added to Cart!' : 'Add to Cart'}
          </button>
        </div>

        {/* Reviews Section */}
        <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
            Customer Reviews ({reviews.length})
          </h3>

          <form onSubmit={handleSubmitReview} className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>Leave a Verified Review</h4>
            <div className="form-group">
              <input
                type="text"
                placeholder="Your Name"
                className="form-input"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <select
                className="form-select"
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
              >
                <option value="5">★★★★★ (5/5) Exceptional</option>
                <option value="4">★★★★☆ (4/5) Very Good</option>
                <option value="3">★★★☆☆ (3/5) Average</option>
                <option value="2">★★☆☆☆ (2/5) Poor</option>
                <option value="1">★☆☆☆☆ (1/5) Terrible</option>
              </select>
            </div>
            <div className="form-group">
              <textarea
                placeholder="Share your thoughts about this product..."
                className="form-textarea"
                rows="3"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit" disabled={submittingReview} className="btn btn-secondary" style={{ width: '100%' }}>
              {submittingReview ? 'Submitting...' : 'Post Review'}
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {reviews.map((r, i) => (
              <div key={r._id || i} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{r.customerName}</span>
                  <span style={{ color: '#fbbf24', fontSize: '13px' }}>{'★'.repeat(r.rating)}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{r.comment}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
