import { Router } from "express";
import Joi from "joi";

import { prisma } from "../config/index.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const userSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).required(),
    role: Joi.string().valid("USER", "ADMIN"),
});

const createUserSchema = userSchema;

const updateUserSchema = userSchema
    .fork(["email", "name"], (schema) => schema.optional())
    .min(1);

router.param("id", (req, res, next, id) => {
    const userId = Number(id);

    if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({
            error: "Invalid user ID",
        });
    }

    res.locals.userId = userId;
    next();
});

router.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
        }),
        prisma.user.count(),
    ]);

    res.json({
        data: users,
        meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    });
});

router.get("/:id", async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: res.locals.userId },
        include: {
            posts: {
                orderBy: { createdAt: "desc" },
            },
        },
    });

    if (!user) {
        return res.status(404).json({
            error: "User not found",
        });
    }

    res.json(user);
});

router.post("/", validate(createUserSchema), async (req, res) => {
    const user = await prisma.user.create({
        data: req.body,
    });

    res.status(201).json(user);
});

router.patch("/:id", validate(updateUserSchema), async (req, res) => {
    const user = await prisma.user.update({
        where: { id: res.locals.userId },
        data: req.body,
    });

    res.json(user);
});

router.delete("/:id", async (req, res) => {
    await prisma.user.delete({
        where: { id: res.locals.userId },
    });

    res.status(204).send();
});

export default router;
