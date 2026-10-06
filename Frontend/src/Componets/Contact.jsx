import { Clock3, Mail, MapPin, Phone, Utensils } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";

const contactMethods = [
  {
    icon: Phone,
    title: "Call us",
    detail: "+91 98765 43210",
    href: "tel:+919876543210",
  },
  {
    icon: Mail,
    title: "Email",
    detail: "info@foodierestaurant.com",
    href: "mailto:info@foodierestaurant.com",
  },
];

function Contact() {
  const [searchParams] = useSearchParams();
  const requestedService = searchParams.get("service");
  const isReservation = searchParams.get("type") === "reservation";

  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-16 text-[#203129]">
      <PageHeader title="Contact Us" />
      <PageContainer>
        <section className="py-10 sm:py-14">
          <div className="mb-7 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a34f32]">We’re happy to help</p>
            <h2 className="mt-2 font-serif text-3xl font-bold">{isReservation ? "Plan a visit with us" : "Get in touch"}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {requestedService
                ? `Contact our team to ask about ${requestedService.replaceAll("-", " ")}.`
                : "Questions about our menu, a reservation, or an order? Reach out and our team will be glad to help."}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {contactMethods.map(({ icon: Icon, title, detail, href }) => (
                <a key={title} href={href} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#1a3c36]/30 hover:shadow-md">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef5f3] text-[#1a3c36]"><Icon className="h-5 w-5" /></span>
                  <span><span className="block text-xs font-semibold text-slate-400">{title}</span><span className="mt-1 block text-sm font-bold text-[#203129]">{detail}</span></span>
                </a>
              ))}
            </div>

            <div className="rounded-2xl bg-[#1a3c36] p-6 text-white shadow-sm sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <MapPin className="h-5 w-5 text-[#edc783]" />
                  <h3 className="mt-3 font-bold">Visit us</h3>
                  <address className="mt-2 text-sm not-italic leading-6 text-white/75">123 Food Street, Ambur,<br />Tamil Nadu - 635802</address>
                </div>
                <div>
                  <Clock3 className="h-5 w-5 text-[#edc783]" />
                  <h3 className="mt-3 font-bold">Opening hours</h3>
                  <p className="mt-2 text-sm leading-6 text-white/75">Monday – Sunday<br />10:00 AM – 11:00 PM</p>
                </div>
              </div>
              <div className="mt-7 border-t border-white/15 pt-6">
                <p className="text-sm leading-6 text-white/75">Ready to choose something delicious?</p>
                <Link to="/shop" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#d5a65a] px-5 py-3 text-sm font-bold text-[#203129] transition hover:bg-[#edc783]">
                  <Utensils className="h-4 w-4" /> Browse the menu
                </Link>
              </div>
            </div>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

export default Contact;
