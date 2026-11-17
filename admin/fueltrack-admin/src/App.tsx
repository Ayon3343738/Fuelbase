import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  LayoutDashboard,
  ReceiptText,
  Users,
  ChartNoAxesCombined,
  Fuel,
  LogOut,
  Search,
  Download,
  ShieldCheck,
  MapPin,
  CalendarDays,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { auth, db } from "./firebase";

type Tx = {
  id: string;
  userId: string;
  date: string;
  location: string;
  litres: number;
  amount: number;
  latitude?: number;
  longitude?: number;
};

type Profile = {
  id: string;
  ownerName?: string;
  vehicleType?: string;
  fuelType?: string;
  vehicleNumber?: string;
  remainingQuota: number;
  phone?: string;
  nic?: string;
  qrImageUrl?: string;
  email?: string;
};

type FuelQuota = {
  vehicleType: string;
  quotaLiters: number;
};

const money = (n: number) =>
  `Rs. ${n.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;

const functions = getFunctions();
const deleteFuelTrackUser = httpsCallable<{ id: string }, { success: boolean }>(
  functions,
  "deleteFuelTrackUser",
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState("Dashboard");

  const [tx, setTx] = useState<Tx[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [fuelQuotas, setFuelQuotas] = useState<FuelQuota[]>([]);
  const [quotaInputs, setQuotaInputs] = useState<Record<string, string>>({});
  const [savingQuota, setSavingQuota] = useState("");

  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [deletingUserId, setDeletingUserId] = useState("");

  // ADMIN AUTHENTICATION
  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAdmin(false);
      setReady(true);

      if (currentUser) {
        try {
          const token = await getIdTokenResult(currentUser, true);
          setAdmin(token.claims.admin === true);
        } catch {
          setAdmin(false);
        }
      }
    });
  }, []);

  // FIRESTORE LISTENERS
  useEffect(() => {
    if (!user || !admin) {
      setTx([]);
      setProfiles([]);
      setFuelQuotas([]);
      setQuotaInputs({});
      return;
    }

    const stop1 = onSnapshot(
      query(collection(db, "transactions"), where("userId", "!=", "")),
      (snapshot) => {
        setTx(
          snapshot.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                userId: String(data.userId || ""),
                date: String(data.date || ""),
                location: String(data.location || ""),
                litres: Number(data.litres || 0),
                amount: Number(data.amount || 0),
                latitude: data.latitude,
                longitude: data.longitude,
              };
            })
            .sort((a, b) => b.date.localeCompare(a.date)),
        );
      },
      (e) => setError(e.message),
    );

    const stop2 = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        setProfiles(
          snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ownerName: data.ownerName || "",
              vehicleType: data.vehicleType || "",
              fuelType: data.fuelType || "",
              vehicleNumber: data.vehicleNumber || "",
              remainingQuota: Number(data.remainingQuota ?? 0),
              phone: data.phone || "",
              nic: data.nic || "",
              qrImageUrl: data.qrImageUrl || "",
              email: data.email || "",
            };
          }),
        );
      },
      (e) => setError(e.message),
    );

    const stop3 = onSnapshot(
      collection(db, "fuelQuotaSettings"),
      (snapshot) => {
        const settings = snapshot.docs.map((d) => ({
          vehicleType: d.id,
          quotaLiters: Number(d.data().quotaLiters ?? 0),
        }));

        setFuelQuotas(settings);
        setQuotaInputs((previous) => {
          const next = { ...previous };
          settings.forEach((item) => {
            next[item.vehicleType] = String(item.quotaLiters);
          });
          return next;
        });
      },
      (e) => setError(e.message),
    );

    return () => {
      stop1();
      stop2();
      stop3();
    };
  }, [user, admin]);

  // FILTER TRANSACTIONS
  const shown = useMemo(
    () =>
      tx.filter(
        (t) =>
          (!search ||
            [t.location, t.userId, t.id].some((v) =>
              v.toLowerCase().includes(search.toLowerCase()),
            )) &&
          (!from || t.date >= from) &&
          (!to || t.date <= to),
      ),
    [tx, search, from, to],
  );

  // DASHBOARD CALCULATIONS
  const litres = tx.reduce((sum, t) => sum + t.litres, 0);
  const spend = tx.reduce((sum, t) => sum + t.amount, 0);
  const unique = new Set(tx.map((t) => t.userId)).size;

  const chart = Object.values(
    tx.reduce<Record<string, { date: string; litres: number }>>((acc, t) => {
      if (t.date) {
        acc[t.date] ??= { date: t.date, litres: 0 };
        acc[t.date].litres += t.litres;
      }
      return acc;
    }, {}),
  )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  // LOGIN
  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
    }
  }

  // CSV EXPORT
  function csv() {
    const data = [
      ["Date", "User ID", "Location", "Litres", "Amount"],
      ...shown.map((t) => [
        t.date,
        t.userId,
        t.location,
        String(t.litres),
        String(t.amount),
      ]),
    ];

    const blob = new Blob(
      [
        data
          .map((row) =>
            row.map((v) => `"${v.replaceAll('"', '""')}"`).join(","),
          )
          .join("\n"),
      ],
      { type: "text/csv" },
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fueltrack-transactions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // EDIT USER
  async function saveUserChanges() {
    if (!editingUser) return;

    const quota = Number(editingUser.remainingQuota);
    if (!Number.isFinite(quota) || quota < 0) {
      setError("Please enter a valid remaining quota.");
      return;
    }

    try {
      setSavingUser(true);
      setError("");
      setSuccess("");

      await updateDoc(doc(db, "users", editingUser.id), {
        vehicleType: editingUser.vehicleType || "",
        fuelType: editingUser.fuelType || "",
        remainingQuota: quota,
      });

      setEditingUser(null);
      setSuccess("User information updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update user.");
    } finally {
      setSavingUser(false);
    }
  }

  // SAVE SHARED VEHICLE-TYPE QUOTA
  async function saveFuelQuota(vehicleType: string) {
    const rawValue = quotaInputs[vehicleType];
    const quota = Number(rawValue);

    if (
      rawValue === undefined ||
      rawValue.trim() === "" ||
      !Number.isFinite(quota) ||
      quota < 0
    ) {
      setError("Please enter a valid fuel quota.");
      return;
    }

    try {
      setSavingQuota(vehicleType);
      setError("");
      setSuccess("");

      await setDoc(doc(db, "fuelQuotaSettings", vehicleType), {
        vehicleType,
        quotaLiters: quota,
        updatedAt: serverTimestamp(),
      });

      setSuccess(`${vehicleType} quota updated to ${quota} L.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save fuel quota.");
    } finally {
      setSavingQuota("");
    }
  }

  // DELETE TRANSACTION
  async function deleteTransaction(id: string) {
    if (!window.confirm("Are you sure you want to delete this transaction?"))
      return;

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");
      await deleteDoc(doc(db, "transactions", id));
      setSuccess("Transaction deleted successfully.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to delete transaction.",
      );
    } finally {
      setDeletingId("");
    }
  }

  // DELETE USER
  async function deleteUserAccount(profile: Profile) {
    if (
      !window.confirm(
        `Delete ${profile.ownerName || "this user"} and their account and transactions? This action cannot be undone.`,
      )
    )
      return;

    try {
      setDeletingUserId(profile.id);
      setError("");
      setSuccess("");
      await deleteFuelTrackUser({ id: profile.id });
      setSuccess("User account and transactions deleted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to delete user.");
    } finally {
      setDeletingUserId("");
    }
  }

  if (!ready) return <div className="center">Loading…</div>;

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="login">
        <form onSubmit={login}>
          <div className="logo">
            <Fuel />
          </div>
          <small>FUELTRACK CONTROL CENTER</small>
          <h1>Admin sign in</h1>
          <p>Use an account granted administrator access.</p>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <div className="error">{error}</div>}
          <button className="primary" type="submit">
            Sign in
          </button>
          <small className="hint">
            Access is verified using a Firebase admin custom claim.
          </small>
        </form>
      </div>
    );
  }

  // ADMIN ACCESS CHECK
  if (!admin) {
    return (
      <div className="login">
        <section>
          <div className="logo">
            <ShieldCheck />
          </div>
          <h1>Admin access required</h1>
          <p>This account does not have the administrator role.</p>
          <button className="primary" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </section>
      </div>
    );
  }

  const nav = [
    ["Dashboard", LayoutDashboard],
    ["Transactions", ReceiptText],
    ["Users", Users],
    ["Fuel Quotas", Fuel],
    ["Reports", ChartNoAxesCombined],
  ] as const;

  const vehicleTypes = [
    ...new Set(
      profiles
        .map((p) => p.vehicleType?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  ].sort();

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <div className="logo">
            <Fuel />
          </div>
          <b>FuelTrack</b>
          <small>ADMIN CONSOLE</small>
        </div>

        <p className="navtitle">WORKSPACE</p>

        {nav.map(([name, Icon]) => (
          <button
            className={page === name ? "selected" : ""}
            key={name}
            onClick={() => setPage(name)}
          >
            <Icon size={18} />
            {name}
          </button>
        ))}

        <div className="bottom">
          <p>{user.email}</p>
          <button onClick={() => signOut(auth)}>
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main>
        <header>
          <span>
            Workspace / <b>{page}</b>
          </span>
          <span className="secure">
            <ShieldCheck size={15} />
            Secure admin
          </span>
        </header>

        <div className="content">
          <div className="heading">
            <div>
              <small>OVERVIEW</small>
              <h1>{page}</h1>
              <p>Monitor fuel activity across your application.</p>
            </div>

            {page === "Transactions" && (
              <button className="outline" onClick={csv}>
                <Download size={16} />
                Export CSV
              </button>
            )}
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          {/* DASHBOARD */}
          {page === "Dashboard" && (
            <>
              <div className="stats">
                <Stat
                  icon={<Users />}
                  label="Users with activity"
                  value={String(unique)}
                />
                <Stat
                  icon={<ReceiptText />}
                  label="Transactions"
                  value={String(tx.length)}
                />
                <Stat
                  icon={<Fuel />}
                  label="Fuel recorded"
                  value={`${litres.toLocaleString()} L`}
                />
                <Stat
                  icon={<ChartNoAxesCombined />}
                  label="Total expenditure"
                  value={money(spend)}
                />
              </div>

              <section className="panel">
                <h2>Fuel activity</h2>
                <p>Daily litres recorded · latest 14 dates</p>

                {chart.length ? (
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          dataKey="litres"
                          stroke="#bd1822"
                          fill="#f5cdd0"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <Empty>No transaction data yet.</Empty>
                )}
              </section>

              <section className="panel">
                <div className="panelhead">
                  <div>
                    <h2>Recent transactions</h2>
                    <p>Latest activity across users</p>
                  </div>
                  <button
                    className="link"
                    onClick={() => setPage("Transactions")}
                  >
                    View all
                  </button>
                </div>
                <Table rows={tx.slice(0, 6)} />
              </section>
            </>
          )}

          {/* TRANSACTIONS */}
          {page === "Transactions" && (
            <section className="panel">
              <div className="filters">
                <div className="search">
                  <Search size={16} />
                  <input
                    placeholder="Search location, user ID or transaction ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <label>
                  <CalendarDays size={15} />
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </label>

                <label>
                  to{" "}
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                </label>
              </div>

              <p>{shown.length} transactions</p>
              <TransactionTable
                rows={shown}
                onDelete={deleteTransaction}
                deletingId={deletingId}
              />
            </section>
          )}

          {/* USERS */}
          {page === "Users" && (
            <section className="panel">
              <h2>Registered users</h2>
              <p>Manage user vehicles and per-user remaining quota.</p>

              {profiles.length ? (
                <div className="overflow">
                  <table>
                    <thead>
                      <tr>
                        <th>OWNER</th>
                        <th>VEHICLE NUMBER</th>
                        <th>VEHICLE TYPE</th>
                        <th>FUEL TYPE</th>
                        <th>REMAINING QUOTA</th>
                        <th>PHONE</th>
                        <th>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profiles.map((profile) => (
                        <tr key={profile.id}>
                          <td>{profile.ownerName || "—"}</td>
                          <td>{profile.vehicleNumber || "—"}</td>
                          <td>{profile.vehicleType || "—"}</td>
                          <td>{profile.fuelType || "—"}</td>
                          <td>{profile.remainingQuota} L</td>
                          <td>{profile.phone || "—"}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="outline"
                                onClick={() => setEditingUser({ ...profile })}
                              >
                                <Pencil size={14} />
                                Edit
                              </button>
                              <button
                                className="danger"
                                disabled={deletingUserId === profile.id}
                                onClick={() => deleteUserAccount(profile)}
                              >
                                <Trash2 size={14} />
                                {deletingUserId === profile.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty>No registered users found.</Empty>
              )}
            </section>
          )}

          {/* FUEL QUOTAS */}
          {page === "Fuel Quotas" && (
            <section className="panel">
              <h2>Vehicle fuel quotas</h2>
              <p>
                Set the total allowance for each vehicle type. Users receive
                changes automatically.
              </p>

              {vehicleTypes.length ? (
                <div className="overflow">
                  <table>
                    <thead>
                      <tr>
                        <th>VEHICLE TYPE</th>
                        <th>CURRENT QUOTA</th>
                        <th>NEW QUOTA (LITRES)</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleTypes.map((vehicleType) => {
                        const current = fuelQuotas.find(
                          (q) => q.vehicleType === vehicleType,
                        );
                        return (
                          <tr key={vehicleType}>
                            <td>{vehicleType}</td>
                            <td>
                              {current
                                ? `${current.quotaLiters} L`
                                : "Not configured"}
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={quotaInputs[vehicleType] ?? ""}
                                placeholder="Enter litres"
                                onChange={(e) =>
                                  setQuotaInputs((previous) => ({
                                    ...previous,
                                    [vehicleType]: e.target.value,
                                  }))
                                }
                              />
                            </td>
                            <td>
                              <button
                                className="primary"
                                disabled={savingQuota === vehicleType}
                                onClick={() => saveFuelQuota(vehicleType)}
                              >
                                {savingQuota === vehicleType
                                  ? "Saving..."
                                  : "Save"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty>No vehicle types found in registered users.</Empty>
              )}
            </section>
          )}

          {/* EDIT USER MODAL */}
          {editingUser && (
            <div className="modal-backdrop">
              <section className="panel edit-modal">
                <div className="panelhead">
                  <div>
                    <h2>Edit user</h2>
                    <p>
                      {editingUser.ownerName || "User"} ·{" "}
                      {editingUser.vehicleNumber || "No vehicle number"}
                    </p>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => setEditingUser(null)}
                    disabled={savingUser}
                  >
                    <X />
                  </button>
                </div>

                <label>
                  Owner name
                  <input value={editingUser.ownerName || ""} disabled />
                </label>
                <label>
                  Vehicle number
                  <input value={editingUser.vehicleNumber || ""} disabled />
                </label>

                <label>
                  Vehicle type
                  <select
                    value={editingUser.vehicleType || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        vehicleType: e.target.value,
                      })
                    }
                  >
                    <option value="">Select vehicle type</option>
                    <option value="Motor Cars">Motor Cars</option>
                    <option value="Motorcycles">Motorcycles</option>
                    <option value="Three Wheelers">Three Wheelers</option>
                    <option value="Dual Purpose Vehicles">
                      Dual Purpose Vehicles
                    </option>
                    <option value="Vans">Vans</option>
                    <option value="Lorries">Lorries</option>
                    <option value="Buses">Buses</option>
                  </select>
                </label>

                <label>
                  Fuel type
                  <select
                    value={editingUser.fuelType || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        fuelType: e.target.value,
                      })
                    }
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                  </select>
                </label>

                <label>
                  Remaining quota (litres)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingUser.remainingQuota}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        remainingQuota:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                  />
                </label>

                <div className="modal-actions">
                  <button
                    className="outline"
                    onClick={() => setEditingUser(null)}
                    disabled={savingUser}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary"
                    onClick={saveUserChanges}
                    disabled={savingUser}
                  >
                    {savingUser ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* REPORTS */}
          {page === "Reports" && (
            <>
              <div className="stats">
                <Stat
                  icon={<Fuel />}
                  label="Average litres / transaction"
                  value={`${tx.length ? (litres / tx.length).toFixed(2) : "0"} L`}
                />
                <Stat
                  icon={<ChartNoAxesCombined />}
                  label="Average transaction"
                  value={money(tx.length ? spend / tx.length : 0)}
                />
              </div>

              <section className="panel">
                <div className="panelhead">
                  <div>
                    <h2>Transaction report</h2>
                    <p>Download records for further analysis.</p>
                  </div>
                  <button className="primary" onClick={csv}>
                    <Download size={16} />
                    Download CSV
                  </button>
                </div>
                <Table rows={tx.slice(0, 10)} />
              </section>
            </>
          )}

          <footer>FuelTrack Admin · Connected to Firebase</footer>
        </div>
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="stat">
      <div>
        {label}
        <span>{icon}</span>
      </div>
      <strong>{value}</strong>
    </article>
  );
}

function Empty({ children }: { children: string }) {
  return <div className="empty">{children}</div>;
}

function Table({ rows }: { rows: Tx[] }) {
  return rows.length ? (
    <div className="overflow">
      <table>
        <thead>
          <tr>
            <th>DATE</th>
            <th>USER ID</th>
            <th>LOCATION</th>
            <th>FUEL</th>
            <th>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{t.date || "—"}</td>
              <td className="mono">{t.userId.slice(0, 13)}…</td>
              <td>
                <MapPin size={13} /> {t.location || "—"}
              </td>
              <td>{t.litres.toFixed(2)} L</td>
              <td>{money(t.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>No transactions found.</Empty>
  );
}

function TransactionTable({
  rows,
  onDelete,
  deletingId,
}: {
  rows: Tx[];
  onDelete: (id: string) => void;
  deletingId: string;
}) {
  return rows.length ? (
    <div className="overflow">
      <table>
        <thead>
          <tr>
            <th>DATE</th>
            <th>USER ID</th>
            <th>LOCATION</th>
            <th>FUEL</th>
            <th>AMOUNT</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{t.date || "—"}</td>
              <td className="mono">{t.userId.slice(0, 13)}…</td>
              <td>
                <MapPin size={13} /> {t.location || "—"}
              </td>
              <td>{t.litres.toFixed(2)} L</td>
              <td>{money(t.amount)}</td>
              <td>
                <button
                  className="danger"
                  disabled={deletingId === t.id}
                  onClick={() => onDelete(t.id)}
                >
                  <Trash2 size={14} />
                  {deletingId === t.id ? "Deleting..." : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty>No transactions found.</Empty>
  );
}
