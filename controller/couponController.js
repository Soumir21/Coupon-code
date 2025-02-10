const Coupon = require("../models/Coupon");

// Create a new coupon
exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = new Coupon(req.body);
    await coupon.save();
    res.status(201).json({ message: "Coupon created successfully", coupon });
  } catch (error) {
   error.extraDetails = "Invalid data while creating coupon"; 
   next(error);
  }
};

// Get all coupons
exports.getCoupons = async (req, res,next) => {
  try {
    const coupons = await Coupon.find().lean(); 
    res.json(coupons);
  } catch (error) {
    next(error)
  }
};
exports.getApplicableCoupons = async (req, res,next) => {
  try {
    const { cart } = req.body;
    if (!cart || !cart.items || cart.items.length === 0) {
      const error = new Error("Invalid Client request");
      error.status = 400; 
      error.extraDetails = "Your cart does not contain items";
      throw error;
    }

    // Calculate total cart value
    const cartTotal = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    // Get all coupons from DB
    const coupons = await Coupon.find().lean();

    let applicableCoupons = [];

    for (const coupon of coupons) {
      let discount = 0;

      // 🛒 **Cart-wise Discount**
      if (coupon.type === "cart-wise" && cartTotal >= coupon.details.threshold) {
        discount = (coupon.details.discount / 100) * cartTotal; // Applying percentage discount
      }

      // 🏷️ **Product-wise Discount**
      if (coupon.type === "product-wise") {
        const applicableProduct = cart.items.find(item => item.product_id === coupon.details.product_id);
        if (applicableProduct) {
          discount = (coupon.details.discount / 100) * applicableProduct.price * applicableProduct.quantity;
        }
      }

      // 🏷️ **BxGy (Buy X Get Y Free)**
      if (coupon.type === "bxgy") {
        // First, check if the buy condition is met for all "buy" products
        const buyConditionMet = coupon.details.buy_products.every(buy => {
          const item = cart.items.find(ci => ci.product_id === buy.product_id);
          return item && item.quantity >= buy.quantity; // Ensure enough quantity of the "buy" product
        });
      
        if (buyConditionMet) {
          // If the buy condition is met, calculate the discount for free products
          discount = coupon.details.get_products.reduce((sum, gp) => {
            
            const productInCart = cart.items.find(ci => ci.product_id === gp.product_id);
            
            // If the product is found in the cart, calculate the discount for the free product
            if (productInCart) {
              const freeProductDiscount = gp.quantity * productInCart.price;
              return sum + freeProductDiscount;
            }
            // If the product is not found, just return the accumulated discount
            return sum;
          }, 0);
        }
      }
      if (discount > 0) {
        applicableCoupons.push({
          coupon_id: coupon._id,
          type: coupon.type,
          discount: Math.floor(discount) 
        });
      }
    }
    if(!applicableCoupons.length){
      return res.json({ message: "No applicable coupons found" });
    }
    res.json({ applicable_coupons: applicableCoupons });
  } catch (error) {
    next(error)
  }
};
// Get a single coupon by ID
exports.getCouponById = async (req, res,next) => {
  try {
    const coupon = await Coupon.findById(req.params.id); //Try to find the coupon
    if (!coupon) { //Throw error if coupon not found
      const error = new Error("Coupon not found");
      error.status = 404; 
      error.extraDetails = "The requested coupon ID does not exist in the database";
      throw error;
    };
    res.json(coupon); // Send the coupon if found
  } catch (error) {
    next(error);
  }
};

// Apply a coupon
exports.applyCoupon = async (req, res,next) => {
  try {
    const { id } = req.params;  // Get coupon ID from URL
    const { cart } = req.body;  // Cart details from request body

    // Validate the cart
    if (!cart || !cart.items || cart.items.length === 0) {
       throw new Error("Cart is empty or invalid." );
    }

    //  Fetch the coupon by ID
    const coupon = await Coupon.findById(id);
    if (!coupon) {
      throw new Error("Invalid coupon.");
    }

    //  Initialize cart totals
    let total_price = 0;
    let total_discount = 0;
    
    // First, calculate the total price of the cart (before any discounts)
    cart.items.forEach(item => {
      total_price += item.quantity * item.price;
    });

    //  If the coupon type is "cart-wise", apply the discount on the total cart value
 // Apply cart-wise discount if applicable
 if (coupon.type === "cart-wise" && total_price >= coupon.details.threshold) {
  total_discount = (coupon.details.discount / 100) * total_price; // Total discount on cart

  // ✅ Distribute discount proportionally to each item
  cart.items = cart.items.map(item => {
    const proportion = (item.quantity * item.price) / total_price; // How much this item contributes
    const itemDiscount = proportion * total_discount; // Apply proportional discount
    return { 
      ...item, 
      total_discount: itemDiscount 
    };
  });
}

// Now, apply the product-wise discount if the coupon type is "product-wise"
if(coupon.type === "product-wise"){
  cart.items = cart.items.map(item => {
    const updatedItem = { ...item, total_discount: 0 }; // Ensure each item has a discount field
  
    // Apply product-wise discount (percentage discount on the product)
    if (coupon.type === "product-wise" && item.product_id === coupon.details.product_id) {
      const productTotal = item.quantity * item.price;
      updatedItem.total_discount = (coupon.details.discount / 100) * productTotal;
      total_discount += updatedItem.total_discount;
    }
  
    return updatedItem; // ✅ Correctly return the updated object
  });
}



    // Apply bxgy coupon  - this adds free products
    if (coupon.type === "bxgy") {
      //  Check if the buy condition is met
      const buyConditionMet = coupon.details.buy_products.every(buy =>
        cart.items.some(ci => ci.product_id === buy.product_id && ci.quantity >= buy.quantity)
      );
    
      //  If the buy condition is met, apply discount for free products
      if (buyConditionMet) {
        coupon.details.get_products.forEach(gp => {
          // Find the free product in the cart
          const freeProduct = cart.items.find(ci => ci.product_id === gp.product_id);
    
          if (freeProduct) {
            // Apply discount for the free product
            const freeProductDiscount = gp.quantity * freeProduct.price;
            total_discount += freeProductDiscount;
          }
        });
      }
    }

    //  Calculate the final price after all discounts
    const final_price = total_price - total_discount;

    //  Send the response with the updated cart
    res.json({
      updated_cart: {
        items: cart.items,
        total_price: total_price,   // Price before discounts
        total_discount: total_discount, // Total discount applied
        final_price: final_price    // Price after discount
      }
    });

  } catch (error) {
    next(error);
  }
};

//Delete a coupon

exports.deletCouponById = async (req, res,next) => {
  try {
    const { id } = req.params; // Get the coupon ID from URL parameters

    // Find and delete the coupon by ID
    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    if (!deletedCoupon) {
      const error = new Error("Coupon not found");
      error.status = 404; 
      error.extraDetails = "The requested coupon ID does not exist in the database";
      throw error;
    }

    res.status(200).json({ message: "Coupon deleted successfully", deletedCoupon });
  } catch (error) {
    next(error)
  }
};

//Update a coupon

exports.updateCoupon = async (req, res,next) => {
  try {
    const { id } = req.params; // Get the coupon ID from URL parameters
    const updateData = req.body; // Get the updated coupon data from request body

    //  Fetch the existing coupon from the database
    const existingCoupon = await Coupon.findById(id);
    if (!existingCoupon) {
      const error = new Error("Coupon not found");
      error.status = 404; 
      error.extraDetails = "The requested coupon ID does not exist in the database";
      throw error;
    }
    //Validation: Ensure the update doesn't change the type field
    if(existingCoupon.type!==updateData.type){
      const error = new Error("Type did not match");
      error.status = 400; 
      error.extraDetails = "Type of the coupon can not be changed";
      throw error;
    };
    //  Validation: Ensure the update doesn't remove required fields
    if (updateData.details) {
      //  Cart-wise Coupon
      if (existingCoupon.type === "cart-wise") {
        if (
          updateData.details.threshold == undefined ||  updateData.details.discount === undefined
        ) {
          const error = new Error("Request is not complete");
          error.status = 400; 
          error.extraDetails = "cart-wise coupon update must include both threshold and discount";
          throw error;
        }
      }

      // Product-wise Coupon
      if (existingCoupon.type === "product-wise") {
        if (
          updateData.details.product_id == undefined || updateData.details.discount === undefined
        ) {
  
          const error = new Error("Request is not complete");
          error.status = 400; 
          error.extraDetails = "Product-wise coupon update must include both product_id and discount";
          throw error;
        }
      }
      // BxGy Coupon
      if (existingCoupon.type === "bxgy") {
        if (
          updateData.details.buy_products == undefined ||
          (!Array.isArray(updateData.details.buy_products) ||
            updateData.details.buy_products.length === 0)
        ) {
          const error = new Error("Request is not complete");
          error.status = 400; 
          error.extraDetails = "BxGy coupon update must include valid `buy_products` array.";
          throw error;
        }

        if (
          updateData.details.get_products == undefined ||
          (!Array.isArray(updateData.details.get_products) ||
            updateData.details.get_products.length === 0)
        ) {
          const error = new Error("Request is not complete");
          error.status = 400; 
          error.extraDetails = "BxGy coupon update must include valid get_products array.";
          throw error;
        }
      }
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({
      message: "Coupon updated successfully",
      updatedCoupon,
    });
  } catch (error) {
    next(error)
  }
};