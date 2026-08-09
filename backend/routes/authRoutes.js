import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

import User from "../models/User.js";
import { sendSuccess, sendError } from "../utils/responseHelper.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const MIN_PASSWORD_LENGTH = 8;

const normalizeEmail = (value = "") =>
  String(value).trim().toLowerCase();

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(
    MIN_PASSWORD_LENGTH,
    `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
  ),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return process.env.JWT_SECRET;
};

const parseValidationResult = (result) => {
  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstIssue = result.error.issues[0];
  return { success: false, message: firstIssue.message };
};

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    const validation = parseValidationResult(parsed);

    if (!validation.success) {
      return sendError(res, validation.message, 400);
    }

    const { name, email, password } = validation.data;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return sendError(res, "Email already registered", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    await newUser.save();

    return sendSuccess(
      res,
      {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
        },
      },
      "User registered successfully",
      201
    );
  } catch (error) {
    console.error("Auth register error:", error);
    return sendError(res, "Unable to register user", 500);
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    const validation = parseValidationResult(parsed);

    if (!validation.success) {
      return sendError(res, validation.message, 400);
    }

    const { email, password } = validation.data;
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return sendError(res, "Invalid email or password", 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return sendError(res, "Invalid email or password", 401);
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      getJwtSecret(),
      {
        expiresIn: "7d",
      }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    }, "Login successful");
  } catch (error) {
    console.error("Auth login error:", error);
    return sendError(res, "Unable to login", 500);
  }
});

// GET CURRENT USER (fetch stored details using the JWT issued at login)
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    return sendSuccess(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    }, "User fetched successfully");
  } catch (error) {
    console.error("Auth me error:", error);
    return sendError(res, "Unable to fetch user", 500);
  }
});

export default router;