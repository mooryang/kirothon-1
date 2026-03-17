import './globals.css';

export const metadata = {
  title: '전설의 전산과 선배',
  description: '퇴근 버튼을 누르면 AI의 근무가 시작된다',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
