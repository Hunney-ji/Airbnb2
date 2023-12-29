const mongoose = require("mongoose");
const initData= require("./data.js");
const Listing = require("../models/listing.js");
// if(process.env.NODE_ENV !="production"){
//   require("dotenv").config();
// }
// mongoose.connect('mongodb://127.0.0.1:27017/wonderland');
// const urldb=process.env.ATLASDB_URL;
const MONGO_URL = "mongodb://127.0.0.1:27017/wonderland";
async function main() {
  await mongoose.connect(MONGO_URL);
}
main()
.then(() => {
  console.log("connected to DB connected hai");
})
.catch((err) => {
  console.log('connect ni hua');
});
const initDB = async () => {
  await Listing.deleteMany({});
  initData.data=initData.data.map((obj)=>({...obj, owners: "6582a78544c83e7fa804218b"}))
  await Listing.insertMany(initData.data);
  console.log("data was initialized");
};

initDB();