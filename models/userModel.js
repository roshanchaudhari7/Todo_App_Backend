// import mongoose to define a schema and interact with MongoDB
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// define the user schema
const userSchema = new Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
});

// export the model
// Collection name will be 'users' in MongoDB
module.exports = mongoose.model("user", userSchema);