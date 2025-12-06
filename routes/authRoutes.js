import express from "express";
import {
    getMe,
    login,
    registerDriver,
    registerPassenger,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes - Registration
router.post("/register", registerPassenger);           // Register as passenger
router.post("/register/driver", registerDriver);       // Register as driver

// Public routes - Email Verification
router.post("/verify-email", verifyEmail);             // Verify email with code
router.post("/resend-verification", resendVerification); // Resend verification code

// Public routes - Authentication
router.post("/login", login);                          // Login (both)

// Public routes - Password Reset
router.post("/forgot-password", forgotPassword);       // Request password reset
router.post("/reset-password", resetPassword);         // Reset password with code

// Protected routes
router.get("/me", protect, getMe);                     // Get current user profile

export default router;
