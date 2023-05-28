const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

// body-parser for Form submit related
let bodyParser = require('body-parser');

// Mount body parser before other uses it
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//  Install and Set Up Mongoose
const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URI);

// Create a mongoDB Model / SCHEMA
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});
const Users = mongoose.model('Users', userSchema);

const exerciseSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  }
});
const Exercises = mongoose.model('Exercises', exerciseSchema);


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
//**************************************************
// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

//**************************************************
// 1. get /api/users -- return full list of users 
app.route('/api/users').get(async function(req, res) {
  console.log("get /api/users")
  let response = await Users.find()
  res.json(response);

  //*************************************************
}).post(async function(req, res) {
  console.log("post /api/users")
  // 2. post /api/user -- create Users and insert into mongoDB then show the username and user_id

  const username = req.body.username
  const newUser = new Users({ username: username });  // create new instance 
  newUser.save(function(err, data) { // insert into mongoDB
    if (err) {
      console.log(err)
      return res.json({ error: "Failed to save into mongoDB" });
    }
    // if no error, proceed to get user id
    Users.findOne({ username: username }, function(err, data) {
      if (err || !data) {
        console.log(err);
        return res.json({ error: "Failed to find ID from mongoDB" });
      }
      // if no error and there is data from mongoDB, send to browser
      // console.log(data)
      let username = data.username
      let newUserId = data.id
      // console.log(` username: ${username}, _id: ${newUserId}`)
      // return res.json({ username: username, _id: newUserId });

      //try this
      res.json({ username: username, _id: newUserId });
      return newUserId;

    });
  })
})

//*********************************************************************
// POST to /api/users/:_id/exercises with form data description, duration, and optionally date.

app.route('/api/users/:_id/exercises').post(async function(req, res) {
  console.log("post /api/users/:_id/exercises")
  // console.log(req.body)
  // const userIdInput = req.body[":_id"] || req.params[_id]
  const userIdInput = req.params._id
  const descriptionInput = req.body.description
  let durationInput = req.body.duration
  let dateInput;
  if (! /\d\d\d\d-\d\d-\d\d/.test(req.body.date)) { // if not in format like 1990-01-01 ,take today date
    dateInput = Date.now()
  } else {
    dateInput = Date.parse(req.body.date)
  }
  // console.log("**************************************************")
  // console.log({ userIdInput, descriptionInput, durationInput, dateInput })
  // console.log("**************************************************")

  // Error-handling.check if the _id format is NOT valid
  if (!mongoose.Types.ObjectId.isValid(userIdInput)) {
    return res.json({ error: "Invalid :_id format" });
  }
  if (! /^[\d]+$/.test(durationInput)) {
    return res.json({ error: "Invalid : duration format" });
  } else {
    durationInput = parseInt(req.body.duration)
  }
  if (!descriptionInput) {
    return res.json({ error: "Invalid : description forrmat" });
  }

  // query username from mongoDB
  Users.findById(userIdInput, function(err, data) {
    if (err || !data) {
      // console.log(err);
      return res.json({ error: "Failed to find username using user_Id" });
    }
    // if no error, get username, proceed to create Exercise instance and save it into mongoDB
    // console.log("-----------Id ok. Response-------------")
    // console.log(data)
    const usernameQuery = data.username
    let newExercise = new Exercises({    // create Exercises instance 
      user_id: userIdInput,
      description: descriptionInput,
      duration: parseInt(durationInput),
      date: dateInput,
    });

    newExercise.save(function(err, data) {   // save it into mongoDB
      if (err || !data) {
        // console.log(err)
        return res.json({ error: "Failed to save into mongoDB" })
      }
      // if no error, display it to browser
      // formate date to DateStrng before return
      // console.log("--------- Save ok ---------")
      // console.log(data)
      dateFormatted = new Date(data.date).toDateString()
      return res.json({ username: usernameQuery, description: data.description, duration: parseInt(data.duration), date: dateFormatted, '_id': data.user_id });

      // return res.json({ username: usernameQuery, description: descriptionInput, duration: parseInt(durationInput),   date: dateFormatted, '_id': userIdInput });
    })

  })

}).get(async function(req, res) {
  return;
})
// ********************************************
app.get('/api/users/:_id/logs', async function(req, res) {
  console.log("get /api/:_id/logs")
  // to return user info and count and list of array of exercise log.

  console.log("******OriginalUrl******")
  console.log(req.originalUrl)
  console.log("***********************")

  const userId = req.params._id
  // console.log(`userId : ${userId}`)

  console.log(req.query)
  let fromDate = Date.parse(req.query.from)
  let toDate = Date.parse(req.query.to)
  let limitNum = parseInt(req.query.limit)
  
  // Error handling of optional filter at URL
  if (isNaN(fromDate)) fromDate = Date.parse("1900-01-01")
  if (isNaN(toDate)) toDate = Date.now()
  if (!limitNum) limitNum = 9999999
  console.log({ fromDate, toDate, limitNum })


  // Error-handling.check if the _id format is NOT valid
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.json({ error: "Invalid :_id format" });
  }

  // query username using userId
  let response = await Users.findById(userId, function(err, data) {
    if (err || !data) {
      console.log(err);
      return res.json({ error: "Sorry, User does not exist" });
    }
    return data;
  })
  let usernameQuery = response.username;

  // then query for exercise using userId
  let response2 = await Exercises.find({ user_id: userId })
    .find({date : {$gte : fromDate, $lt : toDate }})
    .limit(limitNum)
    .select({ "_id": 0, user_id: 0 })
    .exec(function(err, data) {
      if (err || !data) {
        console.log(err)
        return res.json({ error: `Sorry, Query of ${userId} returns error` });
      }
      // if no error, proceed to print to browser
      console.log(data)
      let count =  data.length;
      let logArr = data.map(obj => { return {
        description: obj.description,
        duration: obj.duration,
        date: obj.date.toDateString()
        }
      })
      return res.json({ username: usernameQuery, count: count, _id: userId, log: logArr });
  })
      
       // .find({ user_id: userId, date:{ $gte : fromDate, $lt :  toDate} })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
