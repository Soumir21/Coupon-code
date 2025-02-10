const express = require("express");
const {
  createCoupon,
  getCoupons,
  getCouponById,
  applyCoupon,
  getApplicableCoupons,
  deletCouponById,
  updateCoupon
} = require("../controller/couponController"); // Importing the controllers

const router = express.Router();

router.post("/", createCoupon);      // Create new coupon
router.get("/", getCoupons);          // Get all coupons
router.get("/:id", getCouponById);    // Get coupon by ID
router.delete("/:id", deletCouponById);  // Delete coupon by ID
router.post("/applicable-coupons", getApplicableCoupons);   // Get all the coupons apllicable to that cart
router.post("/apply-coupon/:id", applyCoupon);       // Apply the coupon with the ID
router.put("/:id", updateCoupon);   //Update the coupon by ID.

module.exports = router;
