// TypeScript interfaces for Persona types
export interface Persona {
  id: string;
  name: string;
  description: string;
  limitations: string[];
  strengths: string[];
  testingFocusAreas: string[];
  category: 'standard' | 'accessibility';
  priority: 'high' | 'medium' | 'low';
}

export interface PersonaTestingCriteria {
  usabilityWeight: number;
  accessibilityWeight: number;
  visualWeight: number;
  interactionWeight: number;
}

// Standard User Personas
export const standardPersonas: Persona[] = [
  {
    id: 'tech-savvy',
    name: 'Alex - Tech-Savvy Professional',
    description: 'A 28-year-old software developer who is comfortable with complex interfaces and expects efficient, feature-rich experiences. Uses multiple devices and stays updated with latest UI patterns.',
    limitations: [
      'May overlook obvious usability issues that affect less technical users',
      'Tends to rush through interfaces without reading instructions',
      'Expects advanced shortcuts and may get frustrated with simplified interfaces'
    ],
    strengths: [
      'Quickly understands complex navigation patterns',
      'Can adapt to new interface paradigms rapidly',
      'Provides feedback on advanced functionality and edge cases',
      'Comfortable with dense information layouts'
    ],
    testingFocusAreas: [
      'Advanced feature discoverability',
      'Keyboard shortcuts and power user features',
      'Data density and information architecture',
      'Integration with other tools and workflows',
      'Performance and responsiveness'
    ],
    category: 'standard',
    priority: 'high'
  },
  {
    id: 'mobile-user',
    name: 'Jordan - Mobile-First User',
    description: 'A 24-year-old marketing coordinator who primarily uses mobile devices for work and personal tasks. Expects touch-friendly interfaces and quick access to key features.',
    limitations: [
      'Struggles with small touch targets and cramped layouts',
      'Has difficulty with hover states and desktop-specific interactions',
      'Limited patience for multi-step processes on small screens',
      'May miss important information in dense layouts'
    ],
    strengths: [
      'Expert at thumb navigation and gesture-based interactions',
      'Quickly identifies mobile usability issues',
      'Good at prioritizing essential features over comprehensive functionality',
      'Understands context switching between apps'
    ],
    testingFocusAreas: [
      'Touch target sizes and spacing',
      'Mobile-specific interaction patterns',
      'Progressive disclosure and prioritization',
      'Loading states and offline functionality',
      'Cross-app integration and sharing'
    ],
    category: 'standard',
    priority: 'high'
  },
  {
    id: 'senior',
    name: 'Margaret - Senior User',
    description: 'A 67-year-old retiree who adopted technology later in life. Values clear, simple interfaces and prefers familiar patterns. Takes time to learn new systems but becomes loyal once comfortable.',
    limitations: [
      'Slower to adapt to new interface patterns',
      'May have difficulty with small text and low-contrast elements',
      'Prefers step-by-step guidance over exploration',
      'Can be overwhelmed by too many options or complex layouts'
    ],
    strengths: [
      'Methodical approach reveals hidden usability issues',
      'Values clear labeling and intuitive organization',
      'Good at identifying when interfaces deviate from established patterns',
      'Provides feedback on learning curves and onboarding'
    ],
    testingFocusAreas: [
      'Text size and readability',
      'Clear visual hierarchy and organization',
      'Consistent navigation patterns',
      'Help documentation and onboarding',
      'Error prevention and recovery'
    ],
    category: 'standard',
    priority: 'medium'
  },
  {
    id: 'busy-parent',
    name: 'Sam - Busy Parent',
    description: 'A 35-year-old working parent who needs to accomplish tasks quickly between other responsibilities. Values efficiency and reliability over advanced features.',
    limitations: [
      'Limited time to learn complex interfaces',
      'Frequently interrupted while using applications',
      'May not complete multi-step processes in one session',
      'Prioritizes speed over exploring all features'
    ],
    strengths: [
      'Excellent at identifying inefficient workflows',
      'Values clear progress indicators and save states',
      'Good at spotting essential vs. non-essential features',
      'Understands the importance of reliable, predictable interfaces'
    ],
    testingFocusAreas: [
      'Task completion efficiency',
      'Auto-save and session persistence',
      'Clear progress indicators',
      'Quick access to frequently used features',
      'Minimal cognitive load design'
    ],
    category: 'standard',
    priority: 'high'
  },
  {
    id: 'international',
    name: 'Raj - International User',
    description: 'A 31-year-old business analyst from India who uses English as a second language. Familiar with technology but may interpret UI patterns differently due to cultural context.',
    limitations: [
      'May misinterpret culturally-specific icons or metaphors',
      'Could struggle with idiomatic English in interface copy',
      'Different expectations for reading patterns and information hierarchy',
      'May have slower comprehension of complex instructional text'
    ],
    strengths: [
      'Identifies localization and internationalization issues',
      'Good at spotting unclear or ambiguous interface language',
      'Values universal design patterns over culture-specific ones',
      'Provides perspective on global usability standards'
    ],
    testingFocusAreas: [
      'Icon clarity and universal recognition',
      'Text clarity and plain language usage',
      'Cultural appropriateness of design elements',
      'Support for different reading patterns',
      'Timezone and locale considerations'
    ],
    category: 'standard',
    priority: 'medium'
  }
];

// Accessibility Personas
export const accessibilityPersonas: Persona[] = [
  {
    id: 'screen-reader',
    name: 'Maria - Screen Reader User',
    description: 'A 42-year-old legal researcher who is blind and relies on screen reader technology (JAWS/NVDA) to navigate digital interfaces. Highly proficient with keyboard navigation and assistive technology.',
    limitations: [
      'Cannot perceive visual design, color, or spatial relationships',
      'Relies entirely on semantic HTML structure and ARIA labels',
      'Cannot access content that requires mouse hover or visual positioning',
      'May miss important visual cues like loading states or error highlights'
    ],
    strengths: [
      'Expert at identifying missing alt text and poor semantic structure',
      'Excellent at testing keyboard navigation and focus management',
      'Can quickly identify accessibility violations and suggest improvements',
      'Understands the importance of proper heading structure and landmarks'
    ],
    testingFocusAreas: [
      'Semantic HTML structure and proper heading hierarchy',
      'Alternative text for images and meaningful link text',
      'Keyboard navigation and focus management',
      'ARIA labels and screen reader announcements',
      'Form labels and error message accessibility',
      'Skip links and page landmarks'
    ],
    category: 'accessibility',
    priority: 'high'
  },
  {
    id: 'cognitive-accessibility',
    name: 'David - Cognitive Accessibility User',
    description: 'A 29-year-old graphic designer with ADHD and mild dyslexia. Needs clear, simple interfaces with minimal distractions and good error prevention. Benefits from consistent patterns and clear feedback.',
    limitations: [
      'Easily distracted by busy interfaces or excessive animations',
      'May have difficulty processing large amounts of text quickly',
      'Can struggle with complex multi-step processes without clear guidance',
      'May miss subtle visual cues or state changes'
    ],
    strengths: [
      'Excellent at identifying overly complex or distracting interfaces',
      'Values clear visual hierarchy and consistent design patterns',
      'Good at spotting confusing navigation or unclear instructions',
      'Appreciates interfaces that provide clear feedback and confirmation'
    ],
    testingFocusAreas: [
      'Clear visual hierarchy and content organization',
      'Consistent navigation patterns and terminology',
      'Plain language and concise instructions',
      'Error prevention and clear error messages',
      'Reduced motion and distraction-free design',
      'Clear feedback for user actions and system status'
    ],
    category: 'accessibility',
    priority: 'high'
  }
];

// Combined personas array
export const allPersonas: Persona[] = [...standardPersonas, ...accessibilityPersonas];

// Persona testing criteria mapping
export const personaTestingCriteria: Record<string, PersonaTestingCriteria> = {
  'tech-savvy': {
    usabilityWeight: 0.3,
    accessibilityWeight: 0.1,
    visualWeight: 0.2,
    interactionWeight: 0.4
  },
  'mobile-user': {
    usabilityWeight: 0.4,
    accessibilityWeight: 0.2,
    visualWeight: 0.2,
    interactionWeight: 0.2
  },
  'senior': {
    usabilityWeight: 0.4,
    accessibilityWeight: 0.3,
    visualWeight: 0.2,
    interactionWeight: 0.1
  },
  'busy-parent': {
    usabilityWeight: 0.5,
    accessibilityWeight: 0.1,
    visualWeight: 0.1,
    interactionWeight: 0.3
  },
  'international': {
    usabilityWeight: 0.4,
    accessibilityWeight: 0.2,
    visualWeight: 0.3,
    interactionWeight: 0.1
  },
  'screen-reader': {
    usabilityWeight: 0.2,
    accessibilityWeight: 0.6,
    visualWeight: 0.0,
    interactionWeight: 0.2
  },
  'cognitive-accessibility': {
    usabilityWeight: 0.3,
    accessibilityWeight: 0.4,
    visualWeight: 0.2,
    interactionWeight: 0.1
  }
};

// Helper functions
export function getPersonaById(id: string): Persona | undefined {
  return allPersonas.find(persona => persona.id === id);
}

export function getPersonasByCategory(category: 'standard' | 'accessibility'): Persona[] {
  return allPersonas.filter(persona => persona.category === category);
}

export function getHighPriorityPersonas(): Persona[] {
  return allPersonas.filter(persona => persona.priority === 'high');
}