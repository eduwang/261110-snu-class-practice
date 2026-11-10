# 프로젝트 작업 규칙

이 프로젝트는 Vanilla JavaScript를 사용하는 Vite 프로젝트이며, GitHub 저장소를 Netlify와 연동하여 배포합니다. 향후 코드 작업 전에 이 문서와 기존 파일 및 설정을 먼저 확인하고, 필요한 부분만 수정합니다.

1. HTML, CSS, JavaScript 코드는 각각 분리된 파일로 작성합니다.
2. `index.html`은 프로젝트 루트에, 애플리케이션의 CSS와 JavaScript 파일은 `src` 폴더에 작성합니다. `vite.config.js` 등 설정 파일은 프로젝트 루트에 둡니다.
3. JavaScript는 `<script type="module" src="/src/main.js"></script>`와 같이 모듈 방식으로 연결합니다. CSS는 JavaScript 진입 파일에서 `import './style.css'`와 같이 불러와 Vite 빌드에 포함합니다.
4. 외부 JavaScript 라이브러리는 `npm install`로 설치하고 `import`하여 사용합니다. CDN 방식은 사용하지 않습니다.
5. 기존 파일과 설정을 먼저 확인하고 필요한 부분만 수정합니다.
6. Vite의 기본 진입점인 루트의 `index.html`과 기본 빌드 출력 폴더인 `dist`를 사용합니다. 불필요한 설정은 추가하지 않습니다.
7. `package.json`의 `build` 스크립트는 `vite build`를 실행하도록 유지하고, 작업 후 `npm run build`가 정상적으로 완료되는지 확인합니다.

## Netlify 배포

GitHub에 프로젝트를 업로드한 뒤 Netlify에서 해당 저장소를 연결하고 다음 값을 사용합니다.

- Build command: `npm run build`
- Publish directory: `dist`
