import type { RowDataPacket } from "mysql2/promise";
import { dbExecute, dbQuery } from "@/lib/mysql";
import { getSessionPayload, hashPassword, verifyPassword } from "@/lib/auth";

export type ClientRole = "Owner" | "Staff";

export type ClientUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: ClientRole;
};

export type ClientInventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  qty: number;
  lowStock: number;
  idealStock: number;
  status: "Low Stock" | "Available" | "In Stock";
  updated: string;
};

export type ClientFinancialTransaction = {
  id: string;
  user: string;
  notes: string;
  status: "Income" | "Expense";
  amount: number;
  date: string;
  attachmentName?: string;
};

export type ClientActivity = {
  id: string;
  actorUsername: string;
  actorName: string;
  feature: "Login" | "Inventory" | "Financial" | "User";
  message: string;
  createdAt: string;
};

type UserRow = RowDataPacket & {
  user_id: number;
  full_name: string;
  username: string;
  email: string;
  phone_number: string;
  password_hash: string;
  role_code: "OWNER" | "STAFF";
  is_active: number;
};

type InventoryRow = RowDataPacket & {
  item_code: string;
  item_name: string;
  category_name: string;
  unit_name: string;
  quantity: number;
  minimum_stock: number;
  ideal_stock: number;
  stock_status: "LOW_STOCK" | "AVAILABLE" | "IN_STOCK";
  updated_at: Date;
};

type FinancialRow = RowDataPacket & {
  transaction_code: string;
  full_name: string;
  notes: string;
  transaction_type: "INCOME" | "EXPENSE";
  amount: number;
  transaction_date: Date;
  attachment_name: string | null;
};

type ActivityRow = RowDataPacket & {
  activity_log_id: number;
  actor_username: string;
  actor_name: string;
  feature_name: "LOGIN" | "INVENTORY" | "FINANCIAL" | "USER";
  activity_message: string;
  created_at: Date;
};

type PasswordResetRequestRow = RowDataPacket & {
  password_reset_request_id: number;
  user_id: number;
  request_token: string;
  reset_status: "PENDING" | "PHONE_VERIFIED" | "EMAIL_VERIFIED" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  expires_at: Date;
  completed_at: Date | null;
  username: string;
  full_name: string;
  email: string;
};

type OtpVerificationRow = RowDataPacket & {
  otp_verification_id: number;
  password_reset_request_id: number;
  user_id: number;
  destination_value: string;
  otp_code_hash: string;
  verification_status: "SENT" | "VERIFIED" | "EXPIRED" | "FAILED";
  expires_at: Date;
  attempt_count: number;
};

function mapRole(roleCode: string): ClientRole {
  return roleCode === "OWNER" ? "Owner" : "Staff";
}

function mapInventoryStatus(status: string): ClientInventoryItem["status"] {
  if (status === "LOW_STOCK") return "Low Stock";
  if (status === "AVAILABLE") return "Available";
  return "In Stock";
}

function mapFinancialStatus(status: string): ClientFinancialTransaction["status"] {
  return status === "INCOME" ? "Income" : "Expense";
}

function mapActivityFeature(feature: string): ClientActivity["feature"] {
  if (feature === "LOGIN") return "Login";
  if (feature === "INVENTORY") return "Inventory";
  if (feature === "FINANCIAL") return "Financial";
  return "User";
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString("en-GB");
}

export async function getUserByUsername(username: string) {
  const rows = await dbQuery<UserRow[]>(
    `SELECT user_id, full_name, username, email, phone_number, password_hash, role_code, is_active
     FROM app_users
     WHERE username = ? AND deleted_at IS NULL
     LIMIT 1`,
    [username],
  );

  if (rows.length === 0) return null;
  const user = rows[0];

  return {
    dbUserId: user.user_id,
    id: String(user.user_id),
    name: user.full_name,
    username: user.username,
    email: user.email,
    phone: user.phone_number,
    role: mapRole(user.role_code),
    isActive: user.is_active === 1,
    passwordHash: user.password_hash,
  };
}

export async function getUserByIdentifier(identifier: string) {
  const rows = await dbQuery<UserRow[]>(
    `SELECT user_id, full_name, username, email, phone_number, password_hash, role_code, is_active
     FROM app_users
     WHERE (username = ? OR email = ?) AND deleted_at IS NULL
     LIMIT 1`,
    [identifier, identifier],
  );

  if (rows.length === 0) return null;
  const user = rows[0];

  return {
    dbUserId: user.user_id,
    id: String(user.user_id),
    name: user.full_name,
    username: user.username,
    email: user.email,
    phone: user.phone_number,
    role: mapRole(user.role_code),
    isActive: user.is_active === 1,
    passwordHash: user.password_hash,
  };
}

export async function requireSessionUser() {
  const payload = await getSessionPayload();
  if (!payload) return null;

  return getUserByUsername(payload.username);
}

export async function listUsers() {
  const rows = await dbQuery<UserRow[]>(
    `SELECT user_id, full_name, username, email, phone_number, role_code, is_active
     FROM app_users
     WHERE deleted_at IS NULL
     ORDER BY role_code ASC, full_name ASC`,
  );

  return rows.map<ClientUser>((row) => ({
    id: String(row.user_id),
    name: row.full_name,
    username: row.username,
    email: row.email,
    phone: row.phone_number,
    role: mapRole(row.role_code),
  }));
}

export async function listInventoryItems() {
  const rows = await dbQuery<InventoryRow[]>(
    `SELECT
       ii.item_code,
       ii.item_name,
       ic.category_name,
       iu.unit_name,
       ii.quantity,
       ii.minimum_stock,
       ii.ideal_stock,
       ii.stock_status,
       ii.updated_at
     FROM inventory_items ii
     INNER JOIN inventory_categories ic ON ic.inventory_category_id = ii.inventory_category_id
     INNER JOIN inventory_units iu ON iu.inventory_unit_id = ii.inventory_unit_id
     WHERE ii.deleted_at IS NULL
     ORDER BY ii.item_code ASC`,
  );

  return rows.map<ClientInventoryItem>((row) => ({
    id: row.item_code,
    name: row.item_name,
      category: row.category_name,
      unit: row.unit_name,
      qty: Number(row.quantity),
      lowStock: Number(row.minimum_stock),
      idealStock: Number(row.ideal_stock),
      status: mapInventoryStatus(row.stock_status),
      updated: formatDate(row.updated_at),
    }));
}

export async function listFinancialTransactions() {
  const rows = await dbQuery<FinancialRow[]>(
    `SELECT
       ft.transaction_code,
       au.full_name,
       ft.notes,
       ft.transaction_type,
       ft.amount,
       ft.transaction_date,
       (
         SELECT fta.file_name
         FROM financial_transaction_attachments fta
         WHERE fta.financial_transaction_id = ft.financial_transaction_id
         ORDER BY fta.uploaded_at DESC, fta.financial_transaction_attachment_id DESC
         LIMIT 1
       ) AS attachment_name
     FROM financial_transactions ft
     INNER JOIN app_users au ON au.user_id = ft.user_id
     WHERE ft.deleted_at IS NULL
     ORDER BY ft.transaction_date DESC, ft.financial_transaction_id DESC`,
  );

  return rows.map<ClientFinancialTransaction>((row) => ({
    id: row.transaction_code,
    user: row.full_name,
    notes: row.notes,
    status: mapFinancialStatus(row.transaction_type),
    amount: Number(row.amount),
    date: formatDate(row.transaction_date),
    attachmentName: row.attachment_name ?? undefined,
  }));
}

export async function listActivityLogs() {
  const rows = await dbQuery<ActivityRow[]>(
    `SELECT activity_log_id, actor_username, actor_name, feature_name, activity_message, created_at
     FROM activity_logs
     ORDER BY created_at DESC, activity_log_id DESC
     LIMIT 100`,
  );

  return rows.map<ClientActivity>((row) => ({
    id: `ACT-${row.activity_log_id}`,
    actorUsername: row.actor_username,
    actorName: row.actor_name,
    feature: mapActivityFeature(row.feature_name),
    message: row.activity_message,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function createLoginLog(userId: number | null, usernameInput: string, status: "SUCCESS" | "FAILED") {
  await dbExecute(
    `INSERT INTO login_logs (user_id, username_input, login_status)
     VALUES (?, ?, ?)`,
    [userId, usernameInput, status],
  );
}

export async function touchLastLogin(userId: number) {
  await dbExecute(`UPDATE app_users SET last_login_at = NOW() WHERE user_id = ?`, [userId]);
}

export async function createActivityLog(params: {
  actorUserId: number | null;
  actorUsername: string;
  actorName: string;
  featureName: "LOGIN" | "INVENTORY" | "FINANCIAL" | "USER";
  activityMessage: string;
  referenceTable?: string | null;
  referenceId?: number | null;
}) {
  await dbExecute(
    `INSERT INTO activity_logs (
       actor_user_id,
       actor_username,
       actor_name,
       feature_name,
       activity_message,
       reference_table,
       reference_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.actorUserId,
      params.actorUsername,
      params.actorName,
      params.featureName,
      params.activityMessage,
      params.referenceTable ?? null,
      params.referenceId ?? null,
    ],
  );
}

export async function createEmailPasswordResetRequest(user: {
  dbUserId: number;
  email: string;
}) {
  const requestToken = crypto.randomUUID();
  const otpCode = String(Math.floor(100000 + Math.random() * 900000));

  await dbExecute(
    `UPDATE password_reset_requests
     SET reset_status = 'CANCELLED', completed_at = NOW(), updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?
       AND reset_status IN ('PENDING', 'EMAIL_VERIFIED')
       AND completed_at IS NULL`,
    [user.dbUserId],
  );

  const requestResult = await dbExecute(
    `INSERT INTO password_reset_requests (user_id, request_token, reset_status, expires_at)
     VALUES (?, ?, 'PENDING', DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [user.dbUserId, requestToken],
  ) as { insertId: number };

  const otpCodeHash = await hashPassword(otpCode);

  await dbExecute(
    `INSERT INTO otp_verifications (
       password_reset_request_id,
       user_id,
       otp_channel,
       destination_value,
       otp_code_hash,
       verification_status,
       expires_at
     ) VALUES (?, ?, 'EMAIL', ?, ?, 'SENT', DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
    [requestResult.insertId, user.dbUserId, user.email, otpCodeHash],
  );

  return {
    requestToken,
    otpCode,
  };
}

export async function getPasswordResetRequestByToken(requestToken: string) {
  const rows = await dbQuery<PasswordResetRequestRow[]>(
    `SELECT
       pr.password_reset_request_id,
       pr.user_id,
       pr.request_token,
       pr.reset_status,
       pr.expires_at,
       pr.completed_at,
       au.username,
       au.full_name,
       au.email
     FROM password_reset_requests pr
     INNER JOIN app_users au ON au.user_id = pr.user_id
     WHERE pr.request_token = ?
     LIMIT 1`,
    [requestToken],
  );

  return rows[0] ?? null;
}

export async function getLatestEmailOtpByRequestToken(requestToken: string) {
  const rows = await dbQuery<OtpVerificationRow[]>(
    `SELECT
       ov.otp_verification_id,
       ov.password_reset_request_id,
       ov.user_id,
       ov.destination_value,
       ov.otp_code_hash,
       ov.verification_status,
       ov.expires_at,
       ov.attempt_count
     FROM otp_verifications ov
     INNER JOIN password_reset_requests pr
       ON pr.password_reset_request_id = ov.password_reset_request_id
     WHERE pr.request_token = ?
       AND ov.otp_channel = 'EMAIL'
     ORDER BY ov.otp_verification_id DESC
     LIMIT 1`,
    [requestToken],
  );

  return rows[0] ?? null;
}

export async function verifyPasswordResetOtp(requestToken: string, otpCode: string) {
  const request = await getPasswordResetRequestByToken(requestToken);
  if (!request) {
    return { ok: false as const, reason: "REQUEST_NOT_FOUND" };
  }

  if (request.completed_at || ["COMPLETED", "CANCELLED", "EXPIRED"].includes(request.reset_status)) {
    return { ok: false as const, reason: "REQUEST_CLOSED" };
  }

  if (new Date(request.expires_at).getTime() < Date.now()) {
    await dbExecute(
      `UPDATE password_reset_requests
       SET reset_status = 'EXPIRED', completed_at = NOW(), updated_at = CURRENT_TIMESTAMP
       WHERE password_reset_request_id = ?`,
      [request.password_reset_request_id],
    );
    return { ok: false as const, reason: "REQUEST_EXPIRED" };
  }

  const otp = await getLatestEmailOtpByRequestToken(requestToken);
  if (!otp) {
    return { ok: false as const, reason: "OTP_NOT_FOUND" };
  }

  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await dbExecute(
      `UPDATE otp_verifications
       SET verification_status = 'EXPIRED'
       WHERE otp_verification_id = ?`,
      [otp.otp_verification_id],
    );
    return { ok: false as const, reason: "OTP_EXPIRED" };
  }

  const isMatch = await verifyPassword(otpCode, otp.otp_code_hash);

  if (!isMatch) {
    const nextAttempt = otp.attempt_count + 1;
    await dbExecute(
      `UPDATE otp_verifications
       SET attempt_count = ?, verification_status = ?
       WHERE otp_verification_id = ?`,
      [nextAttempt, nextAttempt >= 5 ? "FAILED" : otp.verification_status, otp.otp_verification_id],
    );
    return { ok: false as const, reason: nextAttempt >= 5 ? "TOO_MANY_ATTEMPTS" : "INVALID_OTP" };
  }

  await dbExecute(
    `UPDATE otp_verifications
     SET attempt_count = attempt_count + 1, verification_status = 'VERIFIED', verified_at = NOW()
     WHERE otp_verification_id = ?`,
    [otp.otp_verification_id],
  );

  await dbExecute(
    `UPDATE password_reset_requests
     SET reset_status = 'EMAIL_VERIFIED', updated_at = CURRENT_TIMESTAMP
     WHERE password_reset_request_id = ?`,
    [request.password_reset_request_id],
  );

  return {
    ok: true as const,
    request,
  };
}

export async function resetPasswordWithVerifiedRequest(requestToken: string, newPassword: string) {
  const request = await getPasswordResetRequestByToken(requestToken);
  if (!request) {
    return { ok: false as const, reason: "REQUEST_NOT_FOUND" };
  }

  if (request.reset_status !== "EMAIL_VERIFIED") {
    return { ok: false as const, reason: "OTP_NOT_VERIFIED" };
  }

  if (new Date(request.expires_at).getTime() < Date.now()) {
    await dbExecute(
      `UPDATE password_reset_requests
       SET reset_status = 'EXPIRED', completed_at = NOW(), updated_at = CURRENT_TIMESTAMP
       WHERE password_reset_request_id = ?`,
      [request.password_reset_request_id],
    );
    return { ok: false as const, reason: "REQUEST_EXPIRED" };
  }

  const newPasswordHash = await hashPassword(newPassword);

  await dbExecute(
    `UPDATE app_users
     SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [newPasswordHash, request.user_id],
  );

  await dbExecute(
    `UPDATE password_reset_requests
     SET reset_status = 'COMPLETED', completed_at = NOW(), updated_at = CURRENT_TIMESTAMP
     WHERE password_reset_request_id = ?`,
    [request.password_reset_request_id],
  );

  return {
    ok: true as const,
    request,
  };
}

export async function ensureInventoryCategory(categoryName: string) {
  const existing = await dbQuery<(RowDataPacket & { inventory_category_id: number })[]>(
    `SELECT inventory_category_id FROM inventory_categories WHERE category_name = ? LIMIT 1`,
    [categoryName],
  );

  if (existing.length > 0) return existing[0].inventory_category_id;

  const result = await dbExecute(
    `INSERT INTO inventory_categories (category_name) VALUES (?)`,
    [categoryName],
  ) as { insertId: number };

  return result.insertId;
}

export async function ensureInventoryUnit(unitName: string) {
  const existing = await dbQuery<(RowDataPacket & { inventory_unit_id: number })[]>(
    `SELECT inventory_unit_id FROM inventory_units WHERE unit_name = ? LIMIT 1`,
    [unitName],
  );

  if (existing.length > 0) return existing[0].inventory_unit_id;

  const result = await dbExecute(
    `INSERT INTO inventory_units (unit_name, unit_symbol) VALUES (?, ?)`,
    [unitName, unitName.toLowerCase()],
  ) as { insertId: number };

  return result.insertId;
}

export function resolveDbStockStatus(qty: number, lowStock: number, idealStock: number) {
  if (qty <= lowStock) return "LOW_STOCK";
  if (qty >= idealStock) return "IN_STOCK";
  return "AVAILABLE";
}
