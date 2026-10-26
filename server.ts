import express from "express";
import { GoogleGenAI } from "@google/genai";

import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import { db, createPool } from "./src/db/index.ts";
import { shops } from "./src/db/schema.ts";
import { eq } from "drizzle-orm";


async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON body parser for API requests
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  
  app.get("/api/shopData", async (req, res) => {
    try {
      const rawShopId = (req.query.shopId as string) || "bismillah_traders_main";
      const shopId = rawShopId === "ml_electric_main" ? "bismillah_traders_main" : rawShopId;
      let result = await db.select().from(shops).where(eq(shops.id, shopId));
      if (result.length === 0 && shopId === "bismillah_traders_main") {
        result = await db.select().from(shops).where(eq(shops.id, "ml_electric_main"));
      }
      if (result.length > 0) {
        res.json({ success: true, data: result[0].data });
      } else {
        res.json({ success: true, data: null });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  app.get("/api/allShopData", async (req, res) => {
    try {
      const result = await db.select().from(shops);
      res.json({ success: true, data: result });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch all shop data" });
    }
  });

  // Database sanitization: remove old/default password 139210 permanently from all shops
  async function sanitizeDatabasePasswords() {
    try {
      const pool = createPool();
      if (pool) {
        await pool.query(`CREATE TABLE IF NOT EXISTS shops (
          id text PRIMARY KEY NOT NULL,
          data jsonb NOT NULL,
          updated_at timestamp DEFAULT now()
        );`);
      }

      const allShops = await db.select().from(shops);
      for (const shop of allShops) {
        const shopData = shop.data as any;
        if (shopData && Array.isArray(shopData.users)) {
          let modified = false;
          const updatedUsers = shopData.users.map((u: any) => {
            if (u && (u.pinOrPassword === '139210' || (u.role === 'admin' && u.pinOrPassword === '139210'))) {
              modified = true;
              return { ...u, pinOrPassword: '102267' };
            }
            return u;
          });
          if (modified) {
            const newPayload = { ...shopData, users: updatedUsers };
            await db.insert(shops)
              .values({ id: shop.id, data: newPayload, updatedAt: new Date() })
              .onConflictDoUpdate({
                target: shops.id,
                set: { data: newPayload, updatedAt: new Date() }
              });
            console.log(`[Database Cleanup] Purged password 139210 from shop: ${shop.id}`);
          }
        }
      }
    } catch (err) {
      console.warn("Database password sanitization check skipped/failed:", err);
    }
  }

  // Execute database sanitization on startup
  sanitizeDatabasePasswords();

  app.get("/api/allUsers", async (req, res) => {
    try {
      const result = await db.select().from(shops);
      const usersMap = new Map();
      for (const s of result) {
        const shopData = s.data as any;
        if (shopData && Array.isArray(shopData.users)) {
          for (const u of shopData.users) {
            if (u && u.id && !usersMap.has(u.id)) {
              const cleanUser = { ...u };
              if (cleanUser.pinOrPassword === '139210' || (cleanUser.role === 'admin' && cleanUser.pinOrPassword === '139210')) {
                cleanUser.pinOrPassword = '102267';
              }
              usersMap.set(u.id, cleanUser);
            }
          }
        }
      }
      res.json({ success: true, users: Array.from(usersMap.values()) });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/branches", async (req, res) => {
    try {
      const result = await db.select().from(shops);
      // First check main shop
      const mainShop = result.find(s => s.id === "bismillah_traders_main" || s.id === "ml_electric_main");
      if (mainShop) {
        const data = mainShop.data as any;
        if (data && Array.isArray(data.branches) && data.branches.length > 0) {
          return res.json({ success: true, branches: data.branches });
        }
      }
      // Otherwise check all shops
      for (const s of result) {
        const d = s.data as any;
        if (d && Array.isArray(d.branches) && d.branches.length > 0) {
          return res.json({ success: true, branches: d.branches });
        }
      }
      res.json({ success: true, branches: [] });
    } catch (e: any) {
      console.error(e);
      res.json({ success: true, branches: [] });
    }
  });

  app.post("/api/restoreAllShopData", async (req, res) => {
    try {
      const shopsData = req.body.shopsData;
      if (Array.isArray(shopsData)) {
        for (const shop of shopsData) {
          await db.insert(shops)
            .values({ id: shop.id, data: shop.data, updatedAt: new Date() })
            .onConflictDoUpdate({
              target: shops.id,
              set: { data: shop.data, updatedAt: new Date() }
            });
        }
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to restore all shop data" });
    }
  });

  app.post("/api/shopData", async (req, res) => {
    try {
      const rawShopId = req.body.shopId || "bismillah_traders_main";
      const shopId = rawShopId === "ml_electric_main" ? "bismillah_traders_main" : rawShopId;
      let payload = req.body.payload;
      if (payload && Array.isArray(payload.users)) {
        payload = {
          ...payload,
          users: payload.users.map((u: any) => {
            if (u && (u.pinOrPassword === '139210' || (u.role === 'admin' && u.pinOrPassword === '139210'))) {
              return { ...u, pinOrPassword: '102267' };
            }
            return u;
          })
        };
      }
      await db.insert(shops)
        .values({ id: shopId, data: payload, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: shops.id,
          set: { data: payload, updatedAt: new Date() }
        });
      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to update data" });
    }
  });

  app.delete("/api/shopData", async (req, res) => {
    try {
      const shopId = req.query.shopId as string;
      if (shopId && shopId !== "bismillah_traders_main" && shopId !== "ml_electric_main") {
        await db.delete(shops).where(eq(shops.id, shopId));
        res.json({ success: true });
      } else {
        res.status(400).json({ error: "Invalid or protected shopId" });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete shop data" });
    }
  });

  // Online Cloud License Endpoints
  app.get("/api/license", async (req, res) => {
    try {
      const result = await db.select().from(shops).where(eq(shops.id, "system_license"));
      if (result.length > 0 && result[0].data) {
        res.json({ success: true, license: result[0].data });
      } else {
        res.json({ success: true, license: null });
      }
    } catch (e: any) {
      console.error("Failed to read license:", e);
      res.status(500).json({ error: "Failed to fetch license" });
    }
  });

  app.post("/api/license", async (req, res) => {
    try {
      const license = req.body.license;
      if (!license) {
        return res.status(400).json({ error: "License data missing" });
      }
      await db.insert(shops)
        .values({ id: "system_license", data: license, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: shops.id,
          set: { data: license, updatedAt: new Date() }
        });
      res.json({ success: true, license });
    } catch (e: any) {
      console.error("Failed to save license:", e);
      res.status(500).json({ error: "Failed to save license" });
    }
  });

  // User Presence & Online Tracking Endpoints
  app.get("/api/presence", async (req, res) => {
    try {
      const result = await db.select().from(shops).where(eq(shops.id, "presence_data"));
      let presenceMap: Record<string, any> = {};
      if (result.length > 0 && result[0].data && typeof result[0].data === "object" && !Array.isArray(result[0].data)) {
        presenceMap = result[0].data as Record<string, any>;
      }

      const now = Date.now();
      const rawValues = presenceMap ? Object.values(presenceMap) : [];
      const presenceList = rawValues
        .filter((p: any) => p && typeof p === "object" && p.userId)
        .map((p: any) => {
          const lastActiveTime = p.lastActive ? new Date(p.lastActive).getTime() : 0;
          // User is online if last heartbeat was within the last 90 seconds AND not manually logged out
          const isRecentlyActive = !isNaN(lastActiveTime) && (now - lastActiveTime < 90 * 1000);
          return {
            ...p,
            isOnline: Boolean(p.isOnline && isRecentlyActive)
          };
        });

      res.json({ success: true, presence: presenceList });
    } catch (e: any) {
      console.error("Failed to fetch presence:", e);
      res.status(500).json({ error: "Failed to fetch presence" });
    }
  });

  app.post("/api/presence/heartbeat", async (req, res) => {
    try {
      const { userId, userName, role, branchId, branchName } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const result = await db.select().from(shops).where(eq(shops.id, "presence_data"));
      let presenceMap: Record<string, any> = {};
      if (result.length > 0 && result[0].data && typeof result[0].data === "object") {
        presenceMap = { ...(result[0].data as Record<string, any>) };
      }

      const userAgent = (req.headers["user-agent"] as string) || "ওয়েব ব্রাউজার";
      let shortDevice = "ওয়েব ব্রাউজার";
      if (/Android/i.test(userAgent)) shortDevice = "অ্যান্ড্রয়েড ফোন";
      else if (/iPhone|iPad/i.test(userAgent)) shortDevice = "আইফোন / আইপ্যাড";
      else if (/Windows/i.test(userAgent)) shortDevice = "উইন্ডোজ পিসি";
      else if (/Macintosh/i.test(userAgent)) shortDevice = "ম্যাক";

      presenceMap[userId] = {
        userId,
        userName: userName || presenceMap[userId]?.userName || "ব্যবহারকারী",
        role: role || presenceMap[userId]?.role || "manager",
        branchId: branchId || presenceMap[userId]?.branchId || "ml_electric_main",
        branchName: branchName || presenceMap[userId]?.branchName || "প্রধান শাখা",
        isOnline: true,
        lastActive: new Date().toISOString(),
        deviceInfo: shortDevice
      };

      await db.insert(shops)
        .values({ id: "presence_data", data: presenceMap, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: shops.id,
          set: { data: presenceMap, updatedAt: new Date() }
        });

      res.json({ success: true, presence: presenceMap[userId] });
    } catch (e: any) {
      console.error("Failed to record heartbeat:", e);
      res.status(500).json({ error: "Failed to update heartbeat" });
    }
  });

  app.post("/api/presence/logout", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const result = await db.select().from(shops).where(eq(shops.id, "presence_data"));
      if (result.length > 0 && result[0].data && typeof result[0].data === "object" && !Array.isArray(result[0].data)) {
        const presenceMap = { ...(result[0].data as Record<string, any>) };
        if (presenceMap[userId] && typeof presenceMap[userId] === "object") {
          presenceMap[userId] = {
            ...presenceMap[userId],
            isOnline: false,
            lastActive: new Date().toISOString()
          };

          await db.insert(shops)
            .values({ id: "presence_data", data: presenceMap, updatedAt: new Date() })
            .onConflictDoUpdate({
              target: shops.id,
              set: { data: presenceMap, updatedAt: new Date() }
            });
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      console.error("Failed to record logout:", e);
      res.status(500).json({ error: "Failed to record logout" });
    }
  });

  app.post("/api/test-email", async (req, res) => {
    try {
      const { host, port, encryption, username, password, fromAddress, fromName, testEmail } = req.body;

      if (!host || !port || !username || !password || !fromAddress || !testEmail) {
        return res.status(400).json({ error: "অনুগ্রহ করে সব প্রয়োজনীয় তথ্য পূরণ করুন।" });
      }

      // Determine secure flag based on port
      // Standard: 465 is secure (SSL/TLS implicit), 587 uses STARTTLS (secure: false)
      let secure = port === "465";

      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure, // true for 465, false for other ports
        auth: {
          user: username,
          pass: password,
        },
      });

      const info = await transporter.sendMail({
        from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
        to: testEmail,
        subject: "Test Email from Bismillah Traders",
        text: "This is a test email sent from the Bismillah Traders system to verify SMTP settings.",
        html: "<p>This is a test email sent from the <strong>Bismillah Traders</strong> system to verify SMTP settings.</p>",
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending test email:", error);
      res.status(500).json({ error: error.message || "ইমেইল পাঠাতে সমস্যা হয়েছে।" });
    }
  });

  app.post("/api/send-backup", async (req, res) => {
    try {
      const { smtpSettings, backupData, filename } = req.body;
      const { host, port, username, password, fromAddress, fromName, testEmail } = smtpSettings;

      if (!host || !port || !username || !password || !fromAddress || !testEmail || !backupData) {
        return res.status(400).json({ error: "Missing SMTP config or backup data." });
      }

      let secure = port === "465";

      const transporter = nodemailer.createTransport({
        host,
        port: parseInt(port),
        secure,
        auth: {
          user: username,
          pass: password,
        },
      });

      const today = new Date().toLocaleDateString('en-GB');
      
      const info = await transporter.sendMail({
        from: fromName ? `"${fromName}" <${fromAddress}>` : fromAddress,
        to: testEmail, // sending the backup to the test/admin email
        subject: `Daily Auto Backup - Bismillah Traders (${today})`,
        text: `Please find the daily automatic backup attached for Bismillah Traders.\n\nDate: ${today}`,
        attachments: [
          {
            filename: filename || `Bismillah_Traders_Backup_${today}.json`,
            content: backupData,
            contentType: 'application/json'
          }
        ]
      });

      res.json({ success: true, messageId: info.messageId });
    } catch (error: any) {
      console.error("Error sending backup email:", error);
      res.status(500).json({ error: error.message || "Failed to send backup email." });
    }
  });


  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, contextData } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `
You are an intelligent AI assistant for "Bismillah Traders" (বিসমিল্লাহ ট্রেডার্স), a shop and business accounting management software. 
Address: 1470, Notun A.K School Road, Dokkhin Donia, Kodomtoli, Dhaka-1236.
Mobile: 01885926704, 01718042483, 01720640137.
You speak fluent Bengali (and English if requested). 
Your job is to answer questions about the software usage AND the user's business data.

Current Business Data:
${JSON.stringify(contextData)}

If the user asks about their business (e.g., "আজকের বিক্রি কত?", "বাকি কত?", "সজিব ভাইয়ের মেমো কত?"), use the data above to answer accurately. 
If the user asks how to use the app (e.g., "কীভাবে মেমো বানাব?"), provide clear instructions.
Keep your answers concise, friendly, and formatted nicely.
`;

      const formattedMessages = messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: formattedMessages,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      res.json({ success: true, text: response.text });
    } catch (e: any) {
      console.error("Chat error:", e);
      res.status(500).json({ error: e.message || "Failed to process chat message." });
    }
  });

  // Serve public directory
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
