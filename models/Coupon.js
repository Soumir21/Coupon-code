const mongoose = require("mongoose");
// Create coupon schema
const CouponSchema = new mongoose.Schema({
  type: { type: String, enum: ["cart-wise", "product-wise", "bxgy"], required: true },
  details: {
    threshold: { type: Number },
    discount: { type: Number },
    product_id: { type: Number },
    buy_products: [
      { product_id: { type: Number} , quantity: { type: Number } }
    ],
    get_products: [
      { product_id: { type: Number}, quantity: { type: Number} }
    ],
  
  },
}, { timestamps: true });

// Validate the input before saving
CouponSchema.pre("save", function (next) {
  if (this.type === "cart-wise" && (!this.details.threshold || !this.details.discount)) {
    return next(new Error("Cart-wise coupon must have threshold and discount"));
  }
  if (this.type === "product-wise" && (!this.details.product_id || !this.details.discount)) {
    return next(new Error("Product-wise coupon must have product_id and discount"));
  }
  if (this.type === "bxgy") {
    // Check if `buy_products` and `get_products` exist and are arrays
    if (!Array.isArray(this.details.buy_products) || this.details.buy_products.length === 0) {
      return next(new Error("BxGy coupon must have at least one `buy_products` entry"));
    }
    if (!Array.isArray(this.details.get_products) || this.details.get_products.length === 0) {
      return next(new Error("BxGy coupon must have at least one `get_products` entry"));
    }

    // Validate each entry in `buy_products`
    for (const product of this.details.buy_products) {
      if (!product.product_id || !product.quantity) {
        return next(new Error("Each `buy_products` entry must have `product_id` and `quantity`"));
      }
    }

    // Validate each entry in `get_products`
    for (const product of this.details.get_products) {
      if (!product.product_id || !product.quantity) {
        return next(new Error("Each `get_products` entry must have `product_id` and `quantity`"));
      }
    }
  }
  next();
});

module.exports = mongoose.model("Coupon", CouponSchema);
