
const { error } = require("console");
const express = require("express");
const mongoose = require("mongoose");
const clc = require("cli-color");
require("dotenv").config();
const app = express();

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log(clc.yellowBright("MongoDb connected successfully"));
    })
    .catch((error) => {
        console.log(clc.redBright(error));
    })

app.get("/", (req, res) => {
    res.send("Server is running");
})

app.listen(process.env.PORT, () => {
    console.log(clc.yellowBright.underline(`http://localhost:${process.env.PORT}`));
})