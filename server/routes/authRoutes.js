const { register, login, getAllUsers, getActiveConversations, searchUsers } = require("../controllers/authController");
const { createGroup, getUserGroups } = require("../controllers/groupController");

const router = require("express").Router();

router.post("/register", register);
router.post("/login", login);
router.get("/allusers/:id", getAllUsers);
router.get("/active-conversations/:id", getActiveConversations);
router.get("/search/:id", searchUsers);
router.post("/create-group", createGroup);
router.get("/get-user-groups/:userId", getUserGroups);

module.exports = router;
