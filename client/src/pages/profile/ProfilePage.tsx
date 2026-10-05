import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getAllOrgs,
  type Organization,
} from "@/services/oraganizations/org.services";
import {
  Building2,
  CircleUserRound,
  LogOut,
  Mail,
  ShieldCheck,
  Users,
  WalletCards,
  ArrowUpRight,
} from "lucide-react";

type TransactionDay = {
  date: Date;
  count: number;
};







const ProfilePage = () => {
  const { user, logout } = useAuth();
    const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [organizationView, setOrganizationView] = useState<"owned" | "member">(
    "owned"
  );
  useEffect(() => {
    const loadOrganizations = async () => {
      try {
        setLoading(true);

        const response = await getAllOrgs();

        setOrgs(response ?? []);
      } catch (error) {
        console.error("Failed to load organizations:", error);
        setOrgs([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrganizations();
  }, []);

  const transactionMap = useMemo(() => {
    const map = new Map<string, number>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const day = date.getDay();

      let count = 0;

      if (day !== 0 && day !== 6) {
        const value = (i * 17 + i * i * 3) % 11;
        if (value >= 3) {
          count = value > 8 ? 8 : value;
        }
      } else {
        const value = (i * 7) % 7;
        if (value >= 4) {
          count = value;
        }
      }

      if (i % 29 === 0) count = 10;
      if (i % 47 === 0) count = 14;

      map.set(formatDateKey(date), count);
    }

    return map;
  }, []);

  const calendar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    start.setDate(today.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());

    const weeks: TransactionDay[][] = [];
    let currentWeekStart = new Date(start);

    while (currentWeekStart <= today) {
      const week: TransactionDay[] = [];

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + day);

        const key = formatDateKey(currentDate);

        week.push({
          date: currentDate,
          count: transactionMap.get(key) ?? 0,
        });
      }

      weeks.push(week);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeks;
  }, [transactionMap]);

  const totalTransactions = useMemo(() => {
    let total = 0;
    transactionMap.forEach((count) => {
      total += count;
    });
    return total;
  }, [transactionMap]);

  const activeDays = useMemo(() => {
    let total = 0;
    transactionMap.forEach((count) => {
      if (count > 0) total++;
    });
    return total;
  }, [transactionMap]);

const ownedOrganizations = useMemo(
  () => orgs.filter((org) => org.role === "owner"),
  [orgs]
);

const memberOrganizations = useMemo(
  () => orgs.filter((org) => org.role !== "owner"),
  [orgs]
);
  const displayedOrganizations =
    organizationView === "owned"
      ? ownedOrganizations
      : memberOrganizations;

  const summaryStats = [
    { label: "Transactions", value: totalTransactions.toString() },
    { label: "Active days", value: activeDays.toString() },
    {
      label: "Organizations",
      value: (
        ownedOrganizations.length + memberOrganizations.length
      ).toString(),
    },
    { label: "Owned", value: ownedOrganizations.length.toString() },
  ];

  return (
    <div className="min-h-full w-full bg-app text-text-primary">
      <div className="mx-auto flex w-[94%] max-w-[1360px] gap-8 py-8 lg:w-[88%] lg:py-12">
        {/* LEFT — PROFILE */}
        <aside className="hidden w-[276px] shrink-0 lg:block">
          <div className="sticky top-8">
            <div className="overflow-hidden rounded-xl border border-line bg-surface">
              {/* Identity */}
              <div className="px-6 pb-6 pt-8 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-line bg-subtle">
                  <CircleUserRound
                    size={62}
                    strokeWidth={1}
                    className="text-text-faint"
                  />
                </div>

                <h1 className="mt-5 text-lg font-semibold tracking-tight text-text-primary">
                  {user?.name || "User"}
                </h1>

                <p className="mt-0.5 text-xs text-text-muted">
                  @{user?.email?.split("@")[0] || "username"}
                </p>

                <p className="mt-3 inline-flex max-w-full items-center gap-1.5 text-xs text-text-muted">
                  <Mail size={12} strokeWidth={1.75} className="shrink-0" />
                  <span className="truncate">
                    {user?.email || "email@example.com"}
                  </span>
                </p>
              </div>

              {/* Details */}
              <div className="border-t border-line px-6 py-5">
                <dl className="space-y-4">
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                      Full name
                    </dt>
                    <dd className="mt-1 truncate text-sm text-text-secondary">
                      {user?.name || "Not provided"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                      Account
                    </dt>
                    <dd className="mt-1 flex items-center gap-1.5 text-sm text-text-secondary">
                      <ShieldCheck
                        size={13}
                        strokeWidth={1.75}
                        className="text-text-faint"
                      />
                      Owner
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 border-t border-line">
                <div className="border-r border-line px-5 py-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                    Active days
                  </p>
                  <p className="mt-1 text-base font-medium tabular-nums tracking-tight text-text-primary">
                    {activeDays}
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                    Transactions
                  </p>
                  <p className="mt-1 text-base font-medium tabular-nums tracking-tight text-text-primary">
                    {totalTransactions}
                  </p>
                </div>
              </div>

              {/* Logout */}
              <div className="border-t border-line p-4">
                <button
                  onClick={logout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm text-text-secondary transition-colors hover:bg-subtle hover:text-text-primary"
                >
                  <LogOut size={14} strokeWidth={1.75} />
                  Log out
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT — CONTENT */}
        <main className="min-w-0 flex-1 space-y-6">
          {/* Mobile identity bar */}
          <section className="rounded-xl border border-line bg-surface p-5 lg:hidden">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-subtle">
                <CircleUserRound
                  size={30}
                  strokeWidth={1}
                  className="text-text-faint"
                />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold tracking-tight text-text-primary">
                  {user?.name || "User"}
                </h1>
                <p className="truncate text-xs text-text-muted">
                  {user?.email}
                </p>
              </div>

              <button
                onClick={logout}
                className="ml-auto rounded-lg border border-line p-2 text-text-muted transition-colors hover:bg-subtle hover:text-text-primary"
                title="Log out"
              >
                <LogOut size={15} strokeWidth={1.75} />
              </button>
            </div>
          </section>

          {/* ORGANIZATIONS */}
          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="px-6 pt-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight text-text-primary">
                <Building2
                  size={15}
                  strokeWidth={1.75}
                  className="text-text-faint"
                />
                Organizations
              </h2>

              <p className="mt-1 text-xs text-text-muted">
                Organizations connected to your account.
              </p>
            </div>

            {/* Tabs */}
            <div className="mt-5 flex gap-6 border-b border-line px-6">
              {(["owned", "member"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setOrganizationView(view)}
                  className={`-mb-px border-b py-3 text-xs font-medium uppercase tracking-[0.12em] transition-colors ${
                    organizationView === view
                      ? "border-text-primary text-text-primary"
                      : "border-transparent text-text-faint hover:text-text-secondary"
                  }`}
                >
                  {view === "owned" ? "Owned" : "Member"}
                </button>
              ))}
            </div>

            {/* List */}
            {displayedOrganizations.length > 0 ? (
              <div className="divide-y divide-line">
                {displayedOrganizations.map((organization) => (
                  <div
                    key={organization.id}
                    className="group flex cursor-default items-center gap-4 px-6 py-4 transition-colors hover:bg-subtle"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-subtle text-xs font-semibold text-text-muted">
                      {organization.name.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-medium text-text-primary">
                          {organization.name}
                        </h3>

                        <span className="shrink-0 rounded border border-line px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.1em] text-text-muted">
                          {organization.role === "owner"
    ? "Owner"
    : organization.role === "admin"
      ? "Admin"
      : "Member"}
                        </span>
                      </div>

                      {/* <p className="mt-0.5 truncate text-xs text-text-muted">
                        {organization.description}
                      </p> */}
                    </div>

                    <div className="hidden shrink-0 items-center gap-5 text-xs tabular-nums text-text-faint sm:flex">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} strokeWidth={1.75} />
                        {organization._count?.members}
                      </span>

                      {/* <span className="flex items-center gap-1.5">
                        <WalletCards size={13} strokeWidth={1.75} />
                        {organization.budgets}
                      </span> */}
                    </div>

                    <ArrowUpRight
                      size={15}
                      strokeWidth={1.75}
                      className="shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <Building2
                  size={24}
                  strokeWidth={1.25}
                  className="mx-auto text-text-faint"
                />
                <p className="mt-3 text-xs text-text-muted">
                  No organizations found.
                </p>
              </div>
            )}
          </section>

          {/* TRANSACTION ACTIVITY */}
          <section className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight text-text-primary">
                    Transaction activity
                  </h2>

                  <p className="mt-1 text-xs text-text-muted">
                    Your recorded transactions over the last year.
                  </p>
                </div>

                <p className="text-xs tabular-nums text-text-muted">
                  <span className="font-medium text-text-secondary">
                    {totalTransactions}
                  </span>{" "}
                  transactions
                </p>
              </div>
            </div>

            {/* Calendar */}
            <div className="overflow-x-auto px-6 py-6">
              <div className="min-w-[740px]">
                {/* Month labels */}
                <div className="flex h-5 gap-[3px] pl-[34px]">
                  {calendar.map((week, weekIndex) => {
                    const firstOfMonth = week.find(
                      (day) => day.date.getDate() === 1
                    );

                    return (
                      <div
                        key={weekIndex}
                        className="w-[10px] shrink-0 whitespace-nowrap text-[10px] leading-none text-text-faint"
                      >
                        {firstOfMonth
                          ? firstOfMonth.date.toLocaleString("default", {
                              month: "short",
                            })
                          : ""}
                      </div>
                    );
                  })}
                </div>

                <div className="flex">
                  {/* Weekday labels */}
                  <div className="mr-2 flex w-[26px] shrink-0 flex-col gap-[3px] text-[10px] leading-[10px] text-text-faint">
                    {["", "Mon", "", "Wed", "", "Fri", ""].map(
                      (label, index) => (
                        <span key={index} className="h-[10px]">
                          {label}
                        </span>
                      )
                    )}
                  </div>

                  {/* Grid */}
                  <div className="flex gap-[3px]">
                    {calendar.map((week, weekIndex) => (
                      <div
                        key={weekIndex}
                        className="flex w-[10px] shrink-0 flex-col gap-[3px]"
                      >
                        {week.map((day) => (
                          <TransactionCell
                            key={formatDateKey(day.date)}
                            day={day}
                            today={new Date()}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-6 flex items-center justify-end gap-1.5 text-[10px] text-text-faint">
                  <span className="mr-1">Less</span>

                  <span className="h-[10px] w-[10px] rounded-[2px] bg-muted" />
                  <span className="h-[10px] w-[10px] rounded-[2px] bg-emerald-200/70 dark:bg-emerald-900/70" />
                  <span className="h-[10px] w-[10px] rounded-[2px] bg-emerald-400/70 dark:bg-emerald-700/80" />
                  <span className="h-[10px] w-[10px] rounded-[2px] bg-emerald-600/80 dark:bg-emerald-500/90" />
                  <span className="h-[10px] w-[10px] rounded-[2px] bg-emerald-800 dark:bg-emerald-400" />

                  <span className="ml-1">More</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
              {summaryStats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={`border-line px-6 py-5 ${
                    index % 2 === 0 ? "border-r" : ""
                  } ${index < 2 ? "border-b sm:border-b-0" : ""} ${
                    index === 3 ? "sm:border-r-0" : "sm:border-r"
                  }`}
                >
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-text-faint">
                    {stat.label}
                  </p>
                  <p className="mt-1.5 text-xl font-medium tabular-nums tracking-tight text-text-primary">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

/* TRANSACTION CELL */

const TransactionCell = ({
  day,
  today,
}: {
  day: TransactionDay;
  today: Date;
}) => {
  const isFuture = day.date > today;

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-muted";
    if (count <= 2) return "bg-emerald-200/70 dark:bg-emerald-900/70";
    if (count <= 5) return "bg-emerald-400/70 dark:bg-emerald-700/80";
    if (count <= 8) return "bg-emerald-600/80 dark:bg-emerald-500/90";
    return "bg-emerald-800 dark:bg-emerald-400";
  };

  if (isFuture) {
    return <div className="h-[10px] w-[10px] rounded-[2px]" />;
  }

  return (
    <div
      title={`${formatReadableDate(day.date)} — ${day.count} transaction${
        day.count === 1 ? "" : "s"
      }`}
      className={`h-[10px] w-[10px] cursor-default rounded-[2px] transition-shadow hover:ring-1 hover:ring-line-strong ${getIntensityClass(
        day.count
      )}`}
    />
  );
};

/* DATE HELPERS */

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatReadableDate = (date: Date) => {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export default ProfilePage;