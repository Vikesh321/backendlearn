import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOneCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { json } from "express"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something wrong while generating and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend 
    // validation
    // check if user alreay exists:username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object -create entry in bd
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const { fullName, email, username, password } = req.body
    console.log("email", email);
    if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOneCloudinary(avatarLocalPath)
    const coverImage = await uploadOneCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })

    const createduser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createduser) {
        throw new ApiError(500, "Something went wrong while register user")
    }

    return res.status(201).json(
        new ApiResponse(200, createduser, "User register successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // req body->data
    // username or email
    // find user
    // password check
    // access and refresh token
    // send cookie

    try {
        const { email, username, password } = req.body

        if (!(username || email)) {
            throw new ApiError(400, "username or password is required")
        }

        const user = await User.findOne({
            $or: [{ username }, { email }]
        })
        if (!user) {
            throw new ApiError(404, "User dose not exist")
        }
        const isPasswordValid = await user.isPasswordCorrect(password)
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user credential")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

        const options = {
            httponly: true,
            secure: true
        }
        return res.
            status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200, {
                    user: loggedInUser, accessToken, refreshToken
                },
                    "User logged In Successfuly"
                )
            )
    } catch (error) {
        throw new ApiError(404, "user not found")
    }
})


const loggoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httponly: true,
        secure: true
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingrefreshToken = req.cookie.refreshToken || req.cookies.refreshToken

    if (!incomingrefreshToken) {
        throw new ApiError(401, "Unauthorized request")
    }

    const decodedToken = jwt.verify(
        incomingrefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )
    const user = await User.findById(decodedToken?._id)
    if (!user) {
        throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingrefreshToken !== user?.refreshToken) {
        throw new ApiError(401, "Refresh token is rquired or used")
    }

    const options = {
        httponly: true,
        secure: true
    }

    try {
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res.status(200)
            .cookie("accesstoken", accessToken)
            .cookie("newRefreshToken", newRefreshToken)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken, newRefreshToken
                    },
                    "Access token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }

})


const channngeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password change successfully"))
})

const getCurrentuser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(200, req.user, "current user fetched successfully")
})

const updatedAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
            }
        },
        { new: true }
    ).select("-password")
    return res
        .status(200)
        / json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }
    const avatar = await uploadOneCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")
    return res.status(200)
        .json(
            new ApiResponse(200, user, "image Image updated successfully.")
        )
})
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (coverImageLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }
    const coverImage = await uploadOneCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res.status(200)
        .json(
            new ApiResponse(200, user, "Cover Image updated successfully.")
        )
})

export {
    registerUser,
    loginUser,
    loggoutUser,
    refreshAccessToken,
    channngeCurrentPassword,
    getCurrentuser,
    updatedAccountDetails,
    updateUserAvatar,
    updateUserAvatar,
    updateUserCoverImage
}
