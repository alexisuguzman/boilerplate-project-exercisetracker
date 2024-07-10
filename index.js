const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

//Connect to mongoose
mongoose
  .connect(process.env.URI)
  .then(() => {
    console.log("Successfully connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB Atlas: ", err);
  });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("connected to the database");
});

//Create Schema for "User" and "Exercise"
const userSchema = new mongoose.Schema({
  username: { type: "string", required: true, unique: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: "string", required: true },
  duration: { type: "number", required: true },
  date: { type: "date", required: true },
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// POST User endpoint
app.post("/api/users", (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username: username });
  newUser.save().then((user) => {
    res.json({ username: user.username, _id: user.id });
  });
});

//GET User endpoint
app.get("/api/users", (req, res) => {
  User.find({}).then((user) => {
    res.json(user);
  });
});

//POST Exercise
app.post("/api/users/:_id/exercises", (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const exerciseDate = date ? new Date(date) : new Date();
  const newExercise = new Exercise({
    userId: _id,
    description,
    duration,
    date: exerciseDate.toDateString(),
  });

  newExercise.save().then((savedExercise) => {
    User.findById(_id).then((user) => {
      res.json({
        _id: _id,
        username: user.username,
        date: savedExercise.date.toDateString(),
        duration: savedExercise.duration,
        description: savedExercise.description,
      });
    });
  });
});

// GET User Logs
app.get("/api/users/:_id/logs", (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  User.findById(_id).then((user) => {
    if (!user) return res.status(404).json({ error: "User not found" });

    let query = { userId: _id };
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    Exercise.find(query)
      .limit(Number(limit))
      .then((exercises) => {
        res.json({
          username: user.username,
          count: exercises.length,
          _id: user._id,
          log: exercises.map((ex) => ({
            description: ex.description,
            duration: ex.duration,
            date: ex.date.toDateString(),
          })),
        });
      });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
