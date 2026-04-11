// Founders information service
// Contains data about the founders of SmartAgroX

export interface FounderProfile {
  id: string;
  name: string;
  role: string;
  linkedin: string;
  linkedinUsername: string;
  bio: string;
  image: string;
  achievements?: string[];
  expertise?: string[];
  isFounder: boolean;
}

// Founders data
const foundersData: FounderProfile[] = [
  {
    id: "raghava-annala",
    name: "Raghava Annala",
    role: "Founder & Lead Developer",
    linkedin: "https://www.linkedin.com/in/annala-raghava/",
    linkedinUsername: "annala raghava",
    bio: "Raghava Annala is the founder and main developer of SmartAgroX. He is passionate about creating intuitive user experiences and robust full-stack solutions for agricultural technology. Specializes in modern frontend frameworks and responsive design.",
    image: "/founders/founder1.jpg",
    achievements: [
      "Founded SmartAgroX to revolutionize agricultural technology",
      "Leads the technical development and implementation of the platform",
      "Created StudyBuddy project for collaborative learning",
      "Developed the core architecture of the SmartAgroX platform",
      "Led the design and implementation of the user interface"
    ],
    expertise: [
      "Full Stack Development",
      "UI/UX Design",
      "Agricultural Technology",
      "React & TypeScript",
      "Cloud Infrastructure"
    ],
    isFounder: true
  },
  {
    id: "shivamani-yadav",
    name: "Shivamani Yadav",
    role: "Co-Founder & Visionary",
    linkedin: "https://www.linkedin.com/in/yadav-shivamani/",
    linkedinUsername: "Yadav Shivamani",
    bio: "Shivamani Yadav provided the core idea and vision for SmartAgroX. Expert in database architecture and backend systems with a focus on scalable agricultural solutions. Brings strong analytical skills to complex data challenges.",
    image: "/founders/founder2.jpg",
    achievements: [
      "Conceptualized the original vision and core idea of SmartAgroX",
      "Designed the database schema and data flow architecture",
      "Developed key agricultural data analytics models",
      "Pioneered the integration of weather data with farming practices"
    ],
    expertise: [
      "Agricultural Vision",
      "Database Architecture",
      "Backend Systems",
      "Data Analytics",
      "Cloud Infrastructure"
    ],
    isFounder: true
  },
  {
    id: "preetham-jakkam",
    name: "Preetham Jakkam",
    role: "Co-Founder & UI/UX Designer",
    linkedin: "https://www.linkedin.com/in/preetham-jakkam/",
    linkedinUsername: "preetham jakkam",
    bio: "You have hands-on experience across AI/ML, full-stack development, system programming, and algorithm design, and you actively work on real-world, impact-driven projects rather than just academic ones. Your interests span from low-level programming (8086, 8051 assembly) to modern AI systems, React-based applications, and scalable software architectures.Creative designer with an eye for detail and aesthetics. Specializes in creating visually appealing interfaces and graphics that enhance the user experience.",
    image: "/founders/founder3.jpg",
    expertise: [
      "UI/UX Design",
      "CSS & Animation",
      "Visual Design",
      "User Experience",
      "AI/ML",
      "Full Stack Development",
      "System Programming",
      "Algorithm Design",
      "8086, 8051 Assembly",
      "React-based Applications",
      "Scalable Software Architectures"
    ],
    isFounder: true
  }
];

/**
 * Get all founders information
 * @returns Array of founder profiles
 */
export const getAllFounders = (): FounderProfile[] => {
  return foundersData;
};

/**
 * Get a specific founder by ID
 * @param id Founder ID
 * @returns Founder profile or undefined if not found
 */
export const getFounderById = (id: string): FounderProfile | undefined => {
  return foundersData.find(founder => founder.id.toLowerCase() === id.toLowerCase());
};

/**
 * Get a founder by name (case insensitive partial match)
 * @param name Full or partial name to search for
 * @returns Founder profile or undefined if not found
 */
export const getFounderByName = (name: string): FounderProfile | undefined => {
  const searchName = name.toLowerCase();
  return foundersData.find(founder => 
    founder.name.toLowerCase().includes(searchName)
  );
};

/**
 * Get the main founder of SmartAgroX
 * @returns The main founder's profile
 */
export const getMainFounder = (): FounderProfile => {
  return foundersData[0]; // Raghava Annala is the first in the array
};

/**
 * Check if a query is asking about founders
 * @param query The query text
 * @returns True if the query is about founders
 */
export const isFounderQuery = (query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  const founderKeywords = [
    'founder', 'created', 'made', 'developed', 'built', 
    'raghava', 'annala', 'who made', 'who created', 
    'who developed', 'who built', 'who is behind',
    'who started', 'creator', 'developer', 'owner'
  ];
  
  return founderKeywords.some(keyword => lowerQuery.includes(keyword));
};

/**
 * Generate a response about founders based on the query
 * @param query The query text
 * @returns A response about the founders
 */
export const generateFounderResponse = (query: string): string => {
  const lowerQuery = query.toLowerCase();
  
  // Check for specific founder mentions
  if (lowerQuery.includes('raghava') || lowerQuery.includes('annala')) {
    const founder = getFounderByName('raghava');
    if (founder) {
      return `${founder.name} is the founder of SmartAgroX. ${founder.bio}`;
    }
  }
  
  // Check for general founder questions
  if (isFounderQuery(query)) {
    const mainFounder = getMainFounder();
    return `SmartAgroX was founded by ${mainFounder.name}, who serves as the ${mainFounder.role}. ${mainFounder.bio}`;
  }
  
  // Default response if no specific match
  return "SmartAgroX was founded by Raghava Annala, a passionate full-stack developer focused on creating innovative agricultural technology solutions.";
};
