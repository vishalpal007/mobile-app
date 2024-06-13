const mongoose = require("mongoose")

const authSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
    },
    password: {
        type: String,
        required: true
    },
    otp: { type: String },
    otpExpiry: { type: Date }
}, { timestamps: true })

module.exports = mongoose.model("auth", authSchema)