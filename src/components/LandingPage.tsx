import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ShieldCheck, Truck, Star, ShoppingBag, Plus } from 'lucide-react';
import { PRODUCTS } from '../constants';
import { Product } from '../types';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  onEnterGuest: () => void;
  addToCart: (product: Product) => void;
  setToast: (message: string) => void;
  isScrolled: boolean;
}

export function LandingPage({ onSignIn, onSignUp, onEnterGuest, addToCart, setToast, isScrolled }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white font-sans text-brand-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 w-full z-50 px-6 py-4 flex items-center justify-between transition-all duration-500 ${
        isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-brand-100 py-3' : 'bg-transparent py-6'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-xl transition-colors ${
            isScrolled ? 'bg-brand-900 text-white' : 'bg-white text-brand-900'
          }`}>
            <ShoppingBag size={24} />
          </div>
          <span className={`font-display font-bold text-xl tracking-tight uppercase transition-colors ${
            isScrolled ? 'text-brand-900' : 'text-white'
          }`}>ZENVY</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onEnterGuest}
            className={`text-xs font-bold uppercase tracking-widest transition-colors hidden sm:block ${
              isScrolled ? 'text-brand-400 hover:text-brand-900' : 'text-white/40 hover:text-white'
            }`}
          >
            Browse as Guest
          </button>
          <button 
            onClick={onSignIn}
            className={`font-bold text-sm uppercase tracking-widest transition-colors ${
              isScrolled ? 'text-brand-600 hover:text-brand-900' : 'text-white/80 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button 
            onClick={onSignUp}
            className={`px-6 py-2 rounded-full font-bold text-sm uppercase tracking-widest transition-all ${
              isScrolled ? 'bg-brand-900 text-white hover:bg-brand-800' : 'bg-white text-brand-900 hover:bg-brand-50'
            }`}
          >
            Join
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop" 
            alt="Luxury Interior" 
            className="w-full h-full object-cover scale-105 animate-slow-zoom"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-6 border border-white/30">
              The Art of Living
            </span>
            <h1 className="font-display font-black text-6xl md:text-8xl lg:text-9xl tracking-tighter leading-[0.85] mb-8 uppercase">
              Curated <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40 italic">Perfection</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-white/80 mb-10 font-light leading-relaxed">
              Step into a world of unparalleled elegance and superior craftsmanship. Join the ZENVY community to access our exclusive collections of premium lifestyle essentials.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={onEnterGuest}
                className="group px-10 py-5 bg-white text-brand-900 font-bold uppercase tracking-widest rounded-full hover:bg-brand-50 transition-all flex items-center gap-3 active:scale-95 shadow-2xl shadow-white/10"
              >
                Shop Now
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">Scroll to Explore</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/40 to-transparent"></div>
        </motion.div>
      </section>

      {/* Featured Preview Section */}
      <section id="featured-preview" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tight mb-4">Featured Essentials</h2>
            <p className="text-brand-500 max-w-xl mx-auto">A glimpse into our curated collection of premium lifestyle goods.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 min-h-[400px]">
            {PRODUCTS.slice(0, 4).map((product) => (
              <div key={product.id} className="group cursor-pointer">
                <div className="relative aspect-square overflow-hidden rounded-2xl bg-brand-50 mb-4 border border-brand-100">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-6 py-2 bg-white text-brand-900 text-xs font-bold uppercase tracking-widest rounded-full shadow-lg">View Details</span>
                  </div>
                </div>
                <h3 className="font-display font-bold text-lg mb-1 line-clamp-1">{product.name}</h3>
                <p className="text-brand-900 font-bold">₹{(product.price || 0).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 text-center">
            <button 
              onClick={onSignIn}
              className="inline-flex items-center gap-2 text-brand-900 font-bold uppercase tracking-widest hover:gap-4 transition-all"
            >
              View Full Collection <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-brand-400 mb-4 block">The ZENVY Difference</span>
              <h2 className="font-display font-black text-4xl md:text-6xl uppercase tracking-tighter mb-8 leading-tight">
                Crafted for those <br /> who value <br /> <span className="text-brand-400">the details.</span>
              </h2>
              <p className="text-brand-500 text-lg mb-10 leading-relaxed font-light">
                We don't just sell products; we curate experiences. Every item in our store undergoes a rigorous selection process to ensure it meets our standards of quality, aesthetics, and functionality.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Ethical Sourcing', desc: 'We partner with artisans who share our commitment to fair labor and sustainable practices.' },
                  { title: 'Timeless Design', desc: 'Our products are designed to transcend trends and remain relevant for years to come.' },
                  { title: 'Unmatched Support', desc: 'Our dedicated team is here to ensure your experience is nothing short of perfect.' }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-brand-900 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm uppercase tracking-wider mb-1">{item.title}</h4>
                      <p className="text-xs text-brand-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop" 
                  alt="Premium Product" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-10 -left-10 bg-brand-900 text-white p-10 rounded-3xl shadow-2xl hidden md:block">
                <div className="text-5xl font-black mb-2">100%</div>
                <div className="text-xs uppercase tracking-widest font-bold opacity-60">Satisfaction <br /> Guaranteed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sign In CTA Section */}
      <section className="bg-brand-900 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-400 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-400 rounded-full blur-[120px]"></div>
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tighter mb-6">Join the ZENVY Community</h2>
            <p className="text-brand-300 text-lg mb-10 max-w-2xl mx-auto font-light">
              Sign in to track your orders, save your favorite items, and get early access to our limited drops.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={onSignIn}
                className="bg-white text-brand-900 px-12 py-5 rounded-full font-bold hover:scale-105 transition-transform text-lg shadow-xl uppercase tracking-widest"
              >
                Sign In
              </button>
              <button 
                onClick={onSignUp}
                className="bg-brand-800 border border-brand-700 text-white px-12 py-5 rounded-full font-bold hover:bg-brand-700 transition-all text-lg uppercase tracking-widest"
              >
                Join Now
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-brand-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-3xl shadow-sm border border-brand-100 transition-transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-brand-900 rounded-2xl flex items-center justify-center text-white mb-6 rotate-3">
                <ShieldCheck size={32} />
              </div>
              <h3 className="font-display font-bold text-xl mb-3 uppercase tracking-tight">Premium Quality</h3>
              <p className="text-brand-500 text-sm leading-relaxed">
                Every piece is crafted with meticulous attention to detail using the finest materials sourced globally.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-3xl shadow-sm border border-brand-100 transition-transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-brand-900 rounded-2xl flex items-center justify-center text-white mb-6 -rotate-3">
                <Truck size={32} />
              </div>
              <h3 className="font-display font-bold text-xl mb-3 uppercase tracking-tight">Global Delivery</h3>
              <p className="text-brand-500 text-sm leading-relaxed">
                We ship our luxury essentials to over 150 countries with fully tracked and insured shipping.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-8 bg-white rounded-3xl shadow-sm border border-brand-100 transition-transform hover:-translate-y-2">
              <div className="w-16 h-16 bg-brand-900 rounded-2xl flex items-center justify-center text-white mb-6 rotate-6">
                <Star size={32} />
              </div>
              <h3 className="font-display font-bold text-xl mb-3 uppercase tracking-tight">Exclusive Access</h3>
              <p className="text-brand-500 text-sm leading-relaxed">
                Members get early access to limited edition drops and special events throughout the year.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-brand-100 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm">
            <ShoppingBag size={18} />
          </div>
          <span className="font-display font-bold text-lg tracking-tight uppercase">ZENVY</span>
        </div>
        <p className="text-brand-400 text-xs uppercase tracking-widest">
          © 2026 ZENVY Luxury Essentials. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
