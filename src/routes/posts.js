import { Router } from "express";
import Joi from "joi";

import { prisma } from "../config/index.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const postSchema = Joi.object({
    title: Joi.string().required(),
    content: Joi.string().allow("", null),
    published: Joi.boolean(),
    authorId: Joi.number().integer().positive().required(),
    tags: Joi.array().items(Joi.string().trim().min(1)),
});

const createPostSchema = postSchema;

const updatePostSchema = postSchema
    .fork(["title", "authorId"], (schema) => schema.optional())
    .min(1);

const postRelations = {
    author: true,
    tags: true,
};

router.param("id", (req, res, next, id) => {
    const postId = Number(id);

    if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({
            error: "Invalid post ID",
        });
    }

    res.locals.postId = postId;
    next();
});

router.get("/", async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));

    const { search, published, authorId } = req.query;
    const where = {};

    if (search) {
        where.title = {
            contains: search,
        };
    }

    if (published !== undefined) {
        if (!["true", "false"].includes(published)) {
            return res.status(400).json({
                error: "published must be true or false",
            });
        }

        where.published = published === "true";
    }

    if (authorId !== undefined) {
        const parsedAuthorId = Number(authorId);

        if (!Number.isInteger(parsedAuthorId) || parsedAuthorId <= 0) {
            return res.status(400).json({
                error: "authorId must be a positive integer",
            });
        }

        where.authorId = parsedAuthorId;
    }

    const [posts, total] = await Promise.all([
        prisma.post.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: postRelations,
        }),
        prisma.post.count({ where }),
    ]);

    res.json({
        data: posts,
        meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        },
    });
});

router.get("/:id", async (req, res) => {
    const post = await prisma.post.findUnique({
        where: { id: res.locals.postId },
        include: postRelations,
    });

    if (!post) {
        return res.status(404).json({
            error: "Post not found",
        });
    }

    res.json(post);
});

router.post("/", validate(createPostSchema), async (req, res) => {
    const { title, content, published, authorId, tags = [] } = req.body;

    const post = await prisma.post.create({
        data: {
            title,
            content,
            published,
            author: {
                connect: { id: authorId },
            },
            tags: {
                connectOrCreate: tags.map((name) => ({
                    where: { name },
                    create: { name },
                })),
            },
        },
        include: postRelations,
    });

    res.status(201).json(post);
});

router.patch("/:id", validate(updatePostSchema), async (req, res) => {
    const { authorId, tags, ...data } = req.body;

    if (authorId !== undefined) {
        data.author = {
            connect: { id: authorId },
        };
    }

    if (tags !== undefined) {
        data.tags = {
            set: [],
            connectOrCreate: tags.map((name) => ({
                where: { name },
                create: { name },
            })),
        };
    }

    const post = await prisma.post.update({
        where: { id: res.locals.postId },
        data,
        include: postRelations,
    });

    res.json(post);
});

router.delete("/:id", async (req, res) => {
    await prisma.post.delete({
        where: { id: res.locals.postId },
    });

    res.status(204).send();
});

export default router;
