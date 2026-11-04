export function errorHandler(err, req, res, next) {
    console.error(err);

    if (err.code === "P2002") {
        return res.status(409).json({
            error: "Resource already exists",
            details: err.meta?.target,
        });
    }

    if (err.code === "P2025") {
        return res.status(404).json({
            error: "Resource not found",
        });
    }

    if (err.code === "P2003") {
        return res.status(400).json({
            error: "Related resource does not exist",
        });
    }

    res.status(500).json({
        error: "Internal server error",
    });
}
