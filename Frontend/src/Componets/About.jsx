import { Link } from "react-router-dom";
import {
  Leaf,
  Heart,
  ShieldCheck,
  Users,
  Search,
  ShoppingCart,
  ChefHat,
  Truck,
  MapPin,
  ArrowRight,
  Star,
  BadgeCheck,
} from "lucide-react";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";

/* ─── Data ─────────────────────────────────────────── */

const stats = [
  { icon: Users, value: "500+", label: "Happy Customers" },
  { icon: ChefHat, value: "100+", label: "Home Chefs" },
  { icon: ShieldCheck, value: "1000+", label: "Delicious Meals" },
  { icon: MapPin, value: "10+", label: "Cities & Towns" },
];

const features = [
  {
    icon: Leaf,
    color: "bg-green-100 text-green-700",
    title: "Fresh Ingredients",
    description: "We use fresh and high-quality ingredients for every meal.",
  },
  {
    icon: Heart,
    color: "bg-red-100 text-red-500",
    title: "Homely Taste",
    description: "Authentic home-style recipes made with love.",
  },
  {
    icon: ShieldCheck,
    color: "bg-teal-100 text-teal-700",
    title: "Hygienic & Safe",
    description: "Prepared in clean and hygienic environments.",
  },
  {
    icon: Users,
    color: "bg-blue-100 text-blue-600",
    title: "Support Home Chefs",
    description: "We empower local home chefs and help them grow.",
  },
];

const steps = [
  {
    icon: Search,
    step: "1. Explore",
    desc: "Browse a variety of home-cooked dishes",
  },
  {
    icon: ShoppingCart,
    step: "2. Order",
    desc: "Choose your favourite meals and place an order",
  },
  {
    icon: ChefHat,
    step: "3. Home Chefs Cook",
    desc: "Our verified home chefs prepare your food with care",
  },
  {
    icon: Truck,
    step: "4. Get it Delivered",
    desc: "Enjoy fresh and tasty homemade food at your doorstep",
  },
];

const values = [
  {
    icon: BadgeCheck,
    color: "bg-yellow-100 text-yellow-600",
    title: "Authenticity",
    desc: "Real home-style flavours",
  },
  {
    icon: Users,
    color: "bg-green-100 text-green-600",
    title: "Community",
    desc: "Support local home chefs",
  },
  {
    icon: Star,
    color: "bg-red-100 text-red-500",
    title: "Quality",
    desc: "Fresh, healthy and tasty food",
  },
  {
    icon: ShieldCheck,
    color: "bg-blue-100 text-blue-600",
    title: "Trust",
    desc: "Your satisfaction is our priority",
  },
];

/* ─── Component ─────────────────────────────────────── */

function About() {
  return (
    <main className="min-h-screen bg-[#f7f9f5] text-[#203129]">

      <PageHeader
        title="About Us"
      />

      {/* ── OUR STORY ───────────────────────────────── */}
      <PageContainer>
        <section className="grid gap-10 py-16 md:grid-cols-2 md:items-center md:py-20">
          {/* Images collage */}
          <div className="relative flex items-center justify-center">
            <div className="relative h-64 w-72 overflow-hidden rounded-3xl shadow-xl sm:h-80 sm:w-96">
              <img
                src="/images/header.png"
                alt="Home chef cooking"
                className="h-full w-full object-cover"
              />
            </div>
            {/* Floating second image */}
            <div className="absolute -bottom-6 right-0 h-36 w-48 overflow-hidden rounded-2xl border-4 border-white shadow-lg sm:h-44 sm:w-60">
              <img
                src="/images/login.png"
                alt="Homemade food"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Text */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#396F0B]">
              Our Story
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              Bringing Homemade Food{" "}
              <span className="text-[#e07b3c]">Closer to You</span>
            </h2>
            <p className="mt-5 text-justify text-sm leading-7 text-slate-600">
              Our restaurant was born from a simple idea — to bring the authentic
              taste of homemade food to everyone. We connect passionate home
              chefs with food lovers who crave healthy, tasty and hygienic meals,
              just like at home.
            </p>
            <p className="mt-4 text-justify text-sm leading-7 text-slate-600">
              Our mission is to support home chefs, promote traditional recipes
              and make home-style food accessible to every household.
            </p>
            <Link
              to="/menu"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#1a3c2e] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#396F0B]"
            >
              Our Journey <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </PageContainer>

      {/* ── STATS ───────────────────────────────────── */}
      <section className="border-y border-[#d9e8ce] bg-[#eef5e7] py-10">
        <PageContainer>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 text-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow">
                  <Icon className="h-5 w-5 text-[#396F0B]" />
                </span>
                <p className="text-2xl font-black text-[#1a3c2e]">{value}</p>
                <p className="text-xs font-medium text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ── WHY CHOOSE US ───────────────────────────── */}
      <PageContainer>
        <section className="py-16 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#396F0B]">
            Why Choose Us
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            More Than <span className="text-[#e07b3c]">Just Food</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-justify text-sm text-slate-500">
            We bring together taste, health and trust to give you a better food
            experience.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, color, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-[#d9e8ce] bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <span
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-bold text-[#1a3c2e]">{title}</h3>
                <p className="mt-2 text-justify text-xs leading-5 text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </PageContainer>

      {/* ── HOW IT WORKS ────────────────────────────── */}
      <section
        className="relative overflow-hidden py-16"
        style={{
          backgroundImage: "url(/images/header.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#f7f9f5]/92" />
        <PageContainer>
          <div className="relative z-10 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#396F0B]">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              From Home Chefs to{" "}
              <span className="text-[#e07b3c]">Your Table</span>
            </h2>
            <p className="mt-2 text-justify text-sm text-slate-500">
              Enjoy homemade food in just a few simple steps.
            </p>
          </div>

          <div className="relative z-10 mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, step, desc }, i) => (
              <div key={step} className="flex flex-col items-center text-center">
                {/* connector line on lg screens */}
                <div className="relative flex items-center justify-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#396F0B] bg-white shadow-md">
                    <Icon className="h-6 w-6 text-[#396F0B]" />
                  </span>
                  {i < steps.length - 1 && (
                    <span className="absolute left-full top-1/2 hidden h-px w-8 -translate-y-1/2 border-t-2 border-dashed border-[#396F0B]/40 lg:block" />
                  )}
                </div>
                <h3 className="mt-4 text-sm font-bold text-[#1a3c2e]">{step}</h3>
                <p className="mt-1 text-justify text-xs leading-5 text-slate-500">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* ── VALUES ──────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-16"
        style={{
          backgroundImage: "url(/images/header.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#1a3c2e]/90" />
        <PageContainer>
          <div className="relative z-10 grid gap-10 md:grid-cols-2 md:items-center">
            {/* Left text */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a3c741]">
                Our Values
              </p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                Rooted in Tradition,
                <br />
                <span className="text-[#a3c741]">Driven by People</span>
              </h2>
              <p className="mt-5 text-justify text-sm leading-7 text-white/75">
                We believe good food brings people closer. Our values are built
                on trust, quality, tradition and community. We work with local
                home chefs to preserve traditional recipes and create
                opportunities for a healthier and happier society.
              </p>
            </div>

            {/* Right values grid */}
            <div className="grid grid-cols-2 gap-4">
              {values.map(({ icon: Icon, color, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{title}</p>
                    <p className="mt-0.5 text-xs text-white/65">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="relative bg-[#f7f9f5] py-16 text-center">
        {/* Decorative leaves */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
          <Leaf className="absolute left-10 top-4 h-24 w-24 rotate-[-30deg] text-[#396F0B]" />
          <Leaf className="absolute bottom-4 right-10 h-20 w-20 rotate-[40deg] text-[#396F0B]" />
        </div>

        <PageContainer>
          <p className="text-sm font-medium text-slate-500">
            Be a Part of Our
          </p>
          <h2 className="mt-1 text-3xl font-black sm:text-4xl">
            <span className="text-[#1a3c2e]">Food </span>
            <span className="text-[#e07b3c]">Family</span>
          </h2>
          <p className="mx-auto mt-3 max-w-md text-justify text-sm text-slate-500">
            Whether you are a food lover or a home chef, join us in our journey
            to spread the joy of homemade food.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/menu"
              className="inline-flex items-center gap-2 rounded-full bg-[#1a3c2e] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#396F0B]"
            >
              Order Now <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#1a3c2e] px-7 py-3 text-sm font-semibold text-[#1a3c2e] transition hover:bg-[#1a3c2e] hover:text-white"
            >
              Become a Home Chef
            </Link>
          </div>
        </PageContainer>

        {/* Bottom badge */}
        <div className="absolute bottom-6 right-8 hidden text-right text-xs font-semibold text-[#e07b3c] md:block">
          Good Food<br />
          <span className="font-bold text-[#1a3c2e]">Brighter Days ♥</span>
        </div>
      </section>
    </main>
  );
}

export default About;
