import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../PrivateRouter/AuthContext";
import { getRoleHome } from "../../PrivateRouter/roleUtils";
import api from "../../api";
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Award, Headset, User, Phone, UserPlus, Utensils } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validate = () => {
    let newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) newErrors.email = "Enter a valid email address";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      const { data } = await api.post("/users/register", {
        username: formData.firstName.trim(),
        firstName: formData.firstName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        mobile_number: formData.phone.trim(),
        password: formData.password,
      });

      const user = data?.user || data?.data;
      if (!data?.token || !user) {
        setServerError("The server returned an incomplete registration response.");
        return;
      }
      login(user, data.token);
      setSubmitted(true);
      navigate(getRoleHome(user.role), { replace: true });
    } catch (error) {
      setServerError(error.response?.data?.message || error.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-full flex font-sans overflow-hidden bg-[#f4f5f7]">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col w-1/2 relative z-10 h-full bg-white">
        {/* Top Image Section */}
        <div 
          className="flex-1 relative p-12 flex flex-col justify-center"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(7,28,24,0.82) 0%, rgba(7,28,24,0.64) 58%, rgba(7,28,24,0.42) 100%), url('images/registre.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute top-10 left-12">
            {/* Top Logo */}
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 border border-gold flex items-center justify-center relative flex-shrink-0">
                  <Utensils size={25} className="text-gold" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                  <span className="text-brand-text text-2xl font-serif tracking-[0.15em] uppercase">Buy Foods</span>
                 <div className="flex items-center gap-3 opacity-70 mt-1">
                    <div className="h-px bg-gold w-6"></div>
                    <span className="text-gold text-[9px] tracking-[0.2em] uppercase whitespace-nowrap font-medium">Fresh food, warm welcome</span>
                    <div className="h-px bg-gold w-6"></div>
                 </div>
              </div>
            </div>
          </div>

          {/* Center Content */}
          <div className="flex flex-col gap-2 max-w-md mt-16">
              <h2 className="text-5xl font-serif font-bold text-brand-text mb-1 tracking-tight">
              Join Buy Foods
            </h2>
            <h2 className="text-5xl font-serif font-bold text-gold mb-6 tracking-tight">
              Restaurant
            </h2>
            
            <div className="flex items-center gap-4 mb-5 opacity-40">
               <div className="h-[1.5px] bg-gold w-12"></div>
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FEB914" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
               <div className="h-[1.5px] bg-gold w-12"></div>
            </div>

            <p className="text-brand-text text-[17px] font-medium leading-relaxed tracking-wide">
              Create your account and get ready<br/>to enjoy fresh, flavorful food.
            </p>
          </div>
        </div>

        {/* Bottom Dark Section */}
        <div className="bg-[#1f3b31] px-10 py-8 grid grid-cols-3 gap-4 flex-shrink-0">
          <div className="flex flex-col items-center text-center gap-2 border-r border-[#d9b882]/20 pr-2">
            <div className="text-[#d9b882] mb-1">
              <ShieldCheck size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[#d9b882] font-medium mb-1 text-[13px]">Safe &amp; Simple</h3>
              <p className="text-[#a1b4ab] text-[11px] px-2 leading-tight">Your account details stay protected.</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center gap-2 border-r border-[#d9b882]/20 px-1">
            <div className="text-[#d9b882] mb-1">
              <Award size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[#d9b882] font-medium mb-1 text-[13px]">Fresh Ingredients</h3>
              <p className="text-[#a1b4ab] text-[11px] px-2 leading-tight">Flavorful dishes made with care.</p>
            </div>
          </div>
          <div className="flex flex-col items-center text-center gap-2 pl-2">
            <div className="text-[#d9b882] mb-1">
              <Headset size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[#d9b882] font-medium mb-1 text-[13px]">Here to Help</h3>
              <p className="text-[#a1b4ab] text-[11px] px-2 leading-tight">We are here to make every visit easy.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 h-full flex flex-col items-center justify-center p-4 lg:p-8 relative overflow-hidden">
        <div className="w-full max-w-[600px] bg-white p-8 md:p-10 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative z-20 flex flex-col overflow-hidden">
          
          {/* Floral decorations Top Right */}
          <svg className="absolute top-0 right-0 text-[#d9b882] w-28 h-28 opacity-40 rounded-tr-[1.5rem] pointer-events-none" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M70 0 Q60 30 80 50 T100 30" stroke="currentColor" strokeWidth="1" fill="none"/>
             <path d="M90 0 Q80 40 100 60" stroke="currentColor" strokeWidth="1" fill="none"/>
             <path d="M50 0 Q40 20 60 40 T90 20" stroke="currentColor" strokeWidth="0.75" fill="none"/>
             <path d="M85 10 Q75 15 80 25 T95 15" stroke="currentColor" strokeWidth="0.5" fill="none"/>
             <circle cx="80" cy="20" r="1.5" fill="currentColor"/>
             <circle cx="95" cy="40" r="1" fill="currentColor"/>
          </svg>

          <div className="flex flex-col items-center mb-5 relative z-10 mt-1">
            <div className="w-14 h-14 rounded-full bg-[#1f3b31] flex items-center justify-center mb-3 shadow-md">
              <Utensils size={25} className="text-[#d9b882]" strokeWidth={1.5} />
            </div>
            <h2 className="text-[24px] font-serif font-bold text-[#1a3029] mb-1 tracking-tight">Create Your Buy Foods Account</h2>
            <p className="text-gray-500 text-[12px] mb-2">Join us for fresh food and easy ordering</p>
            
            <div className="flex items-center gap-2 opacity-30">
               <div className="h-[1px] bg-[#1a3029] w-10"></div>
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a3029" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
               <div className="h-[1px] bg-[#1a3029] w-10"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 relative z-10">
            {/* Name */}
            <div>
              <label className="block text-[13px] font-medium text-gray-800 mb-1.5">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <User size={16} strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={`w-full bg-white text-gray-800 text-sm border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:border-[#1a3029] focus:ring-1 focus:ring-[#1a3029] transition-all`}
                />
              </div>
              {errors.firstName && <p className="text-red-500 text-[10px] mt-1">{errors.firstName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[13px] font-medium text-gray-800 mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail size={16} strokeWidth={1.5} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  className={`w-full bg-white text-gray-800 text-sm border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:border-[#1a3029] focus:ring-1 focus:ring-[#1a3029] transition-all`}
                />
              </div>
              {errors.email && <p className="text-red-500 text-[10px] mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[13px] font-medium text-gray-800 mb-1.5">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Phone size={16} strokeWidth={1.5} />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  className={`w-full bg-white text-gray-800 text-sm border ${errors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:border-[#1a3029] focus:ring-1 focus:ring-[#1a3029] transition-all`}
                />
              </div>
              {errors.phone && <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>}
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-gray-800 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    className={`w-full bg-white text-gray-800 text-sm border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-lg py-3 pl-11 pr-10 focus:outline-none focus:border-[#1a3029] focus:ring-1 focus:ring-[#1a3029] transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-[10px] mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-800 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} strokeWidth={1.5} />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    className={`w-full bg-white text-gray-800 text-sm border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-lg py-3 pl-11 pr-10 focus:outline-none focus:border-[#1a3029] focus:ring-1 focus:ring-[#1a3029] transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-[10px] mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1f3b31] hover:bg-[#162a23] text-white text-[15px] font-medium py-3 rounded-lg flex items-center justify-center gap-2.5 transition-colors shadow-md disabled:opacity-70 mt-2"
            >
              <UserPlus size={17} strokeWidth={2} />
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>

            {serverError && <p className="text-red-500 text-[11px] text-center mt-1">{serverError}</p>}
            {submitted && <p className="text-green-500 text-[11px] text-center mt-1">✅ Registration successful!</p>}

            <p className="text-center text-[13px] text-gray-600 mt-2">
              Already have an account? <Link to="/login" className="text-[#b48353] hover:text-[#9a6f44] font-semibold transition-colors">Login</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;