import React, { useState, useEffect } from "react";
import { ShoppingCart, Leaf, ShoppingBag } from "lucide-react";
import { FaAppleAlt, FaCarrot } from "react-icons/fa";
import { GiBroccoli, GiMilkCarton } from "react-icons/gi";

const Loader = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 25);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-screen bg-white text-gray-800 overflow-hidden font-sans">
      
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FaAppleAlt className="absolute top-1/4 left-1/4 text-green-200/50 text-4xl animate-bounce" style={{animationDuration: '3s'}} />
        <FaCarrot className="absolute top-1/3 right-1/4 text-orange-200/50 text-5xl animate-bounce" style={{animationDuration: '4s'}} />
        <ShoppingBag className="absolute bottom-1/3 left-1/3 text-green-200/50 w-10 h-10 animate-pulse" />
        <GiBroccoli className="absolute top-1/4 right-1/3 text-green-200/50 text-4xl animate-pulse" />
        <GiMilkCarton className="absolute bottom-1/4 right-1/4 text-blue-100/50 text-5xl animate-bounce" style={{animationDuration: '5s'}} />
      </div>

      <div className="relative z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        
        {/* Cart Icon & Veggies */}
        <div className="relative mb-4">
           <ShoppingCart className="w-24 h-24 text-[#359B2E] drop-shadow-lg" />
           <Leaf className="absolute -top-4 left-6 w-12 h-12 text-[#4DBF35] -rotate-12 fill-[#4DBF35]" />
           <div className="absolute top-2 left-8 flex gap-1">
             <div className="w-4 h-4 bg-red-500 rounded-full shadow-inner"></div>
             <div className="w-4 h-4 bg-orange-400 rounded-full shadow-inner"></div>
             <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-inner"></div>
           </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-5xl font-extrabold tracking-tight mb-2 flex">
          <span className="text-[#0E492B]">Green</span>
          <span className="text-[#55A536]">Mart</span>
        </h1>

        {/* Subtitle */}
        <div className="flex items-center gap-3 mb-3">
           <div className="h-px w-8 bg-gray-400"></div>
           <span className="text-gray-600 tracking-[0.3em] text-sm font-semibold">SUPERMARKET</span>
           <div className="h-px w-8 bg-gray-400"></div>
        </div>

        {/* Tagline */}
        <p className="text-gray-500 text-sm font-medium mb-3">
          Fresh Products. Best Prices. Happy You.
        </p>

        {/* Small Leaf Divider */}
        <Leaf className="w-4 h-4 text-[#55A536] mb-8 fill-[#55A536]" />

        {/* Loading Text */}
        <p className="text-gray-700 text-sm font-semibold mb-3">
          Loading amazing deals for you...
        </p>

        {/* Progress Bar Container */}
        <div className="flex items-center gap-4 w-full max-w-sm">
          <div className="h-3 w-64 bg-gray-200 rounded-full overflow-hidden border border-gray-100 shadow-inner flex-1">
            <div 
              className="h-full bg-gradient-to-r from-[#21752D] to-[#55A536] transition-all duration-300 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-[#21752D] font-bold text-sm min-w-[3ch]">{progress}%</span>
        </div>

      </div>

      {/* Bottom Waves */}
      <div className="absolute bottom-0 left-0 w-full leading-none z-0 opacity-80">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto">
          <path fill="#55A536" fillOpacity="0.4" d="M0,160L48,170.7C96,181,192,203,288,197.3C384,192,480,160,576,165.3C672,171,768,213,864,229.3C960,245,1056,235,1152,208C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          <path fill="#21752D" fillOpacity="0.8" d="M0,224L60,213.3C120,203,240,181,360,192C480,203,600,245,720,250.7C840,256,960,224,1080,202.7C1200,181,1320,171,1380,165.3L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
        </svg>
      </div>
      
    </div>
  );
};

export default Loader;