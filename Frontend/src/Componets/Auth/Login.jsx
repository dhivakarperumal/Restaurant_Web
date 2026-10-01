import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { getRoleHome } from "../../PrivateRouter/roleUtils";
import api from "../../api";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Award, Headset, Utensils } from "lucide-react";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "645152369108-a91u0hks1d90u4im40mvkrdpfg53kif9.apps.googleusercontent.com";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    let newErrors = {};
    if (!formData.username.trim()) newErrors.username = "Email Address is required";
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    setErrors({ ...errors, [name]: "" });
    setServerError("");
  };

  const handleGoogleCredential = async (response) => {
    if (!response?.credential) {
      setServerError("Google authentication returned no credential.");
      return;
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      const { data } = await api.post("/users/google-login", {
        credential: response.credential,
      });

      const user = data?.user || data?.data;
      if (data?.token && user) {
        login(user, data.token);
        navigate(getRoleHome(user.role), { replace: true });
      } else {
        setServerError("Google login failed. Please try again.");
      }
    } catch (error) {
      setServerError(error.response?.data?.message || error.message || "Google login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const existingScript = document.getElementById("google-gsi-script");

    const initializeGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });

        const googleButton = document.getElementById("google-login-button");
        if (googleButton && !googleButton.dataset.rendered) {
          window.google.accounts.id.renderButton(googleButton, {
            theme: "outline",
            size: "large",
            type: "standard",
            text: "signin_with",
            shape: "pill",
            logo_alignment: "left",
            width: googleButton.offsetWidth || 420,
          });
          googleButton.dataset.rendered = "true";
        }
      }
    };

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle);
      if (window.google?.accounts?.id) initializeGoogle();
      return () => existingScript.removeEventListener("load", initializeGoogle);
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setServerError("");
    try {
      const { data } = await api.post("/users/login", {
        identifier: formData.username.trim(),
        email: formData.username.trim(),
        password: formData.password,
        rememberMe: formData.rememberMe,
      });

      const user = data?.user || data?.data;
      if (!data?.token || !user) {
        setServerError("The server returned an incomplete login response.");
        return;
      }
      login(user, data.token, formData.rememberMe);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (error) {
      setServerError(error.response?.data?.message || error.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full flex font-sans overflow-hidden bg-[#f4f5f7]">
      {/* Left Panel */}
      <div 
        className="hidden lg:flex flex-col justify-between w-1/2 relative z-10 bg-black text-white px-14 py-12 h-full"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(7,28,24,0.82) 0%, rgba(7,28,24,0.64) 58%, rgba(7,28,24,0.42) 100%), url('images/login.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Top Logo */}
        <div className="flex items-center gap-4 mt-2">
          <div className="w-12 h-12 border border-[#d9b882] flex items-center justify-center relative flex-shrink-0">
             <Utensils size={25} className="text-[#d9b882]" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
             <span className="text-[#d9b882] text-2xl font-serif tracking-[0.15em] uppercase">Foodie</span>
             <div className="flex items-center gap-3 opacity-80 mt-1">
                <div className="h-px bg-[#d9b882] w-8"></div>
                <span className="text-[#d9b882] text-[10px] tracking-[0.25em] uppercase whitespace-nowrap">Fresh food, warm welcome</span>
                <div className="h-px bg-[#d9b882] w-8"></div>
             </div>
          </div>
        </div>

        {/* Center Content */}
        <div className="flex flex-col gap-3 max-w-lg mt-24 flex-1">
          <h2 className="text-5xl md:text-6xl font-serif font-bold text-white mb-2 tracking-wide">
            Welcome Back to Foodie!
          </h2>
          <p className="text-white text-2xl md:text-3xl font-serif mb-2">
            Sign in and find your next favorite
          </p>
          <p className="text-[#d9b882] text-3xl mt-2 italic font-light tracking-wide" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Pacifico', cursive" }}>
            Good food. Great company. Every time.
          </p>
        </div>

        {/* Bottom Features */}
        <div className="grid grid-cols-3 gap-6 pb-4 pt-10 border-t border-[#d9b882]/20 mt-16">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="text-[#d9b882]">
              <ShieldCheck size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[#d9b882] font-medium mb-1 text-sm">Secure Account</h3>
              <p className="text-gray-300 text-xs px-2">Your account is safe with us</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="text-[#d9b882]">
              <Award size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[#d9b882] font-medium mb-1 text-sm">Fresh Ingredients</h3>
              <p className="text-gray-300 text-xs px-2">Freshly prepared favorites, made with care</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center gap-3">
            <div className="text-[#d9b882]">
              <Headset size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[#d9b882] font-medium mb-1 text-sm">Here to Help</h3>
              <p className="text-gray-300 text-xs px-2">We're ready to make your visit special</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-4 lg:p-6 relative overflow-hidden">
        <div className="w-full max-w-[600px] bg-white p-7 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-20 flex flex-col overflow-hidden">

          {/* Floral decorations Top Right */}
          <svg className="absolute top-0 right-0 text-[#d9b882] w-28 h-28 opacity-30 rounded-tr-[2rem] pointer-events-none" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M70 0 Q60 30 80 50 T100 30" stroke="currentColor" strokeWidth="1" fill="none"/>
             <path d="M90 0 Q80 40 100 60" stroke="currentColor" strokeWidth="1" fill="none"/>
             <path d="M50 0 Q40 20 60 40 T90 20" stroke="currentColor" strokeWidth="0.75" fill="none"/>
             <path d="M85 10 Q75 15 80 25 T95 15" stroke="currentColor" strokeWidth="0.5" fill="none"/>
             <circle cx="80" cy="20" r="1.5" fill="currentColor"/>
             <circle cx="95" cy="40" r="1" fill="currentColor"/>
          </svg>

          {/* Floral decorations Bottom Left */}
          <svg className="absolute bottom-0 left-0 text-[#d9b882] w-20 h-20 opacity-30 rounded-bl-[2rem] pointer-events-none" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M0 100 Q30 90 50 70 T100 100" stroke="currentColor" strokeWidth="1" fill="none"/>
             <path d="M0 80 Q40 70 60 90" stroke="currentColor" strokeWidth="1" fill="none"/>
             <path d="M0 60 Q20 50 40 70 T70 90" stroke="currentColor" strokeWidth="0.75" fill="none"/>
             <circle cx="20" cy="80" r="1.5" fill="currentColor"/>
             <circle cx="40" cy="95" r="1" fill="currentColor"/>
          </svg>

          <div className="flex flex-col items-center mb-5 relative z-10">
            <div className="w-14 h-14 rounded-full bg-[#1f3b31] flex items-center justify-center mb-3 shadow-lg">
              <Utensils size={27} className="text-[#d9b882]" strokeWidth={1.6} />
            </div>
            <h2 className="text-[26px] font-serif font-bold text-[#1a3029] mb-1 tracking-tight">Welcome to Foodie</h2>
            <p className="text-gray-500 text-[13px]">Sign in to explore the menu and manage your orders</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 relative z-10">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail size={17} strokeWidth={1.5} />
                </div>
                <input
                  type="email"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  autoComplete="username"
                  className={`w-full bg-white text-gray-800 text-sm border ${errors.username ? 'border-red-500' : 'border-gray-300'} rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:border-[#1a3029] focus:ring-1 focus:ring-[#1a3029] transition-all`}
                />
              </div>
              {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Lock size={17} strokeWidth={1.5} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className={`w-full bg-white text-gray-800 text-sm border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg py-3 pl-11 pr-11 focus:outline-none focus:border-[#1a3029] focus:ring-1 focus:ring-[#1a3029] transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} strokeWidth={1.5} /> : <Eye size={17} strokeWidth={1.5} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="appearance-none w-4 h-4 rounded border border-gray-300 bg-white checked:bg-[#1a3029] checked:border-[#1a3029] cursor-pointer transition-colors"
                  />
                  {formData.rememberMe && (
                    <svg className="w-2.5 h-2.5 text-white absolute pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-[13px] text-gray-700 font-medium">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-[13px] text-[#b48353] hover:text-[#9a6f44] font-medium transition-colors">
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1f3b31] hover:bg-[#162a23] text-white text-[15px] font-medium py-3 rounded-lg flex items-center justify-center gap-2.5 transition-colors shadow-md disabled:opacity-70"
            >
              <Lock size={16} strokeWidth={2} />
              {isSubmitting ? "Logging in..." : "Login"}
            </button>

            {serverError && <p className="text-red-500 text-sm text-center -mt-1">{serverError}</p>}
            {/* Divider */}
            <div className="relative flex items-center">
               <div className="flex-grow border-t border-gray-200"></div>
               <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium">OR</span>
               <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Google Login */}
            <div
              id="google-login-button"
              className="w-full overflow-hidden rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-[14px] font-semibold py-2 transition-colors  flex items-center justify-center"
            ></div>

            <p className="text-center text-[14px] text-gray-500">
              Don't have an account? <Link to="/register" className="text-[#b48353] hover:text-[#9a6f44] font-semibold transition-colors">Sign Up</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

