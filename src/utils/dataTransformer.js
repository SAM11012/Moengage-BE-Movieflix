class DataTransformer {
  transformOMDbMovie(omdb) {
    return {
      imdbID: omdb.imdbID || omdb.imdb_id || null,
      title: omdb.Title || omdb.title || "Untitled",
      year: omdb.Year ? parseInt(omdb.Year) : 0,
      genre:
        typeof omdb.Genre === "string"
          ? omdb.Genre.split(",").map((g) => g.trim())
          : [],
      director:
        omdb.Director && omdb.Director !== "N/A" ? omdb.Director : "Unknown",
      actors:
        typeof omdb.Actors === "string" && omdb.Actors !== "N/A"
          ? omdb.Actors.split(",").map((a) => a.trim())
          : [],
      rating:
        omdb.imdbRating && omdb.imdbRating !== "N/A"
          ? Math.round((parseFloat(omdb.imdbRating) / 2) * 10) / 10
          : 0,
      runtime: this.parseRuntime(omdb.Runtime),
      plot: omdb.Plot && omdb.Plot !== "N/A" ? omdb.Plot : "",
      poster: omdb.Poster && omdb.Poster !== "N/A" ? omdb.Poster : null,
      language: omdb.Language || "",
      country: omdb.Country || "",
      awards: omdb.Awards || "",
      metascore:
        omdb.Metascore && omdb.Metascore !== "N/A"
          ? parseInt(omdb.Metascore)
          : null,
      imdbRating:
        omdb.imdbRating && omdb.imdbRating !== "N/A"
          ? parseFloat(omdb.imdbRating)
          : 0,
      imdbVotes: omdb.imdbVotes || "0",
      boxOffice: omdb.BoxOffice || null,
    };
  }
  transformTMDBMovie(tmdbData) {
    const genres = (tmdbData.genres || []).map((g) => g.name);
    const directors = (tmdbData.credits?.crew || [])
      .filter((c) => c.job === "Director")
      .map((d) => d.name);
    const actors = (tmdbData.credits?.cast || [])
      .slice(0, 5)
      .map((a) => a.name);
    return {
      imdbID: tmdbData.imdb_id || tmdbData.id?.toString(),
      title: tmdbData.title || tmdbData.name,
      year: tmdbData.release_date
        ? parseInt(tmdbData.release_date.split("-")[0])
        : 0,
      genre: genres,
      director: directors[0] || "Unknown",
      actors: actors,
      rating:
        typeof tmdbData.vote_average === "number"
          ? Math.round((tmdbData.vote_average / 2) * 10) / 10
          : 0,
      runtime: Array.isArray(tmdbData.runtime)
        ? tmdbData.runtime[0]
        : tmdbData.runtime || null,
      plot: tmdbData.overview || "",
      poster: tmdbData.poster_path
        ? `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}`
        : null,
      language: Array.isArray(tmdbData.spoken_languages)
        ? tmdbData.spoken_languages.map((l) => l.english_name).join(", ")
        : "",
      country: Array.isArray(tmdbData.production_countries)
        ? tmdbData.production_countries.map((c) => c.name).join(", ")
        : "",
      awards: "",
      metascore: null,
      imdbRating:
        typeof tmdbData.vote_average === "number" ? tmdbData.vote_average : 0,
      imdbVotes:
        typeof tmdbData.vote_count === "number"
          ? tmdbData.vote_count.toString()
          : "0",
      boxOffice: tmdbData.revenue ? `$${tmdbData.revenue}` : null,
    };
  }

  parseRuntime(runtime) {
    if (!runtime || runtime === "N/A") return null;
    const match = runtime.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  sanitizeSearchQuery(query) {
    return query
      .trim()
      .replace(/[^\w\s-]/g, "")
      .substring(0, 100);
  }

  buildSortQuery(sortBy) {
    const sortOptions = {
      title: { title: 1 },
      year: { year: -1 },
      rating: { rating: -1 },
      runtime: { runtime: -1 },
      recent: { createdAt: -1 },
    };
    return sortOptions[sortBy] || sortOptions.recent;
  }

  buildFilterQuery(filters) {
    const query = {};

    if (filters.genre) {
      query.genre = { $in: [new RegExp(filters.genre, "i")] };
    }

    if (filters.year) {
      query.year = parseInt(filters.year);
    }

    if (filters.minRating) {
      query.rating = { $gte: parseFloat(filters.minRating) };
    }

    return query;
  }
}

module.exports = new DataTransformer();
