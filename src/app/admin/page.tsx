"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import API_BASE_URL from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";

type AdminOverview = {
  totals: {
    total_users: number;
    total_articles: number;
    total_feed_sources: number;
  };
  recent_users: AdminUser[];
  logs?: AdminLog[];
};

type AdminUser = {
  id: number;
  public_id: string;
  username: string;
  name?: string;
  email?: string;
  privilege?: number;
  categories?: { id: string; name: string }[];
  created_at?: string;
};

type AdminLog = {
  level: string;
  logger: string;
  message: string;
  timestamp: string;
};

type FeedSource = {
  url: string;
  title?: string;
  type?: string;
  source_kind?: string;
  request_limit?: number;
  categories?: string[];
};

type IngestSchedule = {
  enabled: boolean;
  time_utc: string;
  last_run_date?: string | null;
};

export default function AdminPage() {
  const router = useRouter();
  const [currentUserPublicId, setCurrentUserPublicId] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [feeds, setFeeds] = useState<FeedSource[]>([]);
  const [feedRequestLimits, setFeedRequestLimits] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState<IngestSchedule>({ enabled: false, time_utc: "08:00", last_run_date: null });
  const [error, setError] = useState("");
  const [feedMessage, setFeedMessage] = useState("");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const userResponse = await axios.get(`${API_BASE_URL}/api/get_user/`, {
          withCredentials: true,
        });
        const currentUser = userResponse.data?.data;
        setCurrentUserPublicId(currentUser?.public_id || null);

        if ((currentUser?.privilege || 0) < 1) {
          router.replace(currentUser?.public_id ? `/users/${currentUser.public_id}` : "/auth");
          return;
        }

        const [overviewResponse, usersResponse, logsResponse, feedsResponse, scheduleResponse] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/admin/overview`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/api/admin/users`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/api/admin/logs?limit=100`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/api/feed_sources`, { withCredentials: true }),
          axios.get(`${API_BASE_URL}/api/admin/ingest-schedule`, { withCredentials: true }),
        ]);
        setOverview(overviewResponse.data?.data || null);
        setUsers(usersResponse.data?.data || []);
        setLogs(logsResponse.data?.data || overviewResponse.data?.data?.logs || []);
        const feedSources = feedsResponse.data?.data || [];
        setFeeds(feedSources);
        setFeedRequestLimits(
          Object.fromEntries(
            feedSources.map((feed: FeedSource) => [feed.url, String(feed.request_limit ?? 50)])
          )
        );
        setSchedule(scheduleResponse.data?.data || { enabled: false, time_utc: "08:00", last_run_date: null });
        setAuthorized(true);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            router.replace("/auth");
            return;
          }
          if (err.response?.status === 403) {
            router.replace("/auth");
            return;
          }
          setError(err.response?.data?.error || "Failed to load admin data");
          return;
        }
        setError("Failed to load admin data");
      }
    };

    void load();
  }, [router]);

  const saveFeedRequestLimit = async (feed: FeedSource) => {
    setFeedMessage("");
    setError("");

    const rawValue = feedRequestLimits[feed.url] ?? String(feed.request_limit ?? 50);
    const requestLimit = Number(rawValue);
    if (!Number.isInteger(requestLimit) || requestLimit < 1 || requestLimit > 200) {
      setError("Request limit must be a whole number between 1 and 200");
      return;
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/feed-request-limit`,
        { url: feed.url, request_limit: requestLimit },
        { withCredentials: true }
      );
      setFeeds((current) =>
        current.map((item) => (item.url === feed.url ? { ...item, request_limit: requestLimit } : item))
      );
      setFeedMessage(response.data?.message || "Feed request limit updated");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Failed to update feed request limit");
        return;
      }
      setError("Failed to update feed request limit");
    }
  };

  const saveSchedule = async () => {
    setFeedMessage("");
    setError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/admin/ingest-schedule`,
        {
          enabled: schedule.enabled,
          time_utc: schedule.time_utc,
        },
        { withCredentials: true }
      );
      setSchedule(response.data?.data || schedule);
      setFeedMessage(response.data?.message || "Ingest schedule updated");
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || "Failed to update ingest schedule");
        return;
      }
      setError("Failed to update ingest schedule");
    }
  };

  if (!authorized && !error) {
    return (
      <main className="admin-shell px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex justify-end">
            <ThemeToggle />
          </div>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading admin panel...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-shell px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Admin</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">Operations Panel</h1>
          </div>
          <Link href={currentUserPublicId ? `/users/${currentUserPublicId}` : "/"} className="btn btn-ghost-light text-sm">
            Back to Home
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {feedMessage && (
          <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/10 px-5 py-3 text-sm text-green-300">
            {feedMessage}
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="admin-panel-card p-5">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Users</p>
            <p className="mt-2 text-3xl font-bold">{overview?.totals.total_users ?? "-"}</p>
          </div>
          <div className="admin-panel-card p-5">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Articles</p>
            <p className="mt-2 text-3xl font-bold">{overview?.totals.total_articles ?? "-"}</p>
          </div>
          <div className="admin-panel-card p-5">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Feed Sources</p>
            <p className="mt-2 text-3xl font-bold">{overview?.totals.total_feed_sources ?? "-"}</p>
          </div>
        </section>

        <section className="admin-panel-card mt-8 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Automatic RSS Reload</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>UTC daily schedule</p>
          </div>
          <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-end">
            <label className="flex items-start gap-3 text-sm text-white/80 sm:items-center">
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={(event) =>
                  setSchedule((current) => ({ ...current, enabled: event.target.checked }))
                }
              />
              Enable daily automatic reload
            </label>
            <label className="flex flex-col gap-2 text-sm text-white/80">
              <span>Time (UTC)</span>
              <input
                type="time"
                value={schedule.time_utc}
                onChange={(event) =>
                  setSchedule((current) => ({ ...current, time_utc: event.target.value }))
                }
                className="rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-white/60"
              />
            </label>
            <button type="button" onClick={() => void saveSchedule()} className="btn btn-ghost-light w-full text-sm sm:w-auto">
              Save Schedule
            </button>
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            Last automatic run: {schedule.last_run_date || "Never"}
          </p>
        </section>

        <section className="admin-panel-card mt-8 p-5">
          <h2 className="text-2xl font-bold">Users</h2>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="text-white/45">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3 font-medium">User</th>
                  <th className="px-3 py-3 font-medium">Public URL</th>
                  <th className="px-3 py-3 font-medium">Role</th>
                  <th className="px-3 py-3 font-medium">Categories</th>
                  <th className="px-3 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 align-top">
                    <td className="px-3 py-4">
                      <p className="font-semibold">{user.name || user.username}</p>
                      <p className="text-xs text-white/45">{user.email || user.username}</p>
                    </td>
                    <td className="px-3 py-4 text-xs text-white/60">
                      <Link href={`/users/${user.public_id}`} className="underline">
                        /users/{user.public_id}
                      </Link>
                    </td>
                    <td className="px-3 py-4">{(user.privilege || 0) >= 1 ? "Admin" : "User"}</td>
                    <td className="px-3 py-4">{user.categories?.length || 0}</td>
                    <td className="px-3 py-4 text-white/60">
                      {user.created_at ? new Date(user.created_at).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel-card mt-8 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Feed Request Limits</h2>
            <p className="text-sm text-white/45">{feeds.length} feeds</p>
          </div>
          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="text-white/45">
                <tr className="border-b border-white/10">
                  <th className="px-3 py-3 font-medium">Feed</th>
                  <th className="px-3 py-3 font-medium">Categories</th>
                  <th className="px-3 py-3 font-medium">Request Limit</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map((feed) => (
                  <tr key={feed.url} className="border-b border-white/5 align-top">
                    <td className="px-3 py-4">
                      <p className="font-semibold">{feed.title || feed.url}</p>
                      <p className="text-xs text-white/45 break-all">{feed.url}</p>
                    </td>
                    <td className="px-3 py-4 text-white/60">{feed.categories?.join(", ") || "-"}</td>
                    <td className="px-3 py-4">
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={feedRequestLimits[feed.url] ?? String(feed.request_limit ?? 50)}
                        onChange={(event) =>
                          setFeedRequestLimits((current) => ({
                            ...current,
                            [feed.url]: event.target.value,
                          }))
                        }
                        className="w-full min-w-24 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white outline-none focus:border-white/60 sm:w-28"
                      />
                    </td>
                    <td className="px-3 py-4">
                      <button type="button" onClick={() => void saveFeedRequestLimit(feed)} className="btn btn-ghost-light w-full text-sm sm:w-auto">
                        Save
                      </button>
                    </td>
                  </tr>
                ))}
                {feeds.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-white/45">
                      No feeds registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel-card mt-8 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold">Backend Logs</h2>
            <p className="text-sm text-white/45">{logs.length} entries</p>
          </div>
          <div className="mt-5 max-h-[520px] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3 sm:p-4">
            <div className="space-y-3 font-mono text-xs">
              {logs.length === 0 && (
                <p className="text-white/45">No logs captured yet.</p>
              )}
              {logs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center gap-3 text-white/45">
                    <span>{log.timestamp}</span>
                    <span className="font-semibold text-white/70">{log.level}</span>
                    <span>{log.logger}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-white/85">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
