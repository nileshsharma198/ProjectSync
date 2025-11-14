import express from "express";
import { addComment, getTaskComments } from "../controllers/commentController.js";

const commentRouter = express.Router();

commentRouter.post('/', addComment)
commentRouter.get('/', getTaskComments)

export default commentRouter
