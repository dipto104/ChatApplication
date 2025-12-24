const { addMessage, getAllMessages, markAsRead } = require("../controllers/messageController");
const router = require("express").Router();

router.post("/addmsg/", addMessage);
router.post("/getmsg/", getAllMessages);
router.post("/markasread/", markAsRead);

module.exports = router;
