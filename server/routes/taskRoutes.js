import express from "express"
import { createTask, deleteTask, updateTask, updateTaskStatus } from "../controllers/taskController.js"

const taskRouter = express.Router()

taskRouter.post('/', createTask)
taskRouter.put('/:id', updateTask)
taskRouter.post('/delete', deleteTask)
taskRouter.put('/:id/status', updateTaskStatus);


export default taskRouter
