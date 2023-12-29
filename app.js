if(process.env.NODE_ENV !="production"){
    require("dotenv").config();
}
const express= require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true}));
const mongoose = require('mongoose');
const listing= require("./models/listing.js");
const path =require("path");
const methodOverride=require('method-override');
const ejsmate= require("ejs-mate");
const wrapAsync = require("./utils/wrapasync.js");
const ExpressError = require("./utils/Expresserror.js");
const {listingSchema}=require("./schema.js")
const reviews=require("./models/review.js");
const passport=require("passport");
const User =require("./models/user.js");
const localStrategy = require("passport-local");
const session= require("express-session");
const MongoStore = require('connect-mongo');
const { register } = require('module');
const flash= require("connect-flash");
const {isLoggedin} =require("./middleware.js");
const {saveRedirectUrl}=require("./middleware.js");
const multer  = require('multer')
const{storage}=require("./cloudConfig.js");
const upload = multer({storage});
// app.use(express.bodyParser());
const mongo_url=process.env.ATLASDB_URL;
async function main() {
    await mongoose.connect(mongo_url);
}
main()
  .then(() => {
    console.log("connected to DB connected hai");
  })
  .catch((err) => {
    console.log(err);
  });
app.set("view engine", "ejs");
app.set("views",path.join(__dirname,"views"));
app.engine("ejs", ejsmate);
app.use(express.static(path.join(__dirname,"/public")));

const store =MongoStore.create({
    mongoUrl:mongo_url,
    crypto:{
        secret: process.env.SECRET,
        touchAfter:24*3600,
    }
})
store.on("error",()=>{
    console.log("error in store")
})

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    // Other session options...
};



app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const validateListing=(req,res,next)=>{
    const {error}=listingSchema.validate(req.body);
    if(error){
        let errMsg=error.details.map((el)=>el.message).join(",");
        throw new Error(400, error);
    }
    else{next();}
}
app.use(methodOverride("_method"));

app.use((req,res,next)=>{
    res.locals.success=req.flash("success");
    res.locals.currUser=req.user;
    if(req.user){
        let {username}=req.user;
        res.locals.username=username;
    }
    
    // res.locals.username=req.user.username;
    next();
})

app.get("/demoUser",async(req,res)=>{
    let fakeUser =new User({
        email: "Hunney@gmail.com",
        username: "Hunney"
    });
    let registerUser= await User.register(fakeUser,"qwertyuiop");
    res.send(registerUser);
})





//index route
app.get("/listings",
async (req,res)=>{
    const allListings=await listing.find({});
    res.render("./listings/index.ejs",{allListings});
})
//for new listings
app.get("/listings/new", isLoggedin ,(req,res,next)=>{
    res.render("./listings/new.ejs");
})
app.put("/listings/:id",
upload.single("listing[image]"),
 validateListing,
async(req,res)=>{
    let {id}=req.params;
    let Listing=await listing.findByIdAndUpdate(id, {...req.body.listing});
    let url =req.file.path;
    let filename=req.file.filename;
    Listing.image = {url, filename};
    await Listing.save();
    res.redirect(`/listings/${id}`)
})

//create route
app.post("/listings",
isLoggedin,
upload.single("listing[image]"),
validateListing,
async (req,res,next)=>{
    let url =req.file.path;
    let filename=req.file.filename;
    listingSchema.validate(req.body);
    const newlistings= new listing(req.body.listing);
    newlistings.image={url , filename}
    await newlistings.owners.push(req.user._id);
    await newlistings.save();
    res.redirect("/listings"); 
});
//show route
app.get("/listings/:id", wrapAsync(async(req,res)=>{
    let {id}=req.params;
    const Listing= await listing.findById(id).populate({path:"reviews",populate:{path: "author"}}).populate("owners");
    console.log(Listing);
    console.log(req.user);
    res.render("./listings/show.ejs",{Listing})
}))




//edit route
app.get("/listings/:id/edit",isLoggedin,wrapAsync(async (req,res)=>{
    let {id}=req.params;
    const Listing= await listing.findById(id);
    res.render("./listings/edit.ejs",{Listing})
}))

//delete route
app.delete("/listings/:id", isLoggedin,wrapAsync(async (req,res)=>{
    let {id}=req.params;
    await listing.findByIdAndDelete(id);
    res.redirect("/listings");
}));

//reviews route
//post route
app.post("/listings/:id/reviews",isLoggedin,async(req,res,next)=>{
    let Listing= await listing.findById(req.params.id);
    let newreview = new reviews(req.body.review);
    newreview.author=req.user._id;
    console.log(newreview);
    Listing.reviews.push(newreview);
    await newreview.save();
    await  Listing.save();
    res.redirect(`/listings/${Listing._id}`)
})


//delete review route
app.delete("/listings/:id/reviews/:reviewID",isLoggedin,wrapAsync(async(req,res)=>{
        let{id, reviewID}=req.params;
        await listing.findByIdAndUpdate(id,{$pull:{reviews:reviewID}});
        await reviews.findByIdAndDelete(reviewID);
        res.redirect(`/listings/${id}`);
}))

//signup route
app.get("/signup",(req,res)=>{
    res.render("./users/signup.ejs");
})
app.get("/login",(req,res)=>{
    res.render("./users/login.ejs");
})
app.get("/login1",(req,res)=>{
    res.render("./users/login1.ejs");
})

app.post("/signup",async(req,res,next)=>{
    try{let {email ,username ,password}=req.body;
    const newuser = new User({email,username});
    const registerUser = await User.register(newuser,password);
    console.log(registerUser);
    req.login(registerUser,(err)=>{
        if(err){
            return next(err);
        }
        req.flash("welcome");
        res.redirect("/listings");
    })
    
} catch(e){
    next(e);
}});

//login route
app.post('/login', saveRedirectUrl,
  passport.authenticate('local', { failureRedirect: '/login', failureFlash:true }),
  function(req, res) {
    let redirecturl= res.locals.URL ||"./listings";
    res.redirect(redirecturl);
  });

//logout route
app.get("/logout",(req,res,next)=>{
    req.logout((err)=>{
        if(err){
            return next(err);
        }
        req.flash("success", "you are successfully logout");
        res.redirect("/login1");
    })
})
// app.get("/testlisting" ,async(req,res)=>{
//     let samplelisting= new listing({
//         title: "my new villa",
//         description: "by the beach",
//         price :1200,
//         location:"Goa",
//         country:"india"

//     });
//     await samplelisting.save();
//     console.log("sample was saved");
//     res.send("successful testing");

// });
async function main(){
    await mongoose.connect(mongo_url);
}
main().then(()=>{
    console.log('connected to DB');
})
.catch((err)=>{
    console.log(err);
})

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"page not found!"));

})

// error handling
app.use((err,req,res,next)=>{
    let{statuscode=500,message="something went wrong"}=err;
    // res.status(statuscode).send(message);
    // res.send("something went wrong!");
    res.render("./error.ejs",{message});
})


app.listen(8080 ,()=>{
    console.log("we are live WOHO!");
}) 