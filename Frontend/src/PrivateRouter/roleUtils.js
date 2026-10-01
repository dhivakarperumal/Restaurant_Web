const normalizeRole = (role) => String(role || '').trim().toLowerCase();

export const isAdminRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'admin' || normalizedRole === 'super admin' || normalizedRole === 'superadmin';
};

export const getRoleHome = (role) => {
  const normalizedRole = normalizeRole(role);

  if (isAdminRole(normalizedRole)) return '/admin';
  if (normalizedRole === 'employee') return '/employee';
  if (normalizedRole === 'trainee') return '/trainee';
  return '/';
};