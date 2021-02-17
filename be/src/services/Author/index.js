const express = require("express")
const router = express.Router()
const AuthorModel = require("./AuthorsSchema")

const { authenticate } = require("../auth/tools")
const { authorize } = require("../auth/middleware")

router.post('/', async (req, res, next) => {
    try{
        const newAuthor = new AuthorModel(req.body);
        const {_id} = await newAuthor.save()
        res.status(201).send({id: _id});
    } catch(error){
        console.log(error);
        next(error)
    }
})

router.get("/", authorize,  async(req, res, next) => {
    try{
        const authors = await AuthorModel.find(req.query)
        res.send(authors)
    } catch(error){
        console.log(error)
        next(error)
    }
})

router.get("/me", authorize, async (req, res, next) => {
  try {
    res.send(req.user)
  } catch (error) {
    next(error)
  }
})

router.post("/register", async (req, res, next) => {
  try {
    const newUser = new AuthorModel(req.body)
    const { _id } = await newUser.save()

    res.status(201).send(_id)
  } catch (error) {
    next(error)
  }
})

router.get("/:id", async(req, res, next) => {
    try{
        const id = req.params.id;
        const author = await AuthorModel.findById(id)
        if(author){
            res.send(author)
        } else {
            next("i made a BooBoo")
        }
    } catch (error){
        console.log(error)
        next(error)
    }
})
/*
router.put("/:id", async (req, res, next) => {
    try {
      const author = await AuthorModel.findByIdAndUpdate(req.params.id, req.body)
      if (author) {
        res.send("Ok")
      } else {
        const error = new Error(`author with id ${req.params.id} not found`)
        error.httpStatusCode = 404
        next(error)
      }
    } catch (error) {
      next(error)
    }
  })*/

  router.put("/me", authorize, async (req, res, next) => {
    try {
      const updates = Object.keys(req.body)
      updates.forEach(update => (req.user[update] = req.body[update]))
      await req.user.save()
      res.send(req.user)
    } catch (error) {
      next(error)
    }
  })

  router.delete("/me", authorize, async (req, res, next) => {
    try {
      await req.user.deleteOne(res.send("Deleted"))
    } catch (error) {
      next(error)
    }
  })

  /*
  router.delete("/:id", async (req, res, next) => {
    try {
      const author = await AuthorModel.findByIdAndDelete(req.params.id)
      if (author) {
        res.send("Deleted")
      } else {
        const error = new Error(`author with id ${req.params.id} not found`)
        error.httpStatusCode = 404
        next(error)
      }
    } catch (error) {
      next(error)
    }
  })
*/

router.post("/login", async (req, res, next) => {
  try {
    const { name, password } = req.body
    const user = await AuthorModel.findByCredentials(name, password)
    const tokens = await authenticate(user)
    res.send(tokens)
  } catch (error) {
    console.log('login: ', error)
    next(error)
  }
})

module.exports = router
