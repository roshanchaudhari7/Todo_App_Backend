const express = require("express"); // import express
const mongoose = require("mongoose"); // import mongoose
// imports the cli-color module to enable colored console output (for better readability / logging) 
const clc = require("cli-color");

// mongoose model representing a user in the database
const userModel = require("./models/userModel");

// for password hashing
const bcrypt = require("bcrypt");

const validator = require("validator");

// custome utility function to clean up and validae user input
const { cleanupAndValidate } = require("./utils/authUtils");

// Loads environment variables from a .env file into process.env 
require("dotenv").config();

const app = express();

// Middleware to parse JSON and URL-encoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// view engine configuration
app.set("view engine", "ejs");

// Connect to MongoDB using connection string
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log(clc.yellowBright("MongoDb connected successfully"));
    })
    .catch((error) => {
        console.log(clc.redBright(error));
    })

// Root route
app.get("/", (req, res) => {
    res.send("Server is running");
})

// GET Method
app.get("/signup", (req, res) => {
    return res.render("signup"); // Renders signup.ejs
})

// POST Method
app.post("/signup", async (req, res) => {
    console.log(req.body);

    // destructure values
    const { name, email, username, password } = req.body;

    // clean and validate input data
    try {
        await cleanupAndValidate({ name, email, username, password });
    } catch (error) {
        return res.send({
            status: 400,
            message: "Data Error",
            error: error
        })
    }

    // Check if email already exists in the database
    const userEmailExist = await userModel.findOne({ email: email });
    if (userEmailExist) {
        return res.send({
            status: 400,
            message: "Email already exist"
        });
    }

    // Check if username already exists in the database
    const userNameExist = await userModel.findOne({ username: username });
    if (userNameExist) {
        return res.send({
            status: 400,
            message: "Username already exist"
        });
    }

    // Hashing the password
    const hashedPassword = await bcrypt.hash(
        password,
        parseInt(process.env.SALT)
    );
    console.log(password, hashedPassword);

    // create a new user
    const userObj = new userModel({
        name: name,
        email: email,
        username: username,
        password: hashedPassword
    });

    // Save the user to the database
    try {
        const userDb = await userObj.save();

        return res.send({
            status: 201,
            message: "user created, registeration successfull!",
            data: userDb,
        });
    } catch (error) {
        return res.send({
            status: 500,
            message: "Data base error",
            error: error,
        });
    }
})

app.get("/login", (req, res) => {
    return res.render("login"); // Renders login.ejs
})

app.post("/login", async (req, res) => {
    const { loginId, password } = req.body;

    // Identify loginId by email or username
    try {
        let userDb;
        if (validator.isEmail(loginId)) {
            userDb = await userModel.findOne({ email: loginId });
            if (!userDb) {
                return res.send({
                    status: 400,
                    message: "Email not found"
                });
            }
        } else {
            userDb = await userModel.findOne({ username: loginId });
            if (!userDb) {
                return res.send({
                    status: 400,
                    message: "Username not found"
                });
            }
        }

        // Compare password with hashed password in database
        const isMatched = await bcrypt.compare(password, userDb.password);
        if (!isMatched) {
            return res.send({
                status: 400,
                message: "Password incorrect"
            });
        }
        return res.send("Login successfull");
    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error",
            error: error
        });
    }
})

app.listen(process.env.PORT, () => {
    console.log(clc.yellowBright.underline(`http://localhost:${process.env.PORT}`));
})