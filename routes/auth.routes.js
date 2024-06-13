const authcontroller = require("../controller/authcontroller")

const router = require("express").Router()

router
    .post("/login", authcontroller.loginUser)
    .post("/register", authcontroller.registerUser)
    .post("/logout", authcontroller.logoutUser)
    .post("/verify-otp", authcontroller.verifyOtp)

module.exports = router