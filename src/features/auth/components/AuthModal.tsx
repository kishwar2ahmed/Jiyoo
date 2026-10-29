import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  LogOut,
  Check,
  Mail,
  Lock,
  User,
  Sparkles,
  Package,
  Heart,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { PremiumShieldMark } from "../../core/components/PremiumShieldMark";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../../../contexts/CartContext";
import { useSettings } from "../../../contexts/SettingsContext";
import { useOrderActions } from "../hooks/useOrderActions";
import { useModalBackButton } from "../../core/hooks/useModalBackButton";
import { useToast } from "../../core/contexts/ToastContext";
import { getOptimizedImageUrl } from "../../../utils/imageUtils";
import { useStorefrontProducts } from "../../storefront/hooks/useStorefrontProducts";
import { auth, googleProvider, db } from "../../../services/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";

export function AuthModal({
  isOpen,
  onClose,
  hideClose = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  hideClose?: boolean;
}) {
  const { user, logoutUser, wishlist, addToCart, toggleWishlist } = useCart();
  const { currentProducts } = useStorefrontProducts();
  const { showToast } = useToast();
  const wishlistedProducts = (currentProducts || []).filter(p => wishlist?.includes(String(p.id)));
  const { settings } = useSettings();
  const [activeProfileTab, setActiveProfileTab] = useState<
    "profile" | "orders" | "wishlist"
  >("profile");
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const { cancelOrder } = useOrderActions(setOrders);
  
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [step, setStep] = useState<"login" | "success">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Let the device/browser back button close this modal one step at a time
  // instead of navigating away from the site.
  useModalBackButton(isOpen, onClose);

  const [phase, setPhase] = useState<
    "enter" | "walkToCard" | "grab" | "pull" | "release" | "idle" | "vanish"
  >("idle");

  useEffect(() => {
    if (user && activeProfileTab === "orders" && isOpen) {
      const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
          const qUser = query(
            collection(db, "orders"),
            where("userId", "==", user.id),
          );
          const snapUser = await getDocs(qUser);
          let loaded = snapUser.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          try {
            const local = JSON.parse(
              localStorage.getItem(`jiyoo_orders_history_v2:${user.id}`) || "[]",
            );
            const orderMap = new Map();
            loaded.forEach((o) => orderMap.set(o.id, o));
            local.forEach((lo: any) => {
              if (
                lo &&
                lo.id &&
                (lo.userId === user.id)
              ) {
                if (!orderMap.has(lo.id)) {
                  orderMap.set(lo.id, lo);
                }
              }
            });
            loaded = Array.from(orderMap.values());
          } catch (localErr) {
            console.warn("Local storage parse:", localErr);
          }

          loaded.sort((a: any, b: any) => {
            const timeA =
              (a.createdAt?.seconds
                ? a.createdAt.seconds * 1000
                : new Date(a.createdAt || 0).getTime()) || 0;
            const timeB =
              (b.createdAt?.seconds
                ? b.createdAt.seconds * 1000
                : new Date(b.createdAt || 0).getTime()) || 0;
            return timeB - timeA;
          });

          setOrders(loaded);
        } catch (err) {
          console.error("Failed to fetch orders", err);
        } finally {
          setOrdersLoading(false);
        }
      };
      fetchOrders();
    }
  }, [user, activeProfileTab, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setInfoMessage(null);
      setStep("login");
      setMode("signin");
      setIsLoading(false);
      setPhase("idle");
    }
  }, [isOpen]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(
        "Please enter your email address to receive a password reset link.",
      );
      return;
    }
    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfoMessage("Password reset email sent! Check your inbox.");
      setTimeout(() => {
        setMode("signin");
        setInfoMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      setStep("success");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError(
          "Invalid email or password. Don't have an account? Click 'Create Account' above.",
        );
      } else {
        setError(
          err.message || "Failed to sign in. Please check your credentials.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(userCredential.user, {
        displayName: fullName,
      });
      setStep("success");
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError(err.message || "Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setStep("success");
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      if (
        err?.code === "auth/popup-closed-by-user" ||
        err?.code === "auth/cancelled-popup-request"
      ) {
        // User closed the popup intentionally — do not redirect or display an error
        return;
      }
      if (err?.code === "auth/popup-blocked") {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site and try again.");
      } else {
        setError(err?.message || "Failed to sign in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto "
        >
          {/* Background overlay click to close */}
          <div className="absolute inset-0" onClick={onClose} />

          {/* Hidden recaptcha container */}
          <div id="recaptcha-container"></div>

          {/* Card Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: 10, filter: "blur(10px)" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md bg-white border border-stone-200/90 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl z-10 max-h-[90dvh] overflow-y-auto custom-scrollbar"
          >
            {/* Close Button */}
            {!hideClose && (
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 text-stone-400 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors z-20"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {user ? (
              <motion.div
                key="logged-in"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-2"
              >
                {/* Tabs */}
                <div className="flex bg-stone-50 p-1 rounded-xl mb-6 border border-stone-200">
                  <button
                    onClick={() => setActiveProfileTab("profile")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                      activeProfileTab === "profile"
                        ? "bg-stone-900 text-white shadow-xs"
                        : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveProfileTab("orders")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                      activeProfileTab === "orders"
                        ? "bg-stone-900 text-white shadow-xs"
                        : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Orders
                  </button>
                  <button
                    onClick={() => setActiveProfileTab("wishlist")}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                      activeProfileTab === "wishlist"
                        ? "bg-stone-900 text-white shadow-xs"
                        : "text-stone-500 hover:text-stone-900"
                    }`}
                  >
                    Wishlist
                  </button>
                </div>

                <div className="min-h-[250px] max-h-[400px] overflow-y-auto custom-scrollbar pr-2 -mr-2">
                  {activeProfileTab === "profile" && (
                    <div className="text-center py-6">
                      {user.picture ? (
                        <img
                          src={user.picture}
                          alt={user.name}
                          className="w-20 h-20 rounded-full mx-auto mb-4 shadow-md border border-stone-200 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl font-serif font-bold mx-auto mb-4 text-amber-700 shadow-md">
                          {(
                            user.name ||
                            user.displayName ||
                            user.email ||
                            "Member"
                          )
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1">
                        {user.name || user.displayName || user.email}
                      </h2>
                      <p className="text-xs text-stone-500 mb-6 font-light flex items-center justify-center gap-1.5">
                        <PremiumShieldMark className="w-4 h-4 shrink-0" variant="gold" />
                        JIYOO Member Account
                      </p>

                      <button
                        onClick={() => {
                          logoutUser();
                          setTimeout(() => {
                            onClose();
                          }, 500);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-medium transition-all duration-200 text-sm border border-stone-200"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}

                  {activeProfileTab === "orders" && (
                    <div className="space-y-4">
                      {ordersLoading ? (
                        <div className="flex justify-center items-center py-12">
                          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="text-center py-12">
                          <Package
                            className="w-12 h-12 text-stone-200 mx-auto mb-3"
                            strokeWidth={1}
                          />
                          <p className="text-sm text-stone-500">
                            You haven't placed any orders yet.
                          </p>
                        </div>
                      ) : (
                        orders.map((order) => (
                          <div
                            key={order.id}
                            className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm text-left"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-xs text-stone-500 mb-1">
                                  {new Date(
                                    order.createdAt?.seconds * 1000 || 0,
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-sm font-semibold text-stone-900">
                                  Order #{order.orderId || order.id}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded text-[10px] font-semibold uppercase tracking-wider">
                                {order.status || "Processing"}
                              </span>
                              {['pending', 'confirmed'].includes(order.status || order.orderStatus || 'pending') && (
                                <button
                                  onClick={() => cancelOrder(order.id)}
                                  className="ml-2 px-2 py-1 bg-red-50 text-red-600 rounded text-[10px] font-semibold hover:bg-red-100 transition-colors"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                            <div className="border-t border-stone-100 pt-3">
                              <p className="text-sm text-stone-800 font-medium mb-2">
                                Total: ₹{order.amount}
                              </p>
                              <div className="space-y-2">
                                {order.items?.map((item: any, i: number) => (
                                  <div
                                    key={i}
                                    className="flex justify-between items-center text-xs text-stone-600"
                                  >
                                    <span>
                                      {item.quantity}x {item.name}
                                    </span>
                                    <span>₹{item.price * item.quantity}</span>
                                  </div>
                                ))}
                              </div>
                              <button
                                onClick={() => {
                                  order.items.forEach((item: any) => {
                                    addToCart(
                                      {
                                        id: item.id,
                                        name: item.name,
                                        price: item.price,
                                        image: item.image || "/placeholder.png",
                                      } as any,
                                      item.quantity,
                                    );
                                  });
                                  onClose();
                                }}
                                className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium transition-all text-xs"
                              >
                                <RefreshCw className="w-3 h-3" /> Reorder Items
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeProfileTab === "wishlist" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                            <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                            My Wishlist
                          </h4>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {wishlist?.length || 0} saved item{(wishlist?.length || 0) === 1 ? '' : 's'}
                          </p>
                        </div>
                        {wishlistedProducts.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              wishlistedProducts.forEach(p => {
                                addToCart({
                                  id: String(p.id),
                                  baseId: p.id,
                                  name: p.name,
                                  price: typeof p.price === 'number' ? `₹${p.price}` : String(p.price),
                                  numericPrice: typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, '')),
                                  image: p.image,
                                  badge: p.unit
                                }, 1);
                              });
                              showToast(`Added all items to cart!`, 'success');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <ShoppingBag className="w-3 h-3 text-emerald-700" />
                            Add All
                          </button>
                        )}
                      </div>

                      {wishlistedProducts.length > 0 ? (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                          {wishlistedProducts.map((p) => {
                            const displayPrice = typeof p.price === 'number' ? `₹${p.price}` : String(p.price).startsWith('₹') ? p.price : `₹${p.price}`;
                            const isOutOfStock = p.stock === 0 || p.stockStatus === 'out_of_stock';
                            return (
                              <div
                                key={p.id}
                                className="bg-stone-50 rounded-xl p-3 border border-stone-200/80 flex items-center justify-between gap-3 group relative"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-14 h-14 shrink-0 bg-white rounded-lg overflow-hidden border border-stone-200/60 p-1 flex items-center justify-center">
                                    <img
                                      src={getOptimizedImageUrl(p.image, 150, 80)}
                                      alt={p.name}
                                      className="w-full h-full object-contain"
                                      loading="lazy"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="font-semibold text-stone-900 text-xs sm:text-sm truncate">
                                      {p.name}
                                    </h5>
                                    <p className="text-[11px] text-stone-500 font-medium">
                                      {p.unit || 'Standard'}
                                    </p>
                                    <span className="font-bold text-stone-900 text-xs mt-0.5 inline-block">
                                      {displayPrice}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => {
                                      addToCart({
                                        id: String(p.id),
                                        baseId: p.id,
                                        name: p.name,
                                        price: displayPrice,
                                        numericPrice: typeof p.price === 'number' ? p.price : parseFloat(String(p.price).replace(/[^0-9.]/g, '')),
                                        image: p.image,
                                        badge: p.unit
                                      }, 1);
                                      showToast(`Added ${p.name} to cart!`, 'success');
                                    }}
                                    className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                      isOutOfStock
                                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                        : 'bg-stone-900 hover:bg-stone-800 text-white'
                                    }`}
                                  >
                                    <ShoppingBag className="w-3 h-3" />
                                    <span className="hidden sm:inline">{isOutOfStock ? 'Sold Out' : 'Add'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleWishlist(String(p.id));
                                      showToast(`Removed from wishlist`, 'info');
                                    }}
                                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 border border-stone-200 transition-colors cursor-pointer"
                                    title="Remove from wishlist"
                                    aria-label="Remove from wishlist"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-10 bg-stone-50 rounded-xl border border-stone-200/80">
                          <Heart
                            className="w-10 h-10 text-stone-300 mx-auto mb-2"
                            strokeWidth={1.5}
                          />
                          <p className="text-xs font-semibold text-stone-700 mb-1">
                            Your wishlist is empty
                          </p>
                          <p className="text-[11px] text-stone-400 max-w-xs mx-auto mb-4">
                            Save items you love by tapping the heart icon on any product card.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              const el = document.getElementById('products');
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth' });
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            Explore Store
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : step === "success" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
                  <Check className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">
                  Welcome to JIYOO
                </h2>
                <p className="text-xs text-stone-500 font-light tracking-wide uppercase">
                  Redirecting to your experience...
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, y: 15 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                }}
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <img
                    src="/jiyoo.logo.jpeg"
                    alt="JIYOO Logo"
                    className="h-12 w-auto max-w-[200px] object-contain mx-auto mb-3 rounded-xl"
                  />
                  <h2 className="text-3xl sm:text-4xl font-serif font-light text-stone-900 tracking-wider mb-2">
                    {mode === "signin" ? "Sign in to JIYOO" : mode === "signup" ? "Join JIYOO" : "Reset Password"}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500 font-light">
                    {mode === "forgot" ? "Enter your email to receive a reset link" : "Select your preferred login method"}
                  </p>
                </div>

                {/* Main Social Quick Auth Buttons */}
                {mode !== "forgot" && (
                <div className="grid grid-cols-1 gap-2.5 mb-5">
                  {/* Google Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl font-medium text-xs transition-all shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </div>
                )}

                {/* EMAIL AUTH SECTION */}
                <div>
                  {/* Sign In vs Sign Up mode toggle */}
                  {mode !== "forgot" && (
                  <div className="flex bg-stone-50 p-1 rounded-xl mb-4 border border-stone-200">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        setError(null);
                      }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        mode === "signin"
                          ? "bg-stone-900 text-white shadow-xs"
                          : "text-stone-500 hover:text-stone-900"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signup");
                        setError(null);
                      }}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        mode === "signup"
                          ? "bg-stone-900 text-white shadow-xs"
                          : "text-stone-500 hover:text-stone-900"
                      }`}
                    >
                      Create Account
                    </button>
                  </div>
                  )}

                  <form
                    onSubmit={
                      mode === "signin" ? handleEmailSignIn : mode === "signup" ? handleEmailSignUp : handlePasswordReset
                    }
                    className="space-y-3"
                  >
                    {mode === "signup" && (
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-700 mb-1 tracking-wider uppercase">
                          Full Name
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                            <User className="h-4 w-4" />
                          </div>
                          <input
                            type="text"
                            required={mode === "signup"}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-stone-700 mb-1 tracking-wider uppercase">
                        Email Address
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                          <Mail className="h-4 w-4" />
                        </div>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none"
                          placeholder="hello@example.com"
                        />
                      </div>
                    </div>

                    {mode !== "forgot" && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-semibold text-stone-700 tracking-wider uppercase">
                          Password
                        </label>
                        {mode === "signin" && (
                          <button
                            type="button"
                            onClick={() => { setMode("forgot"); setError(null); setInfoMessage(null); }}
                            className="text-[11px] text-[#1C1917] hover:text-black hover:underline font-bold transition-all"
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                          <Lock className="h-4 w-4" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:ring-1 focus:ring-[#1C1917] focus:border-[#1C1917] transition-all outline-none"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-[#1C1917] transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    )}
                    
                    {mode === "signin" && (
                      <div className="flex items-center pt-1 pb-2">
                        <input
                          type="checkbox"
                          id="rememberMe"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded border-stone-300 text-[#1C1917] focus:ring-[#1C1917] transition-colors cursor-pointer accent-[#1C1917]"
                        />
                        <label htmlFor="rememberMe" className="ml-2 text-xs text-stone-600 cursor-pointer select-none font-medium">
                          Remember me
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="group relative flex w-full h-[56px] text-[11px] font-bold uppercase tracking-[0.15em] text-[#FAF9F5] bg-[#1C1917] transition-all duration-500 cursor-pointer rounded-full overflow-hidden shadow-[0_5px_15px_-5px_rgba(28,25,23,0.3)] hover:shadow-[0_8px_20px_-5px_rgba(28,25,23,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                      <span className="absolute inset-0 w-full h-full bg-[#292524] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span className="relative z-10 flex items-center justify-center gap-2 w-full h-full">
                        {isLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Processing...
                          </div>
                        ) : mode === "signin" ? (
                          "Sign In with Email"
                        ) : mode === "signup" ? (
                          "Create Account"
                        ) : (
                          "Send Reset Link"
                        )}
                      </span>
                    </button>
                    
                    {mode === "forgot" && (
                      <button
                        type="button"
                        onClick={() => { setMode("signin"); setError(null); setInfoMessage(null); }}
                        className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-stone-500 hover:text-[#1C1917] transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                      </button>
                    )}
                  </form>
                </div>

                {/* Info & Error Banners */}
                <AnimatePresence>
                  {infoMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-xl mt-3 flex items-start gap-2"
                    >
                      <Check className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                      <span>{infoMessage}</span>
                    </motion.div>
                  )}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl mt-3 flex items-start gap-2"
                    >
                      <span className="shrink-0 font-bold">!</span>
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Security Footer */}
                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-stone-400 font-medium">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Encrypted & Secure Authentication
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
