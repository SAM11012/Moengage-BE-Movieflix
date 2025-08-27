const axios = require("axios");
const https = require("https");
const config = require("../config/env");
const logger = require("../utils/logger");
const dataTransformer = require("../utils/dataTransformer");
class MovieApiService {
  constructor() {
    this.baseURL = "https://www.omdbapi.com/";
    this.apiKey = config.OMDB_API_KEY;
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      httpsAgent: new https.Agent({ keepAlive: true }),
      headers: { Accept: "application/json" },
      params: { apikey: this.apiKey },
    });

    if (!this.apiKey) {
      logger.warn("OMDB_API_KEY is not set. External movie search will fail.");
    } else {
      logger.debug("OMDB_API_KEY detected (masked)");
    }

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (reqConfig) => {
        try {
          logger.debug("OMDb API Request:", {
            url: reqConfig.url,
            params: reqConfig.params || {},
          });
        } catch (_) {}
        return reqConfig;
      },
      (error) => {
        logger.error("OMDb API Request Error:", error.message);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug("OMDb API Response received");
        return response;
      },
      (error) => {
        try {
          logger.error("OMDb API Response Error:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          });
        } catch (_) {
          logger.error("OMDb API Response Error:", error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  async searchMovies(searchTerm, page = 1) {
    try {
      const sanitizedTerm = dataTransformer.sanitizeSearchQuery(searchTerm);
      const response = await this.axiosInstance.get("/", {
        params: { s: sanitizedTerm, page, type: "movie" },
      });

      if (response.data.Response === "False") {
        return { movies: [], totalResults: 0, currentPage: page };
      }

      const searchResults = response.data.Search || [];
      return {
        movies: searchResults,
        totalResults:
          parseInt(response.data.totalResults) || searchResults.length,
        currentPage: page,
      };
    } catch (error) {
      try {
        logger.error("Error searching movies:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      } catch (_) {
        logger.error("Error searching movies:", error.message);
      }
      throw new Error(`Failed to search movies from OMDb: ${error.message}`);
    }
  }

  async getMovieById(id) {
    try {
      const response = await this.axiosInstance.get("/", {
        params: { i: id, plot: "full" },
      });

      if (response.data.Response === "False") {
        throw new Error("Movie not found");
      }

      return dataTransformer.transformOMDbMovie(response.data);
    } catch (error) {
      try {
        logger.error("Error fetching movie details:", {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        });
      } catch (_) {
        logger.error("Error fetching movie details:", error.message);
      }
      throw new Error(
        `Failed to fetch movie details from OMDb: ${error.message}`
      );
    }
  }

  async getMultipleMovieDetails(imdbIDs) {
    try {
      const promises = imdbIDs.map((id) => this.getMovieById(id));
      const results = await Promise.allSettled(promises);

      return results.map((result, index) => ({
        imdbID: imdbIDs[index],
        success: result.status === "fulfilled",
        data: result.status === "fulfilled" ? result.value : null,
        error: result.status === "rejected" ? result.reason.message : null,
      }));
    } catch (error) {
      logger.error("Error fetching multiple movie details:", error.message);
      throw error;
    }
  }

  // OMDb doesn't provide official trending; emulate by fetching latest releases for the current year
  async getTrendingMovies(mediaType = "movie", timeWindow = "day") {
    try {
      const targetYear = new Date().getFullYear();
      const fallbackYear = targetYear - 1;
      const broadTerms = ["the", "new", "love", "war", "day", "night"]; // >= 3 chars for OMDb

      const collectByYear = async (year) => {
        const seen = new Set();
        const collected = [];
        for (const term of broadTerms) {
          for (let page = 1; page <= 3; page += 1) {
            try {
              const resp = await this.axiosInstance.get("/", {
                params: { s: term, page, type: "movie", y: year },
              });
              if (resp.data.Response === "False") break;
              const items = Array.isArray(resp.data.Search)
                ? resp.data.Search
                : [];
              for (const item of items) {
                if (!item || !item.imdbID || seen.has(item.imdbID)) continue;
                seen.add(item.imdbID);
                collected.push(item);
                if (collected.length >= 40) return collected;
              }
            } catch (e) {
              continue;
            }
          }
          if (collected.length >= 40) break;
        }
        return collected;
      };

      let moviesCurrent = await collectByYear(targetYear);
      if (moviesCurrent.length < 10) {
        const moviesPrev = await collectByYear(fallbackYear);
        moviesCurrent = moviesCurrent.concat(moviesPrev);
      }

      const limited = moviesCurrent.slice(0, 20);
      return {
        movies: limited,
        totalResults: moviesCurrent.length,
        currentPage: 1,
        mediaType,
        timeWindow,
        year: targetYear,
      };
    } catch (error) {
      try {
        logger.error("Error fetching trending (latest) movies from OMDb:", {
          message: error.message,
        });
      } catch (_) {
        logger.error(
          "Error fetching trending (latest) movies from OMDb:",
          error.message
        );
      }
      throw new Error(
        `Failed to fetch latest movies from OMDb: ${error.message}`
      );
    }
  }
}

module.exports = new MovieApiService();
