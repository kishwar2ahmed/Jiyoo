import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCart } from "../../../contexts/CartContext";
import { useSettings } from "../../../contexts/SettingsContext";

export function FlyingItemsLayer() {
  const { flyingItems, removeFlyingItem } = useCart();
  const { settings } = useSettings();
  const [cartPos, setCartPos] = useState({ x: window.innerWidth - 40, y: 40 });

  useEffect(() => {
    // Update cart position
    const updateCartPos = () => {
      const cartIcon = document.getElementById("cart-icon-button");
      if (cartIcon) {
        const rect = cartIcon.getBoundingClientRect();
        setCartPos({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    };
    updateCartPos();
    window.addEventListener("resize", updateCartPos);
    return () => window.removeEventListener("resize", updateCartPos);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              x: item.startX,
              y: item.startY,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: cartPos.x,
              y: cartPos.y,
              scale: 0.2,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1]
            }}
            onAnimationComplete={() => removeFlyingItem(item.id)}
            className="absolute top-0 left-0 -ml-10 -mt-10 w-20 h-20 rounded-2xl overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] bg-[#FAF9F5] border border-[#E7E3DA]"
          >
            {item.image.endsWith(".mp4") ? (
              <video
                src={item.image}
                autoPlay
                loop
                muted
                playsInline
                webkit-playsinline="true"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={item.image}
                alt="Flying product"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes("/jiyoo.logo.jpeg")) {
                    target.src = "/jiyoo.logo.jpeg";
                  }
                }}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
