function notFound(req, res, next) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ message: "Route not found" });
  }
  res.status(404).render("error", { title: "Not Found", message: "Page not found", status: 404 });
}

// Keep this last in the middleware chain: Express treats a 4-arg function as an error handler.
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === "production";
  const message = isProd && status === 500 ? "Something went wrong" : err.message;

  if (!isProd) {
    console.error(err);
  }

  if (req.path.startsWith("/api/")) {
    return res.status(status).json({ message });
  }

  res.status(status).render("error", { title: "Error", message, status });
}

module.exports = { notFound, errorHandler };
