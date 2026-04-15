import { Fragment, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import BottomNav from './BottomNav';
import {
  HomeIcon,
  MapIcon,
  TruckIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CubeIcon,
  UsersIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  BanknotesIcon,
  Bars3Icon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { HomeIcon as HomeIconSolid } from '@heroicons/react/24/solid';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles?: string[];
}

const sidebarItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: HomeIcon },
  { label: 'Operaciones', href: '/operations', icon: ChartBarIcon },
  { label: 'Rutas', href: '/routes', icon: MapIcon },
  { label: 'Guias', href: '/dispatch-guides', icon: ClipboardDocumentListIcon },
  { label: 'Clientes', href: '/clients', icon: UserGroupIcon },
  { label: 'Camiones', href: '/trucks', icon: TruckIcon },
  { label: 'Tipos de Caja', href: '/box-types', icon: CubeIcon },
  { label: 'Trabajadores', href: '/workers', icon: UsersIcon },
  { label: 'Bonos', href: '/bonuses', icon: BanknotesIcon, roles: ['ADMIN'] as string[] },
  { label: 'Configuracion', href: '/settings', icon: Cog6ToothIcon, roles: ['ADMIN'] },
];

function SidebarContent({ onNavigate }: { onNavigate: (to: string) => void }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const visibleItems = sidebarItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role?.codigo ?? ''))
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-200">
        <TruckIcon className="h-7 w-7 text-primary-500" />
        <span className="text-lg font-bold text-gray-900">PiwiLogistic</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = isActive && item.icon === HomeIcon ? HomeIconSolid : item.icon;
            return (
              <li key={item.href}>
                <button
                  onClick={() => onNavigate(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (to: string) => {
    navigate(to);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:w-60 md:flex-col bg-white border-r border-gray-200">
        <SidebarContent onNavigate={handleNav} />
      </aside>

      {/* Mobile menu dialog */}
      <Transition show={mobileMenuOpen} as={Fragment}>
        <Dialog onClose={() => setMobileMenuOpen(false)} className="relative z-50 md:hidden">
          <TransitionChild
            enter="transition-opacity ease-linear duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-900/80" />
          </TransitionChild>

          <div className="fixed inset-0 flex">
            <TransitionChild
              enter="transition ease-in-out duration-200 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-200 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <DialogPanel className="relative mr-16 w-60 bg-white">
                <SidebarContent onNavigate={handleNav} />
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      {/* Main content area */}
      <div className="md:pl-60">
        {/* Top header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3 md:hidden">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="text-gray-600 hover:text-gray-900"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <TruckIcon className="h-6 w-6 text-primary-500" />
            </div>
            <div className="hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                <p className="text-xs text-gray-500">{user?.role?.nombre}</p>
              </div>
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="hidden md:flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 pb-20 md:pb-4">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <BottomNav />
    </div>
  );
}