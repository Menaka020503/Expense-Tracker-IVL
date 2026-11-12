const jwt = require("jsonwebtoken");

function readToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Protects JSON API routes: responds 401 with JSON, never redirects.
function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, name: payload.name, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }
}

// Protects server-rendered pages: redirects to /login instead of a JSON 401.
function requireAuthPage(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.redirect("/login");
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, name: payload.name, email: payload.email };
    res.locals.user = req.user;
    next();
  } catch (err) {
    res.clearCookie("token");
    return res.redirect("/login");
  }
}

// Makes req.user / res.locals.user available on public pages without forcing a redirect.
function attachUserIfPresent(req, res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, name: payload.name, email: payload.email };
    res.locals.user = req.user;
  } catch (err) {
    // Ignore invalid token on public pages.
  }
  next();
}

module.exports = { requireAuth, requireAuthPage, attachUserIfPresent };
