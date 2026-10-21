/** Curated public projects. Source notes: PROJECTS.md. No live API dependency. */
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
