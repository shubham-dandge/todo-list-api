// This file will handle connection logic to MongoDB database

const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect('mongodb+srv://shubhamdandge:shubham16@cluster0.qqsmhwc.mongodb.net/TaskManager?retryWrites=true&w=majority', { useNewUrlParser: true }).then(() => {
    console.log("Connected to MongoDB sucessfully :)");
}).catch((e) => {
    console.log("Error while attempting to connect to MongoDb");
   // console.log(e);
});

//To Prevent deprectation warnings (from MongoDb native Driver)
//mongoose.set('useCreateIndex', true);
//mongoose.set('useFindAndModify',false);

module.exports = {
    mongoose
}