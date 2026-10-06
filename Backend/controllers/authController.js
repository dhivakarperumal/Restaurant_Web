const {
  changeUserPassword: changeUserPasswordRecord,
  createSession,
  createUser,
  deleteUser: deleteUserRecord,
  findUserByIdentifier,
  findUserProfile: findUserProfileRecord,
  listUsers: listUsersRecord,
  updateUser: updateUserRecord,
  updateUserProfile: updateUserProfileRecord,
  verifyPassword,
} = require('../modules/auth');

const isAdmin = (role) => ['admin', 'super admin', 'superadmin'].includes(String(role || '').trim().toLowerCase());
const googleClientId = process.env.GOOGLE_CLIENT_ID
  || process.env.VITE_GOOGLE_CLIENT_ID
  || '645152369108-a91u0hks1d90u4im40mvkrdpfg53kif9.apps.googleusercontent.com';
const supportedRoles = new Map([
  ['user', 'user'],
  ['admin', 'Admin'],
  ['super admin', 'Super Admin'],
  ['chef', 'Chef'],
  ['server', 'Server'],
  ['delivery', 'Delivery'],
]);

async function register(req, res) {
  const username = String(req.body.username || req.body.firstName || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const phone = String(req.body.phone || req.body.mobile_number || '').trim();
  const password = String(req.body.password || '');
  const requestedRole = String(req.body.role || 'user').trim();

  if (!username || username.length > 100) {
    return res.status(400).json({ success: false, message: 'A name of 1 to 100 characters is required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'A valid email address is required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  }
  if (phone.length > 32) {
    return res.status(400).json({ success: false, message: 'Phone number must be 32 characters or fewer' });
  }

  const normalizedRole = requestedRole.toLowerCase();
  if (normalizedRole !== 'user' && !isAdmin(req.auth?.role)) {
    return res.status(403).json({ success: false, message: 'Only an administrator can assign staff or admin roles' });
  }
  const role = supportedRoles.get(normalizedRole);
  if (!role) {
    return res.status(400).json({ success: false, message: 'Unsupported account role' });
  }

  try {
    const user = await createUser({ username, email, phone, password, role });
    const session = await createSession(user.id, req.body.rememberMe !== false);
    return res.status(201).json({ success: true, user, ...session });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }
    console.error('Registration failed:', error.message);
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
}

async function login(req, res) {
  const identifier = String(req.body.identifier || req.body.email || req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const userRecord = await findUserByIdentifier(identifier);
    const validPassword = await verifyPassword(password, userRecord?.password_hash);
    if (!userRecord || !validPassword || String(userRecord.status).toLowerCase() !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const session = await createSession(userRecord.id, req.body.rememberMe !== false);
    const { password_hash: _passwordHash, ...user } = userRecord;
    return res.json({ success: true, user, ...session });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
}

async function listUsers(_req, res) {
  try {
    return res.json({ success: true, data: await listUsersRecord() });
  } catch (error) {
    console.error('Failed to list users:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load users.' });
  }
}

async function updateUser(req, res) {
  const username = String(req.body.username || '').trim();
  const mobileNumber = String(req.body.mobile_number || '').trim();
  const role = supportedRoles.get(String(req.body.role || '').trim().toLowerCase());
  const statusValue = String(req.body.status || '').trim().toLowerCase();

  if (!/^\d+$/.test(req.params.userId) || !username || username.length > 100 || mobileNumber.length > 32 || !role || !['active', 'inactive'].includes(statusValue)) {
    return res.status(400).json({ success: false, message: 'Valid user details are required.' });
  }

  try {
    const user = await updateUserRecord(req.params.userId, {
      username,
      mobile_number: mobileNumber,
      role,
      status: statusValue === 'inactive' ? 'Inactive' : 'Active',
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, data: user });
  } catch (error) {
    console.error('Failed to update user:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update user.' });
  }
}

const isOwnProfile = (req) => [req.auth?.id, req.auth?.user_id]
  .some((identifier) => identifier !== undefined && String(identifier) === String(req.params.profileId));

async function getProfile(req, res) {
  if (!isOwnProfile(req)) return res.status(403).json({ success: false, message: 'You can only view your own profile.' });
  try {
    const profile = await findUserProfileRecord(req.params.profileId);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Failed to load profile:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load profile.' });
  }
}

async function updateProfile(req, res) {
  if (!isOwnProfile(req)) return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
  const username = String(req.body.username || '').trim();
  const mobileNumber = String(req.body.mobile_number || '').trim();
  if (!username || username.length > 100 || mobileNumber.length > 32) {
    return res.status(400).json({ success: false, message: 'Enter a name and a phone number of at most 32 characters.' });
  }
  try {
    const profile = await updateUserProfileRecord(req.params.profileId, { username, mobile_number: mobileNumber });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found.' });
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Failed to update profile:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update profile.' });
  }
}

async function changePassword(req, res) {
  const currentPassword = String(req.body.currentPassword || '');
  const newPassword = String(req.body.newPassword || '');
  if (!currentPassword || newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ success: false, message: 'Enter your current password and a new password of 8 to 128 characters.' });
  }

  try {
    const updated = await changeUserPasswordRecord(req.auth.user_id, currentPassword, newPassword);
    if (!updated) {
      return res.status(400).json({ success: false, message: 'Your current password is incorrect.' });
    }
    return res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Failed to change customer password:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to change password.' });
  }
}

async function removeUser(req, res) {
  if (!/^\d+$/.test(req.params.userId)) {
    return res.status(400).json({ success: false, message: 'A valid user ID is required.' });
  }
  if (String(req.auth.id) === req.params.userId) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  }

  try {
    const deleted = await deleteUserRecord(req.params.userId);
    if (!deleted) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, message: 'User deleted.' });
  } catch (error) {
    console.error('Failed to delete user:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to delete user.' });
  }
}

async function googleLogin(req, res) {
  const credential = String(req.body.credential || '').trim();
  if (!credential) {
    return res.status(400).json({ success: false, message: 'Google credential is required' });
  }

  try {
    const verification = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!verification.ok) {
      return res.status(401).json({ success: false, message: 'Google credential is invalid or expired' });
    }

    const profile = await verification.json();
    if (profile.aud !== googleClientId || profile.email_verified !== 'true' || !profile.email) {
      return res.status(401).json({ success: false, message: 'Google account could not be verified' });
    }

    const email = String(profile.email).trim().toLowerCase();
    let userRecord = await findUserByIdentifier(email);
    if (!userRecord) {
      userRecord = await createUser({
        username: String(profile.name || email.split('@')[0]).slice(0, 100),
        email,
        phone: '',
        password: '',
        role: 'user',
      });
    }

    if (String(userRecord.status).toLowerCase() !== 'active') {
      return res.status(403).json({ success: false, message: 'This account is inactive' });
    }

    const session = await createSession(userRecord.id);
    const { password_hash: _passwordHash, ...user } = userRecord;
    return res.json({ success: true, user, ...session });
  } catch (error) {
    console.error('Google login failed:', error.message);
    return res.status(500).json({ success: false, message: 'Google login failed. Please try again.' });
  }
}

module.exports = {
  changePassword,
  getProfile,
  googleLogin,
  listUsers,
  login,
  register,
  removeUser,
  updateProfile,
  updateUser,
};