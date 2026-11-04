export function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return res.status(400).json({
                error: "Validation error",
                details: error.details.map((detail) => detail.message),
            });
        }

        req.body = value;
        next();
    };
}
