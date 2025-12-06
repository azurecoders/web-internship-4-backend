import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
    },
    // Who is giving the review
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Who is being reviewed
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Type of review
    reviewType: {
      type: String,
      enum: ["passenger-to-driver", "driver-to-passenger"],
      required: true,
    },
    // Rating (1-5 stars)
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    // Review comment
    comment: {
      type: String,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    // Review aspects (optional detailed ratings)
    aspects: {
      punctuality: {
        type: Number,
        min: 1,
        max: 5,
      },
      behavior: {
        type: Number,
        min: 1,
        max: 5,
      },
      communication: {
        type: Number,
        min: 1,
        max: 5,
      },
      // For driver reviews
      drivingSkills: {
        type: Number,
        min: 1,
        max: 5,
      },
      vehicleCondition: {
        type: Number,
        min: 1,
        max: 5,
      },
    },
    // Is the review visible
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one review per booking per reviewer
reviewSchema.index({ booking: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1 });
reviewSchema.index({ reviewType: 1 });

const Review = mongoose.model("Review", reviewSchema);

export default Review;
