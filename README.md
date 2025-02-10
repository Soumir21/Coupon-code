# Coupon-code
1. Implemented cases
a. All the coupon cases and CRUD from the PDF has been applied as it is except for the Repetition Limit
b. Validation  has been implemented, before updating and saving the coupons it is made sure all the fields are filled.
c. All the errors are handled by the error middleware with error and its details.
d. Invalid API endpoint error has been handled.
e. MondoDb has been used for database.

2. Limitations and future scopes:
a. Does not have a coupon code name. (Ex. Save 10%, Save 20% etc)
b. Suggestion for bxgy is missing. Ex. if product_2 is free with product_1, there is no way the user will know it unless
he add the product_2 by himself in the container.
c. There is no expiry date for a coupon.
d. Coupon is not user specific but general.
e. Anyone can post or modify the coupons, admin validation can be implemented.
f. In the applicable coupon array, we can sort the coupons in descending order of the discount value.
