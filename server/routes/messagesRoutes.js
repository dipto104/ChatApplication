const { addMessage, getAllMessages, markAsRead, unsendMessage, removeMessageForMe, deleteConversation, deleteConversationForMe } = require("../controllers/messageController");
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
router.post("/uploadfile/", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ msg: "No file uploaded" });
    }
    // Return relative path suitable for DB storage
    res.json({ filename: "uploads/" + req.file.filename, originalName: req.file.originalname });
});
router.post("/getmsg/", getAllMessages);
router.post("/markasread/", markAsRead);
router.post("/unsendmsg/", unsendMessage);
router.post("/removemsg/", removeMessageForMe);
router.post("/delete-conversation/", deleteConversation);
router.post("/delete-conversation-for-me/", deleteConversationForMe);
router.post("/react/", addReaction);
router.delete("/react/", removeReaction);

module.exports = router;
