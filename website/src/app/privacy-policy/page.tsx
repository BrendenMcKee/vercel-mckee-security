import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold text-white">Privacy Policy</h1>
      <div className="mt-8 space-y-6 text-white/70 leading-relaxed">
        <p>
          McKee Security and Audio Systems respects your privacy. This policy describes how
          we collect, use, and protect information when you visit mckeesecurity.ca or contact
          us through our forms.
        </p>
        <h2 className="text-xl font-bold text-white">Information We Collect</h2>
        <p>
          When you submit a contact form, service inquiry, or job application, we collect the
          information you provide such as your name, email address, phone number, address,
          and message content.
        </p>
        <h2 className="text-xl font-bold text-white">How We Use Information</h2>
        <p>
          We use your information to respond to inquiries, provide quotes, process job
          applications, and deliver the services you request.
        </p>
        <h2 className="text-xl font-bold text-white">Cookies</h2>
        <p>
          Our website may use cookies to improve functionality and analyze site usage. You
          can control cookies through your browser settings.
        </p>
        <h2 className="text-xl font-bold text-white">Contact</h2>
        <p>
          For privacy questions, contact us at info@mckeesecurity.ca or call (705) 457-2156.
        </p>
      </div>
    </article>
  );
}
