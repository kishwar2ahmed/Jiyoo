import type { Dispatch, SetStateAction } from "react";
import { auth } from "../../../services/firebase";
import { getStoredCustomerSession } from "../../../utils/customerAuthFallback";
import { useToast } from "../../core/contexts/ToastContext";
import { useConfirm } from "../../core/contexts/ConfirmContext";

const LOCAL_ORDERS_CACHE_KEY = (uid: string) => `jiyoo_orders_history_v2:${uid}`;

export function useOrderActions(setOrders: Dispatch<SetStateAction<any[]>>) {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const cancelOrder = async (orderId: string) => {
    if (!(await confirm({ title: "Cancel order?", message: "Are you sure you want to cancel this order?" }))) return;
    try {
      const custSession = getStoredCustomerSession();
      const fbToken = await auth.currentUser?.getIdToken().catch(() => null);
      const token = fbToken || custSession?.token || "";
      const activeUid = auth.currentUser?.uid || custSession?.user?.id || "unknown";
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "Failed to cancel order.", "error");
        return;
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: "cancelled", orderStatus: "cancelled" } : o
        )
      );

      try {
        const local = JSON.parse(localStorage.getItem(LOCAL_ORDERS_CACHE_KEY(activeUid)) || "[]");
        const updatedLocal = local.map((o: any) =>
          o.id === orderId ? { ...o, status: "cancelled", orderStatus: "cancelled" } : o
        );
        localStorage.setItem(LOCAL_ORDERS_CACHE_KEY(activeUid), JSON.stringify(updatedLocal));
      } catch (cacheErr) {
        console.warn("Could not sync cancelled order to local cache:", cacheErr);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to cancel order.", "error");
    }
  };

  return { cancelOrder };
}
