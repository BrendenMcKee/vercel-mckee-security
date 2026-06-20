"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ServiceQuoteSection } from "@/components/sections/service-quote-section";

type ServiceCard = {
  id: string;
  href: string;
  icon: string;
  title: string;
  text: string;
  image: string;
  imagePosition?: string;
  fullWidth?: boolean;
  features: string[];
};

const services: ServiceCard[] = [
  {
    id: "ci-security",
    href: "/security",
    icon: "fa-lock",
    title: "Security / Home Automation",
    text: "Professional 24/7 monitored security systems with intrusion detection, environmental monitoring, and smartphone control via Total Connect 2.0. Protect your property with ULC-listed monitoring backed by over 30 years of proven reliability.",
    image: "/images/services/work/security-panel-build.jpg",
    imagePosition: "center 25%",
    features: ["24/7 Monitoring", "Intrusion Detection", "Smart Alerts", "Cellular Communication"],
  },
  {
    id: "ci-camera",
    href: "/camera-surveillance",
    icon: "fa-video",
    title: "Camera Surveillance",
    text: "Uniview UNV 4K UHD camera systems with AI smart detection, remote viewing access, and professional-grade NVR recording. Complete property visibility from anywhere in the world using your smartphone or computer.",
    image: "/images/services/work/camera-ceiling-install.jpg",
    imagePosition: "center 15%",
    features: ["4K Ultra HD", "AI Detection", "Remote Viewing", "NDAA Compliant"],
  },
  {
    id: "ci-networking",
    href: "/networking-cellular-expansion",
    icon: "fa-signal",
    title: "Networking / Cellular Expansion",
    text: "Enterprise-grade Unifi Wi-Fi 7 networking solutions with access points, gateways, POE switches, and IDS/IPS security. Wireless bridges connect multiple buildings, and cellular distribution antennas eliminate dead zones.",
    image: "/images/services/work/network-centex-panel-cabling.jpg",
    imagePosition: "center 58%",
    features: ["Wi-Fi 7", "Unifi Equipment", "Wireless Bridges", "Cellular Boosting"],
  },
  {
    id: "ci-audio",
    href: "/audio-video",
    icon: "fa-tv",
    title: "Home Audio / Video",
    text: "As a certified Sonos dealer, we specialize in premium audio-visual installations. From TV wall mounts and soundbars to whole-home audio systems, surround sound, and immersive Dolby Atmos home theater experiences.",
    image: "/images/services/work/av-outdoor-tv-lakeside.jpg",
    imagePosition: "center 44%",
    features: ["Certified Sonos Dealer", "TV Mounting", "Whole-Home Audio", "Home Theater"],
  },
  {
    id: "ci-starlink",
    href: "/starlink",
    icon: "fa-satellite",
    title: "Starlink Installation",
    text: "Professional Starlink Gen 3 satellite internet installation with no roof penetration. We supply all mounting hardware, extended cables, and accessories. You purchase the kit from Starlink, and we handle the rest with expert installation and optional UniFi network integration.",
    image: "/images/services/work/starlink-lakefront-pole.jpg",
    imagePosition: "center 33%",
    fullWidth: true,
    features: ["Gen 3 Compatible", "No Roof Penetration", "All Equipment Provided", "UniFi Integration"],
  },
];

const whyCards = [
  {
    icon: "fa-award",
    title: "Leading Industry Professionals",
    text: "Over 30 years of hands-on experience across security, surveillance, networking, audio-visual, and satellite internet. Our team stays current with the latest technologies and industry best practices.",
  },
  {
    icon: "fa-key",
    title: "Complete Equipment Ownership",
    text: "You own all equipment and data from day one. No rental fees, no subscription traps, and no long-term contracts required. Your investment belongs to you.",
  },
  {
    icon: "fa-map-marker-alt",
    title: "Local & Responsive",
    text: "Based in the Haliburton region, we provide fast, responsive support when you need it. No call centres, no runaround. Real people, real solutions, real fast.",
  },
  {
    icon: "fa-project-diagram",
    title: "Integrated Solutions",
    text: "Our services work together seamlessly. Combine security, cameras, and networking into a unified system managed from a single interface, all installed and configured by the same trusted team.",
  },
];

function useServicesHubEffects() {
  useEffect(() => {
    const container = document.querySelector(".mks2025-ci-particles-container");
    if (container && !container.childElementCount) {
      for (let i = 0; i < 25; i++) {
        const particle = document.createElement("div");
        particle.className = "mks2025-ci-particle";
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${Math.random() * 12 + 16}s`;
        particle.style.animationDelay = `-${Math.random() * 22}s`;
        const size = `${Math.random() * 3 + 1}px`;
        particle.style.width = size;
        particle.style.height = size;
        container.appendChild(particle);
      }
    }

    const badges = document.querySelectorAll<HTMLAnchorElement>(
      "a.mks2025-ci-hero-badge[href^='#']",
    );
    const handlers: Array<{ el: HTMLAnchorElement; fn: (e: Event) => void }> = [];

    badges.forEach((badge) => {
      const fn = (e: Event) => {
        e.preventDefault();
        const targetId = badge.getAttribute("href")?.slice(1);
        if (!targetId) return;
        const target = document.getElementById(targetId);
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top, behavior: "smooth" });
      };
      badge.addEventListener("click", fn);
      handlers.push({ el: badge, fn });
    });

    return () => {
      handlers.forEach(({ el, fn }) => el.removeEventListener("click", fn));
    };
  }, []);
}

export function ServicesHubContent() {
  useServicesHubEffects();

  return (
    <div id="mks2025-ci-wrapper">
      <div className="mks2025-ci-particles-container" aria-hidden="true" />

      <div id="mks2025-ci-main">
        <div className="mks2025-ci-hero">
          <div className="mks2025-ci-hero-content">
            <i className="fas fa-tools mks2025-ci-hero-icon" aria-hidden="true" />
            <h1>Custom Installations</h1>
            <p className="mks2025-ci-hero-tagline">
              Professional Solutions Tailored to Your Property
            </p>
            <p>
              McKee Security & Audio Systems provides comprehensive technology solutions for
              residential and commercial properties throughout the Haliburton region. From
              advanced security systems and 4K surveillance to enterprise-grade networking,
              premium audio-visual experiences, and high-speed satellite internet, we design,
              install, and support systems that bring the full potential of modern technology
              to your doorstep.
            </p>
            <p>
              Every installation is{" "}
              <span className="mks2025-ci-hero-emphasis">custom-designed</span> for your
              property, professionally installed by our experienced team, and backed by
              responsive local support. Explore our services below and discover how we can
              enhance your home or business.
            </p>
            <div className="mks2025-ci-hero-badges">
              <a href="#ci-security" className="mks2025-ci-hero-badge">
                <i className="fas fa-lock" aria-hidden="true" /> Security Systems
              </a>
              <a href="#ci-camera" className="mks2025-ci-hero-badge">
                <i className="fas fa-video" aria-hidden="true" /> Camera Surveillance
              </a>
              <a href="#ci-networking" className="mks2025-ci-hero-badge">
                <i className="fas fa-signal" aria-hidden="true" /> Networking / Cellular
              </a>
              <a href="#ci-audio" className="mks2025-ci-hero-badge">
                <i className="fas fa-tv" aria-hidden="true" /> Audio / Video
              </a>
              <a href="#ci-starlink" className="mks2025-ci-hero-badge">
                <i className="fas fa-satellite" aria-hidden="true" /> Starlink
              </a>
            </div>
          </div>
        </div>

        <div className="mks2025-ci-values-section">
          <div className="mks2025-ci-values-content">
            <h2>The McKee Approach</h2>
            <p>
              We deliver technology solutions built on three core principles that have defined
              our business for over 30 years.
            </p>
            <div className="mks2025-ci-values-grid">
              <div className="mks2025-ci-value-card">
                <i className="fas fa-bullseye mks2025-ci-value-icon" aria-hidden="true" />
                <h3>Custom Design</h3>
                <p>
                  No two properties are the same. We assess your unique needs, design a
                  tailored solution, and ensure every component is selected and positioned
                  for maximum performance and value.
                </p>
              </div>
              <div className="mks2025-ci-value-card">
                <i className="fas fa-hard-hat mks2025-ci-value-icon" aria-hidden="true" />
                <h3>Professional Installation</h3>
                <p>
                  Our experienced technicians handle every aspect of installation with
                  precision and care. Clean cable runs, secure mounting, and thorough
                  configuration ensure systems that perform flawlessly from day one.
                </p>
              </div>
              <div className="mks2025-ci-value-card">
                <i className="fas fa-handshake mks2025-ci-value-icon" aria-hidden="true" />
                <h3>Ongoing Support</h3>
                <p>
                  We stand behind every installation with responsive local support. Whether
                  you need to expand your system, troubleshoot an issue, or upgrade your
                  equipment, we are just a phone call away.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mks2025-ci-services-header">
          <h2>Our Custom Installation Services</h2>
          <p>Explore the full range of technology solutions we offer for your home or business.</p>
        </div>

        <div className="mks2025-ci-services-grid">
          {services.map((service) => (
            <Link
              key={service.id}
              id={service.id}
              href={service.href}
              className={`mks2025-ci-service-card${service.fullWidth ? " mks2025-ci-full-width" : ""}`}
            >
              <div className="mks2025-ci-card-image">
                <div
                  className="mks2025-ci-card-image-bg"
                  style={{
                    backgroundImage: `url('${service.image}')`,
                    backgroundPosition: service.imagePosition ?? "center",
                  }}
                />
                <div className="mks2025-ci-card-image-icon">
                  <i className={`fas ${service.icon}`} aria-hidden="true" />
                </div>
              </div>
              <div className="mks2025-ci-card-body">
                <h3>
                  <span className="mks2025-ci-card-title-icon" aria-hidden="true">
                    <i className={`fas ${service.icon}`} />
                  </span>
                  {service.title}
                </h3>
                <p>{service.text}</p>
                <div className="mks2025-ci-card-features">
                  {service.features.map((feature) => (
                    <span key={feature} className="mks2025-ci-card-feature">
                      {feature}
                    </span>
                  ))}
                </div>
                <span className="mks2025-ci-card-cta">
                  Learn More <i className="fas fa-arrow-right" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mks2025-ci-why-section">
          <div className="mks2025-ci-why-content">
            <h2>Why Choose McKee Security & Audio Systems</h2>
            <p>
              Professional installation and quality equipment make all the difference. Here is
              what sets us apart.
            </p>
            <div className="mks2025-ci-why-grid">
              {whyCards.map((card) => (
                <div key={card.title} className="mks2025-ci-why-card">
                  <h4>
                    <span className="mks2025-ci-why-card-icon">
                      <i className={`fas ${card.icon}`} aria-hidden="true" />
                    </span>
                    {card.title}
                  </h4>
                  <p>{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ServiceQuoteSection
          id="quote"
          className="mckee-service-quote-section--hub"
          title="Ready to Get Started?"
          description="Tell us about your project and we will design a custom solution for your property."
          serviceSlug="services-hub"
        />
      </div>
    </div>
  );
}
