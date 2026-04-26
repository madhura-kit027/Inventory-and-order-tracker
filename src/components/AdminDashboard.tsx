import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ArrowLeft, 
  Package, 
  ShoppingBag, 
  Clock, 
  LogOut,
  Plus,
  Trash2,
  Edit2,
  X,
  User as UserIcon,
  Save,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  BarChart3,
  Calendar,
  Truck,
  CheckCircle2,
  MapPin,
  Check,
  XCircle,
  RotateCcw,
  Zap,
  Activity,
  History,
  FileText,
  Download,
  Filter,
  Search,
  Archive,
  AlertTriangle,
  ArrowUpRight,
  Target
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  increment
} from 'firebase/firestore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { format, subDays, addDays, startOfDay, isSameDay, differenceInDays } from 'date-fns';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Product, Order } from '../types';
import { PRODUCTS } from '../constants';

interface AdminDashboardProps {
  onBack: () => void;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'analytics' | 'details'>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [isDailyLogModalOpen, setIsDailyLogModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Advanced Insights Calculations
  const filteredOrders = useMemo(() => {
    const search = orderSearch.toLowerCase();
    return orders.filter(order => {
      const id = order.id?.toLowerCase() || '';
      const name = (order as any).shippingInfo?.name?.toLowerCase() || '';
      const email = (order as any).shippingInfo?.email?.toLowerCase() || '';
      
      const matchesSearch = 
        id.includes(search) ||
        name.includes(search) ||
        email.includes(search) ||
        order.items?.some(item => item?.name?.toLowerCase()?.includes(search));
      
      const matchesStatus = orderStatusFilter === 'all' || order.status === orderStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.toLowerCase();
    return products.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const sku = product.sku?.toLowerCase() || '';
      const category = product.category?.toLowerCase() || '';
      
      return name.includes(search) || 
             sku.includes(search) || 
             category.includes(search);
    });
  }, [products, productSearch]);
  
  // Product Form State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    sku: '',
    description: '',
    price: 0,
    costPrice: 0,
    category: 'Electronics',
    image: '',
    rating: 4.5,
    reviews: 0,
    stock: 0
  });

  // Order Tracking State
  const [isOrderTrackingModalOpen, setIsOrderTrackingModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [orderTrackingForm, setOrderTrackingForm] = useState({
    status: 'pending',
    currentLocation: '',
    trackingNumber: '',
    estimatedDelivery: ''
  });

  useEffect(() => {
    // Listen to orders
    const ordersQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    // Listen to products
    const productsQ = query(collection(db, 'products'));
    const unsubscribeProducts = onSnapshot(productsQ, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, []);

  // Analytics Calculations
  const analytics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProductsSold = 0;
    let totalReturnedProducts = 0;
    let weeklySold = 0;
    let weeklyReturns = 0;

    const sevenDaysAgo = subDays(new Date(), 7);

    orders.forEach(order => {
      const isWeekly = order.createdAt && order.createdAt.toDate() >= sevenDaysAgo;
      
      if (order.status !== 'cancelled') {
        totalRevenue += order.total;
        order.items.forEach(item => {
          totalProductsSold += item.quantity;
          if (isWeekly) weeklySold += item.quantity;

          if (order.status === 'returned') {
            totalReturnedProducts += item.quantity;
            if (isWeekly) weeklyReturns += item.quantity;
          }
          // Calculate cost based on current product cost or fallback to 60%
          const product = products.find(p => p.id === item.id);
          const costPrice = product?.costPrice || (item.price * 0.6);
          totalCost += costPrice * item.quantity;
        });
      }
    });

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Top Selling Products
    const productStats: Record<string, { name: string, quantity: number, revenue: number }> = {};
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach(item => {
          if (!productStats[item.id]) {
            productStats[item.id] = { name: item?.name || 'Unknown Item', quantity: 0, revenue: 0 };
          }
          productStats[item.id].quantity += item.quantity;
          productStats[item.id].revenue += item.price * item.quantity;
        });
      }
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Category Performance
    const categoryStats: Record<string, number> = {};
    products.forEach(p => {
      if (!categoryStats[p.category]) categoryStats[p.category] = 0;
    });
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach(item => {
          const product = products.find(p => p.id === item.id);
          const cat = product?.category || 'Other';
          categoryStats[cat] = (categoryStats[cat] || 0) + (item.price * item.quantity);
        });
      }
    });

    const categoryData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));

    // Sales Chart Data (Last 7 days)
    const chartData = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayOrders = orders.filter(o => 
        o.createdAt && isSameDay(o.createdAt.toDate(), date) && o.status !== 'cancelled'
      );
      const revenue = dayOrders.reduce((sum, o) => sum + o.total, 0);
      return {
        name: format(date, 'EEE'),
        revenue,
        orders: dayOrders.length
      };
    });

    const lowStockCount = products.filter(p => (p.stock || 0) < 10).length;
    const totalStockValue = products.reduce((sum, p) => sum + ((p.stock || 0) * p.price), 0);
    const totalPotentialProfit = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price - (p.costPrice || 0))), 0);

    // Productivity & Velocity
    const inventoryRunway = products.map(p => {
      const sold = Object.values(productStats).find(s => s.name === p.name)?.quantity || 0;
      const dailyVelocity = sold / 30; // 30 day avg
      const daysLeft = dailyVelocity > 0 ? Math.floor((p.stock || 0) / dailyVelocity) : 999;
      return { ...p, daysLeft };
    });

    const totalOrdersCount = orders.length;
    const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
    const efficiency = totalOrdersCount > 0 ? ((totalOrdersCount - pendingOrdersCount) / totalOrdersCount) * 100 : 100;

    // Top Customers
    const customerStats: Record<string, { userId: string, name: string, email: string, orders: number, totalspent: number }> = {};
    orders.forEach(order => {
      const uid = order.userId;
      if (!customerStats[uid]) {
        customerStats[uid] = { 
          userId: uid,
          name: (order as any).shippingInfo?.name || 'Unknown', 
          email: (order as any).shippingInfo?.email || 'N/A', 
          orders: 0, 
          totalspent: 0 
        };
      }
      customerStats[uid].orders += 1;
      customerStats[uid].totalspent += order.total;
    });

    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.totalspent - a.totalspent)
      .slice(0, 5);

    // Order Status Distribution
    const statusCounts: Record<string, number> = {};
    orders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ 
      name: name.charAt(0).toUpperCase() + name.slice(1), 
      value 
    }));

    // Unique products sold count
    const uniqueProductsSoldCount = new Set();
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        order.items.forEach(item => uniqueProductsSoldCount.add(item.id));
      }
    });
    const uniqueProductsSold = uniqueProductsSoldCount.size;

    // Use the master catalog count (38) as the base "Total Product" as requested by user
    const totalUnits = PRODUCTS.length; 
    // Remaining is calculated as catalog size minus net sold (Sold - Returned)
    // Formula: 38 - (15 - 2) = 25
    const totalStockCount = totalUnits - (totalProductsSold - totalReturnedProducts);

    return {
      totalRevenue,
      totalCost,
      profit,
      profitMargin,
      totalProductsSold,
      totalReturnedProducts,
      totalUnits,
      uniqueProductsSold,
      weeklySold,
      weeklyReturns,
      chartData,
      topProducts,
      categoryData,
      lowStockCount,
      totalStockCount,
      totalStockValue,
      totalPotentialProfit,
      topCustomers,
      inventoryRunway,
      efficiency,
      statusData
    };
  }, [orders, products]);

  // Activity Feed Logic (Unused)

  const exportPerformancePDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const timestamp = format(new Date(), 'dd MMM yyyy, HH:mm');
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // brand-900
      doc.text('Performance Analytics Report', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // brand-400
      doc.text(`Generated on: ${timestamp}`, 14, 30);
      
      // Key Metrics Table
      autoTable(doc, {
        startY: 40,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', `INR ${(analytics.totalRevenue || 0).toLocaleString()}`],
          ['Total Profit', `INR ${(analytics.profit || 0).toLocaleString()}`],
          ['Profit Margin', `${(analytics.profitMargin || 0).toFixed(1)}%`],
          ['Products Sold', (analytics.totalProductsSold || 0).toString()],
          ['Return Units', (analytics.totalReturnedProducts || 0).toString()],
          ['Average Order Value', `INR ${(analytics.totalRevenue / (orders.length || 1)).toFixed(0)}`],
          ['Inventory Value', `INR ${(analytics.totalStockValue || 0).toLocaleString()}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] }
      });

      // Top Products
      doc.setFontSize(16);
      doc.text('Top Selling Products', 14, (doc as any).lastAutoTable.finalY + 15);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Product Name', 'Total Sales (INR)']],
        body: analytics.topProducts.map(p => [p.name, (p.revenue || 0).toLocaleString()]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] } // Emerald
      });

      doc.save(`Performance_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error('PDF Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const order = orders.find(o => o.id === orderId);
      const historyEntry = { 
        status: newStatus, 
        timestamp: new Date().toISOString(), 
        message: `Order status changed to ${newStatus}` 
      };
      
      await updateDoc(orderRef, { 
        status: newStatus,
        history: order?.history ? [...order.history, historyEntry] : [historyEntry]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleUpdateTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      const orderRef = doc(db, 'orders', editingOrder.id);
      
      const estimatedDelivery = orderTrackingForm.estimatedDelivery && !isNaN(new Date(orderTrackingForm.estimatedDelivery).getTime())
        ? Timestamp.fromDate(new Date(orderTrackingForm.estimatedDelivery))
        : null;

      if (editingItemId) {
        // Update specific item tracking
        const updatedItems = editingOrder.items.map(item => {
          if (item.id === editingItemId) {
            return {
              ...item,
              status: orderTrackingForm.status as any,
              currentLocation: orderTrackingForm.currentLocation,
              trackingNumber: orderTrackingForm.trackingNumber,
              estimatedDelivery: estimatedDelivery
            };
          }
          return item;
        });

        await updateDoc(orderRef, { items: updatedItems });
      } else {
        // Update entire order AND all items inside it so the customer sees the changes
        const updatedItems = editingOrder.items.map(item => ({
          ...item,
          status: orderTrackingForm.status as any,
          currentLocation: orderTrackingForm.currentLocation,
          trackingNumber: orderTrackingForm.trackingNumber,
          estimatedDelivery: estimatedDelivery
        }));

        await updateDoc(orderRef, {
          status: orderTrackingForm.status,
          currentLocation: orderTrackingForm.currentLocation,
          trackingNumber: orderTrackingForm.trackingNumber,
          estimatedDelivery: estimatedDelivery,
          items: updatedItems
        });
      }
      
      setIsOrderTrackingModalOpen(false);
      setEditingOrder(null);
      setEditingItemId(null);
    } catch (error: any) {
      console.error(error);
      alert('Error updating tracking: ' + error.message);
      handleFirestoreError(error, OperationType.UPDATE, `orders/${editingOrder.id}`);
    }
  };

  const handleApproveReturn = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updatedItems = order.items.map(item => ({
        ...item,
        status: 'returned' as const,
        currentLocation: 'Return Approved & Completed'
      }));

      // Update Order Status
      await updateDoc(orderRef, {
        status: 'returned',
        currentLocation: 'Return Approved & Completed',
        items: updatedItems
      });

      // Increment stock back for the returned items
      const stockUpdates = order.items.map(item => {
        const productRef = doc(db, 'products', item.id);
        return updateDoc(productRef, {
          stock: increment(item.quantity)
        });
      });
      await Promise.all(stockUpdates);

    } catch (error) {
      console.error('Error approving return:', error);
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleRejectReturn = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const updatedItems = order.items.map(item => ({
        ...item,
        status: 'received' as const,
        currentLocation: 'Return Rejected'
      }));

      await updateDoc(orderRef, {
        status: 'received',
        currentLocation: 'Return Rejected',
        items: updatedItems
      });
    } catch (error) {
      console.error('Error rejecting return:', error);
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const productId = editingProduct?.id || `p-${Date.now()}`;
      const productData = {
        ...productForm,
        id: productId,
        sku: productForm.sku || `SKU-${Date.now().toString().slice(-6)}`,
        price: Number(productForm.price),
        costPrice: Number(productForm.costPrice),
        stock: Number(productForm.stock || 0)
      } as Product;

      await setDoc(doc(db, 'products', productId), productData);
      setIsProductModalOpen(false);
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: 0,
        costPrice: 0,
        category: 'Electronics',
        image: '',
        rating: 4.5,
        reviews: 0
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm(product);
    setIsProductModalOpen(true);
  };

  const openTrackingModal = (order: Order) => {
    setEditingOrder(order);
    setEditingItemId(null);
    
    setOrderTrackingForm({
      status: order.status,
      currentLocation: order.currentLocation || '',
      trackingNumber: order.trackingNumber || '',
      estimatedDelivery: order.estimatedDelivery ? format(order.estimatedDelivery.toDate(), 'yyyy-MM-dd') : ''
    });
    setIsOrderTrackingModalOpen(true);
  };

  const openItemTrackingModal = (order: Order, itemId: string) => {
    const item = order.items.find(i => i.id === itemId);
    if (!item) return;

    setEditingOrder(order);
    setEditingItemId(itemId);
    
    setOrderTrackingForm({
      status: item.status || order.status,
      currentLocation: item.currentLocation || order.currentLocation || '',
      trackingNumber: item.trackingNumber || order.trackingNumber || '',
      estimatedDelivery: item.estimatedDelivery ? format(item.estimatedDelivery.toDate(), 'yyyy-MM-dd') : 
                        (order.estimatedDelivery ? format(order.estimatedDelivery.toDate(), 'yyyy-MM-dd') : '')
    });
    setIsOrderTrackingModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-brand-500 hover:text-brand-900 mb-2 transition-colors"
          >
            <ArrowLeft size={20} /> Back to Store
          </button>
          <h1 className="text-4xl font-display font-bold">Admin Dashboard</h1>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold hover:bg-red-100 transition-colors"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-brand-100 pb-4 overflow-x-auto no-scrollbar scroll-smooth">
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap ${activeTab === 'orders' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:bg-brand-50'}`}
        >
          <Package size={18} /> Orders
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:bg-brand-50'}`}
        >
          <ShoppingBag size={18} /> Products
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap ${activeTab === 'analytics' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:bg-brand-50'}`}
        >
          <BarChart3 size={18} /> Analytics
        </button>
        <button 
          onClick={() => setActiveTab('details')}
          className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold transition-all whitespace-nowrap ${activeTab === 'details' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:bg-brand-50'}`}
        >
          <UserIcon size={18} /> Admin
        </button>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-6 relative">
          {/* Daily Quick Summary (Owner View) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm transition-all hover:bg-brand-50/50">
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Today's Load</p>
              <div className="flex items-center gap-2">
                <Package className="text-brand-900" size={16} />
                <p className="text-xl font-bold">{orders.filter(o => isSameDay(o.createdAt?.toDate() || new Date(), new Date())).length} Orders</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm transition-all hover:bg-yellow-50/50">
              <div className="flex justify-between items-start mb-1">
                <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Ready for Dispatch</p>
                {orders.filter(o => o.status === 'pending' && differenceInDays(new Date(), o.createdAt?.toDate() || new Date()) > 2).length > 0 && (
                  <span className="bg-red-100 text-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse">
                    <AlertTriangle size={8} /> Risk
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-yellow-600" size={16} />
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-bold">{orders.filter(o => o.status === 'pending').length} Actions</p>
                  {orders.filter(o => o.status === 'pending' && differenceInDays(new Date(), o.createdAt?.toDate() || new Date()) > 2).length > 0 && (
                    <span className="text-[10px] text-red-500 font-bold">
                      ({orders.filter(o => o.status === 'pending' && differenceInDays(new Date(), o.createdAt?.toDate() || new Date()) > 2).length} Delayed)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-brand-100 shadow-sm transition-all hover:bg-orange-50/50">
              <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Return Requests</p>
              <div className="flex items-center gap-2">
                <RotateCcw className="text-orange-600" size={16} />
                <p className="text-xl font-bold">{orders.filter(o => o.status === 'returning').length} Cases</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search by ID, name, or email..." 
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full bg-white border border-brand-200 rounded-2xl px-6 py-3 pl-12 focus:ring-2 focus:ring-brand-900 shadow-sm"
              />
              <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" size={20} />
            </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['all', 'shipped', 'delivered', 'received', 'cancelled', 'returned'].map(status => (
                  <button 
                    key={status}
                    onClick={() => setOrderStatusFilter(status)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                      orderStatusFilter === status ? 'bg-brand-900 text-white' : 'bg-white border border-brand-200 text-brand-600 hover:bg-brand-50'
                    }`}
                  >
                    {status === 'shipped' ? 'In Transit' : 
                     status === 'received' ? 'Settled' : 
                     status}
                  </button>
                ))}
              </div>
            </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-brand-200">
              <Package size={48} className="mx-auto text-brand-200 mb-4" />
              <h3 className="text-xl font-bold">No orders found</h3>
              <p className="text-brand-500">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredOrders.map(order => (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 border border-brand-200 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                    <div className="flex items-start">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">Order ID</span>
                          <span className="font-mono font-bold text-brand-900">{order.id}</span>
                          {order.total > 5000 && (
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Target size={10} /> High Value
                            </span>
                          )}
                          {differenceInDays(new Date(), order.createdAt?.toDate() || new Date()) > 2 && order.status === 'pending' && (
                            <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <AlertTriangle size={10} /> Delayed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-brand-500">
                          <Clock size={14} />
                          {order.createdAt?.toDate()?.toLocaleString() || 'Just now'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => openTrackingModal(order)}
                        className="flex items-center gap-2 bg-brand-50 text-brand-900 px-4 py-2 rounded-full text-sm font-bold hover:bg-brand-100 transition-colors"
                      >
                        <Truck size={16} /> Update Tracking
                      </button>
                      <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === 'received' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm' :
                        order.status === 'delivered' ? 'bg-green-100 text-green-700 border border-green-200' :
                        order.status === 'shipped' ? 'bg-blue-100 text-blue-700 border border-blue-200 shadow-sm' :
                        order.status === 'returned' ? 'bg-brand-100 text-brand-700 border border-brand-200' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-700 border border-red-200' :
                        'bg-yellow-50 text-yellow-700 border border-yellow-200 shadow-sm'
                      }`}>
                        {order.status === 'pending' ? 'Awaiting Dispatch' : 
                         order.status === 'shipped' ? 'In Transit' : 
                         order.status === 'received' ? 'Settled' :
                         order.status}
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold text-sm text-brand-400 uppercase mb-4">Customer Details</h4>
                      <div className="space-y-2">
                        <p className="font-bold text-brand-900">{(order as any).shippingInfo?.name || 'N/A'}</p>
                        <p className="text-brand-500 text-sm">{(order as any).shippingInfo?.email || 'N/A'}</p>
                        <p className="text-brand-500 text-sm">Mobile: {(order as any).shippingInfo?.phone || '[Not Provided]'}</p>
                        <p className="text-brand-400 text-xs font-mono">UID: {order.userId}</p>
                        <div className="mt-4 p-3 bg-brand-50 rounded-xl text-xs text-brand-600">
                          <p className="font-bold mb-1">Shipping Address:</p>
                          <p>
                            {(order as any).shippingInfo?.address || 'No Address'}, {(order as any).shippingInfo?.city || 'N/A'}, {(order as any).shippingInfo?.zipCode || 'N/A'}
                          </p>
                        </div>
                        
                        {order.trackingNumber && (
                          <div className="mt-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 opacity-10">
                              <Truck size={40} />
                            </div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Zap size={10} className="fill-blue-400" /> Active Tracking
                            </p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-blue-600">Waybill/Tracking:</span>
                                <span className="text-xs font-mono font-bold text-blue-900">{order.trackingNumber}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-blue-600">Current Node:</span>
                                <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                                  <MapPin size={10} /> {order.currentLocation || 'Awaiting Update'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        {order.returnReason && (
                          <div className="mt-4 p-3 bg-orange-50 rounded-xl text-xs text-orange-700 border border-orange-100">
                            <p className="font-bold mb-1 flex items-center gap-1">
                              <RotateCcw size={12} /> Return Reason:
                            </p>
                            <p>{order.returnReason}</p>
                            {order.status === 'returning' && (
                              <div className="mt-3 flex gap-2">
                                <button 
                                  onClick={() => handleApproveReturn(order.id)}
                                  className="flex-grow bg-emerald-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition-colors"
                                >
                                  <Check size={14} /> Approve
                                </button>
                                <button 
                                  onClick={() => handleRejectReturn(order.id)}
                                  className="flex-grow bg-red-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1 hover:bg-red-700 transition-colors"
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-brand-400 uppercase mb-4">Order Items</h4>
                      <div className="space-y-3">
                        {order.items && order.items.map((item, idx) => (
                          <div key={idx} className="flex flex-col gap-2 p-3 bg-brand-50/50 rounded-xl">
                            <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 bg-brand-100 rounded-lg overflow-hidden flex-shrink-0">
                                <img src={item?.image || ''} alt={item?.name || 'Item'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                              <div className="flex-grow">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-brand-700">
                                    <span className="font-bold">{item?.quantity || 0}x</span> {item?.name || 'Unknown Item'}
                                  </span>
                                  <span className="font-bold">₹{((item?.price || 0) * (item?.quantity || 0)).toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                                item.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                item.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                item.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                item.status === 'returning' ? 'bg-orange-100 text-orange-700' :
                                item.status === 'returned' ? 'bg-brand-100 text-brand-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {item.status || 'pending'}
                              </div>
                              <button 
                                onClick={() => openItemTrackingModal(order, item.id)}
                                className="text-[10px] font-bold text-brand-600 hover:text-brand-900 underline"
                              >
                                Update Item Tracking
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-3 border-t border-brand-100 flex justify-between items-center">
                          <span className="font-bold">Total Amount</span>
                          <span className="text-lg font-bold text-brand-900">₹{(order.total || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Fulfillment Timeline */}
                  <div className="mt-8 pt-8 border-t border-brand-50">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="font-bold text-sm text-brand-400 uppercase flex items-center gap-2">
                        <History size={16} /> Fulfillment Journey
                      </h4>
                      <p className="text-[10px] font-bold text-brand-300 uppercase tracking-widest text-right">
                        Stage: <span className="text-brand-900 font-bold">{order.status}</span>
                      </p>
                    </div>
                    
                    <div className="flex items-start justify-between relative px-2">
                      <div className="absolute top-4 left-6 right-6 h-0.5 bg-brand-50 z-0" />
                      {[
                        { status: 'shipped', label: 'Shipped', icon: Truck },
                        { status: 'delivered', label: 'Delivered', icon: CheckCircle2 },
                        { status: 'received', label: 'Settled', icon: ShieldCheck }
                      ].map((step, idx) => {
                        const stages = ['shipped', 'delivered', 'received'];
                        const currentIdx = stages.indexOf(order.status);
                        const isCompleted = currentIdx >= idx;
                        const StepIcon = step.icon;
                        
                        return (
                          <div key={step.status} className="relative z-10 flex flex-col items-center flex-1">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                              isCompleted ? 'bg-brand-900 border-brand-900 text-white shadow-lg' : 'bg-white border-brand-100 text-brand-300'
                            }`}>
                              <StepIcon size={14} />
                            </div>
                            <p className={`text-[9px] font-bold mt-2 uppercase tracking-tight text-center ${
                              isCompleted ? 'text-brand-900' : 'text-brand-300'
                            }`}>
                              {step.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-2xl font-bold">Manage Products</h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-grow md:w-64">
                <input 
                  type="text" 
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full bg-white border border-brand-200 rounded-full pl-12 pr-4 py-2 text-sm focus:ring-2 focus:ring-brand-900 focus:border-transparent outline-none transition-all"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
              </div>
              <button 
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({
                    name: '',
                    description: '',
                    price: 0,
                    costPrice: 0,
                    category: 'Electronics',
                    image: '',
                    rating: 4.5,
                    reviews: 0
                  });
                  setIsProductModalOpen(true);
                }}
                className="flex items-center gap-2 bg-brand-900 text-white px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform"
              >
                <Plus size={18} /> Add Product
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-2xl overflow-hidden border border-brand-200 p-4 group">
                <div className="relative aspect-square rounded-xl overflow-hidden bg-brand-50 mb-4">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => openEditModal(product)}
                      className="p-2 bg-white rounded-full text-brand-900 hover:bg-brand-900 hover:text-white transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 bg-white rounded-full text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <h4 className="font-bold text-brand-900 mb-1 line-clamp-1 h-6">{product.name}</h4>
                <p className="text-brand-500 text-xs line-clamp-1 mb-2 h-4">{product.description}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-brand-900">₹{(product.price || 0).toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-brand-400">Cost: ₹{(product.costPrice || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    {analytics.inventoryRunway.find(r => r.id === product.id)?.daysLeft !== 999 && (
                      <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1 rounded">
                        Runway: {analytics.inventoryRunway.find(r => r.id === product.id)?.daysLeft}d
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Advanced Management Hub */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-brand-900 to-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                <Target size={120} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                    <Activity className="text-brand-300" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Fulfillment Capacity</h2>
                    <p className="text-brand-300 text-xs">Operational efficiency tracking</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-brand-300 uppercase mb-1">Avg. Processing Speed</p>
                    <p className="text-2xl font-bold">1.2 Days</p>
                    <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-bold text-brand-300 uppercase mb-1">On-Time Accuracy</p>
                    <p className="text-2xl font-bold">94.8%</p>
                    <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400" style={{ width: '94.8%' }} />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsDailyLogModalOpen(true)}
                  className="mt-8 w-full py-4 bg-white text-brand-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-50 transition-colors shadow-lg"
                >
                  <FileText size={18} /> Daily Performance Log
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 text-left">
              <div className="bg-white p-6 rounded-[2rem] border border-brand-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <DollarSign size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500">+4.5%</span>
                </div>
                <h3 className="text-sm font-bold text-brand-400 uppercase tracking-widest mb-1">Avg. Order Value (AOV)</h3>
                <p className="text-2xl font-bold text-brand-900">
                  ₹{(analytics.totalRevenue / orders.filter(o => o.status !== 'cancelled').length || 0).toFixed(0)}
                </p>
                <p className="text-[10px] text-brand-500 mt-2">Target AOV: ₹1,500</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="bg-white p-5 rounded-3xl border border-brand-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-brand-50 text-brand-900 rounded-2xl">
                  <Activity size={24} />
                </div>
                <h3 className="text-sm font-bold text-brand-400 uppercase tracking-widest leading-none">Total Revenue</h3>
              </div>
              <p className="text-xl font-bold text-brand-900 truncate">₹{(analytics.totalRevenue || 0).toLocaleString('en-IN')}</p>
              <div className="mt-2 text-[10px] font-bold text-brand-400">
                Gross sales volume
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-brand-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <DollarSign size={24} />
                </div>
                <h3 className="text-sm font-bold text-brand-400 uppercase tracking-widest leading-none">Total Expenses</h3>
              </div>
              <p className="text-xl font-bold text-red-600 truncate">₹{(analytics.totalCost || 0).toLocaleString('en-IN')}</p>
              <div className="mt-2 text-[10px] font-bold text-brand-400">
                Product procurement cost
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-brand-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
                <h3 className="text-sm font-bold text-brand-400 uppercase tracking-widest leading-none">Total Profit</h3>
              </div>
              <p className="text-xl font-bold text-green-600 truncate">₹{(analytics.profit || 0).toLocaleString('en-IN')}</p>
              <div className="mt-2 text-[10px] font-bold text-brand-400">
                Margin: <span className="text-brand-900">{(analytics.profitMargin || 0).toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-brand-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <ShoppingBag size={24} />
                </div>
                <h3 className="text-sm font-bold text-brand-400 uppercase tracking-widest leading-none">Products Sold</h3>
              </div>
              <p className="text-xl font-bold text-brand-900">{analytics.totalProductsSold}</p>
              <div className="mt-2 text-[10px] font-bold text-brand-400">
                Avg per Order: <span className="text-brand-900 font-bold">{(analytics.totalProductsSold / (orders.length || 1)).toFixed(1)}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-brand-200 shadow-sm transition-all hover:shadow-md lg:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-50/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center border border-brand-100/50">
                  <p className="text-4xl font-bold text-brand-900 leading-none mb-2">{analytics.totalUnits}</p>
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Total Product</p>
                </div>
                <div className="bg-indigo-50/50 p-6 rounded-2xl flex flex-col items-center justify-center text-center border border-indigo-100/50">
                  <p className="text-4xl font-bold text-indigo-900 leading-none mb-2">{analytics.totalStockCount}</p>
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Remaining Product</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-brand-200 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                  <RotateCcw size={24} />
                </div>
                <h3 className="text-sm font-bold text-brand-400 uppercase tracking-widest leading-none">Return Units</h3>
              </div>
              <p className="text-xl font-bold text-brand-900">{analytics.totalReturnedProducts}</p>
              <div className="mt-2 text-[10px] font-bold text-brand-400">
                Return Rate: <span className="text-red-600 font-bold">{analytics.totalProductsSold > 0 ? ((analytics.totalReturnedProducts / analytics.totalProductsSold) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>

          {/* Weekly Status Graph */}
          <div className="grid grid-cols-1 gap-8 mb-8">
            <div className="bg-white p-8 rounded-3xl border border-brand-200 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
               <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2 text-brand-900">
                  <TrendingUp size={20} className="text-indigo-500" />
                  Weekly Sales Performance
                </h3>
                <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase tracking-widest">
                  Last 7 Days
                </div>
               </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`₹${(value || 0).toLocaleString()}`, "Revenue"]}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
                        padding: '16px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-brand-200 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-brand-900">
                <BarChart3 size={20} className="text-brand-400" />
                Top Selling Products (by Revenue)
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false} 
                      width={100}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => `₹${(value || 0).toLocaleString()}`}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        padding: '12px'
                      }}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-brand-200 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2 text-brand-900">
                <Activity size={20} className="text-brand-400" />
                Order Fulfillment Mix
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.statusData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#d946ef', '#06b6d4', '#4f46e5', '#f43f5e', '#84cc16'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl border border-brand-200 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <UserIcon size={20} className="text-brand-400" />
                Top Valued Customers
              </h3>
              <div className="space-y-4">
                {analytics.topCustomers.map((customer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-brand-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-brand-400 border border-brand-100">
                        {(customer.name || '?')[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-brand-900">{customer.name || 'Unknown Customer'}</p>
                        <p className="text-[10px] text-brand-400">{customer.email || 'No Email'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">₹{(customer.totalspent || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-brand-400">{customer.orders} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-brand-200 shadow-sm">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <ShieldCheck size={20} className="text-brand-400" />
                Category Revenue Distribution
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analytics.categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `₹${(value || 0).toLocaleString()}`} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-brand-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="p-2 bg-brand-50 rounded-full text-brand-900">
                   <Clock size={16} />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <TrendingUp size={20} className="text-brand-400" />
                Latest Orders Performance
              </h3>
              <div className="space-y-4">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-brand-50 rounded-2xl hover:bg-brand-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${order.status === 'delivered' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <div>
                        <p className="text-xs font-bold text-brand-900">{order.id}</p>
                        <p className="text-[10px] text-brand-400">{(order as any).shippingInfo?.name || 'Unknown'}</p>
                      </div>
                    </div>
                    <p className="font-bold text-sm">₹{(order.total || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-brand-200 shadow-sm">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative mb-4">
                <img 
                  src={user?.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'} 
                  alt="Admin" 
                  className="w-32 h-32 rounded-full border-4 border-brand-100 shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-0 right-0 bg-brand-900 text-white p-2 rounded-full border-4 border-white">
                  <ShieldCheck size={20} />
                </div>
              </div>
              <h2 className="text-2xl font-display font-bold">{user?.displayName || 'Admin User'}</h2>
              <p className="text-brand-500">{user?.email}</p>
              <div className="mt-4 px-4 py-1 bg-brand-100 text-brand-900 rounded-full text-xs font-bold uppercase tracking-widest">
                System Administrator
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-brand-50 rounded-2xl">
                  <p className="text-xs font-bold text-brand-400 uppercase mb-1">Total Products</p>
                  <p className="text-2xl font-bold text-brand-900">{PRODUCTS.length}</p>
                </div>
                <div className="p-4 bg-brand-50 rounded-2xl">
                  <p className="text-xs font-bold text-brand-400 uppercase mb-1">Total Orders</p>
                  <p className="text-2xl font-bold text-brand-900">{orders.length}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-brand-100">
                <h3 className="font-bold mb-4">Account Information</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-brand-500 text-sm">Admin ID</span>
                    <span className="font-mono text-[10px] font-bold text-brand-400">{user?.uid}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-brand-500 text-sm">Access Level</span>
                    <span className="text-sm font-bold text-brand-900 capitalize">{user?.role || 'Full Access'}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={logout}
                className="w-full mt-6 bg-rose-50 text-rose-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-all border border-rose-100"
              >
                <LogOut size={20} /> Terminate Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {isProductModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white z-[110] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-brand-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-brand-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Product Name</label>
                  <input 
                    type="text" 
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                    placeholder="e.g. Premium Wireless Headphones"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">SKU / Product Code</label>
                  <input 
                    type="text" 
                    value={productForm.sku}
                    onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900 font-mono"
                    placeholder="e.g. ELE-HDF-001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-brand-700 mb-1">Selling Price (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={productForm.price}
                      onChange={(e) => setProductForm({...productForm, price: Number(e.target.value)})}
                      className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-brand-700 mb-1">Cost Price (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={productForm.costPrice}
                      onChange={(e) => setProductForm({...productForm, costPrice: Number(e.target.value)})}
                      className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Initial Stock Level</label>
                  <input 
                    type="number" 
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({...productForm, stock: Number(e.target.value)})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Category</label>
                  <select 
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Fashion">Fashion</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Image URL</label>
                  <input 
                    type="url" 
                    required
                    value={productForm.image}
                    onChange={(e) => setProductForm({...productForm, image: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Description</label>
                  <textarea 
                    rows={3}
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900 resize-none"
                    placeholder="Tell us about the product..."
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform mt-4"
                >
                  <Save size={20} /> {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Tracking Modal */}
      {/* Daily Performance Modal */}
      <AnimatePresence>
        {isDailyLogModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDailyLogModalOpen(false)}
              className="absolute inset-0 bg-brand-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
            >
              <div className="p-8 bg-brand-900 text-white relative">
                 <div className="absolute top-0 right-0 p-8 opacity-10">
                    <FileText size={100} />
                 </div>
                 <div className="relative z-10 flex justify-between items-start">
                   <div>
                     <h2 className="text-3xl font-display font-bold mb-2">Daily Performance Log</h2>
                     <p className="text-brand-300 font-bold uppercase tracking-widest text-xs">Generated for: {format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
                   </div>
                   <button 
                     onClick={() => setIsDailyLogModalOpen(false)}
                     className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                   >
                     <X size={20} />
                   </button>
                 </div>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-3 gap-6 mb-10">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Total Orders</p>
                    <p className="text-3xl font-bold text-brand-900">{orders.filter(o => isSameDay(o.createdAt?.toDate() || new Date(), new Date())).length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Net Revenue</p>
                    <p className="text-3xl font-bold text-emerald-600">₹{(orders.filter(o => isSameDay(o.createdAt?.toDate() || new Date(), new Date())).reduce((sum, o) => sum+(o.total || 0), 0)).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1">Efficiency</p>
                    <p className="text-3xl font-bold text-brand-900">92%</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="font-bold text-brand-900 flex items-center gap-2 mb-4">
                    <Clock size={18} /> Today's Operation Timeline
                  </h3>
                  {orders
                    .filter(o => isSameDay(o.createdAt?.toDate() || new Date(), new Date()))
                    .slice(0, 5)
                    .map((order) => (
                      <div key={order.id} className="relative pl-8 border-l-2 border-brand-50 pb-8 last:pb-0">
                        <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-brand-900 border-2 border-white" />
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-brand-900">New Order Created</p>
                            <p className="text-xs text-brand-500">Order ID: #{order.id} | {(order as any).shippingInfo?.name || 'Unknown'}</p>
                          </div>
                          <p className="text-[10px] font-mono font-bold text-brand-400">{format(order.createdAt?.toDate() || new Date(), 'HH:mm')}</p>
                        </div>
                      </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-brand-50 border-t border-brand-100 flex gap-4">
                <button 
                  onClick={() => setIsDailyLogModalOpen(false)}
                  className="w-full py-4 bg-brand-900 text-white rounded-2xl font-bold hover:bg-brand-800 transition-colors"
                >
                  Close Performance Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOrderTrackingModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrderTrackingModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white z-[110] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-brand-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">
                  {editingItemId ? 'Update Item Tracking' : 'Update Order Tracking'}
                </h3>
                <button onClick={() => setIsOrderTrackingModalOpen(false)} className="p-2 hover:bg-brand-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleUpdateTracking} className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Status</label>
                  <select 
                    value={orderTrackingForm.status}
                    onChange={(e) => setOrderTrackingForm({...orderTrackingForm, status: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                  >
                    <option value="pending">Awaiting Dispatch</option>
                    <option value="shipped">Shipped (In Transit)</option>
                    <option value="delivered">Delivered (Handed Over)</option>
                    <option value="received">Settled (Customer Received)</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="returning">Returning</option>
                    <option value="returned">Returned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Tracking Number</label>
                  <input 
                    type="text" 
                    value={orderTrackingForm.trackingNumber}
                    onChange={(e) => setOrderTrackingForm({...orderTrackingForm, trackingNumber: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                    placeholder="e.g. ZNV-12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Current Location</label>
                  <input 
                    type="text" 
                    value={orderTrackingForm.currentLocation}
                    onChange={(e) => setOrderTrackingForm({...orderTrackingForm, currentLocation: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                    placeholder="e.g. Mumbai Hub"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-700 mb-1">Estimated Delivery Date</label>
                  <input 
                    type="date" 
                    value={orderTrackingForm.estimatedDelivery}
                    onChange={(e) => setOrderTrackingForm({...orderTrackingForm, estimatedDelivery: e.target.value})}
                    className="w-full bg-brand-50 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-900"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-brand-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform mt-4"
                >
                  <Save size={20} /> Update Tracking Info
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Campaigns Modal removed */}
    </div>
  );
}

