import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isConfigValid } from '../firebase';
import { Product, CartItem } from '../types';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isLoadedFromServer, setIsLoadedFromServer] = useState(false);

  // Sync cart with Firestore if user is logged in
  useEffect(() => {
    if (!user || !db || !isConfigValid) {
      setIsLoadedFromServer(false);
      return;
    }

    const cartRef = doc(db, 'carts', user.uid);
    let isFirstLoad = true;

    const unsubscribe = onSnapshot(cartRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.items) {
          setCart(prev => {
            const serverItems = JSON.stringify(data.items);
            const localItems = JSON.stringify(prev);
            if (serverItems !== localItems) {
              // Merge local guest cart with server cart on first load
              if (isFirstLoad && prev.length > 0) {
                const merged = [...prev];
                data.items.forEach((serverItem: CartItem) => {
                  const existingIndex = merged.findIndex(item => item.id === serverItem.id);
                  if (existingIndex === -1) {
                    merged.push(serverItem);
                  } else {
                    // Optionally update quantity, but we'll prefer local quantity if it exists to be safe
                    merged[existingIndex].quantity = Math.max(merged[existingIndex].quantity, serverItem.quantity);
                  }
                });
                return merged;
              }
              // After first load, or if local is empty, just take server cart
              return data.items;
            }
            return prev;
          });
        }
      } else {
        // If the cart document doesn't exist yet, preserve the local cart by triggering an update
        setCart(prev => [...prev]);
      }
      isFirstLoad = false;
      setIsLoadedFromServer(true);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `carts/${user.uid}`);
      setIsLoadedFromServer(true); // Proceed even on error so they can save
    });

    return () => unsubscribe();
  }, [user]);

  // Persist cart to localStorage (for guest users) and Firestore (for logged in users)
  useEffect(() => {
    if (!user || !db || !isConfigValid) {
      localStorage.setItem('cart', JSON.stringify(cart));
    } else {
      // ONLY save to Firestore if we have successfully loaded from the server
      // AND we are not in the middle of the very first load
      if (!isLoadedFromServer) return;

      const saveCart = async () => {
        try {
          const cartRef = doc(db, 'carts', user.uid);
          // Don't save an empty array if we just loaded an empty array and local is empty
          // Actually, saving the exact state is fine as long as we know it's not a pre-load empty state
          await setDoc(cartRef, { 
            items: cart, 
            updatedAt: serverTimestamp() 
          });
        } catch (error) {
          console.error('Error saving cart to Firestore:', error);
          if (error instanceof Error && error.message.includes('permission')) {
            try {
              handleFirestoreError(error, OperationType.WRITE, `carts/${user.uid}`);
            } catch (e) {}
          }
        }
      };
      saveCart();
    }
  }, [cart, user, isLoadedFromServer]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart,
      cartTotal, 
      cartCount 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
