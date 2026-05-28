"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, UserCheck, Users, X } from "lucide-react";
import type { AppRole } from "@/lib/session";
import type { AppUser } from "@/lib/users-store";
import { PageContainer } from "@/components/pagecontainer";
import { fetchJson } from "@/lib/api-client";

export default function UserPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "self-edit">("add");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [currentRole, setCurrentRole] = useState<AppRole>("Owner");
  const [currentUsername, setCurrentUsername] = useState("");

  useEffect(() => {
    fetchJson<{
      currentUser: AppUser & { role: AppRole; username: string };
      users: AppUser[];
    }>("/api/users")
      .then((data) => {
        setCurrentRole(data.currentUser.role);
        setCurrentUsername(data.currentUser.username);
        setUsers(data.users);
        setSelectedUser(null);
      })
      .catch(() => setUsers([]));
  }, []);

  const currentUser = useMemo(() => {
    return users.find((user) => user.username === currentUsername) ?? users[0];
  }, [currentUsername, users]);

  const previewUser = useMemo(() => {
    if (currentRole !== "Owner") return currentUser;
    return selectedUser ?? currentUser;
  }, [currentRole, currentUser, selectedUser]);

  const staffUsers = useMemo(() => users.filter((user) => user.role === "Staff"), [users]);

  const handleAdd = () => {
    setMode("add");
    setSelectedUser(null);
    setIsOpen(true);
  };

  const handleEdit = (user: AppUser) => {
    setMode("edit");
    setSelectedUser(user);
    setIsOpen(true);
  };

  const handleSelfEdit = () => {
    setMode("self-edit");
    setSelectedUser(currentUser ?? null);
    setIsOpen(true);
  };

  const handleDeleteUser = (user: AppUser) => {
    fetchJson<{ users: AppUser[] }>(`/api/users/${encodeURIComponent(user.username)}`, { method: "DELETE" })
      .then((data) => setUsers(data.users))
      .catch((error) => alert(error instanceof Error ? error.message : "Gagal menghapus user."));
  };

  if (!currentUser || !previewUser) return null;

  return (
    <PageContainer
      title="User Management"
      description={
        currentRole === "Owner"
          ? "Kelola akun owner dan staff, lalu buka detail profil langsung dari tabel user."
          : "Lihat dan ubah data profil Anda."
      }
      actionButton={
        currentRole === "Owner" ? (
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-2xl bg-[#f6c33b] px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-[#ebb019]"
          >
            <Plus size={16} />
            Add User
          </button>
        ) : undefined
      }
    >
      <div className={`grid gap-4 ${currentRole === "Owner" ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
        <StatCard
          title={currentRole === "Owner" ? "Total Users" : "My Role"}
          value={currentRole === "Owner" ? `${users.length}` : currentUser.role}
          icon={<Users size={18} className="text-gray-600" />}
          color="bg-gray-200"
        />
        {currentRole === "Owner" && (
          <StatCard
            title="Staff"
            value={`${staffUsers.length}`}
            icon={<UserCheck size={18} className="text-amber-600" />}
            color="bg-amber-100"
          />
        )}
      </div>

      <ProfileCard
        title={currentRole === "Owner" ? (previewUser.username === currentUser.username ? "My Profile" : "Staff Profile") : "My Profile"}
        description={
          currentRole === "Owner"
            ? previewUser.username === currentUser.username
              ? "Owner dapat mengganti data pribadi dan melihat profil akun lain dari tabel."
              : "Detail akun staff yang dipilih dari tabel user."
            : "Lihat dan ubah data profil Anda."
        }
        user={previewUser}
        showChangeButton={
          currentRole === "Staff" ||
          (currentRole === "Owner" && previewUser.username === currentUser.username)
        }
        onChange={currentRole === "Staff" ? handleSelfEdit : () => handleEdit(currentUser)}
      />

      {currentRole === "Owner" ? (
        <DataTable
          title="All Accounts"
          description="Daftar owner dan staff. Klik view untuk menampilkan profil pada panel di atas."
          columns={["Name", "Username", "Email", "Phone", "Role", "Action"]}
          rows={users.map((user) => (
            <tr key={user.id} className="border-t border-slate-100 hover:bg-[#fffdf7]">
              <td className="px-4 py-4 font-medium text-slate-800">{user.name}</td>
              <td className="px-4 py-4">{user.username}</td>
              <td className="px-4 py-4">{user.email}</td>
              <td className="px-4 py-4">{user.phone}</td>
              <td className="px-4 py-4">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${user.role === "Owner" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                  {user.role}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(user)}
                    className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Edit
                  </button>
                  {user.role === "Staff" && (
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        />
      ) : null}

      <UserFormModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode={mode}
        user={selectedUser}
        users={users}
        setUsers={setUsers}
      />
    </PageContainer>
  );
}

function UserFormModal({
  isOpen,
  onClose,
  mode,
  user,
  users,
  setUsers,
}: {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit" | "self-edit";
  user: AppUser | null;
  users: AppUser[];
  setUsers: React.Dispatch<React.SetStateAction<AppUser[]>>;
}) {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    phone: "",
    role: "Staff" as AppRole,
    password: "",
  });

  const ownerCount = users.filter((entry) => entry.role === "Owner").length;

  useEffect(() => {
    if ((mode === "edit" || mode === "self-edit") && user) {
      setForm({
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        password: "",
      });
    } else {
      setForm({
        name: "",
        username: "",
        email: "",
        phone: "",
        role: "Staff",
        password: "",
      });
    }
  }, [mode, user]);

  if (!isOpen) return null;

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (mode === "self-edit") {
      if (!form.name || !form.email) return;
      fetchJson<{ user: AppUser }>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password }),
      })
        .then((data) => {
          setUsers((prev) => prev.map((u) => u.username === data.user.username ? data.user : u));
          onClose();
        })
        .catch((error) => alert(error instanceof Error ? error.message : "Gagal mengubah profil."));
      return;
    }

    if (!form.name || !form.username || !form.email || !form.phone) return;

    if (mode === "add") {
      fetchJson<{ users: AppUser[] }>("/api/users", {
        method: "POST",
        body: JSON.stringify({ ...form }),
      })
        .then((data) => {
          setUsers(data.users);
          onClose();
        })
        .catch((error) => alert(error instanceof Error ? error.message : "Gagal menambah user."));
    } else if (user) {
      fetchJson<{ users: AppUser[] }>(`/api/users/${encodeURIComponent(user.username)}`, {
        method: "PATCH",
        body: JSON.stringify({ ...form }),
      })
        .then((data) => {
          setUsers(data.users);
          onClose();
        })
        .catch((error) => alert(error instanceof Error ? error.message : "Gagal mengubah user."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {mode === "add" ? "Add User" : mode === "self-edit" ? "Edit Profile" : "Edit User"}
          </h2>
          <button onClick={onClose}>
            <X className="text-gray-400 hover:text-black" />
          </button>
        </div>

        <div className="grid gap-4 text-sm md:grid-cols-2">
          <Input label="Full Name" value={form.name} onChange={(value) => handleChange("name", value)} />
          <Input
            label="Username"
            value={form.username}
            onChange={(value) => handleChange("username", value)}
            readOnly={mode === "self-edit"}
          />
          <Input label="Email" value={form.email} onChange={(value) => handleChange("email", value)} />
          <Input label="Phone" value={form.phone} onChange={(value) => handleChange("phone", value)} />
          <Input
            label={mode === "add" ? "Password" : "New Password (opsional)"}
            value={form.password}
            onChange={(value) => handleChange("password", value)}
            type="password"
          />
          {mode !== "self-edit" && (
            <div>
              <label className="text-gray-500 text-xs">Role</label>
              <select
                value={form.role}
                onChange={(e) => handleChange("role", e.target.value as AppRole)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="Staff">Staff</option>
                {(mode === "edit" && user?.role === "Owner") || ownerCount === 0 ? <option value="Owner">Owner</option> : null}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">
            Cancel
          </button>
          <button onClick={handleSubmit} className="rounded-lg bg-yellow-500 px-5 py-2 text-white hover:bg-yellow-600">
            {mode === "add" ? "Create User" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#efe7d4] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <h2 className="mt-2 text-2xl font-semibold text-gray-800">{value}</h2>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function DataTable({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description: string;
  columns: string[];
  rows: React.ReactNode[];
}) {
  return (
    <section className="rounded-[28px] border border-[#efe7d4] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className="overflow-hidden rounded-[24px] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="text-left">
                {columns.map((column) => (
                  <th key={column} className="px-4 py-3">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">{rows}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ProfileCard({
  title,
  description,
  user,
  showChangeButton = false,
  onChange,
}: {
  title: string;
  description: string;
  user: AppUser;
  showChangeButton?: boolean;
  onChange?: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-[#efe7d4] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[20px] font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {showChangeButton && onChange && (
            <button
              onClick={onChange}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Change
            </button>
          )}
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#fff1a8] text-2xl font-semibold text-[#9a6b00]">
            {user.name.charAt(0)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <ProfileItem label="Full Name" value={user.name} />
        <ProfileItem label="Username" value={user.username} />
        <ProfileItem label="Email" value={user.email} />
        <ProfileItem label="Phone" value={user.phone} />
        <ProfileItem label="Role" value={user.role} />
      </div>
    </section>
  );
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-gray-50 p-5">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className="mt-3 break-words text-[15px] font-medium text-slate-900">{value}</p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="text-gray-500 text-xs">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className={`mt-1 w-full rounded-lg border px-3 py-2 ${readOnly ? "bg-slate-100 text-slate-500" : ""}`}
      />
    </div>
  );
}
