import type { Dispatch, SetStateAction } from "react";
import { auth } from "../../../services/firebase";
import { useToast } from "../../core/contexts/ToastContext";
import { useConfirm } from "../../core/contexts/ConfirmContext";

const LOCAL_ORDERS_CACHE_KEY = (uid: string) => `jiyoo_orders_history_v2:${uid}`;

/**
 * Shared order-management actions used by both AuthModal.tsx and
 * AccountCenter.tsx. Previously each component had its own near-identical
 * copy of cancelOrder; this hook is the single source of truth.
 *
 * @param setOrders setState function for whichever component's local
 *   `orders` list should be optimistically updated after a successful action.
 */
export function useOrderActions(setOrders: Dispatch<SetStateAction<any[]>>) {
  const { showToast } = useToast();
  const confirm = useConfirm();

  const cancelOrder = async (orderId: string) => {
    if (!(await confirm({ title: "Cancel order?", message: "Are you sure you want to cancel this order?" }))) return;
    try {
      const token = await auth.currentUser?.getIdToken();
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

      // Best-effort local cache sync -- the cancellation itself already succeeded
      // above, so a corrupted cache entry here must not surface as a false
      // "Failed to cancel order" toast.
      try {
        const local = JSON.parse(localStorage.getItem(LOCAL_ORDERS_CACHE_KEY(auth.currentUser?.uid || "unknown")) || "[]");
        const updatedLocal = local.map((o: any) =>
          o.id === orderId ? { ...o, status: "cancelled", orderStatus: "cancelled" } : o
        );
        localStorage.setItem(LOCAL_ORDERS_CACHE_KEY(auth.currentUser?.uid || "unknown"), JSON.stringify(updatedLocal));
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
