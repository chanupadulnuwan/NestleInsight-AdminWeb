import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  fetchPortalActivities,
  reviewRouteDeliveryApprovalRequest,
  reviewRouteLoadRequest,
  type PortalActivityEntry,
} from "../../api/activity";
import { getApiErrorMessage } from "../../api/client";
import { generateReturnPin } from "../../api/tm";
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

type SettlementReturnLine = {
  productName: string;
  quantity: number;
  reason: string;
  unitType: "ITEM" | "CASE";
  reasonNote: string | null;
  source: "SHOP_RETURN" | "UNFINISHED_DELIVERY";
  orderCode: string | null;
  shopName: string | null;
};

type SettlementOrderLine = {
  orderId: string | null;
  orderCode: string | null;
  shopName: string | null;
  itemCount: number;
  subtotalBeforeDiscount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string | null;
  promotionCode: string | null;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
};

type SettlementSummary = {
  assignmentId: string;
  completedOrderTotal: number;
  pendingOrderValue: number;
  expectedCashAmount: number;
  shopReturnValue: number;
  cashReturnedAmount: number;
  cashVarianceAmount: number;
  cashVarianceType: string | null;
  cashVarianceReason: string | null;
  remainingStopsCount: number;
  earlyClosureReason: string | null;
  completedOrders: SettlementOrderLine[];
  returnLines: SettlementReturnLine[];
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

function formatCurrencyAmount(value: number) {
  return `LKR ${value.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

function getSettlementActivityReference(activity: PortalActivityEntry) {
  const assignmentId = activity.metadata?.assignmentId;
  if (!assignmentId) {
    return null;
  }

  if (activity.type === "WAREHOUSE_RETURN_PIN_REQUESTED") {
    return {
      assignmentId: String(assignmentId),
      status: "pending" as const,
    };
  }

  if (activity.type === "WAREHOUSE_RETURN_PIN_GENERATED") {
    return {
      assignmentId: String(assignmentId),
      status: "resolved" as const,
    };
  }

  return null;
}

function readSettlement(activity: PortalActivityEntry): SettlementSummary | null {
  const raw = activity.metadata?.settlement;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const settlement = raw as Record<string, unknown>;
  const rawReturnLines = Array.isArray(settlement.returnLines)
    ? settlement.returnLines
    : [];
  const rawCompletedOrders = Array.isArray(settlement.completedOrders)
    ? settlement.completedOrders
    : [];

  return {
    assignmentId: String(settlement.assignmentId ?? activity.metadata?.assignmentId ?? ""),
    completedOrderTotal: Number(settlement.completedOrderTotal ?? 0),
    pendingOrderValue: Number(settlement.pendingOrderValue ?? 0),
    expectedCashAmount: Number(settlement.expectedCashAmount ?? 0),
    shopReturnValue: Number(settlement.shopReturnValue ?? 0),
    cashReturnedAmount: Number(settlement.cashReturnedAmount ?? 0),
    cashVarianceAmount: Number(settlement.cashVarianceAmount ?? 0),
    cashVarianceType:
      typeof settlement.cashVarianceType === "string"
        ? settlement.cashVarianceType
        : null,
    cashVarianceReason:
      typeof settlement.cashVarianceReason === "string"
        ? settlement.cashVarianceReason
        : null,
    remainingStopsCount: Number(settlement.remainingStopsCount ?? 0),
    earlyClosureReason:
      typeof settlement.earlyClosureReason === "string"
        ? settlement.earlyClosureReason
        : null,
    completedOrders: rawCompletedOrders.map((entry) => {
      const order = entry as Record<string, unknown>;
      const rawItems = Array.isArray(order.items) ? order.items : [];
      return {
        orderId: typeof order.orderId === "string" ? order.orderId : null,
        orderCode:
          typeof order.orderCode === "string" ? order.orderCode : null,
        shopName: typeof order.shopName === "string" ? order.shopName : null,
        itemCount: Number(order.itemCount ?? 0),
        subtotalBeforeDiscount: Number(order.subtotalBeforeDiscount ?? 0),
        discountAmount: Number(order.discountAmount ?? 0),
        finalAmount: Number(order.finalAmount ?? 0),
        paymentMethod:
          typeof order.paymentMethod === "string" ? order.paymentMethod : null,
        promotionCode:
          typeof order.promotionCode === "string" ? order.promotionCode : null,
        items: rawItems.map((item) => {
          const orderItem = item as Record<string, unknown>;
          return {
            productName: String(orderItem.productName ?? "Product"),
            quantity: Number(orderItem.quantity ?? 0),
          };
        }),
      };
    }),
    returnLines: rawReturnLines.map((line) => {
      const entry = line as Record<string, unknown>;
      return {
        productName: String(entry.productName ?? "Product"),
        quantity: Number(entry.quantity ?? 0),
        reason: String(entry.reason ?? ""),
        unitType: entry.unitType === "ITEM" ? "ITEM" : "CASE",
        reasonNote:
          typeof entry.reasonNote === "string" ? entry.reasonNote : null,
        source:
          entry.source === "SHOP_RETURN" ? "SHOP_RETURN" : "UNFINISHED_DELIVERY",
        orderCode: typeof entry.orderCode === "string" ? entry.orderCode : null,
        shopName: typeof entry.shopName === "string" ? entry.shopName : null,
      };
    }),
  };
}

function formatReason(reason: string) {
  return reason
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const [settlementActioningId, setSettlementActioningId] = useState<string | null>(null);
  const [settlementResolutionByActivityId, setSettlementResolutionByActivityId] = useState<
    Record<string, ApprovalResolution>
  >({});
  const [settlementReviewNotes, setSettlementReviewNotes] = useState<
    Record<string, string>
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
        const isSettlementReview =
          activity.type === "WAREHOUSE_RETURN_PIN_REQUESTED";
        return (
          !isApprovalAction &&
          !isSettlementReview &&
          !activity.type.includes("FEEDBACK")
        );
      }),
    [activities],
  );

  const settlementActivities = useMemo(() => {
    const sortedActivities = [...activities].sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
    const latestActivityByAssignmentId = new Map<
      string,
      { activity: PortalActivityEntry; status: "pending" | "resolved" }
    >();

    for (const activity of sortedActivities) {
      const reference = getSettlementActivityReference(activity);
      if (!reference) {
        continue;
      }

      if (!latestActivityByAssignmentId.has(reference.assignmentId)) {
        latestActivityByAssignmentId.set(reference.assignmentId, {
          activity,
          status: reference.status,
        });
      }
    }

    return Array.from(latestActivityByAssignmentId.values())
      .filter(({ status }) => status === "pending")
      .map(({ activity }) => activity);
  }, [activities]);

  const groupedHighlights = useMemo(() => {
    return {
      total:
        actionableActivities.length +
        settlementActivities.length +
        generalActivities.length,
      routeApprovals: actionableActivities.length,
      endRouteReviews: settlementActivities.length,
      stockAlerts: generalActivities.filter(
        (item) =>
          item.type.includes("LOW_STOCK") || item.type.includes("REFILL"),
      ).length,
      completedOrders: generalActivities.filter((item) =>
        item.type.includes("ORDER_COMPLETED"),
      ).length,
    };
  }, [actionableActivities.length, generalActivities, settlementActivities.length]);

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

  const handleGenerateSettlementPin = async (activity: PortalActivityEntry) => {
    const assignmentId = activity.metadata?.assignmentId;
    if (!assignmentId) {
      return;
    }

    setSettlementActioningId(activity.id);
    setError(null);

    try {
      const response = await generateReturnPin(
        String(assignmentId),
        settlementReviewNotes[activity.id],
      );

      setSettlementResolutionByActivityId((current) => ({
        ...current,
        [activity.id]: {
          decision: "APPROVED",
          message: response.message,
          pin: response.pin,
          pinExpiresAt: response.expiresAt,
        },
      }));

      const refreshedActivities = await fetchPortalActivities();
      setActivities(refreshedActivities.activities);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSettlementActioningId(null);
    }
  };

  if (!user) return null;

  return (
    <TerritoryManagerPortalShell
      user={user}
      breadcrumb="Territory Manager / Activity Center"
      title="Activity Center"
      description="Review route approvals, end-route settlement requests, warehouse alerts, and general territory activity in one place."
      pendingCounts={{ approvals: actionableActivities.length + settlementActivities.length }}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["All activity", groupedHighlights.total],
          ["Route approvals", groupedHighlights.routeApprovals],
          ["End route reviews", groupedHighlights.endRouteReviews],
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

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#4d3020]">
            End Route Review
          </h2>
          <span className="rounded-full bg-[#e8f1e7] px-3 py-1 text-sm font-bold text-[#3d6f47]">
            {settlementActivities.length} Waiting
          </span>
        </div>
        <div className={surfaceClass}>
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-[#7f6657]">
              Loading route-close reviews...
            </p>
          ) : null}
          {!loading ? (
            <div className="flex flex-col gap-4 px-5 py-5">
              {settlementActivities.length === 0 ? (
                <div className="rounded-[1.3rem] border border-dashed border-[#d9c9bb] bg-[#fffaf7] px-5 py-8 text-center text-sm text-[#7f6657]">
                  No end-route reviews are waiting right now.
                </div>
              ) : null}
              {settlementActivities.map((activity) => {
                const settlement = readSettlement(activity);
                const resolution = settlementResolutionByActivityId[activity.id];
                const isBusy = settlementActioningId === activity.id;
                const cashMismatch = Math.abs(
                  settlement?.cashVarianceAmount ?? 0,
                ) >= 0.01;
                const reviewNote = settlementReviewNotes[activity.id] ?? "";
                const canGeneratePin =
                  !cashMismatch || reviewNote.trim().length > 0;

                return (
                  <article
                    key={activity.id}
                    className="rounded-[1.3rem] border border-[#d7e3d4] bg-[#fbfdf9] px-5 py-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-[#4d3020]">
                          {activity.title}
                        </p>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6d7a6b]">
                          {activity.message}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#b8d1b8] bg-[#eef7ed] px-3 py-1 text-xs font-semibold text-[#3d6f47]">
                        End Route Review
                      </span>
                    </div>

                    {settlement ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-[1rem] border border-[#dce8d8] bg-white px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#70806f]">
                              Expected Cash
                            </p>
                            <p className="mt-2 text-sm font-bold text-[#335a3a]">
                              {formatCurrencyAmount(settlement.expectedCashAmount)}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-[#dce8d8] bg-white px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#70806f]">
                              Returned Cash
                            </p>
                            <p className="mt-2 text-sm font-bold text-[#335a3a]">
                              {formatCurrencyAmount(settlement.cashReturnedAmount)}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-[#dce8d8] bg-white px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#70806f]">
                              Shop Returns
                            </p>
                            <p className="mt-2 text-sm font-bold text-[#5c4030]">
                              {formatCurrencyAmount(settlement.shopReturnValue)}
                            </p>
                          </div>
                          <div className="rounded-[1rem] border border-[#dce8d8] bg-white px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#70806f]">
                              Remaining Stops
                            </p>
                            <p className="mt-2 text-sm font-bold text-[#5c4030]">
                              {settlement.remainingStopsCount}
                            </p>
                          </div>
                        </div>

                        <div
                          className={[
                            "rounded-[1rem] border px-4 py-3 text-sm",
                            cashMismatch
                              ? "border-[#efc2bd] bg-[#fff1ef] text-[#a24e47]"
                              : "border-[#dce8d8] bg-[#f5fbf3] text-[#3d6f47]",
                          ].join(" ")}
                        >
                          <p className="font-semibold">
                            Cash variance: {formatCurrencyAmount(settlement.cashVarianceAmount)}
                          </p>
                          {settlement.cashVarianceType ? (
                            <p className="mt-1">
                              Type: {formatReason(settlement.cashVarianceType)}
                            </p>
                          ) : null}
                          {settlement.cashVarianceReason ? (
                            <p className="mt-1">
                              Reason: {settlement.cashVarianceReason}
                            </p>
                          ) : null}
                          {settlement.earlyClosureReason ? (
                            <p className="mt-1">
                              Early closure: {settlement.earlyClosureReason}
                            </p>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#70806f]">
                            Order Details
                          </p>
                          <div className="mt-2 flex flex-col gap-2">
                            {settlement.completedOrders.length === 0 ? (
                              <div className="rounded-[1rem] border border-dashed border-[#d9c9bb] bg-white px-4 py-3 text-sm text-[#7f6657]">
                                No completed deliveries were found for this route yet.
                              </div>
                            ) : (
                              settlement.completedOrders.map((order, index) => (
                                <div
                                  key={`${activity.id}-order-${order.orderCode ?? index}`}
                                  className="rounded-[1rem] border border-[#e7ece3] bg-white px-4 py-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-[#4d3020]">
                                        {[order.shopName, order.orderCode]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </p>
                                      <p className="mt-1 text-xs text-[#7f6657]">
                                        {order.itemCount} line(s) ·{" "}
                                        {order.paymentMethod === "CASH_ON_DELIVERY"
                                          ? "Cash on delivery"
                                          : "Standard checkout"}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-[#335a3a]">
                                        {formatCurrencyAmount(order.finalAmount)}
                                      </p>
                                      {Math.abs(order.discountAmount) >= 0.01 ? (
                                        <p className="mt-1 text-xs font-semibold text-[#3d6f47]">
                                          Discount: {formatCurrencyAmount(order.discountAmount)}
                                        </p>
                                      ) : null}
                                      {order.promotionCode ? (
                                        <p className="mt-1 text-xs text-[#8b5a3a]">
                                          Promo: {order.promotionCode}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                  {order.items.length > 0 ? (
                                    <p className="mt-2 text-sm text-[#6d7a6b]">
                                      {order.items
                                        .map(
                                          (item) =>
                                            `${item.productName} (${item.quantity})`,
                                        )
                                        .join(" · ")}
                                    </p>
                                  ) : null}
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#70806f]">
                            Return Details
                          </p>
                          <div className="mt-2 flex flex-col gap-2">
                            {settlement.returnLines.length === 0 ? (
                              <div className="rounded-[1rem] border border-dashed border-[#d9c9bb] bg-white px-4 py-3 text-sm text-[#7f6657]">
                                No return products were listed with this route close.
                              </div>
                            ) : (
                              settlement.returnLines.map((line, index) => (
                                <div
                                  key={`${activity.id}-${line.productName}-${index}`}
                                  className="rounded-[1rem] border border-[#e7ece3] bg-white px-4 py-3"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-[#4d3020]">
                                        {line.productName}
                                      </p>
                                      <p className="mt-1 text-xs text-[#7f6657]">
                                        {[line.shopName, line.orderCode]
                                          .filter(Boolean)
                                          .join(" · ")}
                                      </p>
                                    </div>
                                    <span className="rounded-full bg-[#f4efe9] px-2.5 py-1 text-xs font-semibold text-[#6b5444]">
                                      {line.quantity} {line.unitType === "ITEM" ? "item(s)" : "case(s)"}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-[#6d7a6b]">
                                    {formatReason(line.reason)}
                                    {line.reasonNote ? ` · ${line.reasonNote}` : ""}
                                  </p>
                                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#9b826f]">
                                    {line.source === "SHOP_RETURN"
                                      ? "Shop owner return"
                                      : "Unfinished delivery"}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {resolution ? (
                          <div className="rounded-[1.1rem] border border-[#cfe2c8] bg-[#f3fbef] px-4 py-3 text-sm text-[#4d6c45]">
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
                          <div className="space-y-3">
                            {cashMismatch ? (
                              <div className="rounded-[1rem] border border-[#efc2bd] bg-[#fff1ef] px-4 py-3 text-sm text-[#a24e47]">
                                <p className="font-semibold">
                                  Warning: returned cash does not match the expected settlement.
                                </p>
                                <p className="mt-1">
                                  Add the reason below before generating the PIN.
                                </p>
                              </div>
                            ) : null}
                            <textarea
                              value={reviewNote}
                              onChange={(event) =>
                                setSettlementReviewNotes((current) => ({
                                  ...current,
                                  [activity.id]: event.target.value,
                                }))
                              }
                              rows={3}
                              className="w-full rounded-[1rem] border border-[#d9c9bb] bg-white px-4 py-3 text-sm text-[#4d3020] outline-none transition focus:border-[#8b5a3a]"
                              placeholder={
                                cashMismatch
                                  ? "Reason for the cash mismatch (required before PIN generation)."
                                  : "Review note for the distributor (optional)."
                              }
                            />
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleGenerateSettlementPin(activity)
                                }
                                disabled={isBusy || !canGeneratePin}
                                className="rounded-[1rem] bg-[#3f7a4e] px-4 py-2.5 text-sm font-semibold text-white transition duration-300 hover:bg-[#356642] disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {isBusy ? "Generating..." : "Generate PIN"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-[#8f9a8d]">
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
