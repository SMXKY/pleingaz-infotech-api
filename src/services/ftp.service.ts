import Client from "ftp";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { AppError } from "@utils/AppError.util";
import { StatusCodes } from "http-status-codes";
import { Request } from "express";
import * as dotenv from "dotenv";
dotenv.config();

interface FtpConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  remoteDir: string;
  remoteUrlBase: string;
}

const DEV_UPLOAD_DIR =
  process.env.DEV_UPLOAD_DIR || path.join(__dirname, "../../local_uploads");
const DEV_BASE_URL =
  process.env.DEV_BASE_URL || "http://localhost:3000/uploads";

fs.mkdirSync(DEV_UPLOAD_DIR, { recursive: true });

const TEMP_DIR = process.env.TEMP_DIR || path.join(os.tmpdir(), "ftp-uploads");
fs.mkdirSync(TEMP_DIR, { recursive: true });

const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  if (
    !process.env.FTP_USER ||
    !process.env.FTP_PASSWORD ||
    !process.env.FTP_HOST ||
    !process.env.FTP_PORT ||
    !process.env.FTP_UPLOAD_DIR ||
    !process.env.FTP_BASE_URL
  ) {
    throw new Error("Invalid FTP Server configuration");
  }
}

const config: FtpConfig = {
  user: process.env.FTP_USER || "",
  password: process.env.FTP_PASSWORD || "",
  host: process.env.FTP_HOST || "",
  port: Number(process.env.FTP_PORT) || 21,
  remoteDir: process.env.FTP_UPLOAD_DIR || "/",
  remoteUrlBase: process.env.FTP_BASE_URL || "",
};

// ─── Helper: Build clean URL path from remoteDir ─────────────────────────────────────────────────
function buildUrlPath(remoteDir: string, fileName: string): string {
  // Handle root directory cases
  if (
    remoteDir === "./" ||
    remoteDir === "." ||
    remoteDir === "" ||
    remoteDir === "/"
  ) {
    return fileName;
  }
  // Remove leading/trailing slashes and dots, then add trailing slash
  const cleanDir = remoteDir.replace(/^[./]+|\/+$/g, "");
  return cleanDir ? `${cleanDir}/${fileName}` : fileName;
}

// ─── Helper: Build remote path for FTP operations ─────────────────────────────────────────────────
function buildRemotePath(remoteDir: string, fileName: string): string {
  // Handle root directory cases
  if (remoteDir === "./" || remoteDir === "." || remoteDir === "") {
    return fileName;
  }
  return path.posix.join(remoteDir, fileName).replace(/\s+/g, "");
}

// ─── Helper: Get directory for FTP list operations ─────────────────────────────────────────────────
function getListDirectory(remoteDir: string): string {
  if (remoteDir === "./" || remoteDir === "." || remoteDir === "") {
    return ".";
  }
  return remoteDir;
}

// ─── Ensure remote directory exists ─────────────────────────────────────────────────
function ensureRemoteDir(client: Client, dir: string): Promise<void> {
  console.log(`[FTP] 📁 Ensuring directory structure exists: "${dir}"`);

  // Skip if root directory
  if (dir === "./" || dir === "." || dir === "" || dir === "/") {
    console.log("[FTP] 📁 Using root directory, no creation needed");
    return Promise.resolve();
  }

  const parts = dir
    .split("/")
    .filter(Boolean)
    .filter((p) => p !== ".");

  if (parts.length === 0) {
    console.log("[FTP] 📁 No directory parts to create");
    return Promise.resolve();
  }

  return parts.reduce((promise: Promise<void>, _, idx: number) => {
    const segment = parts.slice(0, idx + 1).join("/");
    return promise.then(
      () =>
        new Promise<void>((res, rej) => {
          client.list(segment, (err) => {
            if (err) {
              console.log(`[FTP] 📁 Creating directory: ${segment}`);
              client.mkdir(segment, true, (mkErr) => {
                if (mkErr) {
                  console.error(
                    `[FTP] ❌ Failed to create directory: ${segment}`,
                    mkErr.message
                  );
                  rej(mkErr);
                } else {
                  console.log(`[FTP] ✅ Directory created: ${segment}`);
                  res();
                }
              });
            } else {
              console.log(`[FTP] ✅ Directory exists: ${segment}`);
              res();
            }
          });
        })
    );
  }, Promise.resolve());
}

// ─── Verify web access to uploaded file ─────────────────────────────────────────────────
function verifyWebAccess(
  url: string,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryAccess = () => {
      attempts++;
      console.log(
        `[FTP] 🌐 Verifying web access (attempt ${attempts}/${maxRetries}): ${url}`
      );

      const httpModule = url.startsWith("https") ? https : http;

      const req = httpModule.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log(`[FTP] ✅ File is accessible via web: ${url}`);
          resolve();
        } else if (attempts < maxRetries) {
          console.log(
            `[FTP] ⏳ Status ${res.statusCode}, retrying in ${delayMs}ms...`
          );
          setTimeout(tryAccess, delayMs);
        } else {
          reject(
            new Error(
              `File not accessible via web after ${maxRetries} attempts, status: ${res.statusCode}`
            )
          );
        }
      });

      req.on("error", (err) => {
        if (attempts < maxRetries) {
          console.log(
            `[FTP] ⏳ Request error: ${err.message}, retrying in ${delayMs}ms...`
          );
          setTimeout(tryAccess, delayMs);
        } else {
          reject(
            new Error(
              `Error accessing web URL after ${maxRetries} attempts: ${err.message}`
            )
          );
        }
      });

      req.setTimeout(10000, () => {
        req.destroy();
        if (attempts < maxRetries) {
          console.log(`[FTP] ⏳ Request timeout, retrying in ${delayMs}ms...`);
          setTimeout(tryAccess, delayMs);
        } else {
          reject(new Error(`Request timeout after ${maxRetries} attempts`));
        }
      });
    };

    tryAccess();
  });
}

// ─── Verify file exists on FTP server ─────────────────────────────────────────────────
function verifyFileOnServer(
  client: Client,
  remoteDir: string,
  remoteFile: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const listDir = getListDirectory(remoteDir);

    console.log(`[FTP] 🔍 Verifying file on server in directory: "${listDir}"`);
    console.log(`[FTP] 🔍 Looking for file: "${remoteFile}"`);

    client.list(listDir, (err, list) => {
      if (err) {
        console.error("[FTP] ❌ Error listing directory:", err.message);
        return reject(err);
      }

      const fileNames = list.map((f) => f.name);
      console.log(`[FTP] 📋 Files in directory:`, fileNames);

      const fileFound = list.some((file) => file.name === remoteFile);
      if (fileFound) {
        const fileInfo = list.find((f) => f.name === remoteFile);
        console.log(
          `[FTP] ✅ File verified on server: ${remoteFile} (size: ${
            fileInfo?.size || "unknown"
          } bytes)`
        );
        resolve();
      } else {
        console.error(`[FTP] ❌ File not found on server: ${remoteFile}`);
        reject(new Error(`File not found on server: ${remoteFile}`));
      }
    });
  });
}

// ─── Upload file to FTP server ─────────────────────────────────────────────────
async function uploadToFTP(
  localFilePath: string,
  remoteFileName: string
): Promise<string> {
  console.log("\n" + "=".repeat(60));
  console.log("[FTP] 🚀 STARTING UPLOAD PROCESS");
  console.log("=".repeat(60));
  console.log(`[FTP] 📄 Local file: ${localFilePath}`);
  console.log(`[FTP] 📄 Remote filename: ${remoteFileName}`);

  // Step 1: Verify local file exists
  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file does not exist: ${localFilePath}`);
  }
  const fileStats = fs.statSync(localFilePath);
  console.log(`[FTP] ✅ Local file exists (size: ${fileStats.size} bytes)`);

  const c = new Client();
  const remotePath = buildRemotePath(config.remoteDir, remoteFileName);
  const urlPath = buildUrlPath(config.remoteDir, remoteFileName);
  const fullUrl = config.remoteUrlBase + urlPath;

  console.log(`[FTP] 📍 Remote path for upload: "${remotePath}"`);
  console.log(`[FTP] 🔗 URL path (relative): "${urlPath}"`);
  console.log(`[FTP] 🌐 Full URL: "${fullUrl}"`);

  return new Promise<string>((resolve, reject) => {
    c.on("error", (err) => {
      console.error("[FTP] ❌ Client error:", err.message);
      reject(err);
    });

    c.on("ready", () => {
      console.log("[FTP] ✅ Connected to FTP server");

      (async () => {
        // Step 2: Ensure remote directory exists
        await ensureRemoteDir(c, config.remoteDir);

        // Step 3: Verify file still exists before upload
        if (!fs.existsSync(localFilePath)) {
          throw new Error(
            `Local file disappeared before upload: ${localFilePath}`
          );
        }
        console.log(
          "[FTP] ✅ Local file still exists, proceeding with upload..."
        );

        // Step 4: Upload the file
        console.log("[FTP] 📤 Starting file transfer...");
        await new Promise<void>((res, rej) => {
          const readStream = fs.createReadStream(localFilePath);

          readStream.on("error", (err) => {
            console.error("[FTP] ❌ Read stream error:", err.message);
            rej(err);
          });

          readStream.on("open", () => {
            console.log("[FTP] 📖 Read stream opened");
          });

          c.put(readStream, remotePath, (err) => {
            if (err) {
              console.error("[FTP] ❌ FTP PUT error:", err.message);
              rej(err);
            } else {
              console.log("[FTP] ✅ File transfer complete");
              res();
            }
          });
        });

        // Step 5: Set file permissions
        console.log("[FTP] 🔐 Setting file permissions (644)...");
        await new Promise<void>((res, rej) => {
          c.site(`CHMOD 644 ${remotePath}`, (err) => {
            if (err) {
              console.warn(
                "[FTP] ⚠️ Could not set permissions (non-fatal):",
                err.message
              );
              res(); // Don't fail on permission errors
            } else {
              console.log("[FTP] ✅ File permissions set");
              res();
            }
          });
        });

        // Step 6: Verify file exists on server
        await verifyFileOnServer(c, config.remoteDir, remoteFileName);

        // Step 7: Verify web accessibility
        console.log("[FTP] 🌐 Verifying web accessibility...");
        await verifyWebAccess(fullUrl, 3, 1500);

        console.log("[FTP] ✅ Upload process completed successfully!");
        console.log(`[FTP] 🔗 File available at: ${fullUrl}`);
        console.log("=".repeat(60) + "\n");

        return urlPath;
      })()
        .then((result) => {
          c.end();
          resolve(result);
        })
        .catch((err) => {
          console.error("[FTP] ❌ Upload process failed:", err.message);
          c.end();
          reject(err);
        });
    });

    console.log(`[FTP] 🔌 Connecting to ${config.host}:${config.port}...`);
    c.connect({
      host: config.host,
      user: config.user,
      password: config.password,
      port: config.port,
    });
  });
}

// ─── Production upload handler ─────────────────────────────────────────────────
async function handleFileUploadsProduction(
  request: Request
): Promise<string[]> {
  const fileUrls: string[] = [];

  if (!request.files || (request.files as Express.Multer.File[]).length === 0) {
    throw new Error("No files provided in the request");
  }

  const files = request.files as Express.Multer.File[];
  console.log(`[FTP] 📦 Processing ${files.length} file(s) for upload`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const uniqueFileName = `${uuidv4()}-${file.originalname}`.replace(
      /\s+/g,
      "-"
    );
    const tempFilePath = path.join(TEMP_DIR, uniqueFileName);

    console.log(
      `\n[FTP] 📄 Processing file ${i + 1}/${files.length}: ${
        file.originalname
      }`
    );

    try {
      // Move file to temp directory
      await fs.promises.rename(file.path, tempFilePath);
      console.log(`[FTP] ✅ Moved to temp dir: ${tempFilePath}`);

      // Upload to FTP
      const fileUrl = await uploadToFTP(tempFilePath, uniqueFileName);
      console.log(`[FTP] ✅ Upload complete, URL path: ${fileUrl}`);

      fileUrls.push(fileUrl);
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log(`[FTP] 🗑️ Cleaned up temp file: ${tempFilePath}`);
        }
      } catch (err: any) {
        console.error(`[FTP] ⚠️ Failed to clean up temp file: ${err.message}`);
      }
    }
  }

  console.log(
    `\n[FTP] ✅ All ${fileUrls.length} file(s) uploaded successfully`
  );
  return fileUrls;
}

// ─── Development handlers ─────────────────────────────────────────────────
export async function handleFileUploadsDevelopment(
  request: Request
): Promise<string[]> {
  const fileUrls: string[] = [];
  if (
    !request.files ||
    !(request.files instanceof Array) ||
    (request.files as Express.Multer.File[]).length === 0
  ) {
    throw new AppError("No files provided", StatusCodes.BAD_REQUEST);
  }
  for (const file of request.files as Express.Multer.File[]) {
    const uniqueFileName = `${uuidv4()}-${file.originalname}`.replace(
      /\s+/g,
      "-"
    );
    const destPath = path.join(DEV_UPLOAD_DIR, uniqueFileName);
    await fs.promises.rename(file.path, destPath);
    const fileUrl = `${DEV_BASE_URL}/${uniqueFileName}`;
    fileUrls.push(fileUrl);
  }
  return fileUrls;
}

export async function replaceFileDevelopment(
  oldFileUrl: string,
  request: Request
): Promise<string> {
  if (!oldFileUrl)
    throw new AppError("Old file URL required", StatusCodes.BAD_REQUEST);
  if (!request.files || (request.files as Express.Multer.File[]).length === 0)
    throw new AppError("No new file provided", StatusCodes.BAD_REQUEST);
  try {
    const oldFileName = path.basename(oldFileUrl);
    const oldFilePath = path.join(DEV_UPLOAD_DIR, oldFileName);
    if (fs.existsSync(oldFilePath)) {
      await fs.promises.unlink(oldFilePath);
    }
  } catch {
    // Best-effort: a missing old file shouldn't block the replacement.
  }
  const newUrls = await handleFileUploadsDevelopment(request);
  return newUrls[0];
}

export async function deleteFilesDevelopment(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0)
    throw new AppError("No file URLs provided", StatusCodes.BAD_REQUEST);
  for (const fileUrl of urls) {
    const fileName = path.basename(fileUrl);
    const filePath = path.join(DEV_UPLOAD_DIR, fileName);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
}

// ─── Replace file in production ─────────────────────────────────────────────────
export async function replaceFileProduction(
  oldUrl: string,
  request: Request
): Promise<string> {
  if (!oldUrl)
    throw new AppError("Old file URL required", StatusCodes.BAD_REQUEST);
  if (!request.files || (request.files as Express.Multer.File[]).length === 0) {
    throw new AppError("No new file provided", StatusCodes.BAD_REQUEST);
  }

  const file = (request.files as Express.Multer.File[])[0];
  const uniqueFileName = `${uuidv4()}-${file.originalname}`.replace(
    /\s+/g,
    "-"
  );
  const tempFilePath = path.join(TEMP_DIR, uniqueFileName);

  await fs.promises.rename(file.path, tempFilePath);

  try {
    // Upload new file
    const newFileUrl = await uploadToFTP(tempFilePath, uniqueFileName);

    // Delete old file from FTP
    const oldFileName = path.basename(oldUrl);
    const oldRemotePath = buildRemotePath(config.remoteDir, oldFileName);

    console.log(`[FTP] 🗑️ Deleting old file: ${oldRemotePath}`);

    const client = new Client();
    await new Promise<void>((resolve, reject) => {
      client.on("ready", () => {
        client.delete(oldRemotePath, (err) => {
          client.end();
          if (err) {
            console.warn(
              `[FTP] ⚠️ Could not delete old file (non-fatal): ${err.message}`
            );
            resolve(); // Don't fail if old file deletion fails
          } else {
            console.log(`[FTP] ✅ Old file deleted: ${oldRemotePath}`);
            resolve();
          }
        });
      });
      client.on("error", (err) => {
        console.warn(
          `[FTP] ⚠️ FTP error during delete (non-fatal): ${err.message}`
        );
        resolve(); // Don't fail on connection errors for delete
      });
      client.connect({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
      });
    });

    return newFileUrl;
  } finally {
    try {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    } catch {
      // Best-effort cleanup of the temp file.
    }
  }
}

// ─── Delete files from FTP ─────────────────────────────────────────────────
export function deleteFilesFromFTP(urls: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!urls || urls.length === 0) {
      return resolve();
    }

    console.log(`[FTP] 🗑️ Deleting ${urls.length} file(s) from FTP`);

    const client = new Client();

    client.on("ready", () => {
      const filesToDelete: string[] = [];

      // Extract FTP paths from URLs
      for (const fileUrl of urls) {
        // Handle both full URLs and relative paths
        let relativePath: string;
        if (fileUrl.startsWith(config.remoteUrlBase)) {
          relativePath = fileUrl.slice(config.remoteUrlBase.length);
        } else if (fileUrl.startsWith("http")) {
          // Try to extract path from URL
          try {
            const url = new URL(fileUrl);
            relativePath = url.pathname.split("/").pop() || fileUrl;
          } catch {
            relativePath = fileUrl;
          }
        } else {
          relativePath = fileUrl;
        }

        const remotePath = buildRemotePath(
          config.remoteDir,
          path.basename(relativePath)
        );
        filesToDelete.push(remotePath);
        console.log(`[FTP] 📍 Will delete: ${remotePath}`);
      }

      // Delete files sequentially
      const deleteNext = () => {
        if (filesToDelete.length === 0) {
          console.log("[FTP] ✅ All files deleted");
          client.end();
          return resolve();
        }

        const currentFile = filesToDelete.shift();
        if (!currentFile) return deleteNext();

        client.delete(currentFile, (err) => {
          if (err) {
            console.warn(
              `[FTP] ⚠️ Failed to delete ${currentFile}: ${err.message}`
            );
            // Continue with next file instead of failing
          } else {
            console.log(`[FTP] ✅ Deleted: ${currentFile}`);
          }
          deleteNext();
        });
      };

      deleteNext();
    });

    client.on("error", (err) => {
      console.error(`[FTP] ❌ Client error: ${err.message}`);
      reject(
        new AppError(
          `FTP client error: ${err.message}`,
          StatusCodes.BAD_GATEWAY
        )
      );
    });

    client.connect({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
    });
  });
}

// ─── Main entry point ─────────────────────────────────────────────────
export const handleFileUploads = async (
  req: Request,
  maxSizePerFileInMB: number,
  allowedExtensions: string[]
): Promise<string[]> => {
  const maxSizeBytes = maxSizePerFileInMB * 1024 * 1024;

  if (!req.files || !(req.files instanceof Array)) {
    throw new AppError(
      "No files detected in the Request object",
      StatusCodes.BAD_REQUEST
    );
  }

  console.log(`[FTP] 📋 Validating ${req.files.length} file(s)...`);

  for (const file of req.files as Express.Multer.File[]) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      throw new AppError(
        `Invalid file type: ${ext}. Allowed: ${allowedExtensions.join(", ")}`,
        StatusCodes.BAD_REQUEST
      );
    }

    if (file.size > maxSizeBytes) {
      throw new AppError(
        `File too large: ${file.originalname} (${(
          file.size /
          1024 /
          1024
        ).toFixed(2)}MB) exceeds ${maxSizePerFileInMB}MB limit`,
        StatusCodes.BAD_REQUEST
      );
    }

    console.log(
      `[FTP] ✅ Validated: ${file.originalname} (${ext}, ${(
        file.size / 1024
      ).toFixed(1)}KB)`
    );
  }

  return handleFileUploadsProduction(req);
};
