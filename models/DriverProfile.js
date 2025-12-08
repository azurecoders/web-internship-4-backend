import mongoose from "mongoose";

const driverProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    cnic: {
      type: String,
      required: [true, "CNIC is required"],
      unique: true,
      trim: true,
    },
    drivingLicense: {
      type: String,
      required: [true, "Driving license is required"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: [true, "Gender is required"],
    },
    vehicleInfo: {
      vehicleType: {
        type: String,
        enum: ["car", "bike", "van"],
        required: true,
      },
      vehicleModel: {
        type: String,
        required: true,
        trim: true,
      },
      vehicleColor: {
        type: String,
        required: true,
        trim: true,
      },
      vehiclePlate: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRides: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    currentLocation: {
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
  {
    timestamps: true,
  }
);

// Index for geospatial queries (find nearby drivers)
driverProfileSchema.index({ currentLocation: "2dsphere" });

const DriverProfile = mongoose.model("DriverProfile", driverProfileSchema);

export default DriverProfile;
