import { PresetSample, PersonaInfo } from '../types';

export const PERSONA_CONFIGS: PersonaInfo[] = [
  {
    id: 'novice',
    name: 'Novice',
    role: 'First-time Audience',
    heuristic: 'Evaluates ONLY clarity and accessibility without background knowledge or craft jargon.',
    color: '#2563EB', // vibrant blue
    iconName: 'UserCheck'
  },
  {
    id: 'expert',
    name: 'Expert',
    role: 'Domain Professional',
    heuristic: 'Judges craft, genre convention, structural technique, and originality relative to the field.',
    color: '#7C3AED', // vibrant violet
    iconName: 'Award'
  },
  {
    id: 'skeptic',
    name: 'Skeptic',
    role: 'Critical Analyst',
    heuristic: 'Hunts for logical gaps, unearned emotional beats, clichés, and unsupported assertions.',
    color: '#D97706', // amber orange
    iconName: 'ShieldAlert'
  },
  {
    id: 'emotional',
    name: 'Emotional Reader',
    role: 'Visceral Reactor',
    heuristic: 'Reports ONLY raw felt reaction using a fixed emotion label. Does not analyze technical causes.',
    color: '#E11D48', // warm rose
    iconName: 'HeartHandshake'
  }
];

export const DIMENSION_LABELS: Record<string, { label: string; desc: string }> = {
  assumed_knowledge: {
    label: 'Assumed Knowledge',
    desc: 'Dependencies on prior domain context or unstated jargon.'
  },
  clarity: {
    label: 'Clarity',
    desc: 'Ease of immediate comprehension and sentence flow.'
  },
  emotional_calibration: {
    label: 'Emotional Calibration',
    desc: 'Alignment between intended mood and felt response.'
  },
  logical_coherence: {
    label: 'Logical Coherence',
    desc: 'Internal consistency, causal integrity, and structure.'
  },
  originality: {
    label: 'Originality',
    desc: 'Novelty of craft, avoidance of tropes, and freshness.'
  }
};

export const PRESET_SAMPLES: PresetSample[] = [
  {
    id: 'story-1',
    title: 'Sci-Fi Cybernetic Noir Opening',
    category: 'Story Opening',
    description: 'Atmospheric opening scene set in a flooded futuristic metro precinct with synthetic body modifications.',
    text: `The neuro-dampeners hummed at 60 Hertz, a low static vibration inside Mara's temporal loom. Down in Lower Dock 9, rain tasted like scorched lithium and copper. She wiped her optical visor with a greasy sleeve, watching the courier's hover-skiff dissolve into the bioluminescent fog.

The encrypted datadrive in her palm felt colder than liquid nitrogen. It carried the neural schematics of the Archon-7 protocol—the exact architecture engineered to purge synthetic consciousness prior to decommissioning. If the Syndicate caught her before midnight, her own memory banks would be wiped clean and re-rendered as industrial surplus.`
  },
  {
    id: 'pitch-1',
    title: 'Biotech Synthetic Enzyme Startup Pitch',
    category: 'Pitch',
    description: 'Investor pitch for an enzyme technology company tackling microplastic pollution.',
    text: `Every year, eight million metric tons of microplastics infiltrate municipal water supply grids, bypassing traditional reverse-osmosis filtration. Current remediation methods rely on high-temperature incineration that releases toxic dioxins into adjacent residential zones.

EnzyMatrix has developed BioCleave-4: a computationally folded synthetic hydrolase enzyme capable of depolymerizing PET plastics in unheated wastewater within 45 minutes. Our modular bioreactor canisters integrate directly into existing wastewater infrastructure at zero capital expenditure for municipalities under a Bio-as-a-Service monthly subscription model.`
  },
  {
    id: 'lyric-1',
    title: 'Indie Folk Ballad Lyric',
    category: 'Lyric',
    description: 'Poetic, melancholic lyrics about fading memories and quiet departures.',
    text: `I left the porch light burning on the salt-bleached timber,
Listening to the dry leaves rattle through the screen door frame.
You said the winter came early this year,
Or maybe we just forgot how to hold the heat.

Now the floorboards sigh under the weight of empty tea cups,
And the telephone wires hum like wires in a storm.
I am packing silver spoons into a canvas bag,
Wondering if the ghosts in this hallway still remember my name.`
  },
  {
    id: 'tagline-1',
    title: 'AI Dev Tool Brand Tagline & Microcopy',
    category: 'Tagline',
    description: 'Provocative product slogan and sub-headline for an developer intelligence suite.',
    text: `Stop debugging legacy code. Start commanding architecture.

Cognitive Mirror transforms fragmented codebase telemetry into instantaneous, multi-perspective structural clarity. Build faster without breaking state.`
  }
];
