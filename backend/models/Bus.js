import mongoose from "mongoose";

const busSchema =
  new mongoose.Schema({

    source: String,

    destination: String,

    departure_time: String,

    arrival_time: String,

    duration: String,

    price: Number,

    bus_name: String,

    operator_class: String,

    reliability_score: Number,

    on_time_percentage: Number
  });

busSchema.index({ source: 1, destination: 1 });

const Bus = mongoose.model(
  "Bus",
  busSchema
);

export default Bus;
