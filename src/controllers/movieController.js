const Movie = require("../models/Movie");
const movieApiService = require("../services/movieApiService");
const cacheService = require("../services/cacheService");
const dataTransformer = require("../utils/dataTransformer");
const responseHandler = require("../utils/responseHandler");
const logger = require("../utils/logger");

class MovieController {
  async getTrendingMovies(req, res) {
    try {
      const { mediaType = "movie", timeWindow = "day" } = req.query;
      const base = await movieApiService.getTrendingMovies(
        mediaType,
        timeWindow
      );

      const imdbIDs = (base.movies || [])
        .map((m) => m.imdbID || m.imdb_id || m.id)
        .filter(Boolean);

      const detailed = await movieApiService.getMultipleMovieDetails(imdbIDs);
      const movies = detailed
        .filter((d) => d.success && d.data)
        .map((d) => d.data);

      responseHandler.success(
        res,
        {
          movies,
          totalResults: movies.length,
          currentPage: 1,
          source: "external_api_details",
          mediaType,
          timeWindow,
        },
        "Trending movies retrieved successfully"
      );
    } catch (error) {
      logger.error("Get trending movies error:", error.message);
      responseHandler.error(res, "Failed to retrieve trending movies", 500);
    }
  }

  async searchMovies(req, res) {
    try {
      console.log(req, req.query);
      const { search, page = 1, sort = "recent", ...filters } = req.query;

      // Generate cache key
      const cacheKey = cacheService.generateKey("movie_search", {
        search,
        page,
        sort,
        filters,
      });

      // Try to get from cache first
      let cachedResult = await cacheService.get(cacheKey);
      if (cachedResult) {
        return responseHandler.success(
          res,
          cachedResult,
          "Movies retrieved from cache"
        );
      }

      // Search in local database first
      const dbQuery = {
        $text: { $search: search },
        ...dataTransformer.buildFilterQuery(filters),
      };

      const sortQuery = dataTransformer.buildSortQuery(sort);
      const limit = 10;
      const skip = (page - 1) * limit;

      const [dbMovies, dbTotal] = await Promise.all([
        Movie.find(dbQuery).sort(sortQuery).skip(skip).limit(limit).lean(),
        Movie.countDocuments(dbQuery),
      ]);

      // If we have enough results from DB, return them
      if (dbMovies.length >= limit || page > 1) {
        const result = {
          movies: dbMovies,
          totalResults: dbTotal,
          currentPage: parseInt(page),
          totalPages: Math.ceil(dbTotal / limit),
          source: "database",
        };

        await cacheService.set(cacheKey, result, 1); // Cache for 1 hour
        return responseHandler.success(
          res,
          result,
          "Movies retrieved from database"
        );
      }

      // Fetch from external API (OMDb), then fetch details for each imdbID
      const apiResult = await movieApiService.searchMovies(search, page);

      const imdbIDs = (apiResult.movies || [])
        .map((m) => m.imdbID || m.imdb_id || m.id)
        .filter(Boolean);

      const detailed = await movieApiService.getMultipleMovieDetails(imdbIDs);
      const detailedMovies = detailed
        .filter((d) => d.success && d.data)
        .map((d) => d.data);

      const result = {
        movies: detailedMovies,
        totalResults: apiResult.totalResults,
        currentPage: parseInt(page),
        totalPages: Math.ceil(apiResult.totalResults / limit),
        source: "external_api_details",
      };

      await cacheService.set(cacheKey, result, 2); // Cache for 2 hours
      responseHandler.success(
        res,
        result,
        "Movies retrieved from external API"
      );
    } catch (error) {
      // Debug: log the full error object for diagnosis
      logger.error("Movie search error:", error);
      responseHandler.error(res, "Failed to search movies", 500);
    }
  }

  async getMovieById(req, res) {
    try {
      const { id } = req.params;

      // Try to get from database first
      let movie = await Movie.findOne({ imdbID: id });

      if (movie) {
        // Update search count and last searched
        movie.searchCount += 1;
        movie.lastSearched = new Date();
        await movie.save();

        return responseHandler.success(
          res,
          movie,
          "Movie retrieved from database"
        );
      }

      // If not in database, fetch from external API (OMDb)
      const movieData = await movieApiService.getMovieById(id);

      // Attempt to save to database, but do not fail the request if save fails
      try {
        // Work around Mongo text-index language override pitfalls by removing problematic language values
        const safeData = { ...movieData };
        if (
          typeof safeData.language === "string" &&
          safeData.language.includes(",")
        ) {
          // Multiple languages cause Mongo text index language override errors
          delete safeData.language;
        }

        movie = new Movie(safeData);
        movie.searchCount = 1;
        await movie.save();

        return responseHandler.success(
          res,
          movie,
          "Movie retrieved from external API and saved"
        );
      } catch (saveError) {
        // If save fails (e.g., language override unsupported), still return fetched data
        logger.error("Save fetched movie failed:", saveError.message);
        return responseHandler.success(
          res,
          movieData,
          "Movie retrieved from external API (not saved)",
          200
        );
      }
    } catch (error) {
      logger.error("Get movie by ID error:", error.message);
      if (error.message.includes("not found")) {
        return responseHandler.notFound(res, "Movie not found");
      }
      responseHandler.error(res, "Failed to retrieve movie", 500);
    }
  }

  async getAllMovies(req, res) {
    try {
      const { page = 1, sort = "recent", ...filters } = req.query;
      const limit = 20;
      const skip = (page - 1) * limit;

      const query = dataTransformer.buildFilterQuery(filters);
      const sortQuery = dataTransformer.buildSortQuery(sort);

      const [movies, total] = await Promise.all([
        Movie.find(query).sort(sortQuery).skip(skip).limit(limit).lean(),
        Movie.countDocuments(query),
      ]);

      const result = {
        movies,
        totalResults: total,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
      };

      responseHandler.success(res, result, "Movies retrieved successfully");
    } catch (error) {
      logger.error("Get all movies error:", error.message);
      responseHandler.error(res, "Failed to retrieve movies", 500);
    }
  }

  async deleteMovie(req, res) {
    try {
      const { id } = req.params;

      const movie = await Movie.findOneAndDelete({ imdbID: id });

      if (!movie) {
        return responseHandler.notFound(res, "Movie not found");
      }

      logger.info(`Movie deleted: ${movie.title} by user: ${req.user.email}`);
      responseHandler.success(res, null, "Movie deleted successfully");
    } catch (error) {
      logger.error("Delete movie error:", error.message);
      responseHandler.error(res, "Failed to delete movie", 500);
    }
  }

  async updateMovie(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const movie = await Movie.findOneAndUpdate(
        { imdbID: id },
        { ...updateData, lastUpdated: new Date() },
        { new: true, runValidators: true }
      );

      if (!movie) {
        return responseHandler.notFound(res, "Movie not found");
      }

      logger.info(`Movie updated: ${movie.title} by user: ${req.user.email}`);
      responseHandler.success(res, movie, "Movie updated successfully");
    } catch (error) {
      logger.error("Update movie error:", error.message);
      responseHandler.error(res, "Failed to update movie", 500);
    }
  }

  static async fetchAndSaveMovieDetails(movieList) {
    try {
      const moviePromises = movieList.map(async (movie) => {
        try {
          // Check if movie already exists in database
          const existingMovie = await Movie.findOne({ imdbID: movie.imdbID });
          if (existingMovie) {
            existingMovie.searchCount += 1;
            existingMovie.lastSearched = new Date();
            await existingMovie.save();
            return existingMovie;
          }

          // Fetch detailed data from API (TMDB)
          const detailedMovie = await movieApiService.getMovieById(
            movie.id || movie.imdbID
          );

          // Save to database
          const newMovie = new Movie(detailedMovie);
          newMovie.searchCount = 1;
          await newMovie.save();

          return newMovie;
        } catch (error) {
          logger.error(
            `Failed to fetch details for movie ${movie.id || movie.imdbID}:`,
            error.message
          );
          return null;
        }
      });

      const results = await Promise.all(moviePromises);
      return results.filter((movie) => movie !== null);
    } catch (error) {
      logger.error("Fetch and save movie details error:", error.message);
      throw error;
    }
  }
}

module.exports = new MovieController();
