const express=require("express");
const Router=express.Router();

Router.get("/signup",(req,res)=>{
    res.send("form");
});

module.exports=Router;