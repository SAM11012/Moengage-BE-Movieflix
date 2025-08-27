const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema(
  {
    imdbID: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    genre: [
      {
        type: String,
        trim: true,
        index: true,
      },
    ],
    director: {
      type: String,
      required: true,
    },
    actors: [
      {
        type: String,
        trim: true,
      },
    ],
    rating: {
      type: Number,
      min: 0,
      max: 10,
      index: true,
    },
    runtime: {
      type: Number,
    },
    plot: String,
    poster: String,
    language: String,
    country: String,
    awards: String,
    metascore: Number,
    imdbRating: Number,
    imdbVotes: String,
    boxOffice: String,
    searchCount: {
      type: Number,
      default: 0,
    },
    lastSearched: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

movieSchema.index({ title: "text", plot: "text" });
movieSchema.index({ genre: 1, year: 1 });
movieSchema.index({ rating: -1 });

module.exports = mongoose.model("Movie", movieSchema);
