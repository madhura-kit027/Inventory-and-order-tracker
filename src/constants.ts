import { Product } from './types';

export const PRODUCTS: Product[] = [
  // --- ELECTRONICS ---
  ...[
    'Smartphone', 'Laptop', 'Tablet', 'Desktop Computer', 'Smartwatch',
    'Television (LED TV)', 'Bluetooth Speaker', 'Headphones', 'Earbuds',
    'Digital Camera', 'Printer', 'Router (WiFi Router)', 'Keyboard',
    'Mouse', 'Monitor', 'USB Flash Drive', 'Gaming Console', 'Vacuum Cleaner'
  ].map((name, i) => ({
    id: `e-${i + 1}`,
    name,
    description: [
      'Latest flagship smartphone with high-resolution camera and fast processor.',
      'Powerful laptop for work and gaming with long battery life.',
      'Portable tablet with a vibrant display, perfect for creativity and entertainment.',
      'High-performance desktop computer for professional tasks and multitasking.',
      'Feature-rich smartwatch to track your health and stay connected on the go.',
      'Crystal clear LED TV with smart features and immersive sound.',
      'Portable bluetooth speaker with deep bass and long-lasting battery.',
      'Premium noise-cancelling headphones for an immersive audio experience.',
      'Compact wireless earbuds with superior sound quality and comfortable fit.',
      'Professional digital camera for capturing stunning photos and videos.',
      'Reliable all-in-one printer for home and office use.',
      'High-speed WiFi router for seamless internet connectivity throughout your home.',
      'Ergonomic mechanical keyboard for comfortable typing and gaming.',
      'Precision wireless mouse for smooth navigation and control.',
      'Ultra-sharp monitor with accurate colors for professional work.',
      'Compact USB flash drive for easy file storage and transfer.',
      'Next-gen gaming console for the ultimate gaming experience.',
      'Powerful vacuum cleaner for deep cleaning your home.'
    ][i] || `High-quality ${name.toLowerCase()} with advanced features.`,
    price: [
      699, 1299, 499, 1599, 299,
      899, 129, 199, 149,
      599, 199, 89, 59,
      39, 249, 29, 499, 199
    ][i] * 83 || 99 * 83,
    costPrice: ([
      699, 1299, 499, 1599, 299,
      899, 129, 199, 149,
      599, 199, 89, 59,
      39, 249, 29, 499, 199
    ][i] * 83 || 99 * 83) * 0.6,
    category: 'Electronics',
    image: [
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80', // Smartphone
      'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80', // Laptop
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&q=80', // Tablet
      'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=800&q=80', // Desktop Computer
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80', // Smartwatch
      'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&q=80', // Television (LED TV)
      'https://images.unsplash.com/photo-1608156639585-b3a032ef9689?w=800&q=80', // Bluetooth Speaker
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', // Headphones
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&q=80', // Earbuds
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', // Digital Camera
      'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=800&q=80', // Printer
      'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80', // Router (WiFi Router)
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80', // Keyboard
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&q=80', // Mouse
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&q=80', // Monitor
      'https://images.unsplash.com/photo-1601524909162-ae8725290836?w=800&q=80', // USB Flash Drive
      'https://images.unsplash.com/photo-1486401899868-0e435ed85128?w=800&q=80', // Gaming Console
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&q=80'  // Vacuum Cleaner
    ][i] || `https://picsum.photos/seed/elec-final-${i}/800/800`,
    rating: parseFloat((Math.random() * (5 - 4.3) + 4.3).toFixed(1)),
    reviews: Math.floor(Math.random() * 3000) + 100,
    sku: `ELE-${(i + 1).toString().padStart(3, '0')}`,
    stock: Math.floor(Math.random() * 50) + 5
  })),

  // --- FASHION ---
  ...[
    'T-shirt', 'Shirt', 'Jeans', 'Shorts', 'Jacket', 'Hoodie', 'Blazer', 'Scarf', 'Cap', 'Hat', 'Sneakers', 'Sandals', 'Heels', 'Boots'
  ].map((name, i) => ({
    id: `f-${i + 1}`,
    name,
    description: `Stylish and comfortable ${name.toLowerCase()} for any occasion.`,
    price: [
      25, 45, 60, 35, 120, 65, 150, 25, 30, 45, 120, 60, 90, 140
    ][i] * 83 || 50 * 83,
    costPrice: ([
      25, 45, 60, 35, 120, 65, 150, 25, 30, 45, 120, 60, 90, 140
    ][i] * 83 || 50 * 83) * 0.6,
    category: 'Fashion',
    image: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', // T-shirt
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', // Shirt
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80', // Jeans
      'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&q=80', // Shorts
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80', // Jacket
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80', // Hoodie
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80', // Blazer
      'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80', // Scarf
      'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80', // Cap
      'https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?w=800&q=80', // Hat
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', // Sneakers
      'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80', // Sandals
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80', // Heels
      'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80'  // Boots
    ][i] || `https://picsum.photos/seed/fashion-new-${i}/800/800`,
    rating: parseFloat((Math.random() * (5 - 4) + 4).toFixed(1)),
    reviews: Math.floor(Math.random() * 1500) + 50,
    sku: `FAS-${(i + 1).toString().padStart(3, '0')}`,
    stock: Math.floor(Math.random() * 100) + 10
  })),

  // --- ACCESSORIES & BEAUTY ---
  ...[
    'Belt', 'Handbag', 'Wallet', 'Watch', 'Makeup Brush', 'Perfume Bottle'
  ].map((name, i) => ({
    id: `a-${i + 1}`,
    name,
    description: `High-quality ${name.toLowerCase()} for your daily grooming and style.`,
    price: [
      40, 200, 50, 250, 15, 60
    ][i] * 83 || 20 * 83,
    costPrice: ([
      40, 200, 50, 250, 15, 60
    ][i] * 83 || 20 * 83) * 0.6,
    category: 'Accessories',
    image: [
      'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80', // Belt
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80', // Handbag
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80', // Wallet
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80', // Watch
      'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=800&q=80', // Makeup Brush
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80'  // Perfume Bottle
    ][i] || `https://picsum.photos/seed/acc-beauty-${i}/800/800`,
    rating: parseFloat((Math.random() * (5 - 4.5) + 4.5).toFixed(1)),
    reviews: Math.floor(Math.random() * 800) + 20,
    sku: `ACC-${(i + 1).toString().padStart(3, '0')}`,
    stock: Math.floor(Math.random() * 150) + 20
  }))
];

export const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Accessories'];
