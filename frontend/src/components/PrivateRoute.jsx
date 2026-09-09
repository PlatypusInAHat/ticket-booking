import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * @param {{ requiredRole?: string, requiredRoles?: string[] }} props
 */
function PrivateRoute({ requiredRole = 'user', requiredRoles }) {
  const { user, token } = useSelector(state => state.auth);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const allowedRoles = requiredRoles || (requiredRole === 'user' ? null : [requiredRole]);
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
