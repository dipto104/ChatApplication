const { addMessage, getAllMessages, markAsRead, unsendMessage, removeMessageForMe } = require("../controllers/messageController");
const { addReaction, removeReaction } = require("../controllers/reactionController");
const router = require("express").Router();

const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

router.post("/addmsg/", addMessage);
router.post("/uploadimg/", upload.single("image"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded" });
    }
    res.json({ filename: req.file.filename });
});
router.post("/getmsg/", getAllMessages);
router.post("/markasread/", markAsRead);
router.post("/unsendmsg/", unsendMessage);
router.post("/removemsg/", removeMessageForMe);
router.post("/react/", addReaction);
router.delete("/react/", removeReaction);

module.exports = router;
