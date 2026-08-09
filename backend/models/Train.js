import mongoose from "mongoose";

const trainSchema =
  new mongoose.Schema({

    source: String,

    destination: String,

    departure_time: String,

    arrival_time: String,

    duration: String,

    price: Number,

    train_name: String,

    operator_class: String,

    reliability_score: Number,

    on_time_percentage: Number
  });

trainSchema.index({ source: 1, destination: 1 });

const Train = mongoose.model(
  "Train",
  trainSchema
);

export default Train;
