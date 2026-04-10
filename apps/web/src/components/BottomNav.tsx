import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  MapIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid, MapIcon as MapIconSolid, TruckIcon as TruckIconSolid, ClipboardDocumentListIcon as ClipboardDocumentListIconSolid, Bars3Icon as Bars3IconSolid } from '@heroicons/react/24/solid';

const navItems = [
  { label: 'Inicio', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
  { label: 'Rutas', href: '/routes', icon: MapIcon, activeIcon: MapIconSolid },
  { label: 'Entregas', href: '/deliveries', icon: TruckIcon, activeIcon: TruckIconSolid },
  { label: 'Guias', href: '/dispatch-guides', icon: ClipboardDocumentListIcon, activeIcon: ClipboardDocumentListIconSolid },
  { label: 'Mas', href: '/more', icon: Bars3Icon, activeIcon: Bars3IconSolid },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = isActive ? item.activeIcon : item.icon;
          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full ${
                isActive ? 'text-primary-500' : 'text-gray-500'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}