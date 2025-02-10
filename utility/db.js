const mongoose=require("mongoose");
require("dotenv").config();
const dbConenct=async()=>{
    try{
        await mongoose.connect(process.env.DB_CONNECT)
        console.log("connected to the data base");

    }
    catch(err){
        console.log("could not conenct to the database")
    }
}


module.exports=dbConenct;