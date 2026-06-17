import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold text-white">Terms and Conditions</h1>
      <div className="mt-8 space-y-6 text-white/70 leading-relaxed">
      <p>
        Welcome to McKee Security and Audio Systems. These terms and conditions outline
        the rules and regulations for the use of our website located at mckeesecurity.ca.
      </p>
      <p>
        By accessing this website we assume you accept these terms and conditions. Do not
        continue to use McKee Security and Audio Systems if you do not agree to take all
        of the terms and conditions stated on this page.
      </p>
      <h2 className="text-xl font-bold text-white">Cookies</h2>
      <p>
        We employ the use of cookies. By accessing our website, you agreed to use cookies
        in agreement with our Privacy Policy.
      </p>
      <h2 className="text-xl font-bold text-white">License</h2>
      <p>
        Unless otherwise stated, McKee Security and Audio Systems and/or its licensors own
        the intellectual property rights for all material on this website. All intellectual
        property rights are reserved.
      </p>
      <h2 className="text-xl font-bold text-white">Your Privacy</h2>
      <p>
        Please read our{" "}
        <a href="/privacy-policy" className="text-primary hover:underline">
          Privacy Policy
        </a>
        .
      </p>
      <h2 className="text-xl font-bold text-white">Disclaimer</h2>
      <p>
        To the maximum extent permitted by applicable law in Ontario, Canada, we exclude
        all representations, warranties and conditions relating to our website and the use
        of this website.
      </p>
      </div>
    </article>
  );
}
