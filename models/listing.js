const mongoose=require('mongoose');
const schema= mongoose.Schema;
const Review=require("./review.js");
const User =require("./user.js");

const listingSchema= new schema({
    title:{
        type:String,
        required :true
    },

    description: String,
    image: {
        filename:String,
        url:String,
        
    },
    price: Number,
    location : String,
    country: String,
    reviews:[{
        type: schema.Types.ObjectId,
        ref: "reviews"
    },],
    owners:[{
        type:schema.Types.ObjectId, 
        ref:"Users"

    }],


})

listingSchema.post("findOneAndDelete" , async (listing )=>{
    if(listing){
        await Review.deleteMany({_id:{$in: listing.reviews}});
    }
});

const Listing = mongoose.model("Listing", listingSchema);
module.exports =Listing;