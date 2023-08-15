const mongoose = require('mongoose');

const ListSchema = new mongoose.Schema({
    title:{
        type: String,
        required: true,
        minlength:1,
        trim:true
    },
    //with auth
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
    }

})

const List = mongoose.model( 'List', ListSchema);

module.exports = { List }