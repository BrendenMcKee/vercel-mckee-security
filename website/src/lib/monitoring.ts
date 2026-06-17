export type MonitoringTier = {
  tier: number;
  name: string;
  price: string;
  landlineRequired: boolean;
  cellular: boolean;
  totalConnect: boolean;
  homeAutomation: boolean;
  requirements: string[];
};

export const monitoringTiers: MonitoringTier[] = [
  {
    tier: 1,
    name: "Telephone Land Line",
    price: "Inquire for Pricing",
    landlineRequired: true,
    cellular: false,
    totalConnect: false,
    homeAutomation: false,
    requirements: [
      "Telephone landline is required on site for monitoring",
    ],
  },
  {
    tier: 2,
    name: "Cellular Communicator",
    price: "Inquire for Pricing",
    landlineRequired: false,
    cellular: true,
    totalConnect: false,
    homeAutomation: false,
    requirements: [
      "Requires cell signal. A cell booster can be installed if limited signal is available",
    ],
  },
  {
    tier: 3,
    name: "Cellular + Total Connect 2.0 Basic",
    price: "Inquire for Pricing",
    landlineRequired: false,
    cellular: true,
    totalConnect: true,
    homeAutomation: false,
    requirements: [
      "Requires cell signal. A cell booster can be installed if limited signal is available",
    ],
  },
  {
    tier: 4,
    name: "Cellular + Total Connect Home Automation",
    price: "Inquire for Pricing",
    landlineRequired: false,
    cellular: true,
    totalConnect: true,
    homeAutomation: true,
    requirements: [
      "Home automation requires internet in addition to cell signal on site",
    ],
  },
];

export const monitoringDisclaimer =
  "All monitoring options are invoiced annually. If you decide to cancel your monitoring at any time we require 30 days written notice prior to cancellation. We will then refund you the remainder owing for the rest of the year.";
