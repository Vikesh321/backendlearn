import { Router } from "express";
import { loggoutUser, loginUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
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

export default router