import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/useTheme";
import COBuddyIcon from "@assets/icon_1752387185212.png";
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  Database, 
  BarChart3, 
  Bot, 
  Settings,
  Moon,
  Sun,
  LogOut,
  X,
  Building,
  Building2,
  ClipboardList
} from "lucide-react";

interface SidebarProps {
  onClose?: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: Building },
  { name: 'Documents', href: '/documents', icon: FileText },
  { name: 'Upload & Process', href: '/upload', icon: Upload },
  { name: 'Change Orders', href: '/change-orders', icon: FileText },
  { name: 'CO Log', href: '/co-log', icon: ClipboardList },
  { name: 'Rate Tables', href: '/rate-tables', icon: Database },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Company', href: '/company', icon: Building2 },
  { name: 'AI Assistant', href: '/ai-assistant', icon: Bot },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Close button for mobile */}
      {onClose && (
        <div className="flex justify-end p-4 lg:hidden">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Logo Section */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <img 
            src={COBuddyIcon} 
            alt="CO Buddy AI" 
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">CO Buddy AI</h1>
            <p className="text-xs text-gray-500">Change Order Creator</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href} onClick={handleLinkClick}>
              <div className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'fieldflo-primary text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}>
                <Icon className="mr-3 h-4 w-4" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <Link href="/settings" onClick={handleLinkClick} className="flex items-center space-x-3 flex-1">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="fieldflo-primary text-white">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </Link>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="p-1 text-gray-400 hover:text-gray-600"
              onClick={() => window.location.href = '/api/logout'}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
