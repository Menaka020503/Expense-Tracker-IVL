# Expense Tracker

A full-stack personal finance web app built with Node.js, Express, MongoDB (Mongoose), EJS, and Cloudinary. Register, log in, record income/expenses, organize them by category, view summaries, and attach receipts.

## Features

- Cookie-based JWT authentication (register, login, logout, protected routes)
- Dashboard with income/expense/balance totals and recent transactions
- Transaction CRUD with type, category, date, notes
- Filters (type, category, date range) and pagination
- Summary endpoint with optional by-category / by-month breakdowns
- Receipt/document uploads to Cloudinary (up to 5 files, 8 MB each; JPEG/PNG/WEBP/PDF/TXT/DOC/DOCX)
- Attachment removal from both the transaction and Cloudinary
- Ownership checks on every transaction/category query

## Tech stack

Node.js, Express.js, MongoDB, Mongoose, EJS, JWT + httpOnly cookies, bcryptjs, Multer, Cloudinary, dotenv.

## Getting started

1. **Install dependencies**
   ```
   npm install
   ```
2. **Configure environment** — copy `.env.example` to `.env` and fill in real values:
   ```
   PORT=3000
   MONGODB_URI=mongodb://127.0.0.1:27017/expenseTracker
   JWT_SECRET=use_a_long_random_secret
   JWT_EXPIRES_IN=1d
   NODE_ENV=development

   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
   - Get a free MongoDB instance from [MongoDB Atlas](https://www.mongodb.com/atlas) or run `mongod` locally.
   - Get Cloudinary credentials from your [Cloudinary dashboard](https://cloudinary.com/console).
3. **Run the app**
   ```
   npm run dev    # nodemon, auto-restart
   npm start      # plain node
   ```
4. Visit `http://localhost:3000` — it redirects to `/login`.

## Folder structure

```
expense-tracker/
├── server.js              # loads dotenv, connects DB, starts server
└── src/
    ├── app.js              # express app, middleware, route mounting
    ├── config/             # database.js, cloudinary.js
    ├── controllers/        # auth, category, transaction business logic
    ├── middleware/         # auth, upload (multer), error handling
    ├── models/             # User, Category, Transaction (Mongoose)
    ├── routes/             # auth/category/transaction APIs + EJS page routes
    ├── utils/               # cloudinaryUpload.js (upload/delete helpers)
    └── views/               # EJS templates (auth + dashboard pages)
public/
├── css/style.css
└── js/main.js              # fetch-based form handling for all pages
```

## API reference

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register account |
| POST | `/api/auth/login` | Login, sets httpOnly cookie |
| POST | `/api/auth/logout` | Clear auth cookie |
| GET | `/api/categories` | List owned categories |
| POST | `/api/categories` | Create category |
| PATCH | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category (blocked if in use) |
| GET | `/api/transactions` | List with `type`, `category`, `from`, `to`, `page`, `limit` |
| POST | `/api/transactions` | Create transaction (multipart, field `attachments`) |
| GET | `/api/transactions/summary` | Totals; `?groupBy=category\|month` |
| GET | `/api/transactions/:id` | Get one (owned) |
| PATCH | `/api/transactions/:id` | Update fields and/or add attachments |
| DELETE | `/api/transactions/:id/attachments/:attachmentId` | Remove one attachment |
| DELETE | `/api/transactions/:id` | Delete transaction + its Cloudinary files |
| GET | `/api/health` | Health check |

All `/api/categories` and `/api/transactions` routes require the `token` auth cookie (set automatically after login/register). A Postman collection is included at `postman_collection.json`.

## Security notes

- Passwords are hashed with bcrypt; plaintext is never stored.
- Every category/transaction query is scoped to `req.user.id`.
- Auth cookie is `httpOnly`, `sameSite: lax`, and `secure` in production.
- Uploads are restricted by count (5), size (8 MB), and MIME type.
- A failed multi-file upload cleans up any assets already sent to Cloudinary.
- `.env` is gitignored; only `.env.example` (placeholders) is committed.

## Deployment

Deploy the Node server to Render (or similar), point `MONGODB_URI` at MongoDB Atlas, and set the Cloudinary env vars in the host's dashboard. Never commit real secrets.
