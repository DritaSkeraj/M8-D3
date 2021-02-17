const {Schema} = require("mongoose");
const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const AuthorModel = new Schema({
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    img: {
        type: String,
        required: true,
        default: "https://placehold.it/60x60"
    }
});

AuthorModel.methods.toJSON = function () {
    const author = this
    const authorObject = author.toObject()
  
    delete authorObject.password
    delete authorObject.__v
  
    return authorObject
  }
  
  AuthorModel.statics.findByCredentials = async function(name, password) {
    const author = await this.findOne({ name })
  
    if (author) {
      const isMatch = await bcrypt.compare(password, author.password)
      if (isMatch) return author
      else return null
    } else {
      return null
    }
  }
  
  AuthorModel.pre("save", async function (next) {
    const author = this
    const plainPW = author.password
  
    if (author.isModified("password")) {
      author.password = await bcrypt.hash(plainPW, 10)
    }
    next()
  })
    

//schema exported as a model
module.exports = mongoose.model("Author", AuthorModel);