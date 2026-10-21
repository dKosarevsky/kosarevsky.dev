/** Curated public projects. Source notes: PROJECTS.md. No live API dependency. */
export const projects = [
  {
    id: 'chess', name: 'A MOVE AGO', category: 'games', tags: ['CHESS', 'PUZZLE', 'DAILY'],
    featured: true,
    preview: './assets/previews/chess.jpg',
    action: 'play',
    source: 'https://github.com/agent-axiom/a-move-ago',
    url: 'https://chess.kosarevsky.dev/',
    description: {
      en: 'Retrochess, one move back. Reconstruct the last move in a daily puzzle, then explore the archive.',
      ru: 'Ретрошахматы: восстановите ход, который только что произошёл. Решайте задачу дня и исследуйте архив.',
      zh: '倒推一步，解开棋局。还原每日棋题中刚刚走过的一步，再到题库继续挑战。',
    },
  },
  {
    id: 'book', name: 'Agent Architecture', category: 'ai', tags: ['BOOK', 'AI AGENTS', 'ARCHITECTURE'],
    featured: true,
    preview: './assets/previews/book.jpg',
    action: 'read',
    source: 'https://github.com/agent-axiom/agent-arch',
    url: 'https://agent-axiom.github.io/agent-arch/',
    description: {
      en: 'An open, practical book on AI agent architecture: how to turn agent ideas into systems you can build and understand.',
      ru: 'Открытая практическая книга об архитектуре ИИ-агентов: как превращать идеи в системы, которые можно построить и понять.',
      zh: '一本开放阅读的 AI 智能体架构实践书，探索如何把想法变成可构建、可理解的系统。',
    },
  },
  {
    id: 'salvo', name: 'Salvo', category: 'games', tags: ['BATTLESHIP', 'MULTIPLAYER', 'AGENTS'],
    preview: './assets/previews/salvo.jpg',
    action: 'play',
    source: 'https://github.com/agent-axiom/agents-salvo',
    url: 'https://agent-axiom.github.io/agents-salvo/',
    description: {
      en: 'Battleship with local play, online matches and an agent mode.',
      ru: 'Морской бой с локальной игрой, сетевыми матчами и режимом агента.',
      zh: '支持本地对战、在线对战和智能体模式的海战棋。',
    },
  },
  {
    id: 'aximo', name: 'Aximo', category: 'ai', tags: ['RUST', 'SPEECH', 'LOCAL API'],
    action: 'launch',
    source: 'https://github.com/agent-axiom/aximo',
    url: 'https://ifif-aximo.hf.space/docs/',
    description: {
      en: 'A local speech recognition API in Rust, built for CPU inference with HTTP and WebSocket access.',
      ru: 'Локальный API распознавания речи на Rust с приоритетом работы на CPU и доступом по HTTP и WebSocket.',
      zh: '用 Rust 编写的本地语音识别 API，优先面向 CPU 推理，支持 HTTP 和 WebSocket 接口。',
    },
  },
  {
    id: 'mcp', name: 'albu-mcp', category: 'ai', tags: ['MCP', 'VISION', 'AUGMENTATION'],
    action: 'source',
    source: 'https://github.com/dKosarevsky/albu-mcp',
    url: 'https://github.com/dKosarevsky/albu-mcp',
    description: {
      en: 'A community MCP integration for AlbumentationsX. Preview image augmentations, refine them visually and export pipelines.',
      ru: 'MCP-интеграция сообщества для AlbumentationsX: предпросмотр аугментаций изображений, визуальная настройка и экспорт пайплайнов.',
      zh: '面向 AlbumentationsX 的社区 MCP 集成：预览图像增强效果、直观调整参数并导出处理流程。',
    },
  },
  {
    id: 'jpeg', name: 'ajpegli', category: 'tools', tags: ['PYTHON', 'JPEG', 'NUMPY'],
    action: 'source',
    source: 'https://github.com/dKosarevsky/ajpegli',
    url: 'https://github.com/dKosarevsky/ajpegli',
    description: {
      en: 'Load JPEG images into NumPy with Google jpegli. A focused Python tool for image processing workflows.',
      ru: 'Загрузка JPEG в NumPy с помощью Google jpegli. Python-инструмент для обработки изображений.',
      zh: '借助 Google jpegli 将 JPEG 图像载入 NumPy，为 Python 图像处理流程提供专注实用的工具。',
    },
  },
];

export function filterProjects(category) {
  return category === 'all' ? projects : projects.filter((project) => project.category === category);
}
