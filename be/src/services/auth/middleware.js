const jwt = require("jsonwebtoken")
const AuthorModel = require("../Author/AuthorsSchema")
const { verifyJWT } = require("./tools")

const authorize = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "")
    const decoded = await verifyJWT(token)
    const author = await AuthorModel.findOne({
      _id: decoded._id,
    })

    if (!author) {
      throw new Error()
    }

    req.token = token
    req.author = author
    next()
  } catch (e) {
    const err = new Error("Please authenticate")
    err.httpStatusCode = 401
    next(err)
  }
}

module.exports = {authorize}