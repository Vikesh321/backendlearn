import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"



const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    try {
        const filter = {}
        if (query) {
            filter.$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ]
        }
        if (userId) {
            filter.userId = userId
        }
        const sortOptions = { [sortBy]: sortType === 'asc' ? 1 : -1 }
        const skip = (page - 1) * limit;
        const videos = await Video.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(parent(limit))
            const totalVideos =await Video.countDocuments(filter)
            return res
            .status(200)
            .json(
                new ApiResponse(
                    200,"Data Send successfully",{
                        success:true,
                        data:videos,
                        pagination:{
                            currentPage:parseInt(page),
                            totalPage:Math.ceil(total/limit),
                            totalItems:totalVideos,
                            itemsPerPage:perseInt(limit)
                        }    
                    }
                )
            )
    } catch (error) {
        throw new ApiError(500, "Failed to fetch the video")
    }

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!title || title.length===0){
        throw new ApiError(400,"Title filed is required")
    }
    if(!description || description.length===0){
        throw new ApiError(400,"Description filed is required")
    }
    let videoFilePath=req.files?.videoFile[0].path
    let thumbnailPath=req.files?.thumbnail[0].path

    if(!videoFilePath){
        throw new ApiError(400,"Video file is required ")
    }
    if(!thumbnailPath){
        throw new ApiError(400,"thumbnail  file is required ")
    }

    const video=await uploadOnCloudinary(videoFilePath)
    const thumbnail=await uploadOnCloudinary(thumbnailPath)
    if(!video){
         throw new ApiError(400,"video is required")
    }
    if(!thumbnail){
        throw new ApiError(400,"thumnail is required")
    }

    const uploadVideo=await Video.create({
        title:title,
        owner:req.user?._id,
        description:description,
        videoFile:video.url,
        duration:video.duration,
        isPublished:true
    })
    if(!uploadVideo){
        throw new ApiError(404,"Video file is not uploaded")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200,"Video is uploaded successfully",{uploadVideo})
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }
    const video=await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"Video not found ")
    }
    return res
    .status(200)
    .json(200,{video},"Video fetched successfully")
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if(!isValidObjectId(videoId)){
     throw new ApiError(400,"Invalid video id")
    }
    const video=await Video.findById(videoId)
    if(video.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(400,"only owner of video can update thumbnail")
    }
    const thumbnailPath=req.file?.path
    if (!thumbnail) {
        throw new ApiError(400,"thumnail file is required to updated")
    }
    const thumbnail=await uploadOnCloudinary(thumbnailPath)
    const updatevideoDetails=await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                thumbnail:thumbnail.url
            }
        },
        {new:true}
    )
  if(!updatevideoDetails){
    throw new ApiError(400,"Thumbnail could not be updated")
  }
  return res 
  .status(200)
  .json(
    new ApiResponse(200,"Thumbnail updated successfully",{thumbnail})
)
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
   if(!isValidObjectId(videoId)){
    throw new ApiError(400,"Video id is invalid")
   }
   const video=await findById(videoId)
   if(video.owner.toString()!==req.user?._id.toString()){
    throw new ApiError(400,"owner can delete your video")
   }
   const deleteVideo=await Video.findByIdAndDelete(videoId)
   if(!deleteVideo){
    throw new ApiError(400,"video cannot be deleted")
   }
   return res
   .status(200)
   .json(
    new ApiResponse( 200,"Video is deleted successfully",{deleteVideo})
   )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}