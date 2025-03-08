
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, TruckIcon, Car, Route, Package, BarChart3, Settings, LogOut } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const menuItems = [
    { icon: <Home className="w-5 h-5" />, label: 'Dashboard', path: '/dashboard' },
    { icon: <TruckIcon className="w-5 h-5" />, label: 'Transporters', path: '/transporters' },
    { icon: <Car className="w-5 h-5" />, label: 'Vehicles', path: '/vehicles' },
    { icon: <Route className="w-5 h-5" />, label: 'Routes', path: '/routes' },
    { icon: <Package className="w-5 h-5" />, label: 'Shipments', path: '/shipments' },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Reports', path: '/reports' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold">Coal Logistics</h1>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <a 
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 ${
                    window.location.pathname === item.path ? 'bg-primary/10 text-primary font-medium' : 'text-gray-700'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
            <li className="pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 w-full rounded-md"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white p-4 border-b border-gray-200 md:hidden">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Coal Logistics</h1>
            {/* Mobile menu button would go here */}
          </div>
        </header>
        <div className="p-2 md:p-4">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
