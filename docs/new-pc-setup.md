# 새 PC에서 작업 시작하기

## A. 프로그램 설치 (처음 한 번)
1. https://git-scm.com 에서 Git을 받아 설치한다. 옵션은 기본값 그대로 [Next]를 누른다.
2. https://nodejs.org 에서 이 PC와 같은 v24 계열 LTS를 받아 설치한다. (2단계부터 필요)
3. Claude Code를 설치하고 로그인한다.
4. PowerShell을 새로 열고 `git --version`, `node --version`을 입력해 버전이 나오는지 확인한다.

## B. 프로젝트 받기
1. PowerShell에서 작업할 위치로 이동한다. 예: `cd C:\`
2. 아래 명령을 실행한다.
   ```
   git clone https://github.com/TG-3379/map-site.git
   ```
3. GitHub 로그인 창이 뜨면 이 저장소의 GitHub 계정으로 로그인한다.
4. `cd map-site`로 들어간다.

## C. Git 이름 설정 (커밋하려면 필요)
```
git config --global user.name "본인 이름 또는 별명"
git config --global user.email "본인 GitHub 계정 이메일"
```

## D. 키 파일 `.env` 만들기 (가장 중요)
`.env`는 비밀 파일이라 GitHub에 올라가지 않는다. 새 PC에서 따로 만들어야 한다.
1. `.env.example`을 복사해서 이름을 `.env`로 바꾼다.
2. 키 값은 아래 중 안전한 방법으로 가져온다.
   - USB에 담아 옮긴다. (옮긴 뒤 USB의 파일은 지운다.)
   - 비밀번호 관리 앱이나 본인 메모 앱에 보관한 값을 붙여 넣는다.
   - 처음 발급받은 사이트(공공데이터포털, 네이버 클라우드)에서 다시 확인한다.
3. 카카오톡이나 메일로 키를 보내지 않는다. 키가 남을 수 있다.
4. 이 문서와 GitHub에는 키 값을 절대 적지 않는다.

## E. 매번 작업할 때 습관
- 시작할 때: `git pull`
- 끝날 때: 커밋하고 `git push`
- 두 PC에서 동시에 같은 파일을 고치지 않는다. 충돌이 나서 해결하기 어렵다.

## 확인 방법
- `map-site` 폴더 안에 `CLAUDE.md`와 `docs` 폴더가 보이면 정상이다.
- 새 PC에서 Claude Code로 이 폴더를 열고 "키 확인해줘"라고 하면, 키 값은 가린 채 입력 여부만 확인한다.
