const ExpressError = require("./utils/Expresserror.js");
module.exports.isLoggedin=(req,res,next)=>{
    req.session.redirectUrl=req.originalUrl;
    if(!req.isAuthenticated()){
        return res.redirect("/login")
    }
    next();
}
module.exports.saveRedirectUrl=(req,res,next)=>{
    if(req.session.redirectUrl){
        res.locals.URL=req.session.redirectUrl;
    }
    next();
}