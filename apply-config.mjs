import fs from 'fs';
import { execSync } from 'child_process';

const APP_JS_PATH = 'app.js';

try {
  // 클립보드 내용 가져오기 (Mac용 pbpaste 사용)
  const clipboardData = execSync('pbpaste', { encoding: 'utf-8' }).trim();
  
  // JSON 유효성 검사
  JSON.parse(clipboardData);

  let content = fs.readFileSync(APP_JS_PATH, 'utf-8');
  const regex = /const defaultConfig = \{[\s\S]*?\};/;
  const replacement = `const defaultConfig = ${clipboardData};`;

  if (regex.test(content)) {
    fs.writeFileSync(APP_JS_PATH, content.replace(regex, replacement));
    console.log('✅ app.js의 defaultConfig가 성공적으로 업데이트되었습니다!');
  } else {
    console.error('❌ app.js에서 defaultConfig 변수를 찾을 수 없습니다.');
  }
} catch (e) {
  console.error('❌ 오류 발생: 클립보드에 올바른 설정 데이터가 없거나 app.js 파일에 문제가 있습니다.', e.message);
}