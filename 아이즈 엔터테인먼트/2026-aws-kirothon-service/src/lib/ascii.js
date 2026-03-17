// figlet 텍스트 생성 유틸 (서버사이드)
import figlet from 'figlet';

export function generateAscii(text, options = {}) {
  try {
    return figlet.textSync(text, {
      font: options.font || 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    });
  } catch {
    return text;
  }
}
