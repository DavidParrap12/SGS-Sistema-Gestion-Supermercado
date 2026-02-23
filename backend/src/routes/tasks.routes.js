import { Router } from "express";
import { 
    getTasks,
    getTask,
    createTask,
    updateTask,
    deleteTask 
} from "../controllers/tasks.controller.js";
import { authRequired } from "../middlewares/ValidateToken.js";

const router = Router();

// Todas las rutas de tareas requieren autenticación
router.get('/tasks', authRequired, getTasks);
router.get('/tasks/:id', authRequired, getTask);
router.post('/tasks', authRequired, createTask);
router.put('/tasks/:id', authRequired, updateTask);
router.delete('/tasks/:id', authRequired, deleteTask);

export default router;