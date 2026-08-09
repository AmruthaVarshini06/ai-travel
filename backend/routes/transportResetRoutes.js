import express from "express";
import { seedTransportData } from "../utils/transportSeeder.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

const getAdminEmail = () =>
  process.env.ADMIN_EMAIL?.trim().toLowerCase();

const isAdminUser = (user) => {
  const adminEmail = getAdminEmail();
  return !!adminEmail && user?.email?.toString().toLowerCase() === adminEmail;
};

router.post("/reset", authMiddleware, async (req, res) => {
  try {
    const adminEmail = getAdminEmail();
    if (!adminEmail) {
      return res.status(500).json({
        success: false,
        message: "Transport reset is disabled because ADMIN_EMAIL is not configured."
      });
    }

    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required to reset transport data."
      });
    }

    const result = await seedTransportData();

    res.json({
      success: true,
      message: "Transport database reset and reseeded successfully.",
      counts: result
    });
  } catch (error) {
    console.error("Transport reset error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reset transport data."
    });
  }
});

export default router;
