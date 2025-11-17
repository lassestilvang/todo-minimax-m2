'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TaskList } from '../tasks/TaskList'
import { SearchComponent } from '../search/SearchComponent'
import { useApp } from '@/store/hooks'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface MainLayoutProps {
  children?: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useApp()
  const [showSearch, setShowSearch] = useState(false)
  const [currentView, setCurrentView] = useState('today')

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onSearch={() => setShowSearch(true)}
          onNewTask={() => {}}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            {showSearch ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">Search</h1>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowSearch(false)}
                  >
                    Close Search
                  </Button>
                </div>
                <SearchComponent onClose={() => setShowSearch(false)} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-bold capitalize">
                      {currentView === 'today' ? 'Today' : 
                       currentView === '7days' ? 'Next 7 Days' :
                       currentView === 'upcoming' ? 'Upcoming' : 'All Tasks'}
                    </h1>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </div>
                
                <TaskList view={currentView} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}