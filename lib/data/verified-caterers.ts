export type UsedByCompany = { name: string };

export type VerifiedCaterer = {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  rating: number;
  reviewCount: number;
  estimatedCostPerHead: number;
  location: string;
  image: string;
  usedBy: UsedByCompany[];
  tags: string[];
  url?: string;
  featured?: boolean;
};

export const VERIFIED_CATERERS: VerifiedCaterer[] = [
  {
    id: "c1",
    name: "Harvest Table",
    cuisine: "Farm-to-Table",
    description:
      "Seasonal California cuisine sourced from local farms. Known for beautiful grazing tables and interactive food stations that spark conversation.",
    rating: 4.9,
    reviewCount: 287,
    estimatedCostPerHead: 95,
    location: "San Francisco, CA",
    image: "/catering/catering-1.webp",
    usedBy: [{ name: "Anthropic" }, { name: "Cursor" }, { name: "Vercel" }],
    tags: ["Farm-to-table", "Dietary options", "Grazing tables"],
    featured: true,
  },
  {
    id: "c2",
    name: "Umami Kitchen",
    cuisine: "Asian Fusion",
    description:
      "Bold flavors rooted in Japanese and Korean traditions. Signature bento boxes and family-style sharing platters for any team size.",
    rating: 4.8,
    reviewCount: 204,
    estimatedCostPerHead: 75,
    location: "SoMa, San Francisco",
    image: "/catering/catering-2.webp",
    usedBy: [{ name: "OpenAI" }, { name: "Linear" }, { name: "GitHub" }],
    tags: ["Gluten-free options", "Bento boxes", "Min 20 guests"],
    featured: true,
  },
  {
    id: "c3",
    name: "Cielo Catering",
    cuisine: "Mediterranean",
    description:
      "Vibrant Mediterranean spreads featuring mezze platters, wood-fired proteins, and housemade dips. A crowd-pleaser for any office event.",
    rating: 4.8,
    reviewCount: 331,
    estimatedCostPerHead: 65,
    location: "Bay Area, CA",
    image: "/catering/catering-3.webp",
    usedBy: [{ name: "Stripe" }, { name: "Figma" }, { name: "Anthropic" }],
    tags: ["Vegan options", "Mezze", "Large groups"],
    featured: true,
  },
  {
    id: "c4",
    name: "The Taco Collective",
    cuisine: "Mexican",
    description:
      "Authentic street-style tacos with all the fixings. Interactive taco stations make for a fun, memorable event experience.",
    rating: 4.7,
    reviewCount: 512,
    estimatedCostPerHead: 45,
    location: "Mission District, SF",
    image: "/catering/catering-4.webp",
    usedBy: [{ name: "Cursor" }, { name: "Vercel" }],
    tags: ["Interactive station", "Budget-friendly", "Vegan options"],
  },
  {
    id: "c5",
    name: "Provisions Fine Catering",
    cuisine: "Fine Dining",
    description:
      "White-glove catering service for executive dinners and high-stakes client events. Sommelier-curated wine pairings available.",
    rating: 4.9,
    reviewCount: 143,
    estimatedCostPerHead: 180,
    location: "Pacific Heights, SF",
    image: "/catering/catering-1.webp",
    usedBy: [{ name: "Anthropic" }, { name: "Stripe" }, { name: "OpenAI" }],
    tags: ["White-glove service", "Wine pairing", "Executive dinners"],
    featured: true,
    url: "https://example.com/provisions",
  },
  {
    id: "c6",
    name: "Nourish Bowls",
    cuisine: "Health & Wellness",
    description:
      "Nutritionist-designed bowls and platters built for sustained energy. A favorite for all-day offsites and hackathons.",
    rating: 4.7,
    reviewCount: 178,
    estimatedCostPerHead: 55,
    location: "Mission Bay, SF",
    image: "/catering/catering-2.webp",
    usedBy: [{ name: "Linear" }, { name: "GitHub" }, { name: "Figma" }],
    tags: ["Healthy", "Allergy-aware", "All-day service"],
  },
  {
    id: "c7",
    name: "Smokehaus BBQ",
    cuisine: "American BBQ",
    description:
      "Low-and-slow smoked meats and classic sides that bring teams together. Perfect for outdoor events, company picnics, and milestone parties.",
    rating: 4.6,
    reviewCount: 389,
    estimatedCostPerHead: 60,
    location: "Oakland, CA",
    image: "/catering/catering-3.webp",
    usedBy: [{ name: "Vercel" }, { name: "GitHub" }],
    tags: ["Outdoor-friendly", "Large groups", "Vegetarian options"],
  },
  {
    id: "c8",
    name: "Patisserie Moderne",
    cuisine: "Desserts & Pastry",
    description:
      "Artisan dessert catering specializing in custom celebration cakes, macaron towers, and premium coffee service for corporate events.",
    rating: 4.8,
    reviewCount: 97,
    estimatedCostPerHead: 40,
    location: "San Francisco, CA",
    image: "/catering/catering-4.webp",
    usedBy: [{ name: "Figma" }, { name: "Cursor" }, { name: "Anthropic" }],
    tags: ["Custom cakes", "Coffee service", "Corporate gifting"],
  },
];
