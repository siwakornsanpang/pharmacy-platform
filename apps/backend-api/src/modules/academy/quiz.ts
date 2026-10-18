export type QuizQuestion = { question: string; options: string[]; answer: string };

export function parseQuiz(text: string): QuizQuestion[] {
  return text.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean).flatMap(block => {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const options = lines.slice(1).map(line => line.replace(/^-\s*/, '').replace(/\*$/, '').trim());
    const marked = lines.slice(1).find(line => line.endsWith('*'));
    const answer = marked ? marked.replace(/^-\s*/, '').replace(/\*$/, '').trim() : options[0]!;
    return [{ question: lines[0]!, options, answer }];
  });
}

export function publicQuiz(quiz: unknown): { question: string; options: string[] }[] {
  if (!Array.isArray(quiz)) return [];
  return quiz.map(item => {
    const question = item as QuizQuestion;
    return { question: question.question, options: question.options ?? [] };
  });
}

export function formatQuiz(quiz: unknown): string {
  if (!Array.isArray(quiz)) return '';
  return quiz.map(item => {
    const question = item as QuizQuestion;
    const options = (question.options ?? []).map(option => `- ${option}${option === question.answer ? '*' : ''}`).join('\n');
    return `${question.question}\n${options}`.trim();
  }).filter(Boolean).join('\n\n');
}
