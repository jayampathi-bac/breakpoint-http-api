require("dotenv").config();
const serverless = require("serverless-http");
const express = require("express");
const app = express();
const {s3UploadV2} = require("./s3Service");
const {saveScrappedData} = require("./src/scrape/web-scrape");
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
    console.log('file', file)
    if (file.mimetype === 'text/html' && file.fieldname === 'html') {
        cb(null, true);
    } else if (file.mimetype === 'text/css' && file.fieldname === 'css') {
        cb(null, true);
    } else {
        cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {fileSize: 1000000000, files: 2},
});

const multiUpload = upload.fields([
    {name: "html", maxCount: 1},
    {name: "css", maxCount: 1},
]);

app.post("/upload", multiUpload, async (req, res) => {
    console.log('------------------------- multiple upload api called -----------------------------------')
    console.log(req.files)
    try {
        const results = await s3UploadV2(req.files);
        console.log(results);
        return res.json({status: "success", message: results});
    } catch (err) {
        console.log(err);
    }
});

app.get("/scrape", async (req, res, next) => {
    let { method, body } = req;
    const { url } = body;
    const styleData = await saveScrappedData(JSON.parse(url))
    return res.status(200).json({
        message: `scraped from ${url}`,
        styleData: styleData
    });
});


app.use((req, res, next) => {
    return res.status(404).json({
        error: "Not Found",
    });
});

module.exports.handler = serverless(app);
