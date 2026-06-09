import {
  LayoutDashboard,
  LogOut,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  UserRound,
} from 'lucide-react';

const icons = {
  admin: ShieldCheck,
  cart: ShoppingCart,
  dashboard: LayoutDashboard,
  orders: ReceiptText,
  package: Package,
  search: Search,
  shop: ShoppingBag,
  user: UserRound,
  logout: LogOut,
};

export function Icon({ name, className = 'h-4 w-4' }) {
  const Component = icons[name] || Package;
  return <Component aria-hidden="true" className={className} strokeWidth={1.8} />;
}
