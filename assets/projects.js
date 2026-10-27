/** Curated portfolio projects. Source notes: PROJECTS.md. No live API dependency. */
export const projects = [
  {
    id: 'chess', name: 'A MOVE AGO', category: 'games', tags: ['CHESS', 'PUZZLE', 'DAILY'],
    featured: true,
    preview: './assets/previews/chess.jpg',
    action: 'play',
    source: 'https://github.com/agent-axiom/a-move-ago',
    url: 'https://chess.kosarevsky.dev/',
    description: 'Work backwards from a chess position to find the last move. Try the daily puzzle or explore the archive.',
  },
  {
    id: 'book', name: 'Agent Architecture', category: 'ai', tags: ['BOOK', 'AI AGENTS', 'ARCHITECTURE'],
    featured: true,
    preview: './assets/previews/book.jpg',
    action: 'read',
    source: 'https://github.com/agent-axiom/agent-arch',
    url: 'https://agent-axiom.github.io/agent-arch/',
    description: 'A practical book on AI agent architecture. Read it online and use it to design your own systems.',
  },
  {
    id: 'fortran', name: 'microGPT in Fortran', category: 'ai', tags: ['FORTRAN', 'GPT', 'FROM SCRATCH'],
    featured: true,
    privateSource: true,
    preview: './assets/previews/fortran.svg',
    description: 'A tiny GPT built in modern Fortran. Train a character-level model, save it, and generate new names.',
  },
  {
    id: 'teleport', name: 'Axiom Spacetime', category: 'research', tags: ['SPACETIME', 'MATHEMATICS', 'RESEARCH'],
    featured: true,
    privateSource: true,
    privateSourceLabel: 'Private solver',
    preview: './assets/previews/blackhole.jpg',
    action: 'research',
    url: 'https://blackhole.kosarevsky.dev/',
    description: 'Explore the mathematics of a wormhole mouth through a public manuscript, detailed derivation and interactive plots.',
  },
  {
    id: 'auric', name: 'AURIC OATH', category: 'games', tags: ['ACTION PLATFORMER', 'SIX MISSIONS', 'BROWSER GAME'],
    preview: './assets/previews/auric-oath.jpg',
    action: 'play',
    url: 'https://auricoath.kosarevsky.dev/',
    description: 'Jump, dash and shoot through six citadel missions. Find hidden relics, ride moving platforms and face the Ash Warden.',
  },
  {
    id: 'salvo', name: 'Salvo', category: 'games', tags: ['BATTLESHIP', 'MULTIPLAYER', 'AGENTS'],
    preview: './assets/previews/salvo.jpg',
    action: 'play',
    source: 'https://github.com/agent-axiom/agents-salvo',
    url: 'https://agent-axiom.github.io/agents-salvo/',
    description: 'Play Battleship locally, online or in agent mode.',
  },
  {
    id: 'aximo', name: 'Aximo', category: 'ai', tags: ['RUST', 'SPEECH', 'LOCAL API'],
    action: 'launch',
    source: 'https://github.com/agent-axiom/aximo',
    url: 'https://ifif-aximo.hf.space/docs/',
    description: 'A local speech recognition API in Rust, built to run on a CPU. Connect over HTTP or WebSocket.',
  },
  {
    id: 'mcp', name: 'albu-mcp', category: 'ai', tags: ['MCP', 'VISION', 'AUGMENTATION'],
    action: 'source',
    source: 'https://github.com/dKosarevsky/albu-mcp',
    url: 'https://github.com/dKosarevsky/albu-mcp',
    description: 'Preview and tune image augmentations, then export a pipeline. A community MCP integration for AlbumentationsX.',
  },
  {
    id: 'jpeg', name: 'ajpegli', category: 'tools', tags: ['PYTHON', 'JPEG', 'NUMPY'],
    action: 'source',
    source: 'https://github.com/dKosarevsky/ajpegli',
    url: 'https://github.com/dKosarevsky/ajpegli',
    description: 'Load JPEG images into NumPy with Google jpegli. A Python library for image processing.',
  },
];

export function filterProjects(category) {
  return category === 'all' ? projects : projects.filter((project) => project.category === category);
}
