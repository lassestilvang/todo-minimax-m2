'use client'

import { useState, useCallback, useRef } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { TaskList } from '../tasks/TaskList'
import { SearchComponent } from '../search/SearchComponent'
import { useApp } from '@/store/hooks'
import { useViewTransition } from '@/hooks/use-view-transition'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface MainLayoutProps {
  children?: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useApp()
  const [showSearch, setShowSearch] = useState(false)
  const [currentView, setCurrentView] = useState('today')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  
  const { 
    supportsViewTransition, 
    withViewTransition, 
    getTransitionNames, 
    applyTransitionStyles,
    cleanupTransitionStyles 
  } = useViewTransition()

  const handleViewChange = useCallback((newView: string) => {
    if (isTransitioning || newView === currentView) return
    
    setIsTransitioning(true)
    
    const performViewChange = () => {
      const element = contentRef.current
      if (element) {
        const transitionNames = getTransitionNames(newView)
        
        if (supportsViewTransition) {
          // Apply View Transition API styles
          applyTransitionStyles(element, transitionNames.new, 'new')
          
          // Clean up after transition
          setTimeout(() => {
            if (element) {
              cleanupTransitionStyles(element)
            }
            setIsTransitioning(false)
          }, 300)
        } else {
          // Fallback for unsupported browsers
          element.classList.add(`view-${newView}-transition`)
          setTimeout(() => {
            if (element) {
              element.classList.remove(`view-${newView}-transition`)
            }
            setIsTransitioning(false)
          }, 300)
        }
      }
      
      setCurrentView(newView)
    }
    
    if (supportsViewTransition) {
      // Use View Transition API
      withViewTransition(performViewChange)
    } else {
      // Fallback without View Transition API
      performViewChange()
    }
  }, [currentView, isTransitioning, supportsViewTransition, withViewTransition, getTransitionNames, applyTransitionStyles, cleanupTransitionStyles])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar}
        currentView={currentView}
        onViewChange={handleViewChange}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onSearch={() => setShowSearch(true)}
          onNewTask={() => {}}
        />
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-4 py-6">
            {showSearch ? (
              <div 
                className="space-y-6 view-content search-transition" 
                ref={contentRef}
              >
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">Search</h1>
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowSearch(false)}
                    className="view-modal-transition"
                  >
                    Close Search
                  </Button>
                </div>
                <SearchComponent onClose={() => setShowSearch(false)} />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6 view-header">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-bold capitalize">
                      {currentView === 'today' ? 'Today' : 
                       currentView === 'next7' ? 'Next 7 Days' :
                       currentView === 'upcoming' ? 'Upcoming' : 'All Tasks'}
                    </h1>
                  </div>
                  <Button className="view-modal-transition">
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </div>
                
                <div 
                  className={`view-content content-${currentView} view-${currentView}-transition ${
                    isTransitioning ? 'opacity-75' : 'opacity-100'
                  }`}
                  ref={contentRef}
                >
                  <TaskList view={currentView} />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}