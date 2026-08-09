import mongoose from "mongoose";

const flightSchema =
  new mongoose.Schema({

    source: String,

    destination: String,

    departure_time: String,

    arrival_time: String,

    duration: String,

    price: Number,

    airline: String,

    operator_class: String,

    reliability_score: Number,

    on_time_percentage: Number
  });

flightSchema.index({ source: 1, destination: 1 });

const Flight = mongoose.model(
  "Flight",
  flightSchema
);

export default Flight;
