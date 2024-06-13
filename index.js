const express = require('express')
const cors = require("cors")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
require("dotenv").config({ path: "./.env" })
require("./jobs/otpCleanUp")


const app = express()

app.use(express.json())
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))
app.use(cookieParser())


app.use("/api/auth", require("./routes/auth.routes"))

app.use("*", (req, res) => {
    res.status(404).json({ message: "resource not found" })
})

app.use((err, req, res, next) => {
    console.log(err)
    res.status(500).json({ message: err.message || "something went wrong" })
})


mongoose.connect(process.env.MONGO_URL)


mongoose.connection.once("open", () => {
    console.log("mongo connected")
    app.listen(process.env.PORT, console.log("server running"))
})