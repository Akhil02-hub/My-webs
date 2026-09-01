import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  ['/', 'Home'],
  ['/rooms', 'Rooms'],
  ['/gallery', 'Gallery'],
  ['/about', 'About'],
  ['/contact', 'Contact']
];

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const handleLogout = async () => {
    await logout();
    close();
    navigate('/');
  };

  const navClass = ({ isActive }) => `block py-2 ${isActive ? 'text-gold' : 'hover:text-gold'}`;

  return (
    <header className="bg-charcoal text-white sticky top-0 z-40 shadow">
      <nav className="container-page">
        <div className="flex items-center justify-between min-h-16">
          <Link to="/" onClick={close} className="text-2xl font-serif font-bold">Athidhi Grand</Link>
          <button type="button" aria-label="Toggle menu" onClick={() => setOpen(v => !v)} className="md:hidden text-2xl px-2">☰</button>
          <div className={`${open ? 'block' : 'hidden'} md:flex items-center gap-5 absolute md:static left-0 right-0 top-16 bg-charcoal md:bg-transparent px-4 md:px-0 pb-4 md:pb-0`}> 
            {links.map(([to, label]) => <NavLink key={to} to={to} onClick={close} className={navClass}>{label}</NavLink>)}
            {isAuthenticated ? (
              <>
                <NavLink to="/admin" onClick={close} className={navClass}>Dashboard</NavLink>
                <button type="button" onClick={handleLogout} className="block py-2 hover:text-gold">Logout</button>
              </>
            ) : (
              <NavLink to="/admin/login" onClick={close} className={navClass}>Admin</NavLink>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
