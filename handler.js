require("dotenv").config();
const serverless = require("serverless-http");
const express = require("express");
const app = express();
const {s3UploadV2} = require("./s3Service");
const {saveScrappedData} = require("./src/scrape/web-scrape");
const multer = require("multer");
const {S3} = require("aws-sdk");
const fs = require("fs");

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
    // let { method, body } = req;
    // const { url } = body;
    const url = 'https://test-upload-bucket-devy.s3.amazonaws.com/unprocessed-data/2022-07-15T13%3A19%3A00.844Z-647ed5ed-4f4a-4dad-b605-ab1747750cfd/index.html'
    const styleData = await saveScrappedData(url)
    return res.status(200).json({
        message: `scraped from ${url}`,
        styleData: styleData
    });
});

app.get("/save-tmp", async (req, res, next) => {
    const s3 = new S3();
    const fileKey = 'uploads/c0d34399-93d7-4d64-89ed-0e079cd1e03e-index.html';

    const options = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileKey,
    };

    res.attachment(fileKey);
    const path = '/tmp/test1/test.html'
    const stream = fs.createWriteStream(path);

    const fileStream = s3.getObject(options).createReadStream();
    fileStream.pipe(stream);

    const data = fs.readFileSync(path, {encoding:'utf8', flag:'r'});

    return res.status(200).json({
        message: `scraped from ${path}`,
        file: data
    });
});


app.use((req, res, next) => {
    return res.status(404).json({
        error: "Not Found",
    });
});

module.exports.handler = serverless(app);
