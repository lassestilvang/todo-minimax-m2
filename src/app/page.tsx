import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Daily Task Planner</h1>
        <p className="text-lg text-muted-foreground">
          Organize your tasks efficiently and boost your productivity
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Start managing your tasks today with our powerful dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create, organize, and track your daily tasks with an intuitive interface designed for productivity.
            </p>
            <Link href="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>
              Everything you need to stay organized
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Create and manage tasks</li>
              <li>• Organize tasks by lists</li>
              <li>• Set priorities and due dates</li>
              <li>• Track your progress</li>
              <li>• Beautiful, responsive design</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}