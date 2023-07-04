const express = require('express');
const app = express();
const { mongoose } = require('./db/mongoose');


const bodyParser = require('body-parser');

//Load in the mongoose models
const { List, Task, User } = require('./db/models');
const { verify } = require('jsonwebtoken');
const jwt = require('jsonwebtoken');

/**
 * MIDDLEWARE
 */


//Load Middleware
app.use(bodyParser.json());

//CORS HEADERS MIDDLEWARE
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

    res.header(
        'Access-Control-Expose-Headers',
        'x-access-token, x-refresh-token'
    );

    next();
});
// check whether the request has a valid JWT access token
let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    // verify the JWT
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
            // there was an error
            // jwt is invalid - * DO NOT AUTHENTICATE *
            res.status(401).send(err);
        } else {
            // jwt is valid
            req.user_id = decoded._id;
            next();
        }
    });
}

// Verify Refresh Token Middleware (which will be verifying the session)
let verifySession = (req, res, next) => {   
    // grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // user couldn't be found
            return Promise.reject({
                'error': 'User not found. Make sure that the refresh token and user id are correct'
            });
        }


        // if the code reaches here - the user was found
        // therefore the refresh token exists in the database - but we still have to check if it has expired or not

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((sessions) => {
            if (sessions.token === refreshToken) {
                console.log("62")
                // check if the session has expired
                if (User.hasRefreshTokenExpired(sessions.expiresAt) === false) {
                    console.log("hii");
                    // refresh token has not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is VALID - call next() to continue with processing this web request
            console.log("success");
            next();
        } else {
            // the session is not valid
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }

    }).catch((e) => {
        res.status(401).send(e);
    })
}   


  /**End  MIDDLEWARE */




/* Route Handlers */

/* LIST ROUTES */
/**
 * GET /lists
 * Purpose : Get all Lists
 */
app.get('/lists', authenticate, (req, res) => {
   // we want to return any array of all the lists that belong to the authenticated user
   List.find({
  //  _userId:req.user_id
   }).then((lists)=>{
    res.send(lists); 

   });
})
/**
 * POST /lists
 * Purpose : Create a List
 */
app.post('/lists', (req, res) =>{
    //We want to create a new list and return the list document back to the user(which incude the id)
    //THe list information (fields) will be passed in via the JSON request body
    let title = req.body.title;

    let newList = new List({
        title
    });
    newList.save().then((listDoc) =>{
        // the full list document is returned (incl. id)
        res.send(listDoc);
    })
});
/**
 * PATH /lists/:id
 * Purpose : UPdate a specified list
 */
app.patch('/lists/:id',(req, res)=>{
    //We want to update the spcified list (list document with id in the URL) with the new values specified in the JSON body of the request
    List.findOneAndUpdate({ _id: req.params.id }, {
        $set:req.body
    }).then(() =>{
        res.sendStatus(200);
    })
});
app.delete('/lists/:id',(req, res) => {
    //We want to delete the specified list (document with id in th URL)
    List.findOneAndRemove({
        _id: req.params.id
    }).then((removedListDoc) => {
        res.send(removedListDoc);

        //delete all tasks that are in the deleted list
        deleteTasksFromList(removedListDoc._id);
    })
});

/**
 * GET/lists/:listId/tasks
 * Purpose: Get all tasks in a specific list
 */
app.get('/lists/:listId/tasks', (req,res) =>{
    //We want to return all tasks that belong to a specific lists (specified by listId)
    Task.find({
        _listId:req.params.listId
    }).then((tasks) =>{
        res.send(tasks);
    })
})
// app.get('/lists/:listId/tasks/:taskId',(req,res) => {
//     Task.findOne({
//         _id:req.params.taskId,
//     _listId:req.params.listId        
//     }).then((task) =>{
//         res.send(task);
//     })
// });

/**
 * POST /lists/:listId/tasks
 * Purpose:Create a new task in a specific list
 */
app.post('/lists/:listId/tasks', (req,res) => {
    // we want to create a new task in a list specified by listId
    let newTask = new Task({
        title:req.body.title,
        _listId:req.params.listId
    })
    newTask.save().then((newTaskDoc) =>{
        res.send(newTaskDoc);
    })
})
/**
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: Update an existing task 
 */
app.patch('/lists/:listsId/tasks/:taskId',(req,res) => {
    //We want to update an existing task (specified by taskId)
    Task.findOneAndUpdate
    List.findOneAndRemove({ 
        _id: req.params.taskId,
        _listId: req.params.listId     
    },{
        $set:req.body
    }
).then(() =>{
    res.send({message: 'Updated Sucessfully.'});
})
});
/**
 * DELETE /lists/:listId/tasks/:taskId
 * Purpose: Delete a Task
 */
app.delete('/lists/:listId/tasks/:taskId',(req, res) =>{
    Task.findOneAndRemove({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((removedTaskDoc) => {
        res.send(removedTaskDoc);
    })
});





/** USER ROUTES */
/**
 * POST /users
 * Purpose: Sign up
 * 
 */
app.post('/users', (req, res) => {
    //User sign up

    let body = req.body;
    let newUser = new User(body);
    newUser.save().catch(err => {
        console.log('err', err)

    }).then((res) =>{
        return newUser.createSession();
    }).then((refreshToken) => {
        console.log('refreshToken', refreshToken)
        //Session created sucessfully - refreshToken returned.
        //now we generate an access auth token for the user

        return newUser.generateAccessAuthToken().then((accessToken) => {
            console.log('accessToken 167', accessToken)
            //access auth token generated sucessfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken}
        });
    }).then((authTokens) => {
        //Now we construct and send the response to the user with their auth token in the header and th user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
})

/**
 * POST /users/login
 * Purpose : Login
 * 
 */
app.post('/users/login',(req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) =>{
        console.log('email', email)
        return user.createSession().then((refreshToken)=>{
            //session created sucessfully -refreshToken
            //now we generate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) =>{
                //access auth token generated sucessfully, now we return  an object containing the auth token
                return { accessToken, refreshToken}

            }).catch(err => err);
        }).then((authTokens)=>{
        //Now we construct and send the response to the user with their auth token in the header and th user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });

})

/**Helper */
let deleteTasksFromList = (_listId) => {
    Task.deleteMany({
        _listId
    }).then(() => {
        console.log("Tasks from " + _listId + " were deleted!");
    }) 
}
app.listen(3000,() => {
    console.log("Server is listening on port 3000");
    
});

/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 */
app.get('/users/me/access-token', verifySession, (req, res) =>{
    //we know that the user caller is authenticated and we have the user id and user object available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token',accessToken).send({ accessToken }); 
        console.log("296");
    }).catch((e) => {
        res.status(400).send(e);
    });

})