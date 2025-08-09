import Image from "next/image";
import { useRouter } from "next/navigation";

interface ProfileModalProps {
  isOpen: boolean;
  user: {
    id: string;
    email: string;
    avatar_url?: string;
  } | null;
  onLogin: () => void;    
  onLogout: () => void;
  setIsProfileModalOpen: (isOpen: boolean) => void;
}

export default function ProfileModal({ 
  isOpen, 
  setIsProfileModalOpen,
  user, 
  onLogin, 
  onLogout 
}: ProfileModalProps) {
  const router = useRouter();
  
  const handleProfileClick = () => {
    router.push("/super-admin");
    setIsProfileModalOpen(false);
  };

  if (!isOpen) return null;
  
  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-60 overflow-hidden">
      {user ? (
        <>
          {/* User Profile Section */}
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-white shadow-md">
                  {user?.avatar_url?.trim() ? (
                    <Image
                      src={user.avatar_url}
                      alt={"Profile"}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : user?.email ? (
                    <div className="w-full h-full bg-[#042954] text-white flex items-center justify-center font-semibold text-2xl uppercase">
                      {user.email.charAt(0)}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              
              <div className="text-center space-y-1">
              
                <p className="text-xs text-gray-600 truncate max-w-full px-2">
                  {user.email}
                </p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#042954]/10 text-[#042954]">
                  Super Admin
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile Button */}
            <button 
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150 flex items-center space-x-3 group"
              onClick={handleProfileClick}
            >
              <div className="w-8 h-8 rounded-full bg-[#042954]/10 flex items-center justify-center group-hover:bg-[#042954]/20 transition-colors">
                <svg className="w-4 h-4 text-[#042954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Profile</p>
                <p className="text-xs text-gray-500">View and edit profile</p>
              </div>
             
            </button>

           

            {/* Divider */}
            <div className="border-t border-gray-100 my-2"></div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors duration-150 flex items-center space-x-3 group"
            >
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">Logout</p>
                <p className="text-xs text-red-500">Sign out of your account</p>
              </div>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Not Logged In */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-medium text-gray-900">Not signed in</h3>
                <p className="text-xs text-gray-500 mt-1">Please sign in to access your account</p>
              </div>
            </div>
          </div>

          {/* Login Button */}
          <div className="p-4">
            <button
              onClick={onLogin}
              className="w-full bg-[#042954] hover:brightness-110 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Sign In</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}