const express = require("express"); // import express
const mongoose = require("mongoose"); // import mongoose
const clc = require("cli-color"); // imports the cli-color module to enable colored console output (for better readability / logging) 
const userModel = require("./models/userModel"); // mongoose model representing a user in the database
const bcrypt = require("bcrypt"); // for password hashing
const validator = require("validator");
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);
const { cleanupAndValidate } = require("./utils/authUtils"); // custome utility function to clean up and validae user input
const isAuth = require("./middleware/isAuth");
const todoModel = require("./models/todoModel");
require("dotenv").config(); // Loads environment variables from a .env file into process.env 

const app = express();
const store = new mongoDbSession({
    uri: process.env.MONGO_URI,
    collection: "sessions"
});

// Middleware to parse JSON and URL-encoded payloads
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs"); // view engine configuration

// Session configuration
app.use(
    session({
        secret: process.env.SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        store: store
    })
)

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

        //session base auth
        console.log(req.session);
        req.session.isAuth = true;
        req.session.user = {
            email: userDb.email,
            username: userDb.username,
            loginId: userDb._id
        }

        return res.redirect("/todo");
    } catch (error) {
        return res.send({
            status: 500,
            message: "Database error",
            error: error
        });
    }
})

app.get("/todo", isAuth, (req, res) => {
    return res.render("todo");
})

// todo apis
app.post("/create-item", isAuth, async (req, res) => {
    const todoText = req.body.todo;
    const username = req.session.user.username;

    if (!todoText) {
        return res.send({
            status: 400,
            message: "Missing todo text"
        });
    } else if (typeof todoText !== "string") {
        return res.send({
            status: 400,
            message: "Todo text is not a string"
        });
    } else if (todoText.length < 3 || todoText.length > 100) {
        return res.send({
            status: 400,
            message: "Todo length should be 3-100"
        });
    }

    // create a todo in DB
    const todoObj = new todoModel({
        todo: todoText,
        username: username
    });

    try {
        const todoDb = await todoObj.save();
        return res.send({
            status: 201,
            message: "Todo created successfully",
            data: todoDb
        });
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

