require("dotenv").config();
const cors = require("cors");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const dns = require("dns");
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/views/index.html");
});

// Connect to DB
mongoose.connect(
  process.env.DB_URI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  console.log("connected to db")
);

// Mongoose model
const urlSchema = mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: Number
});

// Intialise Model
const Model = mongoose.model("model", urlSchema);

// Your first API endpoint
app.post("/api/shorturl/", async (req, res) => {
  const originalUrl = req.body.url;
  const existsInDb = await Model.find({ original_url: originalUrl },{ _id: 0, __v: 0 },(err, result) => {
      if (result.length > 0) {
        // If already exists Send JSON result back to user
        res.json(result[0]);
      } else {
        // Verifiy genuine URL (strip leading http:// before passing to function)
        const testUrl = new URL(originalUrl);
        if (testUrl.protocol === "https:") {
          dns.lookup(testUrl.host, async function(err, addresses) {
            if(err){
              console.error(err);
            }
            if (addresses === undefined) {
              res.json({ error: "invalid url" });
            } else {
              await Model.findOne({}, {}, { sort: { short_url: -1 }, }, function(err,result) {
                if (result === null) {
                  const newUrl = new Model({
                    original_url: originalUrl,
                    short_url: 1
                  });
                  newUrl.save();
                } else {
                  const newUrl = new Model({
                    original_url: originalUrl,
                    short_url: parseInt(result.short_url + 1)
                  });
                  newUrl.save();
                  res.json({
                    original_url: newUrl.original_url,
                    short_url: newUrl.short_url
                  });
                }
              });
            }
          });
        } else {
          res.json({ error: "invalid url" });
        }
      }
    }
  );
});

// redirect to shorturl page once /:id is hit
app.get("/api/shorturl/:short_url", async (req, res) => {
  const id = req.params.short_url;
  const doc = await Model.find({ short_url: id });
  if (doc.length === 0) {
    res.json({ error: "no availible shorturl redirect" });
  } else {
    res.redirect(doc[0].original_url);
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
