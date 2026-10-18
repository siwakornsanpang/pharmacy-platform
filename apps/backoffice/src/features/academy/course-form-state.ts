export type QuizItem = { question: string; options: { text: string; correct: boolean }[] };

export function blankQuiz(): QuizItem {
  return { question: '', options: [{ text: '', correct: true }, { text: '', correct: false }] };
}

export function parseQuizText(text: string): QuizItem[] {
  return text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).flatMap((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const options = lines.slice(1).map((line) => ({
      text: line.replace(/^-\s*/, '').replace(/\*$/, '').trim(),
      correct: line.endsWith('*'),
    })).filter((option) => option.text);
    if (!options.length) return [];
    if (!options.some((option) => option.correct)) options[0].correct = true;
    return [{ question: lines[0], options }];
  });
}

export function serializeQuiz(items: QuizItem[]) {
  return items
    .filter((item) => item.question.trim() && item.options.some((option) => option.text.trim()))
    .map((item) => {
      const options = item.options.filter((option) => option.text.trim());
      const marked = options.some((option) => option.correct) ? options : options.map((option, index) => ({ ...option, correct: index === 0 }));
      return [item.question.trim(), ...marked.map((option) => `- ${option.text.trim()}${option.correct ? '*' : ''}`)].join('\n');
    })
    .join('\n\n');
}

export function toLocalInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const emptyCourseForm = {
  title: '',
  summary: '',
  coverUrl: '',
  durationLabel: '',
  cpeCredits: '0',
  conferenceCode: '',
  price: '0',
  audience: 'all',
  format: 'online',
  venue: '',
  trainingStartsAt: '',
  trainingEndsAt: '',
  status: 'draft',
  isFeatured: false,
  popularOrder: 0,
  categoryId: '',
  instructorId: '',
  outcomes: '',
  examText: '',
};
