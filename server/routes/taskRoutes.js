import express from "express"
import { createTask, deleteTask, updateTask } from "../controllers/taskController.js"

const taskRouter = express.Router()

taskRouter.post('/', createTask)
taskRouter.put('/', updateTask)
taskRouter.post('/', deleteTask)

export default taskRouter
