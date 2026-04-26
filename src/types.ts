import { Timestamp } from 'firebase/firestore';

export interface Product {
  id: string;
  sku: string; // Added for unique stock tracking
  name: string;
  description: string;
  price: number;
  costPrice: number; // Added for profit/loss calculation
  category: string;
  image: string;
  rating: number;
  reviews: number;
  stock: number; // Added for inventory management
}

export interface CartItem extends Product {
  quantity: number;
  status?: 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'received' | 'returning' | 'returned';
  trackingNumber?: string;
  currentLocation?: string;
  estimatedDelivery?: Timestamp | null;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role?: 'admin' | 'user';
  shippingInfo?: {
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'received' | 'returning' | 'returned';
  createdAt: Timestamp | null;
  estimatedDelivery: Timestamp | null;
  trackingNumber: string;
  currentLocation: string;
  returnReason?: string;
  shippingInfo: {
    name: string | null;
    email: string | null;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
  paymentMethod: string;
  history?: {
    status: string;
    timestamp: string;
    message: string;
  }[];
}
