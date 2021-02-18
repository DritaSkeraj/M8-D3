const express = require("express");
const router = express.Router();
const ArticlesModel = require("./schema");
const AuthorModel = require("../Author/AuthorsSchema");
const mongoose = require("mongoose");
const q2m = require("query-to-mongo");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");

const { authenticate } = require("../auth/tools");
const { authorize } = require("../auth/middleware");

const transporter = nodemailer.createTransport(
  smtpTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    auth: {
      user: process.env.gmail,
      pass: process.env.password,
    },
  })
);

const sendEmail = async () => {
  try {
    let info = await transporter.sendMail({
      to: ["drita.skeraj97@gmail.com"],
      from: process.env.gmail,
      subject: "Welcome ", // Subject line
      text: `Hi thank you for registering`, // plain text body
      html: `<b>Hi thank you for registering</b>`, // html body
    });
  } catch (err) {
    console.log(err);
  }
};

transporter.sendMail(sendEmail, function (error, info) {
  if (error) {
    // console.log('email:::::::::::', error);
  } else {
    console.log("Email sent: " + info.response);
  }
});

router.post("/", authorize, async (req, res, next) => {
  try {
    const payload = {
      author: [req.author._id],
      ...req.body,
    };
    const newArticle = new ArticlesModel(payload);
    console.log("new article: ", newArticle);
    const { _id } = await newArticle.save();
    res.status(201).send({ id: _id });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/", authorize, async (req, res, next) => {
  try {
    const query = q2m(req.query);
    const total = await ArticlesModel.countDocuments(query.criteria);
    const articles = await ArticlesModel.find(
      query.criteria,
      query.options.fields
    )
      .populate("author") //sends author object toObject
      .sort(query.options.sort)
      .skip(query.options.skip)
      .limit(query.options.limit);

    res.status(200).send({ links: query.links("/articles", total), articles });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get("/:id", authorize, async (req, res, next) => {
  try {
    const article = await ArticlesModel.findById(req.params.id).populate(
      "author"
    ); //author should be same as the property name
    res.status(200).send({ article });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put("/:id", authorize, async (req, res, next) => {
  const articleToUpdate = await ArticlesModel.findById(req.params.id);
  try {
    if (articleToUpdate.author[0].toString() != req.author._id.toString()) {
      const err = new Error("Unauthorized");
      err.httpStatusCode = 401;
      next(err);
    } else {
      const payload = {
        author: [req.author._id],
        ...req.body,
      };
      const article = await ArticlesModel.findByIdAndUpdate(
        req.params.id,
        payload,
        {
          runValidators: true,
          new: true,
        }
      );
      if (article) res.status(200).send({ article });
      else {
        const error = new Error(`Article with id ${req.params.id} not found`);
        error.httpStatusCode = 404;
        next(error);
      }
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete("/:id", authorize, async (req, res, next) => {
  const articleToDelete = await ArticlesModel.findById(req.params.id);
  try {
    if (articleToDelete.author[0].toString() != req.author._id.toString()) {
      const err = new Error("Unauthorized");
      err.httpStatusCode = 401;
      next(err);
    } else {
      const article = await ArticlesModel.findByIdAndDelete(req.params.id);
      if (article) {
        res.status(200).send({ article });
      } else {
        const error = new Error(`User ${req.params.id} not found`);
        error.httpStatusCode = 404;
        next(error);
      }
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// POST /articles/:id => adds a new review for the specified article
router.post("/:id/", authorize, async (req, res, next) => {
  try {
    const reviewText = req.body.text;
    const reviewAuthorId = req.author._id;

    const reviewToInsert = {
      text: reviewText,
      author: reviewAuthorId,
    };
    console.log("REVIEW TO INSERT:::::::", reviewToInsert);
    const updatedArticle = await ArticlesModel.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reviews: reviewToInsert,
        },
      },
      {
        runValidators: true,
        new: true,
      }
    );
    res.status(201).send(updatedArticle);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// GET /articles/:id/reviews =>
// returns all the reviews for the specified article

router.get("/:id/reviews", authorize, async (req, res, next) => {
  try {
    const { reviews } = await ArticlesModel.findById(req.params.id);
    res.status(200).send(reviews);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

//GET /articles/:id/reviews/:reviewId =>
// returns a single review for the specified article

router.get("/:id/reviews/:reviewId", authorize, async (req, res, next) => {
  try {
    const { reviews } = await ArticlesModel.findById(req.params.id, {
      reviews: {
        $elemMatch: { _id: req.params.reviewId },
      },
    });

    if (reviews && reviews.length > 0) {
      res.send(reviews[0]);
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// PUT /articles/:id/reviews/:reviewId =>
// edit the review belonging to the specified article

router.put("/:id/reviews/:reviewId", authorize, async (req, res, next) => {
  try {
    const { reviews } = await ArticlesModel.findById(req.params.id, {
      _id: 0,
      reviews: {
        $elemMatch: {
          _id: req.params.reviewId,
        },
      },
    });

    if (reviews && reviews.length > 0) {
      const reviewToReplace = { ...reviews[0].toObject(), ...req.body };
      console.log("review to replace author: ", reviewToReplace.author);
      if (reviewToReplace.author.toString() != req.author._id.toString()) {
        const err = new Error("Unauthorized");
        err.httpStatusCode = 401;
        next(err);
      } else {
        const modifiedReview = await ArticlesModel.findOneAndUpdate(
          {
            _id: mongoose.Types.ObjectId(req.params.id),
            "reviews._id": mongoose.Types.ObjectId(req.params.reviewId),
          },
          { $set: { "reviews.$": reviewToReplace } },
          {
            runValidators: true,
            new: true,
          }
        );
        res.status(200).send(modifiedReview);
      }
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// DELETE /articles/:id/reviews/:reviewId =>
// delete the review belonging to the specified article

router.delete("/:id/reviews/:reviewId", authorize, async (req, res, next) => {
  try {
    const { reviews } = await ArticlesModel.findById(req.params.id, {
      _id: 0,
      reviews: {
        $elemMatch: {
          _id: req.params.reviewId,
        },
      },
    });

    if (reviews && reviews.length > 0) {
      const reviewToDelete = { ...reviews[0].toObject(), ...req.body };
      console.log("review to replace author: ", reviewToDelete.author);
      if (reviewToDelete.author.toString() != req.author._id.toString()) {
        const err = new Error("Unauthorized");
        err.httpStatusCode = 401;
        next(err);
      } else {
        // findByIdAndUpdate because we're not deleting the whole article,
        // we're deleting only one review inside the article
        const modifiedReview = await ArticlesModel.findByIdAndUpdate(
          req.params.id,
          {
            $pull: {
              reviews: { _id: req.params.reviewId },
            },
          }
        );
        res.status(200).send(modifiedReview);
      }
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

module.exports = router;
