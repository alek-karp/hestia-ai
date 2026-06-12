export type UsedByCompany = { name: string };

export type VerifiedVenue = {
  id: string;
  name: string;
  category:
    | "Restaurant"
    | "Cafe"
    | "Coworking Space"
    | "Rooftop"
    | "Event Hall"
    | "Bar & Lounge";
  description: string;
  rating: number;
  reviewCount: number;
  priceRange: string;
  location: string;
  image: string;
  usedBy: UsedByCompany[];
  tags: string[];
  url?: string;
  featured?: boolean;
};

export const VERIFIED_VENUES: VerifiedVenue[] = [
  {
    id: "ve1",
    name: "The Grand Atrium",
    category: "Event Hall",
    description:
      "Stunning industrial-chic event hall with floor-to-ceiling windows and capacity for 500+. Perfect for product launches and company celebrations.",
    rating: 4.9,
    reviewCount: 312,
    priceRange: "$$$",
    location: "SoMa, San Francisco",
    image: "/venues/venue-1.webp",
    usedBy: [{ name: "Anthropic" }, { name: "Cursor" }, { name: "OpenAI" }],
    tags: ["Industrial", "Large capacity", "AV included"],
    featured: true,
  },
  {
    id: "ve2",
    name: "The Rooftop at Fifth",
    category: "Rooftop",
    description:
      "Panoramic rooftop with city skyline views. Ideal for cocktail hours and intimate company dinners up to 150 guests.",
    rating: 4.8,
    reviewCount: 198,
    priceRange: "$$$$",
    location: "Financial District, San Francisco",
    image: "/venues/venue-2.webp",
    usedBy: [{ name: "Stripe" }, { name: "Vercel" }],
    tags: ["City views", "Premium bar", "Sunset hours"],
    featured: true,
  },
  {
    id: "ve3",
    name: "Meridian Hall",
    category: "Event Hall",
    description:
      "Classic event hall with modern AV infrastructure. Hosts up to 800 attendees with built-in stage and backstage facilities.",
    rating: 4.7,
    reviewCount: 445,
    priceRange: "$$$",
    location: "Mission Bay, San Francisco",
    image: "/venues/venue-3.webp",
    usedBy: [{ name: "Linear" }, { name: "Figma" }, { name: "GitHub" }],
    tags: ["Stage", "Parking", "Catering kitchen"],
    featured: true,
  },
  {
    id: "ve4",
    name: "Sandbox SF",
    category: "Coworking Space",
    description:
      "Flexible coworking venue in Hayes Valley. Great for team offsites, workshops, and small launches up to 80 people. High-speed wifi and modular furniture.",
    rating: 4.6,
    reviewCount: 89,
    priceRange: "$$",
    location: "Hayes Valley, San Francisco",
    image: "/venues/venue-4.webp",
    usedBy: [{ name: "Cursor" }, { name: "Linear" }],
    tags: ["High-speed wifi", "Modular layout", "All-day rental"],
  },
  {
    id: "ve5",
    name: "Oak & Iron",
    category: "Restaurant",
    description:
      "Private dining rooms in a beloved SoMa restaurant. Seats up to 60 for seated dinners or 100 for standing receptions. Full kitchen and sommelier on-site.",
    rating: 4.9,
    reviewCount: 267,
    priceRange: "$$$",
    location: "SoMa, San Francisco",
    image: "/venues/venue-1.webp",
    usedBy: [{ name: "Anthropic" }, { name: "OpenAI" }, { name: "Stripe" }],
    tags: ["Private dining", "Full bar", "Custom menus"],
    featured: true,
  },
  {
    id: "ve6",
    name: "Provisions Cafe",
    category: "Cafe",
    description:
      "Charming specialty coffee shop available for private morning or afternoon buy-outs. Ideal for small team breakfasts, press briefings, or investor meetings.",
    rating: 4.8,
    reviewCount: 183,
    priceRange: "$$",
    location: "Mission District, San Francisco",
    image: "/venues/venue-2.webp",
    usedBy: [{ name: "Vercel" }, { name: "Figma" }, { name: "GitHub" }],
    tags: ["Buy-out available", "Espresso bar", "Up to 40 guests"],
    featured: true,
  },
  {
    id: "ve7",
    name: "The Vault",
    category: "Bar & Lounge",
    description:
      "Underground cocktail lounge in a converted bank vault. A dramatic setting for launch parties, press events, and VIP receptions up to 120 guests.",
    rating: 4.7,
    reviewCount: 94,
    priceRange: "$$$",
    location: "Financial District, SF",
    image: "/venues/venue-3.webp",
    usedBy: [{ name: "Anthropic" }, { name: "Linear" }],
    tags: ["Unique setting", "Full bar", "DJ booth"],
  },
  {
    id: "ve8",
    name: "Bloom House",
    category: "Coworking Space",
    description:
      "Design-forward coworking space with a full event floor. Conference rooms, breakout pods, and a rooftop terrace — all rentable by the hour or day.",
    rating: 4.6,
    reviewCount: 112,
    priceRange: "$$",
    location: "SoMa, San Francisco",
    image: "/venues/venue-4.webp",
    usedBy: [{ name: "Cursor" }, { name: "Stripe" }],
    tags: ["Hourly rental", "Rooftop access", "AV included"],
  },
];
