import { Award, Heart, Leaf, UtensilsCrossed } from "lucide-react";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";

const values = [
  {
    icon: Leaf,
    title: "Fresh ingredients",
    description: "We choose quality ingredients and prepare every dish with care.",
  },
  {
    icon: Heart,
    title: "Made with care",
    description: "Warm hospitality and thoughtful service are part of every visit.",
  },
  {
    icon: Award,
    title: "Recipes worth sharing",
    description: "Our menu brings familiar favourites and bold flavours to your table.",
  },
];

function About() {
  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-16 text-[#203129]">
      <PageHeader title="About Us" />
      <PageContainer>
        <section className="grid gap-8 py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-16">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">Welcome to Foodie</p>
            <h2 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">
              Good food brings everyone together.
            </h2>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              We are here to make every meal feel special, with freshly prepared
              food, welcoming service, and a menu made for sharing. Whether
              you are stopping by for a quick bite or gathering with family and
              friends, there is always something delicious waiting for you.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              From dine-in favourites to convenient takeaway and delivery, our
              team is committed to making your experience enjoyable from the
              first order to the last bite.
            </p>
          </div>
          <div className="flex min-h-64 items-center justify-center rounded-3xl bg-[#1a3c36] p-8 text-center text-white shadow-lg sm:min-h-80">
            <div>
              <UtensilsCrossed className="mx-auto h-12 w-12 text-[#edc783]" />
              <p className="mt-5 font-serif text-3xl font-bold">Freshly made.</p>
              <p className="mt-2 text-sm text-white/75">Thoughtfully served, every day.</p>
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className="mx-auto mb-7 max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">What matters to us</p>
            <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">The ingredients of a great experience</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef5f3] text-[#1a3c36]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-[#203129]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

export default About;
