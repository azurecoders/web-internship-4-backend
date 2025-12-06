import User from "../models/User.js";
import DriverProfile from "../models/DriverProfile.js";
import { generateToken } from "../utils/generateToken.js";
import {
  validatePassengerRegister,
  validateDriverRegister,
  validateLogin,
} from "../utils/validators.js";
import {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../utils/emailService.js";

/**
 * @desc    Register a new passenger
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerPassenger = async (req, res) => {
  try {
    // Validate input
    const { isValid, errors } = validatePassengerRegister(req.body);
    if (!isValid) {
      return res.status(400).json({ errors });
    }

    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Create new user with passenger role
    const verificationCode = generateVerificationCode();
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      roles: ["passenger"],
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationCode, user.name);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    // Generate token
    const token = generateToken(user._id, user.roles);

    res.status(201).json({
      message: "Registration successful. Please check your email for verification code.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        isVerified: user.isVerified,
      },
      token,
    });
  } catch (error) {
    console.error("Register passenger error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Register a new driver
 * @route   POST /api/auth/register/driver
 * @access  Public
 */
export const registerDriver = async (req, res) => {
  try {
    // Validate input
    const { isValid, errors } = validateDriverRegister(req.body);
    if (!isValid) {
      return res.status(400).json({ errors });
    }

    const {
      name,
      email,
      password,
      phone,
      cnic,
      drivingLicense,
      gender,
      vehicleInfo,
      profilePicture,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Check if CNIC already registered
    const existingCnic = await DriverProfile.findOne({ cnic });
    if (existingCnic) {
      return res.status(400).json({ message: "CNIC already registered" });
    }

    // Check if vehicle plate already registered
    const existingPlate = await DriverProfile.findOne({
      "vehicleInfo.vehiclePlate": vehicleInfo.vehiclePlate,
    });
    if (existingPlate) {
      return res.status(400).json({ message: "Vehicle plate already registered" });
    }

    // Create new user with driver role
    const verificationCode = generateVerificationCode();
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      profilePicture: profilePicture || "",
      roles: ["driver"],
      verificationCode,
      verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Create driver profile
    const driverProfile = await DriverProfile.create({
      user: user._id,
      cnic,
      drivingLicense,
      gender: gender.toLowerCase(),
      vehicleInfo,
    });

    // Send verification email
    try {
      await sendVerificationEmail(user.email, verificationCode, user.name);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    // Generate token
    const token = generateToken(user._id, user.roles);

    res.status(201).json({
      message: "Driver registration successful. Please check your email for verification code.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        isVerified: user.isVerified,
      },
      driverProfile: {
        id: driverProfile._id,
        cnic: driverProfile.cnic,
        vehicleInfo: driverProfile.vehicleInfo,
        isApproved: driverProfile.isApproved,
      },
      token,
    });
  } catch (error) {
    console.error("Register driver error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Login user (passenger or driver)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    // Validate input
    const { isValid, errors } = validateLogin(req.body);
    if (!isValid) {
      return res.status(400).json({ errors });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in",
        requiresVerification: true,
        email: user.email,
      });
    }

    // Generate token
    const token = generateToken(user._id, user.roles);

    // Get driver profile if user is a driver
    let driverProfile = null;
    if (user.roles.includes("driver")) {
      driverProfile = await DriverProfile.findOne({ user: user._id });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        profilePicture: user.profilePicture,
      },
      driverProfile: driverProfile
        ? {
            id: driverProfile._id,
            vehicleInfo: driverProfile.vehicleInfo,
            isApproved: driverProfile.isApproved,
            rating: driverProfile.rating,
          }
        : null,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get driver profile if user is a driver
    let driverProfile = null;
    if (user.roles.includes("driver")) {
      driverProfile = await DriverProfile.findOne({ user: user._id });
    }

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles: user.roles,
        profilePicture: user.profilePicture,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      driverProfile: driverProfile
        ? {
            id: driverProfile._id,
            cnic: driverProfile.cnic,
            drivingLicense: driverProfile.drivingLicense,
            gender: driverProfile.gender,
            vehicleInfo: driverProfile.vehicleInfo,
            isApproved: driverProfile.isApproved,
            isAvailable: driverProfile.isAvailable,
            rating: driverProfile.rating,
            totalRides: driverProfile.totalRides,
            totalEarnings: driverProfile.totalEarnings,
          }
        : null,
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Verify email with code
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    // Generate token
    const token = generateToken(user._id, user.roles);

    res.status(200).json({
      message: "Email verified successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        isVerified: user.isVerified,
      },
      token,
    });
  } catch (error) {
    console.error("Verify email error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Resend verification code
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, verificationCode, user.name);

    res.status(200).json({
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Forgot password - send reset code
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        message: "If an account exists with this email, a reset code will be sent",
      });
    }

    // Generate reset code
    const resetCode = generateVerificationCode();
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(user.email, resetCode, user.name);

    res.status(200).json({
      message: "If an account exists with this email, a reset code will be sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Reset password with code
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        message: "Email, reset code, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    // Update password
    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({
      message: "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
