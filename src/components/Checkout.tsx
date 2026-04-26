import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { doc, setDoc, collection, serverTimestamp, Timestamp, updateDoc, increment, getDocs, query, where, limit, orderBy, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

interface CheckoutProps {
  onBack: () => void;
  onSuccess: (orderId: string) => void;
  onLoginClick: () => void;
}

export function Checkout({ onBack, onSuccess, onLoginClick }: CheckoutProps) {
  const { cart, cartTotal, clearCart } = useCart();
  const { user, isSigningIn, authError } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const [shippingForm, setShippingForm] = useState({
    address: '',
    city: '',
    zipCode: '',
    phone: '',
  });

  // Fetch saved shipping info from user profile, fallback to last order
  React.useEffect(() => {
    if (user) {
      // 1. Try localStorage first for instant load
      try {
        const saved = localStorage.getItem(`shipping_info_${user.uid}`);
        if (saved) {
          setShippingForm(JSON.parse(saved));
          return;
        }
      } catch (e) {}

      // 2. Try user document (cloud sync)
      if (user.shippingInfo) {
        setShippingForm({
          address: user.shippingInfo.address || '',
          city: user.shippingInfo.city || '',
          zipCode: user.shippingInfo.zipCode || '',
          phone: user.shippingInfo.phone || '',
        });
        return;
      }
      
      const fetchLastOrder = async () => {
        try {
          const q = query(
            collection(db, 'orders'),
            where('userId', '==', user.uid)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            let latestOrder = snapshot.docs[0].data();
            for (let i = 1; i < snapshot.docs.length; i++) {
              const orderData = snapshot.docs[i].data();
              if ((orderData.createdAt?.toMillis() || 0) > (latestOrder.createdAt?.toMillis() || 0)) {
                latestOrder = orderData;
              }
            }
            if (latestOrder.shippingInfo) {
              setShippingForm({
                address: latestOrder.shippingInfo.address || '',
                city: latestOrder.shippingInfo.city || '',
                zipCode: latestOrder.shippingInfo.zipCode || '',
                phone: latestOrder.shippingInfo.phone || '',
              });
            }
          }
        } catch (error) {
          console.warn('Could not fetch last order for shipping info:', error);
        }
      };
      fetchLastOrder();
    }
  }, [user]);

  // Auto-save shipping form to localStorage and Firestore as user types
  React.useEffect(() => {
    if (!user) return;
    
    // Only save if at least one field has content to avoid overwriting with empty
    const hasContent = shippingForm.address || shippingForm.city || shippingForm.zipCode || shippingForm.phone;
    if (!hasContent) return;

    // 1. Instant local save
    try {
      localStorage.setItem(`shipping_info_${user.uid}`, JSON.stringify(shippingForm));
    } catch (e) {}

    // 2. Debounced cloud save
    const timeoutId = setTimeout(() => {
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { shippingInfo: shippingForm }).catch(() => {
        // Silent catch for background autosave
      });
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [shippingForm, user]);

  const handleCompletePurchase = async () => {
    if (!user) {
      onLoginClick();
      return;
    }

    if (!shippingForm.address || !shippingForm.city || !shippingForm.zipCode || !shippingForm.phone) {
      alert('Please fill in all shipping details including mobile number.');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Create order in Firestore
      const orderId = `ZNV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const orderRef = doc(db, 'orders', orderId);
      
      const orderData = {
        userId: user.uid,
        items: cart.map(item => ({
          ...item,
          status: 'pending',
          trackingNumber: `ZNV-${Math.floor(Math.random() * 100000000)}`,
          currentLocation: 'Processing Center',
          estimatedDelivery: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
        })),
        total: cartTotal,
        paymentMethod,
        status: 'pending',
        createdAt: serverTimestamp(),
        estimatedDelivery: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)), // 2 days from now
        trackingNumber: `ZNV-${Math.floor(Math.random() * 100000000)}`,
        currentLocation: 'Processing Center',
        shippingInfo: {
          name: user?.displayName || 'Guest',
          email: user?.email || 'Guest Email',
          phone: shippingForm.phone,
          address: shippingForm.address,
          city: shippingForm.city,
          zipCode: shippingForm.zipCode,
        }
      };

      console.log('Checkout: Saving order to Firestore in background...');
      setDoc(orderRef, orderData).catch(err => {
        console.error('Checkout: Error saving order to Firestore:', err);
        alert('Warning: Order was placed, but there was an issue saving to the database: ' + err.message);
      });
      
      // Save shipping details to user profile for future sessions
      const newShippingInfo = {
        phone: shippingForm.phone,
        address: shippingForm.address,
        city: shippingForm.city,
        zipCode: shippingForm.zipCode,
      };
      
      const userRef = doc(db, 'users', user.uid);
      updateDoc(userRef, { shippingInfo: newShippingInfo }).catch(e => console.warn('Could not save shipping info to user profile:', e));
      
      // Also save to localStorage for instant reliable persistence
      try {
        localStorage.setItem(`shipping_info_${user.uid}`, JSON.stringify(newShippingInfo));
      } catch (e) {}
      
      // Fire-and-forget stock updates (don't wait, and don't fail the order if they fail)
      console.log('Checkout: Reducing product stock levels in background...');
      cart.forEach(item => {
        const productRef = doc(db, 'products', item.id);
        updateDoc(productRef, {
          stock: increment(-item.quantity)
        }).catch(err => {
          console.warn(`Could not update stock for product ${item.id}:`, err);
        });
      });
      
      console.log('Checkout: Order saved successfully:', orderId);
      
      setIsProcessing(false);
      clearCart();
      onSuccess(orderId);
      
    } catch (error: any) {
      console.error('Checkout: Error creating order:', error);
      setIsProcessing(false);
      alert('Error placing order: ' + (error?.message || String(error)));
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-8 shadow-xl border border-brand-200"
      >
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-brand-500 hover:text-brand-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Shop
        </button>
        
        <h2 className="text-3xl font-display font-bold mb-8">Checkout</h2>
        
        <div className="space-y-6">
          {!user ? (
            <div className="p-6 bg-brand-50 rounded-2xl text-center">
              <p className="text-brand-700 mb-4">Please sign in to complete your purchase.</p>
              {authError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm rounded-xl flex items-center gap-2 justify-center">
                  <ShieldCheck size={16} />
                  {authError}
                </div>
              )}
              <button 
                onClick={onLoginClick}
                disabled={isSigningIn}
                className={`bg-brand-900 text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2 mx-auto ${isSigningIn ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSigningIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand-900 text-white rounded-full flex items-center justify-center text-xs">1</span>
                  Shipping Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="First Name" defaultValue={user.displayName?.split(' ')[0]} className="p-3 bg-brand-50 rounded-xl border-none focus:ring-2 focus:ring-brand-900" readOnly />
                  <input type="text" placeholder="Last Name" defaultValue={user.displayName?.split(' ').slice(1).join(' ')} className="p-3 bg-brand-50 rounded-xl border-none focus:ring-2 focus:ring-brand-900" readOnly />
                  <input type="email" placeholder="Email Address" defaultValue={user.email || ''} className="col-span-2 p-3 bg-brand-50 rounded-xl border-none focus:ring-2 focus:ring-brand-900" readOnly />
                  <input 
                    type="text" 
                    placeholder="Full Address" 
                    value={shippingForm.address}
                    onChange={(e) => setShippingForm({...shippingForm, address: e.target.value})}
                    className="col-span-2 p-3 bg-brand-50 rounded-xl border-none focus:ring-2 focus:ring-brand-900" 
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="City" 
                    value={shippingForm.city}
                    onChange={(e) => setShippingForm({...shippingForm, city: e.target.value})}
                    className="p-3 bg-brand-50 rounded-xl border-none focus:ring-2 focus:ring-brand-900" 
                    required
                  />
                  <input 
                    type="text" 
                    placeholder="Zip Code" 
                    value={shippingForm.zipCode}
                    onChange={(e) => setShippingForm({...shippingForm, zipCode: e.target.value})}
                    className="p-3 bg-brand-50 rounded-xl border-none focus:ring-2 focus:ring-brand-900" 
                    required
                  />
                  <input 
                    type="tel" 
                    placeholder="Mobile Number" 
                    value={shippingForm.phone}
                    onChange={(e) => setShippingForm({...shippingForm, phone: e.target.value})}
                    className="col-span-2 p-3 bg-brand-50 rounded-xl border-none focus:ring-2 focus:ring-brand-900" 
                    required
                  />
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2 text-brand-900">
                  <span className="w-6 h-6 bg-brand-900 text-white rounded-full flex items-center justify-center text-xs">2</span>
                  Payment Method
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'upi', name: 'UPI (GPay, PhonePe, Paytm)', icon: '📱' },
                    { id: 'card', name: 'Credit / Debit Card', icon: '💳' },
                    { id: 'netbanking', name: 'Net Banking', icon: '🏦' },
                    { id: 'cod', name: 'Cash on Delivery', icon: '💵' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-4 border-2 rounded-2xl flex items-center justify-between transition-all ${
                        paymentMethod === method.id 
                        ? 'border-brand-900 bg-brand-50 shadow-md' 
                        : 'border-brand-100 hover:border-brand-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{method.icon}</span>
                        <span className={`font-bold text-sm ${paymentMethod === method.id ? 'text-brand-900' : 'text-brand-600'}`}>
                          {method.name}
                        </span>
                      </div>
                      {paymentMethod === method.id && <CheckCircle2 className="text-brand-900" size={20} />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="pt-6 border-t border-brand-100">
            <div className="flex justify-between mb-2">
              <span className="text-brand-500">Subtotal</span>
              <span className="font-medium">₹{(cartTotal || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-brand-500">Shipping</span>
              <span className="text-green-600 font-medium">FREE</span>
            </div>
            <div className="flex justify-between text-xl font-bold mb-8">
              <span>Total</span>
              <span>₹{(cartTotal || 0).toLocaleString('en-IN')}</span>
            </div>
            
            <button 
              onClick={handleCompletePurchase}
              disabled={isProcessing}
              className={`w-full py-4 bg-brand-900 text-white rounded-full font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                user ? 'Complete Purchase' : 'Sign In to Pay'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
