const express=require("express");
const coupanRouter=require("./Routers/couponRouter"); //Import the coupon router
const app=express();
const dbConenct=require("./utility/db"); //Import MongoDb connector function
const cors=require("cors");
const errorMiddleware=require("./middleWare/errorMidlleware"); //Import errorMiddleware which will handle all our error

app.use(cors()); //To allow cross-origin API requests from the browser
app.use(express.json());
require("dotenv").config();
const port = process.env.PORT;

app.use("/api/coupons",coupanRouter);
app.use((req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    error.extraDetails = "The requested endpoint does not exist on this server.";
    next(error); 
  });
  
app.use(errorMiddleware)


dbConenct().then(app.listen(port,()=>{
    console.log("started listeniong at ",port)
}))
