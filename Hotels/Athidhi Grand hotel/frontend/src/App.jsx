import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Home from './pages/Home';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import BookingForm from './pages/BookingForm';
import BookingSuccess from './pages/BookingSuccess';
import Gallery from './pages/Gallery';
import About from './pages/About';
import Contact from './pages/Contact';
import AdminLogin from './pages/Admin/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import RoomManager from './pages/Admin/RoomManager';
import GalleryManager from './pages/Admin/GalleryManager';
import BookingManager from './pages/Admin/BookingManager';
import SiteManager from './pages/Admin/SiteManager';

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/rooms/:id" element={<RoomDetail />} />
                <Route path="/book" element={<BookingForm />} />
                <Route path="/booking-success" element={<BookingSuccess />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/rooms" element={<ProtectedRoute><RoomManager /></ProtectedRoute>} />
                <Route path="/admin/gallery" element={<ProtectedRoute><GalleryManager /></ProtectedRoute>} />
                <Route path="/admin/bookings" element={<ProtectedRoute><BookingManager /></ProtectedRoute>} />
                <Route path="/admin/site" element={<ProtectedRoute><SiteManager /></ProtectedRoute>} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </HelmetProvider>
  );
}
