import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    ride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ride",
      required: true,
    },
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Booking Details
    seatsBooked: {
      type: Number,
      required: [true, "Number of seats is required"],
      min: [1, "At least 1 seat must be booked"],
    },
    pickupLocation: {
      address: {
        type: String,
        required: [true, "Pickup address is required"],
      },
      city: String,
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },
    dropoffLocation: {
      address: {
        type: String,
        required: [true, "Dropoff address is required"],
      },
      city: String,
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },
    // Fare Calculation
    farePerSeat: {
      type: Number,
      required: true,
    },
    totalFare: {
      type: Number,
      required: true,
    },
    // Booking Status
    status: {
      type: String,
      enum: [
        "pending", // Waiting for driver confirmation
        "confirmed", // Driver accepted the booking
        "coming-for-pickup", // Driver is on the way to pick up
        "picked-up", // Passenger has been picked up
        "in-transit", // Ride is in progress
        "dropped-off", // Passenger has been dropped off
        "completed", // Ride completed successfully
        "cancelled", // Booking was cancelled
        "rejected", // Driver rejected the booking
      ],
      default: "pending",
    },
    // Payment Status
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online"],
      default: "cash",
    },
    // Notes
    passengerNote: {
      type: String,
      maxlength: [200, "Note cannot exceed 200 characters"],
    },
    driverNote: {
      type: String,
      maxlength: [200, "Note cannot exceed 200 characters"],
    },
    // Cancellation
    cancelledBy: {
      type: String,
      enum: ["passenger", "driver", null],
      default: null,
    },
    cancellationReason: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    // Timestamps for status changes
    confirmedAt: {
      type: Date,
    },
    comingForPickupAt: {
      type: Date,
    },
    pickedUpAt: {
      type: Date,
    },
    droppedOffAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ ride: 1, passenger: 1 });
bookingSchema.index({ passenger: 1, status: 1 });
bookingSchema.index({ status: 1 });

// Calculate total fare before saving
bookingSchema.pre("save", function () {
  if (
    this.isNew ||
    this.isModified("seatsBooked") ||
    this.isModified("farePerSeat")
  ) {
    this.totalFare = this.seatsBooked * this.farePerSeat;
  }
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
