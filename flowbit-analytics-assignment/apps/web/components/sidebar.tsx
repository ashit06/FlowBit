'use client'

import { BarChart3, MessageSquare, FileText, Users, Settings, Menu } from 'lucide-react'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
    },
    {
      id: 'invoice',
      label: 'Invoice',
      icon: FileText,
    },
    {
      id: 'other-files',
      label: 'Other files',
      icon: FileText,
    },
    {
      id: 'departments',
      label: 'Departments',
      icon: Users,
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ]

  const bottomItems = [
    {
      id: 'chat',
      label: 'Chat with Data',
      icon: MessageSquare,
    },
  ]

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div>
            <div className="font-semibold text-gray-900">Buchhalung</div>
            <div className="text-xs text-gray-500">12 members</div>
          </div>
        </div>
        <button className="p-1 hover:bg-gray-100 rounded">
          <Menu className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* General Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            GENERAL
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                    activeTab === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Chat with Data Section */}
        <div className="p-4 border-t border-gray-200">
          {bottomItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom Brand */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="text-sm font-medium text-gray-700">Flowbit AI</span>
        </div>
      </div>
    </div>
  )
}