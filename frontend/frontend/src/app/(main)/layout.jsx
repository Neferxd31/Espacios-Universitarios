import RouteGuard from '@/components/RouteGuard'
import Header from '@/components/Header'

export default function MainLayout({ children }) {
  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />
        {children}
      </div>
    </RouteGuard>
  )
}
