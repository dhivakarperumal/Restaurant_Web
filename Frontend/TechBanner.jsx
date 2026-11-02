
import React from "react";

const banners = [
  {
    id: 1,
    title: "Gaming Zone",
    subtitle: "Upgrade Your Play",
    offer: "Up to 40% OFF",
    button: "Shop Gaming",
    image:
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500&auto=format&fit=crop",
    theme: "gaming",
  },
  {
    id: 2,
    title: "Work & Study",
    subtitle: "Laptops for Every Need",
    offer: "From ₹34,999",
    button: "Explore Laptops",
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop",
    theme: "laptop",
  },
  {
    id: 3,
    title: "Audio & Sound",
    subtitle: "Feel the Real Sound",
    offer: "Up to 40% OFF",
    button: "Shop Audio",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop",
    theme: "audio",
  },
];

const TechBanner = () => {
  return (
    <section className="w-full py-5">
      <div className="mx-auto grid max-w-[1450px] grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3">

        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`group relative flex h-[125px] overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:h-[135px] ${
              banner.theme === "gaming"
                ? "bg-gradient-to-r from-[#19005c] via-[#3900a0] to-[#170044]"
                : banner.theme === "laptop"
                ? "bg-gradient-to-r from-[#ffe5f8] via-[#f9cafa] to-[#e9d9ff]"
                : "bg-gradient-to-r from-[#170052] via-[#3600a0] to-[#a500a8]"
            }`}
          >
            {/* Text Content */}
            <div className="relative z-10 flex w-[58%] flex-col justify-center pl-5 sm:pl-6">
              <h3
                className={`text-base font-extrabold tracking-tight ${
                  banner.theme === "laptop"
                    ? "text-[#211052]"
                    : "text-white"
                }`}
              >
                {banner.title}
                {banner.theme === "gaming" && " 🎮"}
              </h3>

              <p
                className={`mt-0.5 text-xs font-medium ${
                  banner.theme === "laptop"
                    ? "text-[#40315d]"
                    : "text-white/80"
                }`}
              >
                {banner.subtitle}
              </p>

              <p
                className={`mt-1 text-sm font-black ${
                  banner.theme === "laptop"
                    ? "text-[#9b176c]"
                    : "text-[#ffed29]"
                }`}
              >
                {banner.offer}
              </p>

              <button
                className={`mt-2 flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition-all duration-300 group-hover:gap-2 ${
                  banner.theme === "laptop"
                    ? "bg-white text-[#4c2475] hover:bg-[#211052] hover:text-white"
                    : "bg-white text-[#25005e] hover:bg-[#ffdc36]"
                }`}
              >
                {banner.button}
                <span>→</span>
              </button>
            </div>

            {/* Product Image */}
            <div className="absolute right-0 top-0 flex h-full w-[46%] items-center justify-center">
              <img
                src={banner.image}
                alt={banner.title}
                className="h-[90%] w-full object-contain p-2 transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            {/* Decorative Glow */}
            <div
              className={`pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full blur-3xl ${
                banner.theme === "laptop"
                  ? "bg-white/70"
                  : "bg-purple-400/30"
              }`}
            />
          </div>
        ))}

      </div>
    </section>
  );
};

export default TechBanner;
