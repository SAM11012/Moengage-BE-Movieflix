const Joi = require("joi");
const responseHandler = require("../utils/responseHandler");

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return responseHandler.validationError(res, errors);
    }

    next();
  };
};

const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid("admin", "user").optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  movieSearch: Joi.object({
    search: Joi.string().min(1).max(100).required(),
    page: Joi.number().integer().min(1).max(100).optional(),
    sort: Joi.string()
      .valid("title", "year", "rating", "runtime", "recent")
      .optional(),
    genre: Joi.string().optional(),
    year: Joi.number()
      .integer()
      .min(1888)
      .max(new Date().getFullYear() + 5)
      .optional(),
    minRating: Joi.number().min(0).max(10).optional(),
  }),
};

module.exports = { validateRequest, schemas };
