import React from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Trash2, Minus, Plus, ArrowLeft, ChevronRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface CartPageProps {
  onBack: () => void;
  onCheckout: () => void;
}

export function CartPage({ onBack, onCheckout }: CartPageProps) {
  const { cart, cartTotal, cartCount, removeFromCart, updateQuantity } = useCart();

  if (cart.length === 0) {
    return (
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-12 shadow-xl border border-brand-200"
        >
          <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center text-brand-400 mx-auto mb-6">
            <ShoppingBag size={48} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">Your cart is empty</h2>
          <p className="text-brand-500 mb-8 max-w-md mx-auto">
            Looks like you haven't added any premium essentials to your cart yet. Start exploring our collection!
          </p>
          <button 
            onClick={onBack}
            className="bg-brand-900 text-white px-10 py-4 rounded-full font-bold hover:scale-105 transition-transform"
          >
            Start Shopping
          </button>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-display font-bold">Shopping Cart</h2>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-brand-500 hover:text-brand-900 transition-colors font-medium"
        >
          <ArrowLeft size={20} /> Continue Shopping
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-brand-100 flex flex-col sm:flex-row gap-6 items-center"
            >
              <div className="w-32 h-32 bg-brand-50 rounded-xl overflow-hidden flex-shrink-0">
                <img 
                  src={item.image} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="flex-grow text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold text-brand-900">{item.name}</h3>
                  <span className="text-lg font-bold text-brand-900">₹{((item.price || 0) * (item.quantity || 0)).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-brand-500 text-sm mb-4 line-clamp-1">{item.description}</p>
                
                <div className="flex flex-wrap items-center justify-center sm:justify-between gap-4">
                  <div className="flex items-center bg-brand-50 rounded-full px-4 py-2 border border-brand-100">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1 hover:bg-white rounded-full transition-all text-brand-600"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="w-12 text-center font-bold text-lg">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1 hover:bg-white rounded-full transition-all text-brand-600"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors font-medium text-sm"
                  >
                    <Trash2 size={18} /> Remove Item
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 shadow-xl border border-brand-200 sticky top-24">
            <h3 className="text-2xl font-display font-bold mb-6">Order Summary</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-brand-500">
                <span>Items ({cartCount})</span>
                <span>₹{(cartTotal || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-brand-500">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">FREE</span>
              </div>
              <div className="flex justify-between text-brand-500">
                <span>Tax (GST 18%)</span>
                <span>Included</span>
              </div>
              <div className="h-px bg-brand-100 my-4" />
              <div className="flex justify-between text-2xl font-bold text-brand-900">
                <span>Total</span>
                <span>₹{(cartTotal || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button 
              onClick={onCheckout}
              className="w-full bg-brand-900 text-white py-5 rounded-full font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg shadow-brand-900/20"
            >
              Proceed to Checkout <ChevronRight size={20} />
            </button>
            
            <p className="text-center text-brand-400 text-xs mt-6">
              Secure checkout powered by ZenvyPay. All major Indian payment methods supported.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
