require("dotenv").config();
const serverless = require("serverless-http");
const express = require("express");
const app = express();
const { s3UploadV2 } = require("./s3Service");
const multer = require("multer");

app.get("/", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from root!",
  });
});

app.get("/hello", (req, res, next) => {
  return res.status(200).json({
    message: "Hello from path!",
  });
});

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "text/html") {
    cb(null, true);
  } else if(file.mimetype === "text/css") {
    cb(null, true);
  } else {
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
  }
};

// ["image", "jpeg"]

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1000000000, files: 2 },
});

const multiUpload = upload.fields([
  { name: "html", maxCount: 1 },
  { name: "css", maxCount: 1 },
]);

app.post("/upload", multiUpload, async (req, res) => {
  console.log('------------------------- multiple upload api called -----------------------------------')
  console.log(req.files)
  try {
    const results = await s3UploadV2(req.files);
    console.log(results);
    return res.json({ status: "success" });
  } catch (err) {
    console.log(err);
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

module.exports.handler = serverless(app);
