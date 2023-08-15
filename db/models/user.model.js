const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const e = require('express');
const bcrypt = require('bcryptjs');
//JWT Secret
const jwtSecret = "43390190916338987150fsdklafjjhcf2134414359";

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        minlength: 1,
        trim: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        minlength:8
    },
    sessions:[{
        token:{
            type:String,
            required:true,

        },
        expiresAt:{
            type: Number,
            required: true
        }
    }]
});

//**Instance Methods */
UserSchema.methods.toJSON = function(){
    const user = this;
    const userObject = user.toObject();

    //return the documents except the password and sessions(these shouldn't be made availabe)
    return _.omit(userObject, ['password','sessions']);
}
UserSchema.methods.generateAccessAuthToken = function(){
    const user = this;
    return new Promise((resolve, reject) =>{
        //create the JSON web Token and return that
        jwt.sign({ _id: user._id.toHexString()}, jwtSecret,{ expiresIn:"15m"}, (err, token) =>{
            if (!err){
                resolve(token);
            }
            else{
                // there is an error
                reject(err);
            }
        })
    })
}
UserSchema.methods.generatesRefreshAuthToken = function(){
    //THis method simply generates a 64byte hex string - it doesnt save it to the database. SaveSessionToDatabase() does that.
    return new Promise((resolve, reject) => {
        crypto.randomBytes(64,(err,buf)=>{
            if(!err){
                // no error
                let token = buf.toString('hex');

                return resolve(token);
            } else {
                reject(err);
            }
        })


    })
}

UserSchema.methods.createSession = function(){
    let user =this;
    console.log('user', user)

    return user.generatesRefreshAuthToken().then((refreshToken) =>{
        console.log('refreshToken 79', refreshToken)
        return saveSessionToDatabase(user,refreshToken);
    }).then((refreshToken)=>{
        console.log('refreshToken 81', refreshToken)
        //saved to dtabase sucessfully
        //now return the refresh token
        return refreshToken;
    }).catch((e)=>{
        console.log('e', e)
        return promiseHooks.reject('Failed to save session to database. \n' +e);

    })
}
/*MODEL METHODS (static methods) */

UserSchema.statics.getJWTSecret = () => {
    return jwtSecret;
}

UserSchema.statics.findByIdAndToken = function(_id, token){
    //finds user by id and token
    //used in auth middleware (verifySession)
    const User = this;
    return User.findOne({
        _id,
        'sessions.token':token
    });
}
UserSchema.statics.findByCredentials = function(email, password){
    let user = this;
 
    return User.findOne({ email }).then((user) =>{
        if (!user) return Promise.reject();

        return new Promise((resolve, reject) => {
            bcrypt.compare(password,user.password, (err, res) => {
                if (res) {resolve (user);
                    console.log('success user.find')
                }

                else{
                    console.log('err in user.find')
                    reject();
                }
            })
        }).catch(err => {console.log("error ni user .findcred")})
    })

}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let secondsSinceEpoch = Date.now() / 1000;
    if (expiresAt > secondsSinceEpoch ){
        //hasn't expired
        return false;
    }
    else{
        //has expired
        return true;
    }
}

/*MIDDLEWARE */
//Before a user document is saved , this code runs
UserSchema.pre('save',function(next){
    let user = this;
    let costFactor=10;


    if(user.isModified('password')){
        //if the password field  has been edited/changed thenrun thiscode.
        //Generate salt and hash password
        bcrypt.genSalt(costFactor,(err, salt) => {
            bcrypt.hash(user.password, salt, (err, hash) =>{
                user.password = hash;
                next();
            })
        })
    } else {
        next();
    }

});
/*HELPER METHODS */
let saveSessionToDatabase = (user, refreshToken) =>{
    // save session to database
    return new Promise((resolve, reject) => {
        let expiresAt = generatesRefreshTokenExpiryTime();
        console.log('expiresAt', expiresAt)

        user.sessions.push({'token' : refreshToken, expiresAt });

        user.save().then((res)=>{
            console.log('res 161', res) 
            //saved session sucessfully
            return resolve(refreshToken);
        }).catch((e)=>{
            reject(e);
        });
    })
}
let generatesRefreshTokenExpiryTime = () =>{
    let daysUntilExpire= "10";
    let secondsUntilExpire = ((daysUntilExpire * 24) *60) *60;
    return((Date.now()/1000)+ secondsUntilExpire);
}

const User = mongoose.model('User',UserSchema);
module.exports = { User }