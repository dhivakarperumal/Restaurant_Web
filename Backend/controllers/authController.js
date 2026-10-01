const {
  createSession,
  createUser,
  findUserByIdentifier,
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

module.exports = { googleLogin, login, register };