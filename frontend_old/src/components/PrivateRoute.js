import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

function PrivateRoute({ requiredRole = 'user' }) {
  const { user, token } = useSelector(state => state.auth);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
