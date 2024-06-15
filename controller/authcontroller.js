const asyncHandler = require("express-async-handler")
const validator = require("validator")
const Auth = require("../model/Auth")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const sendEmail = require("../utils/email")


exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, phone, password } = req.body
    // Validation\\

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Please provide a valid email" });
    }
    if (!validator.isStrongPassword(password)) {
        return res.status(400).json({ message: "Please provide a strong password" });
    }
    // Validation\\

    const result = await Auth.findOne({ email })

    if (result) {
        return res.status(400).json({ message: "email already register with us" })
    }

    const phoneExist = await Auth.findOne({ phone })

    if (phoneExist) {
        return res.status(400).json({ message: "phone already register with us" })
    }

    const hashPass = await bcrypt.hash(password, 10)

    await Auth.create({ name, email, phone, password: hashPass })

    res.json({ message: "User Register Success" })
})

exports.loginUser = asyncHandler(async (req, res) => {
    const { emailOrPhone, password } = req.body;

    if (!emailOrPhone || !password) {
        return res.status(400).json({ message: "Email/Phone and password are required" });
    }

    const result = await Auth.findOne({
        $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
    });

    if (!result) {
        return res.status(404).json({ message: "User not found" });
    }

    const verifyPass = await bcrypt.compare(password, result.password);

    if (!verifyPass) {
        return res.status(400).json({ message: "Password does not match" });
    }

    const generateOtp = Math.floor(1000 + Math.random() * 9000);
    console.log(generateOtp);

    const styledServer = `<html>
    <head>
        <style>
            body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #333; }
            h1 { color: #007BFF; }
            p { font-size: 16px; line-height: 1.6; color: #555; }
            .phone-number { background-color: #87CEEB; padding: 10px; display: inline-block; color:white; }
            .center-text { text-align: left; }
            .left-text { text-align: left; }
            .signature { margin-top: 20px; font-style: italic; }
        </style>
    </head>
    <body>
        <p class="left-text" style="font-weight: bold;">Hello, ${result.name},</p>
        <p class="center-text">
            Your OTP is ${generateOtp}
        </p>
        <p class="center-text signature">Best regards,<br>Our Company.</p>
    </body>
</html>`;

    await sendEmail({
        to: result.email,
        html: styledServer,
        subject: `Verify OTP`
    });

    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000);

    result.otp = generateOtp;
    result.otpExpiry = otpExpiry;
    await result.save();

    res.json({
        message: "OTP sent to email. Please verify to complete login.",
    });
});

exports.verifyOtp = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
    }

    const result = await Auth.findOne({ otp });

    if (!result) {
        return res.status(400).json({ message: "Invalid OTP" });
    }

    if (result.otpExpiry < Date.now()) {
        await Auth.updateOne(
            { _id: result._id },
            { $unset: { otp: 1, otpExpiry: 1 } }
        );
        return res.status(400).json({ message: "OTP has expired" });
    }

    await Auth.updateOne(
        { _id: result._id },
        { $unset: { otp: 1, otpExpiry: 1 } }
    );

    const token = jwt.sign({ userId: result._id }, process.env.JWT_KEY, { expiresIn: "7d" });

    res.cookie("auth", token, { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true });

    res.json({
        message: "User login success",
        token,
        result: {
            name: result.name,
            email: result.email,
            phone: result.phone
        }
    });
});

exports.logoutUser = asyncHandler(async (req, res) => {
    res.clearCookie("auth")
    res.json({ message: "User Logout Success" })
})


exports.requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    if (!validator.isEmail(email)) {
        return res.status(400).json({ message: "Please provide a valid email" });
    }

    const user = await Auth.findOne({ email });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const generateOtp = Math.floor(1000 + Math.random() * 9000);
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // OTP valid for 2 minutes

    user.otp = generateOtp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const styledServer = `<html>
        <head>
            <style>
                body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; color: #333; }
                h1 { color: #007BFF; }
                p { font-size: 16px; line-height: 1.6; color: #555; }
                .phone-number { background-color: #87CEEB; padding: 10px; display: inline-block; color:white; }
                .center-text { text-align: left; }
                .left-text { text-align: left; }
                .signature { margin-top: 20px; font-style: italic; }
            </style>
        </head>
        <body>
            <p class="left-text" style="font-weight: bold;">Hello, ${user.name},</p>
            <p class="center-text">
                Your OTP is ${generateOtp}
            </p>
            <p class="center-text signature">Best regards,<br>Our Company.</p>
        </body>
    </html>`;

    await sendEmail({
        to: user.email,
        html: styledServer,
        subject: "Password Reset OTP"
    });

    res.json({ message: "OTP sent to email. Please verify to reset your password." });
});



exports.verifyOtpForReset = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
    }

    const user = await Auth.findOne({ otp });

    if (!user) {
        return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
        await Auth.updateOne({ _id: user._id }, { $unset: { otp: 1, otpExpiry: 1 } });
        return res.status(400).json({ message: "OTP has expired" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: '15m' }); // Token valid for 15 minutes

    res.json({ message: "OTP verified. You can now reset your password.", token });
});




exports.resetPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token) {
        return res.status(400).json({ message: "Token is required" });
    }

    if (!newPassword) {
        return res.status(400).json({ message: "New password is required" });
    }

    if (!validator.isStrongPassword(newPassword)) {
        return res.status(400).json({ message: "Please provide a strong password" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        const userId = decoded.userId;

        const user = await Auth.findById(userId);

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const hashPass = await bcrypt.hash(newPassword, 10);
        user.password = hashPass;

        await Auth.updateOne(
            { _id: user._id },
            { $unset: { otp: 1, otpExpiry: 1, isOtpVerified: 1 }, password: hashPass }
        );

        res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (err) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }
})