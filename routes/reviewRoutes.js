import express from "express";
import {
  createReview,
  getUserReviews,
  getMyGivenReviews,
  getMyReceivedReviews,
  canReviewBooking,
  getDriverReviews,
  updateReview,
  deleteReview,
} from "../controllers/reviewController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// ==================== PUBLIC ROUTES ====================
router.get("/user/:userId", getUserReviews);         // Get reviews for any user
router.get("/driver/:driverId", getDriverReviews);   // Get driver's public reviews

// ==================== PRIVATE ROUTES ====================
router.post("/", protect, createReview);                      // Create a review
router.get("/my-reviews", protect, getMyGivenReviews);        // Reviews I've given
router.get("/received", protect, getMyReceivedReviews);       // Reviews I've received
router.get("/can-review/:bookingId", protect, canReviewBooking); // Check if can review
router.put("/:id", protect, updateReview);                    // Update review (within 24h)
router.delete("/:id", protect, deleteReview);                 // Delete review (within 24h)

export default router;
