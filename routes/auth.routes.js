const authcontroller = require("../controller/authcontroller")

const router = require("express").Router()

router
    .post("/login", authcontroller.loginUser)
    .post("/register", authcontroller.registerUser)
    .post("/logout", authcontroller.logoutUser)
    .post("/verify-otp", authcontroller.verifyOtp)
    .post("/requestPasswordReset", authcontroller.requestPasswordReset)
    .post("/verifyOtpForReset", authcontroller.verifyOtpForReset)
    .post("/resetPassword", authcontroller.resetPassword)

module.exports = router