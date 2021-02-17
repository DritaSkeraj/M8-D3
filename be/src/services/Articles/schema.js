const { Schema } = require("mongoose")
const mongoose = require("mongoose")

const ArticleSchema = new Schema(
    {
        headline: {
            type: String,
            required: true,
        }, 
        subHead: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        category: {
            name: {
                type: String,
                required: true,
            },
            img: {
                type: String,
                required: true,
            }
        },
        author: [
            { type: Schema.Types.ObjectId, ref: "Author" }
        ],
        cover: {
            type:String,
            required: true,
        },
        reviews: {
            type: [{
                text: {
                    type: String,
                    required: true,
                },
                author: {
                    type: Schema.Types.ObjectId, 
                    ref: "Author",
                }
            }],
            default: []
        }
    }, 
    {timestamps: true}
)

module.exports = mongoose.model("Article", ArticleSchema)