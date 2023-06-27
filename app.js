const express = require('express');
const app = express();

const { mongoose } = require('./db/mongoose');


const bodyParser = require('body-parser');

//Load in the mongoose models
const { List, Task } = require('./db/models');


//Load Middleware
app.use(bodyParser.json());

//CORS HEADERS MIDDLEWARE
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

/* Route Handlers */

/* LIST ROUTES */
/**
 * GET /lists
 * Purpose : Get all Lists
 */
app.get('/lists',(req, res) => {
   // we want to return any array of all the lists in the database
   List.find({}).then((lists)=>{
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
    })
});
/**
 * GET/lists/:listId/tasks
 * Purpose: Get all tasks in a specific list
 */
app.get('/lists/:listID/tasks', (req,res) =>{
    //We want to return all tasks that belong to a specific lists (specified by listId)
    Task.find({
        _listId:req.params.listID
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
    res.sendStatus(200);
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
app.listen(3000,() => {
    console.log("Server is listening on port 3000");
    
});