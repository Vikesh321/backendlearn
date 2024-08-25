import { Router } from "express";
import { channngeCurrentPassword, getCurrentuser, getUserChannelProfile, getWatchHistory, loggoutUser, loginUser, refreshAccessToken, registerUser, updatedAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import {upload} from "../middlewears/multer.middlewears.js"
import { verifyJWT } from "../middlewears/auth.middlewear.js";
const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// secured routes
router.route("/logout").post( verifyJWT,loggoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,channngeCurrentPassword)
router.route("/current-user").get(verifyJWT,getCurrentuser)
router.route("/update-account").patch(verifyJWT,updatedAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory)
export default router