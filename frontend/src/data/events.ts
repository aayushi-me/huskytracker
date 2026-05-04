// frontend/src/data/events.ts

export type EventCategory =
  | "Workshop"
  | "Seminar"
  | "Cultural"
  | "Sports"
  | "Other";

export type EventItem = {
  id: number; // <-- FIXED (was string)
  title: string;
  type: EventCategory;
  date: string;
  time: string;
  location: string;
  image: string;
  shortDescription: string;
  fullDescription: string;
  organizer: string;
};

export const events: EventItem[] = [
  {
    id: 1,
    title: "No Code Automation Bootcamp",
    type: "Workshop",
    date: "Dec 14, 2025",
    time: "10:00 AM – 12:00 PM",
    location: "ISEC Auditorium",
    image:
      "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg",
    shortDescription:
      "Learn how to build workflows without writing complex code.",
    fullDescription:
      "This hands-on workshop introduces popular no-code tools and shows how to automate campus workflows. Ideal for students interested in product management, operations, and rapid prototyping.",
    organizer: "HuskyTech Club",
  },
  {
    id: 2,
    title: "AI in Business Transformation",
    type: "Seminar",
    date: "Dec 16, 2025",
    time: "2:00 PM – 3:30 PM",
    location: "Snell Library 140",
    image:
      "https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg",
    shortDescription:
      "Industry experts discuss real-world AI use cases.",
    fullDescription:
      "Hear from practitioners who implemented AI in finance, healthcare, and retail. The session focuses on challenges, lessons learned, and how students can prepare for AI-driven roles.",
    organizer: "D'Amore-McKim School of Business",
  },
  {
    id: 3,
    title: "Prompt Engineering Workshop",
    type: "Workshop",
    date: "Dec 18, 2025",
    time: "4:00 PM – 6:00 PM",
    location: "Curry Student Center 333",
    image:
      "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg",
    shortDescription:
      "Master the art of talking to AI tools effectively.",
    fullDescription:
      "This session covers prompt patterns, system prompts, role-based prompting, and evaluation strategies. We’ll also walk through examples with HuskyTrack’s own AI helpers.",
    organizer: "HuskyTracker Team",
  },
  {
    id: 4,
    title: "Husky Cultural Night",
    type: "Cultural",
    date: "Dec 20, 2025",
    time: "6:00 PM – 9:00 PM",
    location: "Curry Ballroom",
    image:
      "https://images.pexels.com/photos/1047442/pexels-photo-1047442.jpeg",
    shortDescription:
      "An evening of food, music, and performances from Husky clubs.",
    fullDescription:
      "Join us for a night celebrating diversity across the Husky community. Expect performances, interactive booths, and food from multiple cultures.",
    organizer: "NU Cultural Organizations Council",
  },
];
