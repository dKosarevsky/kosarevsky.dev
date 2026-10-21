/** Curated public projects. Source notes: PROJECTS.md. No live API dependency. */
export const projects = [
  {
    id: 'talks', name: 'AI Talks', category: 'ai', tags: ['AI', 'PYTHON', 'STREAMLIT'],
    source: 'https://github.com/dKosarevsky/AI-Talks',
    url: 'https://github.com/dKosarevsky/AI-Talks',
    description: {
      en: 'A conversational AI assistant built with Streamlit. An open starting point for your own chat experience.',
      ru: 'Разговорный AI-ассистент на Streamlit. Открытая основа для собственного интерфейса общения с ИИ.',
      es: 'Un asistente de IA conversacional creado con Streamlit. Un punto de partida abierto para tu propia experiencia de chat.',
    },
  },
  {
    id: 'snake', name: 'Spherical Snake', category: 'games', tags: ['GAME', '3D', 'PYTHON'],
    source: 'https://github.com/dKosarevsky/spherical-snake',
    url: 'https://spherical-snake.streamlit.app',
    description: {
      en: 'A familiar game on an unfamiliar planet. Classic Snake leaves the grid and takes a spherical turn.',
      ru: 'Знакомая игра на незнакомой планете. Классическая змейка выходит за рамки плоскости и покоряет сферу.',
      es: 'Un juego conocido en un planeta inesperado. La serpiente clásica deja el tablero plano y explora una esfera.',
    },
  },
  {
    id: 'video', name: 'Video Downloader', category: 'tools', tags: ['TOOL', 'PYTHON', 'STREAMLIT'],
    source: 'https://github.com/dKosarevsky/video_downloader',
    url: 'https://video-loader.streamlit.app',
    description: {
      en: 'A straightforward video downloader with a Streamlit interface. One useful tool, one focused job.',
      ru: 'Простой инструмент для загрузки видео с интерфейсом на Streamlit. Одна задача — ничего лишнего.',
      es: 'Una herramienta sencilla para descargar vídeos con una interfaz en Streamlit. Una tarea, sin distracciones.',
    },
  },
  {
    id: 'jpeg', name: 'ajpegli', category: 'tools', tags: ['IMAGING', 'PYTHON'],
    source: 'https://github.com/dKosarevsky/ajpegli',
    url: 'https://github.com/dKosarevsky/ajpegli',
    description: {
      en: 'Load JPEG images straight into NumPy with Google jpegli. A lightweight Python tool for image pipelines.',
      ru: 'Загрузка JPEG прямо в NumPy с помощью Google jpegli. Лёгкий Python-инструмент для обработки изображений.',
      es: 'Carga imágenes JPEG directamente en NumPy con Google jpegli. Una herramienta ligera para flujos de imágenes en Python.',
    },
  },
  {
    id: 'tta', name: 'albu-tta', category: 'ai', tags: ['ML', 'RESEARCH', 'VISION'],
    source: 'https://github.com/dKosarevsky/albu-tta',
    url: 'https://github.com/dKosarevsky/albu-tta',
    description: {
      en: 'Experiments in learned test-time augmentation: teaching a selector which image transformations to use.',
      ru: 'Эксперименты с аугментацией при инференсе: обучение селектора выбирать полезные преобразования изображений.',
      es: 'Experimentos con aumentación aprendida en inferencia: enseñar a un selector qué transformaciones de imagen usar.',
    },
  },
  {
    id: 'mcp', name: 'albu-mcp', category: 'ai', tags: ['MCP', 'AI', 'VISION'],
    source: 'https://github.com/dKosarevsky/albu-mcp',
    url: 'https://github.com/dKosarevsky/albu-mcp',
    description: {
      en: 'Preview image augmentations, refine them with visual feedback, and export pipelines through an MCP assistant.',
      ru: 'Предпросмотр аугментаций, настройка по визуальной обратной связи и экспорт пайплайнов через MCP-ассистента.',
      es: 'Previsualiza aumentaciones, ajústalas con comentarios visuales y exporta flujos mediante un asistente MCP.',
    },
  },
];

export function filterProjects(category) {
  return category === 'all' ? projects : projects.filter((project) => project.category === category);
}
