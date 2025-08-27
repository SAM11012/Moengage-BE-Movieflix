const Movie = require('../models/Movie');
const logger = require('../utils/logger');

class AnalyticsService {
  async getGenreDistribution() {
    try {
      const pipeline = [
        { $unwind: '$genre' },
        {
          $group: {
            _id: '$genre',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            movies: { $push: { title: '$title', year: '$year', rating: '$rating' } }
          }
        },
        { $sort: { count: -1 } },
        {
          $project: {
            genre: '$_id',
            count: 1,
            avgRating: { $round: ['$avgRating', 1] },
            topMovies: { $slice: ['$movies', 3] },
            _id: 0
          }
        }
      ];

      const result = await Movie.aggregate(pipeline);
      return result;
    } catch (error) {
      logger.error('Error getting genre distribution:', error.message);
      throw error;
    }
  }

  async getRatingDistribution() {
    try {
      const pipeline = [
        {
          $bucket: {
            groupBy: '$rating',
            boundaries: [0, 2, 4, 6, 8, 10],
            default: 'Unknown',
            output: {
              count: { $sum: 1 },
              avgRating: { $avg: '$rating' },
              movies: {
                $push: {
                  title: '$title',
                  year: '$year',
                  rating: '$rating'
                }
              }
            }
          }
        },
        {
          $project: {
            range: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 0] }, then: '0-2' },
                  { case: { $eq: ['$_id', 2] }, then: '2-4' },
                  { case: { $eq: ['$_id', 4] }, then: '4-6' },
                  { case: { $eq: ['$_id', 6] }, then: '6-8' },
                  { case: { $eq: ['$_id', 8] }, then: '8-10' }
                ],
                default: 'Unknown'
              }
            },
            count: 1,
            avgRating: { $round: ['$avgRating', 1] },
            _id: 0
          }
        },
        { $sort: { range: 1 } }
      ];

      const result = await Movie.aggregate(pipeline);
      return result;
    } catch (error) {
      logger.error('Error getting rating distribution:', error.message);
      throw error;
    }
  }

  async getYearlyStats() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$year',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            avgRuntime: { $avg: '$runtime' },
            topMovies: {
              $push: {
                title: '$title',
                rating: '$rating',
                genre: '$genre'
              }
            }
          }
        },
        {
          $project: {
            year: '$_id',
            count: 1,
            avgRating: { $round: ['$avgRating', 1] },
            avgRuntime: { $round: ['$avgRuntime', 0] },
            topMovies: { $slice: [{ $sortArray: { input: '$topMovies', sortBy: { rating: -1 } } }, 5] },
            _id: 0
          }
        },
        { $sort: { year: -1 } }
      ];

      const result = await Movie.aggregate(pipeline);
      return result;
    } catch (error) {
      logger.error('Error getting yearly stats:', error.message);
      throw error;
    }
  }

  async getOverallStats() {
    try {
      const pipeline = [
        {
          $group: {
            _id: null,
            totalMovies: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            avgRuntime: { $avg: '$runtime' },
            minYear: { $min: '$year' },
            maxYear: { $max: '$year' },
            totalGenres: { $addToSet: '$genre' },
            highestRated: { $max: '$rating' },
            lowestRated: { $min: '$rating' }
          }
        },
        {
          $project: {
            totalMovies: 1,
            avgRating: { $round: ['$avgRating', 1] },
            avgRuntime: { $round: ['$avgRuntime', 0] },
            yearRange: {
              $concat: [
                { $toString: '$minYear' },
                ' - ',
                { $toString: '$maxYear' }
              ]
            },
            uniqueGenres: { $size: { $reduce: { input: '$totalGenres', initialValue: [], in: { $setUnion: ['$$value', '$$this'] } } } },
            ratingRange: {
              $concat: [
                { $toString: '$lowestRated' },
                ' - ',
                { $toString: '$highestRated' }
              ]
            },
            _id: 0
          }
        }
      ];

      const result = await Movie.aggregate(pipeline);
      return result[0] || {};
    } catch (error) {
      logger.error('Error getting overall stats:', error.message);
      throw error;
    }
  }

  async getTopMovies(limit = 10, sortBy = 'rating') {
    try {
      const sortOptions = {
        rating: { rating: -1 },
        year: { year: -1 },
        runtime: { runtime: -1 },
        searches: { searchCount: -1 }
      };

      const movies = await Movie.find()
        .sort(sortOptions[sortBy] || sortOptions.rating)
        .limit(limit)
        .select('title year genre director rating runtime poster searchCount')
        .lean();

      return movies;
    } catch (error) {
      logger.error('Error getting top movies:', error.message);
      throw error;
    }
  }

  async getSearchTrends() {
    try {
      const pipeline = [
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$lastSearched'
              }
            },
            searchCount: { $sum: '$searchCount' },
            uniqueMovies: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
        {
          $project: {
            date: '$_id',
            searchCount: 1,
            uniqueMovies: 1,
            _id: 0
          }
        }
      ];

      const result = await Movie.aggregate(pipeline);
      return result;
    } catch (error) {
      logger.error('Error getting search trends:', error.message);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();