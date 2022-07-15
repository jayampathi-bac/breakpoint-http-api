const {S3} = require("aws-sdk");
const uuid = require("uuid").v4;

exports.s3UploadV2 = async (files) => {
    const s3 = new S3();
    let arr = []
    files['html'].forEach((file) => {
        arr.push(file)
    })
    files['css'].forEach((file) => {
        arr.push(file)
    })
    console.log(files)
    const cur_date =  new Date().toISOString();
    const params = arr.map((file) => {
        return {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `unprocessed-data/${cur_date}-${uuid()}/${file.originalname}`,
            Body: file.buffer,
        };
    });

    return await Promise.all(params.map((param) => s3.upload(param).promise()));
};


