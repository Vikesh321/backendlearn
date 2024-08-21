import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    apli_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET

})

const uploadOneCloudinary = async (loccalFilePath) => {
    try {
        if (!loccalFilePath) return null
        const response = await cloudinary.uploader.upload(loccalFilePath, {
            resource_type: "auto"
        })
        // file has been uploaded successfull
        console.log('file is uploaded successfull',
            response.url);
        return response
    } catch (error) {
        fs.unlinkSync(loccalFilePath) // reomve the locally save temporary file as the uploded operation failed
        return null
    }
}
export { uploadOneCloudinary }