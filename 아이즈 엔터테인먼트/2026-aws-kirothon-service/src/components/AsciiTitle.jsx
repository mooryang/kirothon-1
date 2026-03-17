'use client';

const ASCII_CS_SENPAI = `
   ____ ____    ____                         _
  / ___/ ___|  / ___|  ___ _ __  _ __   __ _(_)
 | |   \\___ \\  \\___ \\ / _ \\ '_ \\| '_ \\ / _\` | |
 | |___ ___) |  ___) |  __/ | | | |_) | (_| | |
  \\____|____/  |____/ \\___|_| |_| .__/ \\__,_|_|
                                |_|
`.trimStart();

const ASCII_CS_SENPAI_SMALL = `
   ___ ___   ___                      _
  / __/ __| / __| ___ _ _  _ __  __ _(_)
 | (__\\__ \\ \\__ \\/ -_) ' \\| '_ \\/ _\` | |
  \\___|___/ |___/\\___|_||_| .__/\\__,_|_|
                          |_|
`.trimStart();

export default function AsciiTitle({ color = 'var(--color-term-green)', size = 'normal' }) {
  const ascii = size === 'small' ? ASCII_CS_SENPAI_SMALL : ASCII_CS_SENPAI;

  return (
    <pre
      className="glow-text leading-none text-xs"
      style={{ color }}
    >
      {ascii}
    </pre>
  );
}
