import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driverProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DriverProfile",
      required: true,
    },
    // Route Information
    origin: {
      address: {
        type: String,
        required: [true, "Origin address is required"],
      },
      city: {
        type: String,
        required: [true, "Origin city is required"],
      },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },
    destination: {
      address: {
        type: String,
        required: [true, "Destination address is required"],
      },
      city: {
        type: String,
        required: [true, "Destination city is required"],
      },
      coordinates: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },
    // Stops along the way (optional)
    stops: [
      {
        address: String,
        city: String,
        fare: Number, // Fare to this stop from origin
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
    ],
    // Schedule
    departureDate: {
      type: Date,
      required: [true, "Departure date is required"],
    },
    departureTime: {
      type: String,
      required: [true, "Departure time is required"],
    },
    // Seats
    totalSeats: {
      type: Number,
      required: [true, "Total seats is required"],
      min: [1, "At least 1 seat is required"],
      max: [8, "Maximum 8 seats allowed"],
    },
    availableSeats: {
      type: Number,
      required: true,
    },
    // Pricing
    farePerSeat: {
      type: Number,
      required: [true, "Fare per seat is required"],
      min: [0, "Fare cannot be negative"],
    },
    // Ride Preferences
    preferences: {
      smokingAllowed: {
        type: Boolean,
        default: false,
      },
      petsAllowed: {
        type: Boolean,
        default: false,
      },
      musicAllowed: {
        type: Boolean,
        default: true,
      },
      acAvailable: {
        type: Boolean,
        default: true,
      },
      luggageSpace: {
        type: String,
        enum: ["small", "medium", "large"],
        default: "medium",
      },
    },
    // Additional Info
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    // Status
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    // Passengers who booked this ride
    passengers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient searching
rideSchema.index({ "origin.city": 1, "destination.city": 1 });
rideSchema.index({ departureDate: 1 });
rideSchema.index({ status: 1 });
rideSchema.index({ availableSeats: 1 });
rideSchema.index({ "origin.coordinates": "2dsphere" });
rideSchema.index({ "destination.coordinates": "2dsphere" });

// Virtual to check if ride is full
rideSchema.virtual("isFull").get(function () {
  return this.availableSeats === 0;
});

// Virtual to check if ride is in the past
rideSchema.virtual("isPast").get(function () {
  return new Date(this.departureDate) < new Date();
});

// Pre-save to set availableSeats equal to totalSeats on creation
rideSchema.pre("save", function () {
  if (this.isNew) {
    this.availableSeats = this.totalSeats;
  }
});

const Ride = mongoose.model("Ride", rideSchema);

export default Ride;
