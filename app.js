//jshint esversion:6

//requiring packages-----------------------------------------------------------------------------
require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");

const mongoose = require("mongoose");

const passportLocalMongoose = require("passport-local-mongoose");
const passport = require("passport");
const session = require('express-session');

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

//setting up EJS, body-parser and the public file------------------------------------------------
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

//Initializing session----------------------------------------------------------------------------
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

//connecting to mongoose--------------------------------------------------------------------------
mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });

//setting up model and schema---------------------------------------------------------------------
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleProfile: Array
});

userSchema.plugin(findOrCreate);
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

//Creating a new strategy, serializing and deserializing user-------------------------------------
passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

//setting up and implementing strategy so we can connect our project to google---------------------
passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/TverrfagligProsjekt",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
  //Gaining accsesstoken, refreshtoken and finding or creating google user in db-------------------
  function (accessToken, refreshToken, profile, cb) {
    console.log(profile)

    User.findOrCreate({ googleProfile: profile }, function (err, user) {
      return cb(err, user);
    });
  }
));

//getting and rendering our pages-------------------------------------------------------------------
app.get("/", function (req, res) {
  res.render("home");
});

app.get("/auth/google", passport.authenticate('google', {
  scope: ['profile']
}));

//This will be the page where the user logs in with google------------------------------------------
app.get('/auth/google/TverrfagligProsjekt',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect to documentation.
    res.redirect('/documentation');
  });

app.get("/login", function (req, res) {
  res.render("login");
});

app.post("/login", passport.authenticate("local"), function(req, res){
  res.redirect("/documentation");
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/")
})

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", function (req, res) {
  User.register({username: req.body.username}, req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/documentation");
      })
    }
  });
});

app.get("/documentation", function(req, res){
  if(req.isAuthenticated()){
    res.render("documentation");
  }else{
    res.redirect("/login");
  }

  });

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
});