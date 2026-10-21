import PageContainer from "../CommonComponents/PageContainer";
import PageHeader from "../CommonComponents/PageHeader";

const privacySections = [
  {
    title: "Information we collect",
    content:
      "When you place an order, make a reservation, or contact us, we may collect information you provide, such as your name, phone number, email address, delivery details, and order information.",
  },
  {
    title: "How we use your information",
    content:
      "We use this information to process and deliver orders, manage reservations, respond to questions, and provide customer support. We may also use it to maintain and improve our services.",
  },
  {
    title: "Payments and service providers",
    content:
      "Payments may be handled by third-party payment providers. We do not ask you to send payment card details through our contact channels. Information needed to complete a payment is handled according to the provider’s privacy practices.",
  },
  {
    title: "Cookies and website data",
    content:
      "Our website may store essential browser data to support features such as your cart and sign-in session. You can manage cookies through your browser settings, though some site features may not work as expected if they are disabled.",
  },
  {
    title: "Your choices and questions",
    content:
      "You can contact us to ask about the personal information you have shared or request help with it. Please use the contact details on our Contact Us page.",
  },
];

function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#fcfbf9] pb-16 text-[#203129]">
      <PageHeader title="Privacy Policy" />
      <PageContainer>
        <section className="mx-auto max-w-4xl py-10 sm:py-14">
          <p className="text-sm leading-7 text-slate-600">
            We respect your privacy and use the information you share with us
            to provide restaurant services and support. This page explains the
            types of information we may handle and how we use it.
          </p>
          <div className="mt-8 space-y-6">
            {privacySections.map(({ title, content }) => (
              <article
                key={title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold text-[#203129]">{title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {content}
                </p>
              </article>
            ))}
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

export default PrivacyPolicy;
