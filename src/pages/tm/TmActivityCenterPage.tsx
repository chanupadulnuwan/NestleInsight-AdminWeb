import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  fetchPortalActivities,
  reviewRouteDeliveryApprovalRequest,
  reviewRouteLoadRequest,
  type PortalActivityEntry,
} from "../../api/activity";
import { getApiErrorMessage } from "../../api/client";
import { TerritoryManagerPortalShell } from "../../components/TerritoryManagerPortalShell";
import { useTmGuard } from "../../hooks/useTmGuard";

const surfaceClass =
  "rounded-[1.8rem] border border-[#ebdfd5] bg-white shadow-[0_20px_48px_rgba(59,31,15,0.08)]";

type ApprovalResolution = {
  decision: "APPROVED" | "REJECTED";
  message: string;
  pin?: string;
  pinExpiresAt?: string | null;
};

type ApprovalActivityReference = {
  kind: "delivery" | "load";
  id: string;
  status: "pending" | "resolved";
};

function activityTone(type: string) {
  if (type === "ORDER_FEEDBACK") {
    return "border-[#f0d070] bg-[#fffbec] text-[#7a5a00]";
  }
  if (type.includes("LOW_STOCK") || type.includes("REFILL")) {
    return "border-[#f0c96d] bg-[#fff7df] text-[#8c5d0d]";
  }
  if (type.includes("COMPLETE")) {
    return "border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]";
  }
  if (type.includes("FEEDBACK")) {
    return "border-[#b8d4e8] bg-[#f0f7fc] text-[#2e6b99]";
  }
  if (
    type.includes("ROUTE_") ||
    type.includes("PENDING") ||
    type.includes("APPROVED") ||
    type.includes("ORDER_")
  ) {
    return "border-[#d7baa3] bg-[#fff8f2] text-[#8b5a3a]";
  }
  return "border-[#ebdfd5] bg-[#fff9f5] text-[#7f6657]";
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function getApprovalTarget(activity: PortalActivityEntry) {
  if (activity.type === "ROUTE_DELIVERY_APPROVAL_PENDING") {
    const approvalRequestId = activity.metadata?.approvalRequestId;
    return approvalRequestId
      ? { kind: "delivery" as const, id: String(approvalRequestId) }
      : null;
  }
  if (activity.type === "ROUTE_LOAD_REQUEST_PENDING") {
    const loadRequestId = activity.metadata?.loadRequestId;
    return loadRequestId
      ? { kind: "load" as const, id: String(loadRequestId) }
      : null;
  }
  return null;
}

function getApprovalActivityReference(
  activity: PortalActivityEntry,
): ApprovalActivityReference | null {
  const approvalRequestId = activity.metadata?.approvalRequestId;
  const loadRequestId = activity.metadata?.loadRequestId;

  if (
    activity.type === "ROUTE_DELIVERY_APPROVAL_PENDING" &&
    approvalRequestId
  ) {
    return {
      kind: "delivery",
      id: String(approvalRequestId),
      status: "pending",
    };
  }

  if (
    [
      "ROUTE_DELIVERY_APPROVAL_REVIEWED",
      "ROUTE_DELIVERY_APPROVAL_APPROVED",
      "ROUTE_DELIVERY_APPROVAL_REJECTED",
      "ROUTE_DELIVERY_APPROVAL_PIN_CONFIRMED",
    ].includes(activity.type) &&
    approvalRequestId
  ) {
    return {
      kind: "delivery",
      id: String(approvalRequestId),
      status: "resolved",
    };
  }

  if (activity.type === "ROUTE_LOAD_REQUEST_PENDING" && loadRequestId) {
    return {
      kind: "load",
      id: String(loadRequestId),
      status: "pending",
    };
  }

  if (
    [
      "ROUTE_LOAD_REQUEST_REVIEWED",
      "ROUTE_LOAD_REQUEST_APPROVED",
      "ROUTE_LOAD_REQUEST_REJECTED",
    ].includes(activity.type) &&
    loadRequestId
  ) {
    return {
      kind: "load",
      id: String(loadRequestId),
      status: "resolved",
    };
  }

  return null;
}

export default function TmActivityCenterPage() {
  const { user, isUnauthorized } = useTmGuard();
  const [activities, setActivities] = useState<PortalActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [resolutionByActivityId, setResolutionByActivityId] = useState<
    Record<string, ApprovalResolution>
  >({});

  if (isUnauthorized) return <Navigate to="/" replace />;

  useEffect(() => {
    fetchPortalActivities()
      .then((activitiesResponse) => {
        setActivities(activitiesResponse.activities);
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, []);

  const actionableActivities = useMemo(() => {
    const sortedActivities = [...activities].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
    const latestActivityByApprovalKey = new Map<
      string,
      { activity: PortalActivityEntry; status: "pending" | "resolved" }
    >();

    for (const activity of sortedActivities) {
      const reference = getApprovalActivityReference(activity);
      if (!reference) {
        continue;
      }

      const approvalKey = `${reference.kind}:${reference.id}`;
      if (!latestActivityByApprovalKey.has(approvalKey)) {
        latestActivityByApprovalKey.set(approvalKey, {
          activity,
          status: reference.status,
        });
      }
    }

    return Array.from(latestActivityByApprovalKey.values())
      .filter(({ status }) => status === "pending")
      .map(({ activity }) => activity);
  }, [activities]);

  const generalActivities = useMemo(
    () =>
      activities.filter((activity) => {
        const isApprovalAction = getApprovalTarget(activity) !== null;
        return !isApprovalAction && !activity.type.includes("FEEDBACK");
      }),
    [activities],
  );

  const groupedHighlights = useMemo(() => {
    return {
      total: actionableActivities.length + generalActivities.length,
      routeApprovals: actionableActivities.length,
      stockAlerts: generalActivities.filter(
        (item) =>
          item.type.includes("LOW_STOCK") || item.type.includes("REFILL"),
      ).length,
      completedOrders: generalActivities.filter((item) =>
        item.type.includes("ORDER_COMPLETED"),
      ).length,
    };
  }, [actionableActivities.length, generalActivities]);

  const handleReview = async (
    activity: PortalActivityEntry,
    decision: "APPROVED" | "REJECTED",
  ) => {
    const target = getApprovalTarget(activity);
    if (!target) {
      return;
    }

    setActioningId(activity.id);
    setError(null);

    try {
      const notes =
        decision === "REJECTED"
          ? window
              .prompt("Enter the rejection reason for the sales rep:")
              ?.trim()
          : "Approved from Activity Center.";

      if (decision === "REJECTED" && !notes) {
        setError("Please provide a rejection reason.");
        setActioningId(null);
        return;
      }

      if (target.kind === "delivery") {
        const response = await reviewRouteDeliveryApprovalRequest(target.id, {
          decision,
          notes,
        });

        setResolutionByActivityId((current) => ({
          ...current,
          [activity.id]: {
            decision,
            message: response.message,
            pin: response.pin,
            pinExpiresAt: response.pinExpiresAt ?? null,
          },
        }));
      } else {
        const response = await reviewRouteLoadRequest(target.id, {
          decision,
          notes,
        });

        setResolutionByActivityId((current) => ({
          ...current,
          [activity.id]: {
            decision,
            message: response.message,
            pin: response.startPin,
            pinExpiresAt: response.pinExpiresAt ?? null,
          },
        }));
      }

      const refreshedActivities = await fetchPortalActivities();
      setActivities(refreshedActivities.activities);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActioningId(null);
    }
  };

  if (!user) return null;

  return (
    <TerritoryManagerPortalShell
      user={user}
      breadcrumb="Territory Manager / Activity Center"
      title="Activity Center"
      description="Review route start approvals, warehouse alerts, and general territory activity in one place."
      pendingCounts={{ approvals: actionableActivities.length }}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["All activity", groupedHighlights.total],
          ["Route approvals", groupedHighlights.routeApprovals],
          ["Refill alerts", groupedHighlights.stockAlerts],
          ["Completed orders", groupedHighlights.completedOrders],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-[1.2rem] border border-[#eee2d7] bg-[#fff9f5] px-4 py-4"
          >
            <p className="text-sm font-semibold text-[#8a6c58]">{label}</p>
            <p className="mt-2 text-[1.4rem] font-bold text-[#4d3020]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#4d3020]">
            Route Approval Queue
          </h2>
          <span className="rounded-full bg-[#f2e2d4] px-3 py-1 text-sm font-bold text-[#8b5a3a]">
            {actionableActivities.length} Pending
          </span>
        </div>
        <div className={surfaceClass}>
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-[#7f6657]">
              Loading approval queue...
            </p>
          ) : null}
          {error ? (
            <p className="px-5 py-6 text-center text-sm text-red-600">
              {error}
            </p>
          ) : null}
          {!loading ? (
            <div className="flex flex-col gap-4 px-5 py-5">
              {actionableActivities.length === 0 ? (
                <div className="rounded-[1.3rem] border border-dashed border-[#d9c9bb] bg-[#fffaf7] px-5 py-8 text-center text-sm text-[#7f6657]">
                  No route approvals are waiting right now.
                </div>
              ) : null}
              {actionableActivities.map((activity) => {
                const resolution = resolutionByActivityId[activity.id];
                const isBusy = actioningId === activity.id;

                return (
                  <article
                    key={activity.id}
                    className="rounded-[1.3rem] border border-[#eee2d7] bg-[#fffaf7] px-5 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-[#4d3020]">
                          {activity.title}
                        </p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7f6657]">
                          {activity.message}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${activityTone(activity.type)}`}
                      >
                        {activity.type.replaceAll("_", " ")}
                      </span>
                    </div>

                    {resolution ? (
                      <div
                        className={[
                          "mt-4 rounded-[1.1rem] border px-4 py-3 text-sm",
                          resolution.decision === "APPROVED"
                            ? "border-[#cfe2c8] bg-[#f3fbef] text-[#4d6c45]"
                            : "border-[#f0d5d1] bg-[#fff3f2] text-[#9b4b46]",
                        ].join(" ")}
                      >
                        <p className="font-semibold">{resolution.message}</p>
                        {resolution.pin ? (
                          <p className="mt-2">
                            PIN:{" "}
                            <span className="font-mono font-bold">
                              {resolution.pin}
                            </span>
                            {resolution.pinExpiresAt
                              ? ` · Expires ${formatTimestamp(resolution.pinExpiresAt)}`
                              : ""}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            void handleReview(activity, "APPROVED")
                          }
                          disabled={isBusy}
                          className="rounded-[1rem] bg-[#8b5a3a] px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#73492f] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isBusy ? "Saving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleReview(activity, "REJECTED")
                          }
                          disabled={isBusy}
                          className="rounded-[1rem] border border-[#e7c0bc] bg-[#fff0ef] px-4 py-2.5 text-sm font-semibold text-[#9b4b46] transition duration-300 hover:bg-[#ffe5e3] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#a37d63]">
                      {formatTimestamp(activity.createdAt)}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <h2 className="mb-4 mt-8 text-xl font-bold text-[#4d3020]">
        General Activity
      </h2>
      <div className={surfaceClass}>
        {loading ? (
          <p className="px-5 py-10 text-center text-sm text-[#7f6657]">
            Loading activity...
          </p>
        ) : null}
        {!loading ? (
          <div className="flex flex-col gap-4 px-5 py-5">
            {generalActivities.length === 0 ? (
              <div className="rounded-[1.3rem] border border-dashed border-[#d9c9bb] bg-[#fffaf7] px-5 py-8 text-center text-sm text-[#7f6657]">
                No activity recorded yet.
              </div>
            ) : null}
            {generalActivities.map((activity) => {
              const pin =
                activity.metadata?.pin ?? activity.metadata?.routeStartPin;
              const pinExpiresAt =
                activity.metadata?.pinExpiresAt ?? activity.metadata?.expiresAt;
              const pinLabel =
                activity.type === "ROUTE_HANDOVER_PIN_GENERATED"
                  ? "Route Handover PIN"
                  : "Route Start PIN";
              return (
                <article
                  key={activity.id}
                  className="rounded-[1.3rem] border border-[#eee2d7] bg-[#fffaf7] px-5 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-[#4d3020]">
                        {activity.title}
                      </p>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#7f6657]">
                        {activity.message}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${activityTone(activity.type)}`}
                    >
                      {activity.type.replaceAll("_", " ")}
                    </span>
                  </div>
                  {pin ? (
                    <div className="mt-4 rounded-[1.1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#4d6c45]">
                        {pinLabel}
                      </p>
                      <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-[#2d5c25]">
                        {String(pin)}
                      </p>
                      {pinExpiresAt ? (
                        <p className="mt-1 text-xs text-[#4d6c45]">
                          Expires {formatTimestamp(String(pinExpiresAt))}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#a37d63]">
                    {formatTimestamp(activity.createdAt)}
                  </p>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </TerritoryManagerPortalShell>
  );
}
