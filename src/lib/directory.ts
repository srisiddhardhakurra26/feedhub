// Curated catalog of free, no-login sources for one-click adding on
// /discover. Every feed URL and Bluesky handle here was verified live —
// re-verify before adding new entries.

export interface DirectoryEntry {
  type: 'rss' | 'bluesky'
  identifier: string
  label: string
  description: string
  category: string
}

export const DIRECTORY_CATEGORIES = [
  'World News',
  'Tech & Product',
  'AI & Dev',
  'Science & Ideas',
  'Business & Politics',
  'Culture & Sport',
  'Bluesky',
] as const

export const DIRECTORY: DirectoryEntry[] = [
  // ── World News ──────────────────────────────────────────────
  {
    type: 'rss',
    identifier: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    label: 'BBC World',
    description: 'World headlines from the BBC.',
    category: 'World News',
  },
  {
    type: 'rss',
    identifier: 'https://www.theguardian.com/world/rss',
    label: 'The Guardian — World',
    description: 'International reporting, free and open.',
    category: 'World News',
  },
  {
    type: 'rss',
    identifier: 'https://feeds.npr.org/1001/rss.xml',
    label: 'NPR News',
    description: 'US public-radio news desk.',
    category: 'World News',
  },
  {
    type: 'rss',
    identifier: 'https://www.aljazeera.com/xml/rss/all.xml',
    label: 'Al Jazeera',
    description: 'Global coverage with a non-Western lens.',
    category: 'World News',
  },
  {
    type: 'rss',
    identifier: 'https://news.google.com/rss',
    label: 'Google News — Top Stories',
    description: 'Aggregated top headlines across outlets.',
    category: 'World News',
  },
  {
    type: 'rss',
    identifier: 'https://news.google.com/rss/headlines/section/topic/WORLD',
    label: 'Google News — World',
    description: 'Aggregated world headlines across outlets.',
    category: 'World News',
  },
  {
    type: 'rss',
    identifier: 'https://news.google.com/rss/headlines/section/topic/BUSINESS',
    label: 'Google News — Business',
    description: 'Aggregated business and markets headlines.',
    category: 'Business & Politics',
  },
  {
    type: 'rss',
    identifier: 'https://news.google.com/rss/headlines/section/topic/SCIENCE',
    label: 'Google News — Science',
    description: 'Aggregated science headlines across outlets.',
    category: 'Science & Ideas',
  },

  // ── Tech & Product ──────────────────────────────────────────
  {
    type: 'rss',
    identifier: 'https://www.theverge.com/rss/index.xml',
    label: 'The Verge',
    description: 'Consumer tech, platforms, and culture.',
    category: 'Tech & Product',
  },
  {
    type: 'rss',
    identifier: 'https://feeds.arstechnica.com/arstechnica/index',
    label: 'Ars Technica',
    description: 'Deep technical reporting and reviews.',
    category: 'Tech & Product',
  },
  {
    type: 'rss',
    identifier: 'https://techcrunch.com/feed/',
    label: 'TechCrunch',
    description: 'Startups, funding rounds, product launches.',
    category: 'Tech & Product',
  },
  {
    type: 'rss',
    identifier: 'https://www.wired.com/feed/rss',
    label: 'WIRED',
    description: 'Where tech meets society.',
    category: 'Tech & Product',
  },
  {
    type: 'rss',
    identifier: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY',
    label: 'Google News — Technology',
    description: 'Aggregated tech headlines across outlets.',
    category: 'Tech & Product',
  },

  // ── AI & Dev ────────────────────────────────────────────────
  {
    type: 'rss',
    identifier: 'https://rss.arxiv.org/rss/cs.AI',
    label: 'arXiv cs.AI',
    description: 'New AI research papers, daily.',
    category: 'AI & Dev',
  },
  {
    type: 'rss',
    identifier: 'https://simonwillison.net/atom/everything/',
    label: 'Simon Willison',
    description: 'Sharp, hands-on LLM engineering notes.',
    category: 'AI & Dev',
  },
  {
    type: 'rss',
    identifier: 'https://www.technologyreview.com/feed/',
    label: 'MIT Technology Review',
    description: 'Where AI and emerging tech are heading.',
    category: 'AI & Dev',
  },
  {
    type: 'rss',
    identifier: 'https://lobste.rs/rss',
    label: 'Lobsters',
    description: 'Computing link aggregator; HN\'s quieter sibling.',
    category: 'AI & Dev',
  },
  {
    type: 'rss',
    identifier: 'https://dev.to/feed',
    label: 'DEV Community',
    description: 'Practical posts from working developers.',
    category: 'AI & Dev',
  },

  // ── Science & Ideas ─────────────────────────────────────────
  {
    type: 'rss',
    identifier: 'https://www.quantamagazine.org/feed/',
    label: 'Quanta Magazine',
    description: 'Math, physics, and biology — beautifully explained.',
    category: 'Science & Ideas',
  },
  {
    type: 'rss',
    identifier: 'https://www.nature.com/nature.rss',
    label: 'Nature',
    description: 'Research highlights from the flagship journal.',
    category: 'Science & Ideas',
  },
  {
    type: 'rss',
    identifier: 'https://www.sciencedaily.com/rss/all.xml',
    label: 'ScienceDaily',
    description: 'Press-release science across every field.',
    category: 'Science & Ideas',
  },
  {
    type: 'rss',
    identifier: 'https://www.nasa.gov/feed/',
    label: 'NASA',
    description: 'Missions, launches, and space imagery.',
    category: 'Science & Ideas',
  },
  {
    type: 'rss',
    identifier: 'https://aeon.co/feed.rss',
    label: 'Aeon',
    description: 'Long-form essays on philosophy and culture.',
    category: 'Science & Ideas',
  },
  {
    type: 'rss',
    identifier: 'https://longreads.com/feed/',
    label: 'Longreads',
    description: 'The best long-form writing on the web.',
    category: 'Science & Ideas',
  },

  // ── Business & Politics ─────────────────────────────────────
  {
    type: 'rss',
    identifier: 'https://rss.politico.com/politics-news.xml',
    label: 'POLITICO',
    description: 'US politics and policy.',
    category: 'Business & Politics',
  },
  {
    type: 'rss',
    identifier: 'https://finance.yahoo.com/news/rssindex',
    label: 'Yahoo Finance',
    description: 'Markets and business headlines.',
    category: 'Business & Politics',
  },
  {
    type: 'rss',
    identifier: 'https://www.theatlantic.com/feed/all/',
    label: 'The Atlantic',
    description: 'Politics, culture, and ideas.',
    category: 'Business & Politics',
  },

  // ── Culture & Sport ─────────────────────────────────────────
  {
    type: 'rss',
    identifier: 'https://www.espn.com/espn/rss/news',
    label: 'ESPN',
    description: 'Top sports stories across leagues.',
    category: 'Culture & Sport',
  },

  // ── Bluesky ─────────────────────────────────────────────────
  {
    type: 'bluesky',
    identifier: 'npr.org',
    label: 'NPR on Bluesky',
    description: 'NPR\'s newsroom, in post form.',
    category: 'Bluesky',
  },
  {
    type: 'bluesky',
    identifier: 'washingtonpost.com',
    label: 'The Washington Post',
    description: 'Breaking news and analysis.',
    category: 'Bluesky',
  },
  {
    type: 'bluesky',
    identifier: 'newscientist.com',
    label: 'New Scientist',
    description: 'Science news in short form.',
    category: 'Bluesky',
  },
  {
    type: 'bluesky',
    identifier: 'theonion.com',
    label: 'The Onion',
    description: 'America\'s finest news source.',
    category: 'Bluesky',
  },
  {
    type: 'bluesky',
    identifier: 'bsky.app',
    label: 'Bluesky',
    description: 'Platform news from the team.',
    category: 'Bluesky',
  },
]
