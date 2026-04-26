import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Search, 
  Menu, 
  ArrowRight, 
  Plus, 
  Star, 
  Truck, 
  ShieldCheck, 
  Package, 
  CheckCircle2, 
  X, 
  Trash2, 
  Minus, 
  ChevronRight,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { collection, onSnapshot, query, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isConfigValid } from './firebase';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider, useCart } from './contexts/CartContext';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { PRODUCTS as SEED_PRODUCTS, CATEGORIES } from './constants';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Product } from './types';

// Lazy load larger route components to improve website load speed
const Checkout = React.lazy(() => import('./components/Checkout').then(m => ({ default: m.Checkout })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const CartPage = React.lazy(() => import('./components/CartPage').then(m => ({ default: m.CartPage })));
const MyOrders = React.lazy(() => import('./components/MyOrders').then(m => ({ default: m.MyOrders })));

function AppContent() {
  const { cart, addToCart, removeFromCart, updateQuantity, cartTotal, cartCount, clearCart } = useCart();
  const { user, logout, authError, clearAuthError, isSigningIn, loading: authLoading } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'browsing' | 'cart' | 'checkout' | 'success' | 'admin' | 'orders'>('browsing');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  // If Firebase config is missing, show a clear warning UI
  if (!isConfigValid) {
    return (
      <div className="min-h-screen bg-rose-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border-4 border-rose-200">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-2xl font-bold text-center text-rose-900 mb-4">Configuration Required</h1>
          <p className="text-rose-700 text-center mb-8 leading-relaxed">
            Your Firebase API key is missing. This happens when you download the project from GitHub because your private keys are protected.
          </p>
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 rounded-2xl">
              <h3 className="font-bold text-rose-900 text-sm mb-2">How to fix this:</h3>
              <ol className="text-sm text-rose-700 list-decimal list-inside space-y-2">
                <li>Create <strong>firebase-applet-config.json</strong> in the root folder.</li>
                <li>Add your project ID and API Key from the Firebase Console.</li>
                <li>Restart your development server.</li>
              </ol>
            </div>
            
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <h3 className="font-bold text-amber-900 text-sm mb-2 flex items-center gap-2">
                <AlertCircle size={16} /> Tip: "node_modules/.bin" error?
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                If you get a command not recognized error on Windows, make sure your folder name <strong>doesn't have spaces or '&'</strong> (e.g., rename it to <code>zenvy-ecommerce</code>).
              </p>
            </div>

            <a 
              href="https://console.firebase.google.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-4 bg-rose-600 text-white rounded-full font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
            >
              Open Firebase Console <ExternalLink size={18} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Welcome toast when user signs in
  useEffect(() => {
    if (user && !isLoading) {
      setToast(`Welcome back, ${user.displayName || 'User'}!`);
    }
  }, [user?.uid, isLoading]);

  // Handle scroll for navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  // Clear toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Clear auth error after 5 seconds
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        clearAuthError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [authError, clearAuthError]);

  // Fetch products from Firestore
  useEffect(() => {
    setIsLoading(true);
    // Log the current database ID to help the user verify console settings
    console.log('Using Firestore Database ID:', (db as any)._databaseId?.database || '(default)');
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
      setIsLoading(false);

      // If user is logged in, ensure all seed products are in Firestore
      // (Since everyone is admin now, we check for 'user' existence directly)
      if (user) {
        const existingIds = new Set(productsData.map(p => p.id));
        const missingProducts = SEED_PRODUCTS.filter(p => !existingIds.has(p.id));
        
        if (missingProducts.length > 0) {
          console.log(`Seeding ${missingProducts.length} missing products...`);
          for (const product of missingProducts) {
            try {
              await setDoc(doc(db, 'products', product.id), product);
            } catch (error) {
              console.error('Error seeding product:', error);
            }
          }
        }

        // Cleanup: Remove Kudu and Vena if they exist in Firestore
        const unwantedProducts = productsData.filter(p => 
          p.name === 'Kudu Leather Wallet' || p.name === 'Vena Premium Case'
        );
        
        for (const product of unwantedProducts) {
          try {
            console.log(`Removing unwanted product: ${product.name}`);
            await deleteDoc(doc(db, 'products', product.id));
          } catch (error) {
            console.error('Error removing unwanted product:', error);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return unsubscribe;
  }, [user]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const name = product.name || '';
      const description = product.description || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, products]);

  const handleCheckout = () => {
    setCheckoutStep('checkout');
    setIsCartOpen(false);
  };

  const completeOrder = (orderId: string) => {
    setCompletedOrderId(orderId);
    setCheckoutStep('success');
    alert('Order successfully placed!');
    setToast('Your order has been placed successfully! 🎉');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-900 flex flex-col items-center justify-center text-white">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-6"
        >
          <div className="w-20 h-20 bg-white text-brand-900 rounded-3xl flex items-center justify-center shadow-2xl">
            <ShoppingBag size={40} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-display font-bold tracking-tighter">ZENVY</h1>
            <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                animate={{ x: [-48, 48] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-full bg-white"
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show landing page only if user is not logged in and is on browsing step
  // but let them enter as guest if they want
  if (!user && checkoutStep === 'browsing' && !localStorage.getItem('zenvy_entered')) {
    return (
      <div className="min-h-screen relative">
        <LandingPage 
          onSignIn={() => openAuthModal('signin')} 
          onSignUp={() => openAuthModal('signup')} 
          onEnterGuest={() => {
            localStorage.setItem('zenvy_entered', 'true');
            setCheckoutStep('browsing');
          }}
          addToCart={addToCart}
          setToast={setToast}
          isScrolled={isScrolled}
        />
        <AnimatePresence>
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-red-50 border border-red-100 px-6 py-3 rounded-full shadow-xl flex items-center gap-3"
            >
              <ShieldCheck size={20} className="text-red-500" />
              <span className="text-red-700 font-bold text-sm">{authError}</span>
              <button onClick={clearAuthError} className="text-red-400 hover:text-red-600">
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          initialMode={authModalMode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/80 backdrop-blur-md border-b border-brand-200 py-3' 
          : 'bg-transparent py-6'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCheckoutStep('browsing')}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isScrolled ? 'bg-brand-900 text-white' : 'bg-white text-brand-900'
              }`}>
                <ShoppingBag size={24} />
              </div>
              <span className={`text-xl font-display font-bold tracking-tight hidden sm:block transition-colors ${
                isScrolled ? 'text-brand-900' : 'text-white'
              }`}>INVENTORY & ORDERS</span>
            </div>

            {/* Search - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                  isScrolled ? 'text-brand-400' : 'text-white/60'
                }`} size={18} />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  className={`w-full border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-brand-900 transition-all ${
                    isScrolled ? 'bg-brand-100 text-brand-900' : 'bg-white/10 text-white placeholder:text-white/40'
                  }`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className={`p-2 rounded-full transition-all ${
                  isScrolled ? 'text-brand-700 hover:bg-brand-100' : 'text-white hover:bg-white/10'
                }`}
                title="Open in New Tab"
              >
                <ArrowRight className="-rotate-45" size={20} />
              </button>
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className={`text-sm font-bold transition-colors ${
                      isScrolled ? 'text-brand-900' : 'text-white'
                    }`}>{user.displayName}</p>
                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => setCheckoutStep('orders')}
                        className={`text-[10px] font-bold underline transition-colors ${
                          isScrolled ? 'text-brand-600 hover:text-brand-900' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        My Orders
                      </button>
                      {user.role === 'admin' && (
                        <button 
                          onClick={() => setCheckoutStep('admin')}
                          className={`text-[10px] font-bold underline transition-colors ${
                            isScrolled ? 'text-brand-600 hover:text-brand-900' : 'text-white/60 hover:text-white'
                          }`}
                        >
                          Admin Panel
                        </button>
                      )}
                      <button 
                        onClick={logout} 
                        className="text-[10px] font-bold text-red-500 hover:text-red-700"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${
                    isScrolled 
                      ? 'bg-brand-900 text-white hover:bg-brand-800' 
                      : 'bg-white text-brand-900 hover:bg-brand-50'
                  }`}
                >
                  Sign In
                </button>
              )}
              
              <button 
                className={`relative p-2 rounded-full transition-all ${
                  isScrolled ? 'text-brand-700 hover:bg-brand-100' : 'text-white hover:bg-white/10'
                }`}
                onClick={() => setCheckoutStep('cart')}
              >
                <ShoppingBag size={24} />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 bg-brand-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>
              <button className={`md:hidden p-2 transition-colors ${
                isScrolled ? 'text-brand-700' : 'text-white'
              }`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Error Banner */}
      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 border-b border-red-100 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-red-700 text-sm font-medium">
                <ShieldCheck size={18} />
                <p>{authError}</p>
              </div>
              <button 
                onClick={clearAuthError}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-brand-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 size={20} className="text-green-400" />
            <span className="font-bold text-sm">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-grow">
        {checkoutStep === 'browsing' && (
          <>
            {/* Hero Section */}
            <section className="relative h-screen overflow-hidden bg-brand-900 text-white">
              <div className="absolute inset-0 opacity-40">
                <img 
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2000&auto=format&fit=crop" 
                  alt="Hero Background" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="relative max-w-7xl mx-auto px-4 h-full flex flex-col justify-center items-start">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold tracking-widest uppercase mb-4">
                    New Collection 2026
                  </span>
                  <h1 className="text-5xl md:text-8xl font-display font-bold leading-tight mb-6">
                    Curated <br /> Perfection.
                  </h1>
                  <p className="text-lg md:text-2xl text-brand-200 max-w-2xl mb-8">
                    Step into a world of unparalleled elegance and superior craftsmanship. Discover our exclusive collections of premium lifestyle essentials.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => {
                        const element = document.getElementById('products');
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-white text-brand-900 px-10 py-5 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform text-lg shadow-xl"
                    >
                      Explore Collection <ChevronRight size={24} />
                    </button>
                  </div>
                </motion.div>
                
                {/* Scroll Indicator */}
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-brand-300 opacity-60"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest">Scroll to Explore</span>
                  <div className="w-px h-12 bg-gradient-to-b from-brand-300 to-transparent"></div>
                </motion.div>
              </div>
            </section>

            {/* Categories & Products */}
            <section id="products" className="max-w-7xl mx-auto px-4 py-24">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <h2 className="text-3xl font-display font-bold">Featured Products</h2>
                
                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-6 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                        selectedCategory === category 
                        ? 'bg-brand-900 text-white shadow-lg' 
                        : 'bg-white text-brand-600 hover:bg-brand-100 border border-brand-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 min-h-[600px]">
                {isLoading ? (
                  // Skeleton Loaders
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl overflow-hidden border border-brand-200 animate-pulse">
                      <div className="aspect-square bg-brand-100" />
                      <div className="p-5 space-y-3">
                        <div className="h-4 bg-brand-100 rounded w-1/4" />
                        <div className="h-6 bg-brand-100 rounded w-3/4" />
                        <div className="h-4 bg-brand-100 rounded w-full" />
                        <div className="h-6 bg-brand-100 rounded w-1/3" />
                      </div>
                    </div>
                  ))
                ) : (
                  <AnimatePresence mode="popLayout">
                    {filteredProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="group bg-white rounded-2xl overflow-hidden border border-brand-200 hover:shadow-xl transition-all"
                      >
                        <div className="relative aspect-square overflow-hidden bg-brand-100">
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <button 
                            onClick={() => addToCart(product)}
                            className="absolute bottom-4 right-4 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all hover:bg-brand-900 hover:text-white"
                          >
                            <Plus size={24} />
                          </button>
                          <div className="absolute top-4 left-4">
                            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-[10px] font-bold uppercase tracking-wider text-brand-900">
                              {product.category}
                            </span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="flex items-center gap-1 mb-2">
                            <Star size={14} className="fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-bold text-brand-700">{product.rating}</span>
                            <span className="text-xs text-brand-400">({product.reviews})</span>
                          </div>
                          <h3 className="font-display font-bold text-lg mb-1 group-hover:text-brand-700 transition-colors line-clamp-1">
                            {product.name}
                          </h3>
                          <p className="text-brand-500 text-sm line-clamp-2 mb-4 h-10">
                            {product.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xl font-bold text-brand-900">₹{(product.price || 0).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-100 rounded-full mb-4 text-brand-400">
                    <Search size={40} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">No products found</h3>
                  <p className="text-brand-500">Try adjusting your search or category filters.</p>
                </div>
              )}
            </section>

            {/* Features Section */}
            <section className="bg-white border-y border-brand-200 py-16">
              <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-900 mb-6">
                    <Truck size={32} />
                  </div>
                  <h4 className="text-xl font-bold mb-2">Free Shipping</h4>
                  <p className="text-brand-500">On all orders over ₹10,000. Fast and reliable delivery to your doorstep.</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-900 mb-6">
                    <ShieldCheck size={32} />
                  </div>
                  <h4 className="text-xl font-bold mb-2">Secure Payment</h4>
                  <p className="text-brand-500">We use industry-standard encryption to protect your financial information.</p>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-900 mb-6">
                    <Package size={32} />
                  </div>
                  <h4 className="text-xl font-bold mb-2">Easy Returns</h4>
                  <p className="text-brand-500">Not satisfied? Return your items within 30 days for a full refund.</p>
                </div>
              </div>
            </section>
          </>
        )}

        {checkoutStep === 'cart' && (
          <Suspense fallback={<div className="py-20 text-center"><div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <CartPage onBack={() => setCheckoutStep('browsing')} onCheckout={() => setCheckoutStep('checkout')} />
          </Suspense>
        )}

        {checkoutStep === 'checkout' && (
          <Suspense fallback={<div className="py-20 text-center"><div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <Checkout 
              onBack={() => setCheckoutStep('browsing')} 
              onSuccess={completeOrder} 
              onLoginClick={() => setIsAuthModalOpen(true)}
            />
          </Suspense>
        )}

        {checkoutStep === 'admin' && user?.role === 'admin' && (
          <Suspense fallback={<div className="py-20 text-center"><div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <AdminDashboard onBack={() => setCheckoutStep('browsing')} />
          </Suspense>
        )}

        {checkoutStep === 'admin' && user?.role !== 'admin' && (
          <div className="py-32 text-center">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="text-brand-500 mb-8">You do not have permission to access the admin panel.</p>
            <button 
              onClick={() => setCheckoutStep('browsing')}
              className="px-8 py-3 bg-brand-900 text-white rounded-full font-bold"
            >
              Go Back
            </button>
          </div>
        )}

        {checkoutStep === 'orders' && (
          <Suspense fallback={<div className="py-20 text-center"><div className="w-10 h-10 border-4 border-brand-900 border-t-transparent rounded-full animate-spin mx-auto" /></div>}>
            <MyOrders onBack={() => setCheckoutStep('browsing')} />
          </Suspense>
        )}

        {checkoutStep === 'success' && (
          <section className="max-w-xl mx-auto px-4 py-32 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-12 shadow-xl border border-brand-200"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-4xl font-display font-bold mb-4">Order Successfully Placed!</h2>
              <p className="text-brand-500 mb-8">
                Thank you for your purchase. We've sent a confirmation email to your inbox. Your order {completedOrderId ? `#${completedOrderId}` : ''} is being processed.
              </p>
              <div className="flex flex-col gap-4">
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Hello! I just placed an order on ZENVY.\nOrder ID: ${completedOrderId}\nStatus: Processing\nPlease confirm.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 bg-green-500 text-white rounded-full font-bold hover:scale-[1.02] transition-transform flex justify-center items-center gap-2"
                >
                  Send Order Message on WhatsApp
                </a>
                <button 
                  onClick={() => setCheckoutStep('browsing')}
                  className="w-full py-4 bg-brand-900 text-white rounded-full font-bold hover:scale-[1.02] transition-transform"
                >
                  Continue Shopping
                </button>
              </div>
            </motion.div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-brand-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-brand-500 text-xs">© 2026 ZENVY.</p>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-brand-900" />
                  <h2 className="text-xl font-display font-bold">Your Cart ({cartCount})</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-brand-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center text-brand-400 mb-4">
                      <ShoppingBag size={40} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Your cart is empty</h3>
                    <p className="text-brand-500 mb-8">Looks like you haven't added anything yet.</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="bg-brand-900 text-white px-8 py-3 rounded-full font-bold"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4">
                      <div className="w-24 h-24 bg-brand-100 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-brand-900 leading-tight">{item.name}</h4>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-brand-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <p className="text-brand-500 text-sm mb-4">₹{(item.price || 0).toLocaleString('en-IN')}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center bg-brand-100 rounded-full px-2 py-1">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1 hover:bg-white rounded-full transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1 hover:bg-white rounded-full transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="font-bold text-brand-900">₹{((item.price || 0) * (item.quantity || 0)).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t border-brand-100 space-y-4">
                  <div className="flex justify-between items-center text-brand-500 text-sm">
                    <span>Subtotal</span>
                    <span>₹{(cartTotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center text-brand-500 text-sm">
                    <span>Shipping</span>
                    <span className="text-green-600 font-medium">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold pt-2">
                    <span>Total</span>
                    <span>₹{(cartTotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setCheckoutStep('checkout');
                      setIsCartOpen(false);
                    }}
                    className="w-full bg-brand-900 text-white py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                  >
                    Checkout <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-80 bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-brand-100 flex items-center justify-between">
                <span className="text-xl font-display font-bold text-brand-900 tracking-tight">MENU</span>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 hover:bg-brand-100 rounded-full transition-colors text-brand-400 hover:text-brand-900"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-grow overflow-y-auto p-6 space-y-8">
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Navigation</p>
                  <button 
                    onClick={() => {
                      setCheckoutStep('browsing');
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left py-3 text-lg font-bold text-brand-900 hover:text-brand-600 transition-colors flex items-center justify-between"
                  >
                    Home <ChevronRight size={20} />
                  </button>
                  {user && (
                    <button 
                      onClick={() => {
                        setCheckoutStep('orders');
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left py-3 text-lg font-bold text-brand-900 hover:text-brand-600 transition-colors flex items-center justify-between"
                    >
                      My Orders <ChevronRight size={20} />
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button 
                      onClick={() => {
                        setCheckoutStep('admin');
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left py-3 text-lg font-bold text-brand-900 hover:text-brand-600 transition-colors flex items-center justify-between"
                    >
                      Admin Panel <ChevronRight size={20} />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Account</p>
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-brand-50 rounded-2xl border border-brand-100">
                        <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=random`} alt="User" className="w-10 h-10 rounded-full border border-brand-200" />
                        <div>
                          <p className="font-bold text-brand-900">{user.displayName}</p>
                          <p className="text-xs text-brand-500">{user?.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                        className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setIsAuthModalOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full py-4 bg-brand-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-brand-800 transition-colors shadow-lg shadow-brand-900/20"
                    >
                      Sign In <ArrowRight size={20} />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-brand-100 bg-brand-50/50">
                <p className="text-[10px] text-center text-brand-400 font-bold uppercase tracking-widest">
                  © 2026 ZENVY Premium
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authModalMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

