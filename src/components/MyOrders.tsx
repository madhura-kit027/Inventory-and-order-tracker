import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  ArrowLeft, 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  MapPin,
  Calendar,
  ChevronRight,
  X,
  CreditCard,
  User,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';

interface MyOrdersProps {
  onBack: () => void;
}

export function MyOrders({ onBack }: MyOrdersProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [orderToReturn, setOrderToReturn] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    if (!user) {
      console.log('MyOrders: No user found, skipping query');
      return;
    }

    console.log('MyOrders: Querying orders for user:', user.uid);
    // Simplified query to avoid indexing issues during debugging
    const ordersQ = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(ordersQ, (snapshot) => {
      console.log('MyOrders: Received snapshot with', snapshot.size, 'orders');
      
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Sort manually if we removed orderBy
      const sortedOrders = ordersData.sort((a, b) => {
        const dateA = a.createdAt?.toMillis() || 0;
        const dateB = b.createdAt?.toMillis() || 0;
        return dateB - dateA;
      });
      
      setOrders(sortedOrders);
      setLoading(false);
    }, (error) => {
      console.error('MyOrders: Firestore error:', error);
      handleFirestoreError(error, OperationType.LIST, 'orders');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="text-yellow-500" size={20} />;
      case 'shipped': return <Truck className="text-blue-500" size={20} />;
      case 'delivered': return <CheckCircle2 className="text-green-500" size={20} />;
      case 'received': return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'cancelled': return <Package className="text-red-500" size={20} />;
      case 'returning': return <RotateCcw className="text-orange-500" size={20} />;
      case 'returned': return <RotateCcw className="text-brand-400" size={20} />;
      default: return <Package size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'shipped': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'received': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'returning': return 'bg-orange-100 text-orange-700';
      case 'returned': return 'bg-brand-100 text-brand-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleMarkAsReceived = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderToUpdate = orders.find(o => o.id === orderId);
      
      if (orderToUpdate) {
        // Update all items to 'received' as well
        const updatedItems = orderToUpdate.items.map(item => ({
          ...item,
          status: 'received' as const,
          currentLocation: 'Delivered to Customer'
        }));

        await updateDoc(orderRef, {
          status: 'received',
          currentLocation: 'Delivered to Customer',
          items: updatedItems
        });
      } else {
        await updateDoc(orderRef, {
          status: 'received',
          currentLocation: 'Delivered to Customer'
        });
      }
    } catch (error) {
      console.error('Error marking as received:', error);
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setOrderToCancel(orderId);
    setIsCancelModalOpen(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    
    try {
      const orderRef = doc(db, 'orders', orderToCancel);
      const orderToUpdate = orders.find(o => o.id === orderToCancel);
      
      if (orderToUpdate) {
        // Update all items to 'cancelled' as well
        const updatedItems = orderToUpdate.items.map(item => ({
          ...item,
          status: 'cancelled' as const,
          currentLocation: 'Cancelled by Customer'
        }));

        await updateDoc(orderRef, { 
          status: 'cancelled',
          currentLocation: 'Cancelled by Customer',
          items: updatedItems
        });
      } else {
        await updateDoc(orderRef, { 
          status: 'cancelled',
          currentLocation: 'Cancelled by Customer'
        });
      }
      setIsCancelModalOpen(false);
      setOrderToCancel(null);
    } catch (error) {
      console.error('Error cancelling order:', error);
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderToCancel}`);
    }
  };

  const openDetailsModal = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  };

  const handleReturnOrder = (orderId: string) => {
    setOrderToReturn(orderId);
    setIsReturnModalOpen(true);
  };

  const confirmReturnOrder = async () => {
    if (!orderToReturn) return;

    try {
      const orderRef = doc(db, 'orders', orderToReturn);
      const orderToUpdate = orders.find(o => o.id === orderToReturn);

      if (orderToUpdate) {
        const updatedItems = orderToUpdate.items.map(item => ({
          ...item,
          status: 'returning' as const,
          currentLocation: 'Return Requested'
        }));

        await updateDoc(orderRef, {
          status: 'returning',
          currentLocation: 'Return Requested',
          returnReason: returnReason || 'No reason provided',
          items: updatedItems
        });
      }

      setIsReturnModalOpen(false);
      setOrderToReturn(null);
      setReturnReason('');
      if (isDetailsModalOpen) setIsDetailsModalOpen(false);
    } catch (error) {
      console.error('Error returning order:', error);
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderToReturn}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-brand-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-display font-bold">My Orders</h2>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-brand-500 hover:text-brand-900 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Store
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-brand-200">
          <ShoppingBag size={48} className="mx-auto text-brand-200 mb-4" />
          <h3 className="text-xl font-bold">No orders found</h3>
          <p className="text-brand-500 mb-8">You haven't placed any orders yet.</p>
          <button 
            onClick={onBack}
            className="bg-brand-900 text-white px-8 py-3 rounded-full font-bold hover:scale-105 transition-transform"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map((order) => (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-brand-200 shadow-sm overflow-hidden"
            >
              <div className="p-6 border-b border-brand-100 bg-brand-50/50 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Order ID</p>
                    <p className="font-mono font-bold text-brand-900">{order.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Order Date</p>
                  <p className="font-bold text-brand-900">
                    {order.createdAt?.toDate()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) || 'Just now'}
                  </p>
                </div>
              </div>

              <div className="p-6 grid md:grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold mb-4 text-brand-900 flex items-center gap-2">
                    <Package size={18} className="text-brand-400" />
                    Order Items
                  </h4>
                  <div className="space-y-4">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-3 p-4 bg-brand-50/50 rounded-2xl border border-brand-100/50">
                        <div className="flex gap-4 items-center">
                          <div className="w-12 h-12 bg-brand-50 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-grow">
                            <p className="text-sm font-bold text-brand-900 line-clamp-1">{item.name}</p>
                            <p className="text-xs text-brand-500">{item.quantity} x ₹{(item.price || 0).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        
                        {/* Item Specific Tracking */}
                        <div className="pl-4 space-y-2 border-l-2 border-brand-200 ml-6 py-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${(item.status || order.status) === 'received' ? 'bg-emerald-500' : 'bg-brand-900 animate-pulse'}`} />
                            <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">
                              Status: <span className="text-brand-900">{item.status || order.status}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-brand-400" />
                            <span className="text-[10px] text-brand-500">
                              Location: <span className="font-bold text-brand-700">{item.currentLocation || order.currentLocation || 'Processing Center'}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Truck size={12} className="text-brand-400" />
                            <span className="text-[10px] text-brand-500">
                              Tracking: <span className="font-bold text-brand-700">{item.trackingNumber || order.trackingNumber}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-brand-100 flex justify-between items-center">
                    <span className="font-bold text-brand-900">Total Amount</span>
                    <span className="text-xl font-bold text-brand-900">₹{(order.total || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
                    <h4 className="font-bold text-sm text-brand-900 mb-3 flex items-center gap-2">
                      <Truck size={16} className="text-brand-400" />
                      Tracking Information
                    </h4>
                    
                    {/* Progress Bar */}
                      <div className="relative h-2 bg-brand-200 rounded-full mb-6 mt-4">
                        <div 
                          className={`absolute left-0 top-0 h-full bg-brand-900 rounded-full transition-all duration-1000 ${
                            order.status === 'pending' ? 'w-1/4' :
                            order.status === 'shipped' ? 'w-2/4' :
                            order.status === 'delivered' ? 'w-3/4' :
                            (order.status === 'received' || order.status === 'returning' || order.status === 'returned') ? 'w-full' : 'w-0'
                          }`}
                        />
                        <div className="absolute -top-6 left-0 text-[10px] font-bold text-brand-400 uppercase">Pending</div>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-brand-400 uppercase">Shipped</div>
                        <div className="absolute -top-6 right-0 text-[10px] font-bold text-brand-400 uppercase">Delivered</div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${(order.status === 'received' || order.status === 'returned') ? 'bg-emerald-500' : order.status === 'returning' ? 'bg-orange-500' : 'bg-brand-900 animate-pulse'}`} />
                          <span className="text-sm font-medium text-brand-700">Status: <span className="capitalize font-bold">{order.status}</span></span>
                        </div>
                      <div className="flex items-start gap-3">
                        <MapPin size={16} className="text-brand-400 mt-0.5" />
                        <span className="text-sm text-brand-600">Current Location: <span className="font-bold text-brand-900">{order.currentLocation || 'Processing Center'}</span></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-brand-400" />
                        <span className="text-sm text-brand-600">Est. Delivery: <span className="font-bold text-brand-900">
                          {order.estimatedDelivery?.toDate()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' }) || 'Calculating...'}
                        </span></span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-brand-100">
                    <h4 className="font-bold text-sm text-brand-900 mb-2">Shipping Address</h4>
                    <p className="text-sm text-brand-600 leading-relaxed">
                      {(order as any).shippingInfo?.name || 'Unknown'}<br />
                      {(order as any).shippingInfo?.phone && <>{(order as any).shippingInfo.phone}<br /></>}
                      {(order as any).shippingInfo?.address || 'No Address'}<br />
                      {(order as any).shippingInfo?.city || 'N/A'}, {(order as any).shippingInfo?.zipCode || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-brand-50/30 border-t border-brand-100 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-widest">
                  Tracking Number: <span className="text-brand-900 font-mono">{order.trackingNumber || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-4">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => handleCancelOrder(order.id)}
                      className="text-red-600 font-bold text-sm hover:text-red-700 transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                  {(order.status === 'received' || order.status === 'delivered') && (
                    <button 
                      onClick={() => handleReturnOrder(order.id)}
                      className="text-orange-600 font-bold text-sm hover:text-orange-700 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw size={16} /> Return Product
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <button 
                      onClick={() => handleMarkAsReceived(order.id)}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                      Mark as Received
                    </button>
                  )}
                  <button 
                    onClick={() => openDetailsModal(order)}
                    className="text-brand-900 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Full Details <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      <AnimatePresence>
        {isCancelModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCancelModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white z-[110] rounded-3xl shadow-2xl p-8 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-6">
                <X size={32} />
              </div>
              <h3 className="text-2xl font-bold text-brand-900 mb-2">Cancel Order?</h3>
              <p className="text-brand-500 mb-8">Are you sure you want to cancel this order? This action cannot be undone.</p>
              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={confirmCancelOrder}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-colors"
                >
                  Yes, Cancel Order
                </button>
                <button 
                  onClick={() => setIsCancelModalOpen(false)}
                  className="w-full bg-brand-50 text-brand-900 py-4 rounded-2xl font-bold hover:bg-brand-100 transition-colors"
                >
                  No, Keep Order
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Return Product Modal */}
      <AnimatePresence>
        {isReturnModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReturnModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white z-[110] rounded-3xl shadow-2xl p-8 flex flex-col"
            >
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 mb-6 mx-auto">
                <RotateCcw size={32} />
              </div>
              <h3 className="text-2xl font-bold text-brand-900 mb-2 text-center">Return Product</h3>
              <p className="text-brand-500 mb-6 text-center">Please tell us why you want to return this product.</p>
              
              <div className="space-y-4 mb-8">
                <label className="block text-sm font-bold text-brand-900">Reason for Return</label>
                <textarea 
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g., Wrong size, damaged item, etc."
                  className="w-full bg-brand-50 border border-brand-100 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-900 outline-none min-h-[120px] resize-none"
                />
              </div>

              <div className="flex flex-col w-full gap-3">
                <button 
                  onClick={confirmReturnOrder}
                  className="w-full bg-brand-900 text-white py-4 rounded-2xl font-bold hover:bg-brand-800 transition-colors"
                >
                  Submit Return Request
                </button>
                <button 
                  onClick={() => setIsReturnModalOpen(false)}
                  className="w-full bg-brand-50 text-brand-900 py-4 rounded-2xl font-bold hover:bg-brand-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailsModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white z-[110] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-brand-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-xl font-bold text-brand-900">Order Details</h3>
                  <p className="text-xs text-brand-400 font-mono">#{selectedOrder.id}</p>
                </div>
                <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 hover:bg-brand-50 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8">
                {/* Status Summary */}
                <div className="flex items-center justify-between p-4 bg-brand-50 rounded-2xl border border-brand-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Current Status</p>
                      <p className="font-bold text-brand-900 capitalize">{selectedOrder.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-brand-400 uppercase tracking-widest">Total Amount</p>
                    <p className="text-xl font-bold text-brand-900">₹{(selectedOrder.total || 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Shipping Info */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-brand-900 flex items-center gap-2">
                      <MapPin size={18} className="text-brand-400" />
                      Shipping Details
                    </h4>
                    <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100/50 space-y-2">
                      <p className="font-bold text-brand-900">{(selectedOrder as any).shippingInfo?.name || 'Unknown'}</p>
                      <p className="text-sm text-brand-600">{(selectedOrder as any).shippingInfo?.email || 'N/A'}</p>
                      <p className="text-sm text-brand-600">{(selectedOrder as any).shippingInfo?.phone || '[No Phone]'}</p>
                      <div className="pt-2 mt-2 border-t border-brand-100 text-sm text-brand-500">
                        {(selectedOrder as any).shippingInfo?.address || 'No address'}<br />
                        {(selectedOrder as any).shippingInfo?.city || 'N/A'}, {(selectedOrder as any).shippingInfo?.zipCode || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-brand-900 flex items-center gap-2">
                      <CreditCard size={18} className="text-brand-400" />
                      Payment Details
                    </h4>
                    <div className="bg-brand-50/50 p-4 rounded-2xl border border-brand-100/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-brand-500">Method</span>
                        <span className="text-sm font-bold text-brand-900 uppercase">{selectedOrder.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-brand-500">Date</span>
                        <span className="text-sm font-bold text-brand-900">
                          {selectedOrder.createdAt?.toDate()?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  <h4 className="font-bold text-brand-900 flex items-center gap-2">
                    <Package size={18} className="text-brand-400" />
                    Items ({selectedOrder.items.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-3 bg-brand-50/30 rounded-2xl border border-brand-100/50 items-center">
                        <div className="w-16 h-16 bg-white rounded-xl overflow-hidden border border-brand-100 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="flex-grow">
                          <p className="text-sm font-bold text-brand-900">{item.name}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-brand-500">{item.quantity} x ₹{(item.price || 0).toLocaleString('en-IN')}</p>
                            <p className="text-sm font-bold text-brand-900">₹{((item.price || 0) * (item.quantity || 0)).toLocaleString('en-IN')}</p>
                          </div>
                          {/* Item Status */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'received' ? 'bg-emerald-500' : 'bg-brand-900'}`} />
                            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">{item.status || selectedOrder.status}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-brand-100 bg-brand-50/50 flex justify-between items-center">
                <span className="font-bold text-brand-900">Order Total</span>
                <span className="text-2xl font-bold text-brand-900">₹{(selectedOrder.total || 0).toLocaleString('en-IN')}</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
