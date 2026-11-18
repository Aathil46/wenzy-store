import React, { forwardRef } from 'react'
import type { Product } from '../../types/database'

interface RackHangerItemProps {
  product: Product
  index: number
  onClick: (e: React.MouseEvent<HTMLDivElement>) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * Individual hanging piece on the WENZY RACK.
 *
 * Requirements matching the reference Nike clothing rail:
 * - NO artificial/duplicate SVG hanger! The studio photography cutouts already contain their own built-in natural hanger and hook.
 * - Hook naturally meets the top rail rod without visible gaps or duplicate hooks.
 * - 3 layered views:
 *   - pos="0": side profile (resting rail state)
 *   - pos="1": front view (revealed on hover and in focus view)
 *   - pos="-1": back view (revealed in 3D rotateY focus view)
 * - Hanging price tag suspended from collar
 * - Natural uncompromised proportions without stretch or distortion
 */
const RackHangerItem = forwardRef<HTMLDivElement, RackHangerItemProps>(
  ({ product, index, onClick, onMouseEnter, onMouseLeave }, ref) => {
    // Extract mandatory views
    const sideImage =
      product.images?.find((img) => img.view_type === 'side')?.image_url ||
      product.images?.[0]?.image_url ||
      ''
    const frontImage =
      product.images?.find((img) => img.view_type === 'front')?.image_url ||
      product.images?.find((img) => img.is_primary)?.image_url ||
      sideImage
    const backImage =
      product.images?.find((img) => img.view_type === 'back')?.image_url ||
      frontImage

    if (!sideImage) return null

    return (
      <div
        ref={ref}
        className="rack-item group"
        data-sr-item
        data-idx={index + 1}
        data-name={product.name}
        data-price={`₹${product.price.toLocaleString('en-IN')}`}
        data-product-id={product.id}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="button"
        tabIndex={0}
        aria-label={`${product.name} - ₹${product.price}`}
      >
        {/* Garment 3D Viewport (Height dynamically set by rack engine or CSS) */}
        <div className="rack-garment relative">
          {/* VIEW 0: Side Profile (Resting state, pos="0") */}
          <div
            className="rack-view"
            data-sr-pos="0"
            style={{ opacity: 1, transform: 'none' }}
          >
            <img
              src={sideImage}
              alt={`${product.name} – side profile`}
              loading="lazy"
              decoding="async"
              className="pointer-events-none"
            />
          </div>

          {/* VIEW 1: Front Face (Hover & Focus state, pos="1") */}
          <div
            className="rack-view"
            data-sr-pos="1"
            style={{ opacity: 0, transform: 'scale(0.92)' }}
          >
            <img
              src={frontImage}
              alt={`${product.name} – front view`}
              loading="lazy"
              decoding="async"
              className="pointer-events-none"
            />
          </div>

          {/* VIEW -1: Back Face (3D Flip state in modal, pos="-1") */}
          <div
            className="rack-view"
            data-sr-pos="-1"
            style={{ opacity: 0, transform: 'rotateY(180deg)' }}
          >
            <img
              src={backImage}
              alt={`${product.name} – back view`}
              loading="lazy"
              decoding="async"
              className="pointer-events-none"
            />
          </div>
        </div>
      </div>
    )
  }
)

RackHangerItem.displayName = 'RackHangerItem'

export default RackHangerItem
