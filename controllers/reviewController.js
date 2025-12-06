import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import DriverProfile from "../models/DriverProfile.js";
import User from "../models/User.js";

/**
 * @desc    Create a review (Passenger reviews Driver OR Driver reviews Passenger)
 * @route   POST /api/reviews
 * @access  Private
 */
export const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment, aspects } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Find the booking
    const booking = await Booking.findById(bookingId).populate("ride");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Booking must be completed
    if (booking.status !== "completed") {
      return res.status(400).json({ message: "Can only review completed rides" });
    }

    // Determine review type and reviewee
    const isPassenger = booking.passenger.toString() === req.user._id.toString();
    const isDriver = booking.ride.driver.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(403).json({ message: "You are not part of this booking" });
    }

    let reviewType, reviewee;
    if (isPassenger) {
      reviewType = "passenger-to-driver";
      reviewee = booking.ride.driver;
    } else {
      reviewType = "driver-to-passenger";
      reviewee = booking.passenger;
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      booking: bookingId,
      reviewer: req.user._id,
    });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this ride" });
    }

    // Create review
    const review = await Review.create({
      booking: bookingId,
      ride: booking.ride._id,
      reviewer: req.user._id,
      reviewee,
      reviewType,
      rating,
      comment,
      aspects,
    });

    // Update driver's average rating if passenger reviewed driver
    if (reviewType === "passenger-to-driver") {
      await updateDriverRating(reviewee);
    }

    // Populate the review for response
    const populatedReview = await Review.findById(review._id)
      .populate("reviewer", "name profilePicture")
      .populate("reviewee", "name profilePicture");

    res.status(201).json({
      message: "Review submitted successfully",
      review: populatedReview,
    });
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Helper function to update driver's average rating
 */
const updateDriverRating = async (driverId) => {
  const reviews = await Review.find({
    reviewee: driverId,
    reviewType: "passenger-to-driver",
    isVisible: true,
  });

  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await DriverProfile.findOneAndUpdate(
      { user: driverId },
      { rating: Math.round(avgRating * 10) / 10 } // Round to 1 decimal
    );
  }
};

/**
 * @desc    Get reviews for a user (driver or passenger)
 * @route   GET /api/reviews/user/:userId
 * @access  Public
 */
export const getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, page = 1, limit = 10 } = req.query;

    const query = { reviewee: userId, isVisible: true };
    if (type) {
      query.reviewType = type;
    }

    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("reviewer", "name profilePicture")
      .populate({
        path: "ride",
        select: "origin destination departureDate",
      });

    const total = await Review.countDocuments(query);

    // Calculate stats
    const stats = await Review.aggregate([
      { $match: { reviewee: userId, isVisible: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        },
      },
    ]);

    res.status(200).json({
      reviews,
      stats: stats[0] || {
        avgRating: 0,
        totalReviews: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
      },
    });
  } catch (error) {
    console.error("Get user reviews error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get reviews I've given
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
export const getMyGivenReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ reviewer: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("reviewee", "name profilePicture")
      .populate({
        path: "ride",
        select: "origin destination departureDate",
      });

    const total = await Review.countDocuments({ reviewer: req.user._id });

    res.status(200).json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
      },
    });
  } catch (error) {
    console.error("Get my given reviews error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get reviews I've received
 * @route   GET /api/reviews/received
 * @access  Private
 */
export const getMyReceivedReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ reviewee: req.user._id, isVisible: true })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("reviewer", "name profilePicture")
      .populate({
        path: "ride",
        select: "origin destination departureDate",
      });

    const total = await Review.countDocuments({ reviewee: req.user._id, isVisible: true });

    // Calculate my rating stats
    const stats = await Review.aggregate([
      { $match: { reviewee: req.user._id, isVisible: true } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      reviews,
      stats: stats[0] || { avgRating: 0, totalReviews: 0 },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalReviews: total,
      },
    });
  } catch (error) {
    console.error("Get my received reviews error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Check if user can review a booking
 * @route   GET /api/reviews/can-review/:bookingId
 * @access  Private
 */
export const canReviewBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId).populate("ride");
    if (!booking) {
      return res.status(404).json({ canReview: false, message: "Booking not found" });
    }

    // Check if user is part of the booking
    const isPassenger = booking.passenger.toString() === req.user._id.toString();
    const isDriver = booking.ride.driver.toString() === req.user._id.toString();

    if (!isPassenger && !isDriver) {
      return res.status(200).json({ canReview: false, message: "Not part of this booking" });
    }

    // Check if booking is completed
    if (booking.status !== "completed") {
      return res.status(200).json({ canReview: false, message: "Ride not completed yet" });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      booking: bookingId,
      reviewer: req.user._id,
    });

    if (existingReview) {
      return res.status(200).json({ canReview: false, message: "Already reviewed", review: existingReview });
    }

    res.status(200).json({
      canReview: true,
      reviewType: isPassenger ? "passenger-to-driver" : "driver-to-passenger",
    });
  } catch (error) {
    console.error("Can review booking error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Get driver's public reviews (for ride details page)
 * @route   GET /api/reviews/driver/:driverId
 * @access  Public
 */
export const getDriverReviews = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { page = 1, limit = 5 } = req.query;

    const reviews = await Review.find({
      reviewee: driverId,
      reviewType: "passenger-to-driver",
      isVisible: true,
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("reviewer", "name profilePicture");

    const total = await Review.countDocuments({
      reviewee: driverId,
      reviewType: "passenger-to-driver",
      isVisible: true,
    });

    // Get driver's average rating
    const driverProfile = await DriverProfile.findOne({ user: driverId });

    res.status(200).json({
      reviews,
      driverRating: driverProfile?.rating || 0,
      totalReviews: total,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get driver reviews error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Update a review (only within 24 hours)
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment, aspects } = req.body;

    const review = await Review.findOne({ _id: id, reviewer: req.user._id });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Can only edit within 24 hours
    const hoursAgo = (Date.now() - review.createdAt) / (1000 * 60 * 60);
    if (hoursAgo > 24) {
      return res.status(400).json({ message: "Can only edit reviews within 24 hours" });
    }

    // Update fields
    if (rating) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    if (aspects) review.aspects = aspects;

    await review.save();

    // Update driver rating if needed
    if (review.reviewType === "passenger-to-driver") {
      await updateDriverRating(review.reviewee);
    }

    res.status(200).json({
      message: "Review updated successfully",
      review,
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc    Delete a review (only within 24 hours)
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findOne({ _id: id, reviewer: req.user._id });
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Can only delete within 24 hours
    const hoursAgo = (Date.now() - review.createdAt) / (1000 * 60 * 60);
    if (hoursAgo > 24) {
      return res.status(400).json({ message: "Can only delete reviews within 24 hours" });
    }

    const revieweeId = review.reviewee;
    const reviewType = review.reviewType;

    await Review.deleteOne({ _id: id });

    // Update driver rating if needed
    if (reviewType === "passenger-to-driver") {
      await updateDriverRating(revieweeId);
    }

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
